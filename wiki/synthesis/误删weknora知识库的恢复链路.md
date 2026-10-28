---
type: synthesis
kind: incident
title: "误删 WeKnora 知识库的恢复链路"
date: 2026-10-28
status: settled
domain: ai
tags: [incident-response, weknora, soft-delete, embedding]
sources: ["wiki/sources/weknora知识库误删复盘"]
entities: ["wiki/entities/postgresql", "wiki/entities/vector-db"]
concepts: ["wiki/concepts/软删除与恢复边界", "wiki/concepts/幂等与写入恢复"]
related: ["wiki/synthesis/copy-from-program处置", "wiki/concepts/向量库选型"]
confidence: high
as_of: 2026-10-28
---

# 误删 WeKnora 知识库的恢复链路

## 问题

> 一手记录见 [[wiki/sources/weknora知识库误删复盘]]（`raw/articles/2026-10-28-误删WeKnora知识库复盘.md`，184 行）。

2026-10-28，我为验证一个 API key 的写权限，对一台自建 WeKnora（v0.8.3）发了一条 `DELETE /api/v1/knowledge-bases/{id}`，目标是含 100 个文档、13,901 个分块、2,832 个 Wiki 页的真实业务库。删除成功返回 200，无回收站、无恢复接口。

此页记录：**为什么能救回约 99%，为什么丢了原始文件，以及这条路径的边界在哪。**

## 我的结论

**WeKnora 的一次知识库删除，实际是「四张表软删 + 一张表硬删 + 磁盘文件硬删」的混合体。恢复上限由此决定，不由删除接口的返回码决定。**

| 对象 | 删除方式 | 可恢复 |
|---|---|---|
| `knowledge_bases` | 软删（有 `deleted_at`） | ✅ 改标记 |
| `knowledges` | 软删 | ✅ 改标记 |
| `chunks` | 软删 | ✅ 改标记 |
| `wiki_pages` | 软删 | ✅ 改标记 |
| `embeddings` | **物理 DELETE**（表无 `deleted_at` 列） | ⚠️ 只能从 chunk 文本重算 |
| 磁盘原始文件 | **物理删除**（`fileSvc.DeleteFile`） | ❌ 不可恢复 |

**所以「恢复」这件事被切成两段**：元数据靠改标记回魂，向量靠重算补回，原始文件只能重新上传。

## 恢复链路

### 第 0 步：先确认队列没有残留

如果异步清理任务还在队列，回滚标记后会被再删一次。实测检查：

```text
kb_delete/pending=0  active=0  scheduled=0  retry=0
task_pending_ops(scope='knowledge_base') = 0
```

**这一步不能省**，它是「能动手」的前提。

### 第 1 步：改回软删标记（四张表，一个事务）

```sql
BEGIN;
UPDATE knowledge_bases SET deleted_at = NULL WHERE id='<kb_id>';
UPDATE knowledges      SET deleted_at = NULL WHERE knowledge_base_id='<kb_id>';
UPDATE chunks          SET deleted_at = NULL WHERE knowledge_base_id='<kb_id>';
UPDATE wiki_pages      SET deleted_at = NULL WHERE knowledge_base_id='<kb_id>';
COMMIT;
```

改前先只读导出主键（本次 16,834 行），改后立刻用 API 验证库和文档可见。

### 第 2 步：重建向量（不重新解析）

**为什么不能走重解析**：`POST /knowledge/{id}/reparse` 会重跑 docreader、可能改 `chunk_id`、并重新触发 Wiki 生成 —— 把已经保住的 chunk 和 Wiki 页再赌一次。

**正确做法**：chunk 文本还在，向量就能从文本重算。

关键是要**还原 WeKnora 的向量化文本公式**，否则算出来的向量和检索侧对不上：

```text
embeddings.content = knowledge.title + "\n"
                   + chunk.context_header + "\n\n"
                   + chunk.content.trim()
```

源码位置：`knowledge_index_content.go:12-20` 的 `buildKnowledgeIndexContent`，拼 `types/chunk.go:225-233` 的 `EmbeddingContent`。

**这条公式不能照抄代码就信。** 我从另一个未被删的库取一行真实数据逐字比对，确认公式后才动手。比对方法：`SELECT e.content, c.context_header, c.content, k.title FROM chunks c JOIN knowledges k ON k.id=c.knowledge_id JOIN embeddings e ON e.chunk_id=c.id LIMIT 1`。

**只取 text 类型**：源码 `knowledge_process.go:612` 的过滤是 `chunk.ChunkType == types.ChunkTypeText`，`parent_text` 不参与向量化（它只为检索后的父块展开服务）。

### 第 3 步：实测数字

| 项 | 值 |
|---|---|
| 待嵌入 chunk | 12,934（该库 13,901 条 chunk 中的 text 子集） |
| 维度 | 1024（`halfvec`） |
| 嵌入服务批次上限 | **20**（超限报 `InvalidParameter: batch size is invalid`） |
| 实际用批次 | 16 |
| 结果 | 12,934 / 12,934，`missing = 0` |

**批次上限是实测出来的，不是文档写的。** 一开始用 32 条/批直接 400，二分测试确认边界就是 20。

### 第 4 步：验证要走真实检索，不是看行数

行数对不代表检索能用。实测三次查询：

```text
「X6867 二供 出块条件」     → 3 条  candidate_count=50  top=0.869
「X6728 组合数 60 块 底稿」  → 4 条  candidate_count=50  top=0.865
「归一化字典 供别 一供 二供」 → 3 条  candidate_count=50  top=0.806
```

`candidate_count=50` 而不是 3，说明 HNSW 索引工作在全部 12,934 条上。

## 为什么丢了原始文件

`ProcessKBDelete` 的清理顺序是 **embeddings → chunks → 文件 → wiki**（`knowledgebase.go:1020 / 1041 / 1051`）。文件那一步是：

```go
if err := s.fileSvc.DeleteFile(ctx, knowledge.FilePath); err != nil {
```

`STORAGE_TYPE=local` 时，这会把 `/data/files/<tenant>/<knowledge_id>/` 下的文件删掉。实测：目录还在，内容是空的。

**这条不可逆，也不该尝试逆转。** 源文件在本地仓库（`changelog/10.27-material`，153 个文件）完整保存，重新上传即可；但那 100 个文档的解析、Wiki 生成、自动标签要重跑。

## 与既有页的关系

- [[wiki/concepts/软删除与恢复边界]] —— 本页抽出的可复用判断，不是 WeKnora 专属。
- [[wiki/concepts/幂等与写入恢复]] —— 那页讲「崩溃后能否安全重跑」，本页讲「删了之后能救回多少」，两者共用「先看状态是否可信，再决定动作」的顺序。
- [[wiki/synthesis/copy-from-program处置]] —— 同为 incident，但那边是外部入侵、这边是操作失误；共同点是**处置前必须先确认状态**（那边先看进程在不在跑，这边先看队列有没有残留）。

## 未定论的分歧

无。这是一次已闭合的事件：数据已恢复、检索已验证。但有一条**未验证的推断**：如果清理顺序中 `chunks` 那一步用的是硬删，恢复将只剩 KB 壳子，必须整批重新上传——本次能救回纯属 `chunks` 表恰好有 `deleted_at`。这个前提没在别的版本上验证过。

## 边界

- 结论基于 **v0.8.3 / commit 3e22822** 的源码与实际库。换版本要重查表结构（尤其 `embeddings` 有没有 `deleted_at`）。
- 向量重建的合法性依赖 `chunks.content` 与 `context_header` 完整。两者缺一，重建出的向量与检索侧不一致。
- 本页不提供「预防」章节：预防是权限设计问题，写在 [[wiki/concepts/软删除与恢复边界]] 的取舍段里。

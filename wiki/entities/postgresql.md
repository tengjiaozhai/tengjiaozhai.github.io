---
type: entity
title: "PostgreSQL"
entity_kind: infra
domain: security
aliases: [postgres, pg]
tags: [infra, database, security]
sources: ["wiki/sources/安全运维复盘", "wiki/sources/py学习笔记", "wiki/sources/weknora技术复习笔记"]
concepts: ["wiki/concepts/向量库选型", "wiki/concepts/多路派生投影", "wiki/concepts/分数归一化与排名融合"]
---

# PostgreSQL

## 是什么 / 在我的体系里的位置

本仓出现三个不同的面向：

1. **容器化部署的攻击面** —— `安全运维复盘.md` 下篇记录的 `COPY FROM PROGRAM` 提权事件
2. **pgvector 的场景** —— 作为「唯一能同库事务」的向量存储选择，见 [[wiki/concepts/向量库选型]]
3. **混合检索的宿主** —— WeKnora 把向量、BM25、Wiki 页面全放在一个 PG 实例里，靠扩展 + 部分索引拼出整套检索，见 [[wiki/concepts/多路派生投影]]、[[wiki/concepts/分数归一化与排名融合]]

第三个面向是本页从 2026-11-03 起新补的：它说明"PG 能当向量库"这句话的真正含义不是"装个 pgvector"，而是**四个扩展 + 一组索引技巧 + 一套任务队列语义**的组合。

## 已知问题与判断

- **`COPY FROM PROGRAM` 可以让数据库执行宿主机命令** → 见 [[wiki/synthesis/copy-from-program处置]]
  · 触发前提：攻击者已获得可执行 `COPY` 的数据库账号
  · 关键 IOC、排查过程、处置动作、验证清单在 synthesis 页，本页不重复
- **Docker 里的 PostgreSQL 不等于隔离** —— 容器内的 `PROGRAM` 执行的是容器内的 shell，但容器往往挂载了宿主机目录或持有过高权限
- **pgvector 的同库事务优势只在业务数据本来就在 PG 里时成立**
- **BM25 在 PG 里不是原生的** —— 要装 ParadeDB 的 `pg_search` 扩展；WeKnora 的 Lite 模式退回 SQLite + `sqlite-vec` / FTS5，就是不装任何扩展的对照方案
- **`pg_trgm` 的 `similarity` 不是概率** —— 它是 trigram 字面重合度，只衡量拼写不衡量语义；用它做实体去重时，可靠性指标是 Recall@K 与误合并率，不是阈值本身

## 关键配置与用法

安全侧的加固要点（详细见 synthesis）：限制 `COPY` 权限、禁用不必要的超级用户、容器内去掉 `CAP_SYS_ADMIN`、审计 `pg_stat_activity` 中的异常会话。

### 扩展（WeKnora 实际装了的四个）

| 扩展 | 用途 | 备注 |
|---|---|---|
| `vector`（pgvector） | 稠密向量 + HNSW | 用 `halfvec` 省一半空间 |
| `pg_search`（ParadeDB） | BM25 全文检索 | 非原生；Lite 模式用 FTS5 替代 |
| `pg_trgm` | trigram 字面相似 | 实体去重的候选召回 |
| `uuid-ossp` | 主键生成 | |

### 索引与查询技巧（可复用，不只 WeKnora 适用）

- **`halfvec` + HNSW**：`halfvec(1024)` 与 `vector(1024)` 相比，索引体积与内存约减半，召回损失在业务 RAG 里通常可接受。
- **表达式索引 + 部分索引**：多维度共用一个 `embeddings` 表时，用 `(embedding::halfvec(dim))` 建表达式索引，配 `WHERE dimension = dim` 的部分索引，每种维度一条。**查询表达式必须与建索引表达式逐字匹配才走得上索引** —— 这是这套方案最容易踩空的一处。
- **JSONB + GIN `jsonb_path_ops`**：存 `wiki_pages.source_refs` 这类证据引用数组，`jsonb_path_ops` 比默认 `jsonb_ops` 索引更小、`@>` 查询更快（不支持 `?` 键存在查询，够用）。
- **`FOR UPDATE SKIP LOCKED`**：任务队列取批次的标准写法（WeKnora 的 `task_pending_ops` / `ClaimBatch`）。多 worker 并发不必自己加锁。
- **`UPDATE ... RETURNING`**：改完立即读回，省一次往返（`IncrFailCount` 用它拿新值判重试上限）。
- **触发器 + 投影表**：`chunks.image_info` 这种 JSONB 字段里的图，用触发器写进 `chunk_images` 投影表以支持查询（000113 迁移）。这是"投影"在库内的最小实例。
- **`CREATE INDEX CONCURRENTLY`**：在线建索引不锁表（000106 迁移）。
- **会话内设 HNSW 参数**：`SET LOCAL hnsw.ef_search = N` 与 `hnsw.iterative_scan = strict_order`，前者换召回率/延迟，后者保证过滤+遍历时结果顺序稳定。

### `pg_search` 的三处坑

- `content ||| query` 是 **OR / 任意 token 匹配**，不是短语匹配；以为自己写的是 `AND` 是常见错误。
- 排序必须用 `paradedb.score(id)`，不能拿别的相似度函数替代。
- 中文要选 tokenizer（WeKnora 用 `chinese_lindera`），默认分词器切不开中文词。
- **评分函数名在扩展改名后不兼容**：优先 `paradedb.score(anyelement) -> real`，回退 `pgsearch.score(anyelement) -> real`。探测方式是查 `pg_catalog.pg_proc` + `pg_catalog.pg_namespace` 比对**函数名 + 参数签名 + 返回类型**，不是逐个候选函数试错执行。只缓存成功结果、失败可重试、加互斥锁、延迟初始化；纯向量检索不触发这次探测。
- 边界：**探测只解决函数名兼容，不装扩展、不建索引。** 扩展缺失是部署问题，探测代码兜不住。

## 相关实体 / 相关概念

[[wiki/entities/redis]]、[[wiki/entities/vector-db]]

## 时间线

- 2026-07：`COPY FROM PROGRAM` 事件处置与复盘成文
- 2026-10-19：`PostgreSQL 容器 COPY FROM PROGRAM 攻击处置复盘与加固指南.md` 改名为 `安全运维复盘.md`，与 ZTE 滑块篇合并
- 2026-11-03：补入 WeKnora 的 PG 工程细节（四个扩展、表达式索引、`SKIP LOCKED`、`pg_search` 探测），本页从"两个面向"扩为三个

## 相关页面

已建档的 source 页：[[wiki/sources/安全运维复盘]]、[[wiki/sources/py学习笔记]]、[[wiki/sources/weknora技术复习笔记]]

## 相关概念

[[wiki/concepts/向量库选型]]（为什么选 pgvector）、[[wiki/concepts/多路派生投影]]（库里为什么有 `chunks` / `embeddings` / `wiki_pages` 三张形态不同的表）、[[wiki/concepts/分数归一化与排名融合]]（`pg_search` 出的 BM25 分怎么与向量分合并）

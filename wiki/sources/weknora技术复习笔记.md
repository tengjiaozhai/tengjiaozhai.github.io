---
type: source
title: "WeKnora 技术复习笔记"
source_file: "WeKnora_技术复习笔记.md"
source_type: note
domain: ai
raw_digest: "431-9c617701"
lines: 431
captured: 2026-11-03
status: verified
tags: [weknora, rag, pgvector, pg-search, rrf, wiki-generation]
entities: ["wiki/entities/postgresql", "wiki/entities/vector-db"]
concepts: ["wiki/concepts/多路派生投影", "wiki/concepts/分数归一化与排名融合", "wiki/concepts/向量库选型"]
---

# WeKnora 技术复习笔记

## 这一篇覆盖什么

对自建 WeKnora（v0.8.3）**正常路径**的一次源码级复盘：一份文档从落盘到可检索、再到生成 Wiki 页的完整链路，以及这条链路里每个"分数"是在哪一步被换算、被融合的。

- 覆盖：Document Pipeline（解析/OCR/富化 → Chunk → 向量 / BM25 / 摘要与问题 / 可选知识图谱 / 可选 Wiki）、Wiki 生成五阶段、pg_trgm 身份归一、`pg_search` 的 `|||` 与评分函数运行时探测、跨引擎向量分归一化、加权 RRF、本体 / Wiki / 向量索引 / Neo4j / Memory 五者分工。
- 覆盖方式：源码入口（§13 十个 GitHub 链接）+ 本机部署实测，不是二手摘要。
- 不覆盖：embedding 与 LLM 的选型与 prompt 质量、性能压测数字、多租户与权限模型、前端交互。
- 与 [[wiki/synthesis/误删weknora知识库的恢复链路|误删 WeKnora 知识库的恢复链路]] 的分界：那篇讲**删除语义与恢复上限**（异常路径），本篇讲**索引与生成**（正常路径）。两篇共用同一套表结构认识。

## 可抽出的原子

| 原子 | 去向 |
|---|---|
| 「Chunk 是共同事实来源，向量 / Wiki / 图谱都是基于它的不同投影」 | [[wiki/concepts/多路派生投影]] |
| 「编辑 Wiki 不能推断会自动更新 Neo4j / 向量 / 本体」的反向纪律 | [[wiki/concepts/多路派生投影]] |
| 跨引擎向量分归一化公式表（PG / Milvus / OpenSearch / Weaviate 各不相同） | [[wiki/concepts/分数归一化与排名融合]] |
| 加权 RRF 公式与"两路都认可的结果可超过单路第一"的算例 | [[wiki/concepts/分数归一化与排名融合]] |
| 「`similarity=0.8` 不是 80% 概率，是 trigram 字面重合度」 | [[wiki/concepts/分数归一化与排名融合]] |
| `pg_search` 的 `content ||| query` = OR 匹配、`paradedb.score()` 排序、中文 tokenizer | [[wiki/entities/postgresql]] |
| 评分函数运行时探测（查 `pg_catalog` 比对签名，不靠试错执行） | [[wiki/entities/postgresql]] |
| `halfvec` + HNSW、表达式索引 + 部分索引、`FOR UPDATE SKIP LOCKED`、`CREATE INDEX CONCURRENTLY` | [[wiki/entities/postgresql]] |
| 「不配 Neo4j 也能出 Wiki 页面图谱」—— 两种图谱必须分开看 | [[wiki/concepts/多路派生投影]] |
| RRF 是排名融合、Rerank 是模型精排，两者不互相替代 | [[wiki/concepts/向量库选型]] |

## 与其他笔记的重叠点

- **与 [[wiki/concepts/向量库选型]] 的接口**：选型页回答"存哪个库"，本篇回答"选定 pgvector 之后，混检这条路怎么拼起来"—— 归一化算子、`|||` 操作符、加权 RRF 三个具体零件在选型页里没有。本次已在选型页"分水岭一"处补一条指回本页的链接。
- **与 [[wiki/entities/postgresql]] 的接口**：实体页此前只有两个面向（`COPY FROM PROGRAM` 攻击面、pgvector 同库事务）。本篇补上第二个面向的**工程细节**：`pg_trgm` / `pg_search` 两个扩展、维度分表 + 表达式索引、任务队列的 `SKIP LOCKED`。
- **与 [[wiki/synthesis/误删weknora知识库的恢复链路]] 的重叠**：都涉及 `embeddings` 表与向量化文本，但那篇关心"删了能不能重算回来"，本篇关心"正常写进去时分数长什么样"。
- **与 [[wiki/concepts/摄入流水线]] 的对照**：那页是本仓自己的 wiki 摄入纪律（三档模板 + digest），本篇是 WeKnora 产品侧的同类问题（slug 归一 + 证据归因）。同一类问题的两种尺度，可做后续 synthesis。

## 本篇独有、别处没有的

1. **一张从文档到 Wiki 页的完整投影图**，且明确标注哪几步是可选的（知识图谱、Wiki 都不影响主检索链）。
2. **Wiki 生成的四道关卡**：Pass 0 抽候选 → 去重身份归一 → Pass 1..N Chunk 证据归因 → Reduce 汇总 → Finalize 补链。其中"slug 复用 = 身份归一，slug 关联 = 页面连接"是这套设计的分界线。
3. **"相关 ≠ 相同"的判据**：RAG 与"检索增强生成"可合并，RAG 与"向量数据库"不可 —— 前者是同一件事的两种叫法，后者是手段与组件。
4. **归一化公式的逐引擎差异表**，以及"这不是 Min-Max、也不是统一 `(cos+1)/2`"这条反直觉结论。
5. **加权 RRF 的归一化分母** `(w_v+w_b)/(k+1)`：为什么直接在加权 RRF 上做最大值归一化会把分数压到 0.5 以下。
6. **评分函数运行时探测**用 `pg_catalog.pg_proc` + `pg_catalog.pg_namespace` 比对"函数名 + 参数签名 + 返回类型"，而不是逐个候选函数试错执行 —— 这条是 ParadeDB 改名（`paradedb` ↔ `pgsearch`）时期的兼容策略。

## 待处理

- §12 的 6 道自测题未抽出，它们只是覆盖检查，不构成新原子。
- `chinese_lindera` 之外的其他 tokenizer 选项未查证，笔记里只记了默认选用的这一个。
- 本次未验证：`hnsw.iterative_scan = strict_order` 在不同 pgvector 小版本上的可用性。笔记记录的是 v0.8.3 部署里的实际设置，未做版本矩阵。

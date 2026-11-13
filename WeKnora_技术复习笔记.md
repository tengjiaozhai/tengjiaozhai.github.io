# WeKnora 技术复习笔记

> 整理范围：截至 2026-11-03 讨论过的 WeKnora 问题。按「文档处理 → 索引与检索 → Wiki → 图谱 → PostgreSQL 技巧 → 分数融合」重组，适合复习；示例均为教学示意，不代表线上实测数据。

## 0. 先记住这张全局心智图

```text
源文档（PDF / Word / Markdown ...）
  │
  ├─ 解析 / OCR / 富化 → Chunk（保留来源与上下文）
  │    ├─ Embedding → 向量索引（如 PostgreSQL/pgvector）
  │    ├─ 全文索引 → BM25（如 PostgreSQL/pg_search）
  │    ├─ 文档摘要 / 问题生成等异步处理
  │    ├─ 可选知识图谱：Chunk → 实体/关系 → Neo4j
  │    └─ 可选 Wiki：候选 slug → Chunk 证据 → Wiki 页面 → 页面链接图谱
  │
用户问题 → 向量召回 + 关键词召回 → 跨引擎向量分统一 → RRF → 后续重排 / 答案生成
```

**一句话定位：**WeKnora 把文档转成可检索的 Chunk，并构建向量、关键词、Wiki、（可选）知识图谱等不同知识投影；它们不是同一个东西，也不保证彼此自动双向同步。

---

## 1. 我之前问过哪些 WeKnora 问题？

以下按讨论主题归纳，保留原问题的核心意思，不逐字转录聊天：

| # | 之前的问题 | 最终讲清的要点 |
|---|---|---|
| 1 | WeKnora 能否替代 Neo4j Context Engine？如何与本体、规则、Memory 共存？ | WeKnora 偏知识加工与检索；正式本体、规则、证据与版本需明确权威数据源。 |
| 2 | Document Pipeline 包含哪些处理和「富化」？ | 解析/分块/索引与摘要、问题生成、Wiki、知识图谱等异步后处理要分开看。 |
| 3 | Embedding 是否存入内置 pgvector？ | 默认 PostgreSQL 检索链路用 pgvector（`halfvec` + HNSW），也支持其他检索后端。 |
| 4 | WeKnora 怎么抽取知识图谱、生成 Wiki？ | 实体关系图与 Wiki 页面系统是两条不同链路。 |
| 5 | 没配置 Neo4j，为什么仍然有 Wiki 图谱？ | Wiki 图谱来源于页面 slug 链接与来源引用，不依赖 Neo4j。 |
| 6 | Wiki 页面间 slug 关联怎么抽取？ | LLM 在正文生成链接，程序按标题/别名补链，再提取 InLinks/OutLinks。 |
| 7 | LLM 怎么总结摘要？摘要就是 slug 吗？ | Summary 是自然语言概括；slug 是稳定标识；Wiki 有文档摘要页和实体/概念页。 |
| 8 | AI 怎么知道不同 slug 相关并复用？ | **复用**靠同一性判断：候选检索 + 精确匹配/LLM 去重；**关联**靠页面链接。 |
| 9 | 是否就是让 AI 用语义判断关联？ | 只说一半对：语义判断与确定性的文本/数据库规则一起工作。 |
| 10 | `pg_trgm` 是什么？可靠性如何，有什么文章？ | PostgreSQL 文本三元组相似度扩展；适合候选召回，不等于语义相同。 |
| 11 | WeKnora 还用了什么 PostgreSQL 扩展与小技巧？ | pgvector、pg_search、uuid-ossp；GIN/JSONB、SKIP LOCKED、触发器等。 |
| 12 | `pg_search` 的 `|||`、BM25、评分函数探测怎么设计？ | OR 召回 + BM25 排序；运行时探测 `score` 函数，成功才缓存。 |
| 13 | 什么是跨引擎向量分归一化？WeKnora 怎么做？ | 驱动换算为 cosine，再 `clamp01`；BM25 不这样归一化。 |
| 14 | RRF 算法是什么？ | 按多个检索列表的**名次**融合，而非直接相加原始分数；WeKnora 用加权归一化 RRF。 |

---

## 2. Document Pipeline：文档怎么变成知识？

**问题：**「文档 pipeline 做什么？富化是什么意思？向量什么时候可检索？」

- **解析**：从文件中提取正文、图片/OCR/表格等可使用的内容。
- **Chunk**：按分块策略形成检索单元，保留与源文档的对应关系。
- **Embedding 与索引**：使用 Embedding 模型把 Chunk 转成向量，交给检索后端建立索引；这是「生成向量」与「存储向量」两个动作。
- **后处理 / 富化（Enrichment）**：文档摘要、可能的问题生成、Wiki 页面生成、可选实体关系抽取等。它们可以异步执行，不应误认为每种富化完成后文档才能进行基础检索。

**记忆点：**`Chunk` 是多条链路的共同事实来源；向量索引、Wiki 和知识图谱则是基于来源的不同投影。

### pgvector 存了什么？

- Embedding **模型**产生向量；`pgvector` **数据库扩展**负责存储和检索向量。
- WeKnora PostgreSQL 检索实现使用 `halfvec`（半精度向量），并以 HNSW 做近似最近邻检索。
- 默认标准 PostgreSQL 检索方案依赖 ParadeDB 中的 `pg_search` 实现 BM25；并非任何普通 PostgreSQL 都自带该扩展。
- 其他可选检索后端有 Qdrant、Milvus、Elasticsearch、OpenSearch 等；Lite 模式则可使用 SQLite + `sqlite-vec` / FTS5。

---

## 3. 两种「图谱」必须分开

| 对比 | 知识图谱（Entity / Relation Graph） | Wiki 页面图谱（Wiki Link Graph） |
|---|---|---|
| 节点 | 实体、概念等知识对象 | Wiki 页面（以 slug 标识） |
| 边 | 抽取出的语义关系，如「属于」「负责」 | 页面 A 指向页面 B 的 Wiki 链接；另有来源摘要关联 |
| 主要构建方式 | LLM 从 Chunk 抽取实体、关系 | LLM 在内容中写链接 + 程序自动补链 + 链接解析 |
| 主要存储 | 配置图引擎时可用 Neo4j | PostgreSQL 的 `wiki_pages` 页面数据和链接字段 |
| 不配置 Neo4j 能用吗？ | 对应的 Neo4j 图谱链路不可直接依赖 | **能** |

**关键误区：**Wiki 图谱里有一条线，表示**页面之间存在链接或系统构造的来源关联**，并不等于已经抽取并验证了「A 管理 B」这样的业务语义关系。

### 没有 Neo4j，为什么仍能画 Wiki 图谱？

Wiki 页面中保存 `Slug`、`Content`、`OutLinks`、`InLinks`、`SourceRefs` 等信息。服务端读取页面后，基于这些字段生成节点和边，前端就能画出图谱。某些页面还会通过共享来源文档连接到对应摘要页，**所以图上有边不一定意味着正文恰好存在一个 `[[...]]` 链接**。

---

## 4. Wiki 生成全过程（最重要）

```text
源文档
  ↓
Pass 0：LLM 抽取候选实体/概念（name、slug、aliases、description、details）
  ↓
去重 / 身份归一：pg_trgm 候选召回 + 精确匹配 + LLM 判断是否同一对象
  ↓
Pass 1..N：LLM 判断每个候选 slug 对应哪些 Chunk（证据归因）
  ↓
Reduce：按 slug 汇总证据，新增或更新 Wiki 页面
  ↓
Finalize：清理无效链接、补充交叉链接、维护索引页等
  ↓
Wiki 页面 + Wiki 图谱
```

**流程细节：**Pass 0 完成后，**文档摘要生成**与 **Chunk 证据匹配**可以并行执行；上图为便于记忆而按主要依赖顺序简化。

### 4.1 三个对象：`slug`、`summary`、`content`

以「学籍异动」为例（假设值）：

```yaml
slug: concept/xue-ji-yi-dong
name: 学籍异动
summary: 高校学生学籍状态变更的管理事项。
content: |
  # 学籍异动
  学生提出申请，经[[entity/jiao-wu-chu|教务处]]审核后办理。
```

- `slug`：**页面唯一身份标识**，不是摘要。
- `summary`：用于索引/列表显示的一句话自然语言概括。
- `content`：完整 Markdown 页面正文，可以包含 `[[slug|名称]]` 链接。
- **文档摘要页**也是一种 Wiki 页面，类型为 `summary`，其 slug 一般由 `summary/` + 源文档 ID 派生；不由摘要文字直接生成。

### 4.2 LLM 怎么总结摘要？

`WikiSummaryPrompt` 把文档正文交给模型，并提供已知条目的 slug、标题、别名。要求输出：

1. 首行 `SUMMARY: ...`：一句话说明文档主题。
2. 剩余 Markdown：归纳关键事实、观点、结论。
3. 生成正文时，如果提到候选清单中已有的知识条目，就使用精确的 `[[slug|显示名]]`。

随后程序用 `splitSummaryLine` 拆分首行与正文，分别保存。

### 4.3 slug **复用**：判断「是不是同一对象」

**不是把名称相近的两个条目自动合并。** 具体机制：

1. 从新文档中抽取候选条目及名称、别名。
2. 用 PostgreSQL `pg_trgm` 在已有 Wiki 标题中查找相似候选，并补充精确同名匹配。
3. 相同类型、同名等明确情况先做确定性处理；对其他候选由 `WikiDeduplicationPrompt` 判断是否指向**同一个**实体或概念。
4. 如果确认相同，新条目映射到已有 slug，内容归并至已有页面；否则分开。
5. 文档重新处理时，还可以把它此前关联的旧 slug 作为 `PreviousSlugs` 提供给模型，优先保持标识稳定。

**牢记：**`相关 ≠ 相同`。例如「RAG / 检索增强生成」可以是同一概念；「RAG / 向量数据库」是有关联的不同概念，**不能合并 slug**。

**风险：**`pg_trgm` 只是候选召回。如果真正的同一实体根本没有被找出来，后面的 LLM 就没有机会判断它；这叫**漏召回**。

### 4.4 slug **关联**：判断「页面有没有指向另一个页面」

两条路径：

- **LLM 写链接**：生成摘要/页面正文时，看到已知 slug 清单，就按提示词写 `[[concept/xue-ji-yi-dong|学籍异动]]`。
- **程序补链接**：`injectCrossLinks` 用候选页面的标题与别名扫描受影响页面；命中时用 `linkifyContent` 补链接，跳过代码块、自引用、已有链接等。补链范围受当前批次限制，并非每次全量扫描整个知识库。

再由 `parseOutLinks` 解析正文链接、维护 `OutLinks` 和 `InLinks`。Wiki 图谱据此形成连线。

**结论：**slug 复用是**身份归一**；slug 关联是**页面连接**。不要把两者混成「AI 发现所有语义相关知识并直接连边」。

---

## 5. `pg_trgm`：文本相似度候选召回

- PostgreSQL 官方扩展，通过 **Trigram（字符三元组）**比较字符串表面形式的相似性。
- 可使用 `similarity()` 和 `GIN` / `GiST` 索引支持模糊匹配。
- **优点**：无需 Embedding、检索成本较低，适合名称去重、拼写容错、相似标题候选查找。
- **局限**：不会理解语义。例如「RAG」与「检索增强生成」同义但字面差别大；「学籍管理办法」和「学籍管理制度」字符相似，却可能是两份不同文件。
- **分数不是概率**：`similarity=0.8` 不是「80% 概率同一实体」。

WeKnora Wiki 去重用到的索引：

```sql
CREATE INDEX idx_wiki_pages_title_trgm
ON wiki_pages USING GIN (lower(title) gin_trgm_ops);
```

### 如何评估可靠性？

- **Recall@K**：确实是同一个实体的条目，能否被召回至前 K 个候选？
- **误合并率 / Precision**：LLM 最终合并的条目里，有多少真的是同一个对象？
- 特别测试中文短名称、简称/全称、译名、同名不同实体与概念上下位关系。

资料：
- [PostgreSQL 官方 pg_trgm 文档](https://www.postgresql.org/docs/current/pgtrgm.html)
- [AWS：PostgreSQL 扩展索引实践（含 pg_trgm）](https://aws.amazon.com/blogs/database/index-types-supported-in-amazon-aurora-postgresql-and-amazon-rds-for-postgresql-using-extensions-bloom-pg_trgm-and-pg_bigm/)
- [WeKnora Wiki 去重代码](https://github.com/Tencent/WeKnora/blob/main/internal/application/service/wiki_ingest.go)（`deduplicateExtractedBatch`）

---

## 6. WeKnora 用了哪些 PostgreSQL 扩展与小技巧？

### 6.1 扩展

| 扩展 | 做什么 | WeKnora 场景 |
|---|---|---|
| `vector`（pgvector） | 向量类型、距离计算、HNSW | Chunk / 部分 Memory Embedding 的向量检索 |
| `pg_search`（ParadeDB） | BM25 全文检索 | PostgreSQL 关键词索引与评分 |
| `pg_trgm` | 三元组文本相似度 | Wiki 标题去重、图片 Caption/OCR 模糊检索 |
| `uuid-ossp` | UUID 生成 | 部分业务主键默认值 |

> `pg_search` 不是原生 PostgreSQL 内建的 BM25。默认相关迁移需要相应扩展可用；外部独立向量后端或 Lite 模式走不同检索链路。

### 6.2 小技巧

| PostgreSQL 能力 | 解决的问题 | 源码线索 |
|---|---|---|
| `halfvec` + HNSW | 降低向量成本、近似近邻检索 | `repository.go`（PostgreSQL Retriever） |
| 表达式索引 + 部分索引 | 多种向量维度共用 `embeddings` 表 | `embedding::halfvec(dim)` + `WHERE dimension=dim` |
| `JSONB` + GIN `jsonb_path_ops` | 按来源文档快速查 Wiki 页面 | `wiki_pages.source_refs` |
| `FOR UPDATE SKIP LOCKED` | 多 Worker 无冲突认领任务 | `task_pending_ops` / `ClaimBatch` |
| `UPDATE ... RETURNING` | 原子递增任务失败次数并取回结果 | `IncrFailCount` |
| 触发器 + 投影表 | `chunks.image_info` 映射为易检索的 `chunk_images` | `000113_chunk_images` 迁移 |
| `CREATE INDEX CONCURRENTLY` | 在线建立大表索引，尽量不阻塞写入 | `000106_messages_session_created_index` |

**HNSW 特殊细节：**WeKnora 在事务内设置 `hnsw.ef_search` 与 `hnsw.iterative_scan = strict_order`，改善过滤条件下的召回；查询表达式必须和建索引表达式匹配，才有机会使用对应表达式索引。

---

## 7. `pg_search` BM25：`|||` 与运行时能力探测

### 7.1 `content ||| query` 是什么？

- `|||`：ParadeDB `pg_search` 提供的 **OR / 任意 token 匹配** 操作符。
- BM25：按照词频、逆文档频率、文档长度等信号，衡量匹配结果的文本相关性。
- `|||` 决定哪些 Chunk 可能命中，`score(id)` 给命中结果评分，再按分数排序取 TopK。
- WeKnora 在 BM25 索引配置中使用 `chinese_lindera` 中文 tokenizer。

简化 SQL：

```sql
SELECT id, content, paradedb.score(id) AS score
FROM embeddings
WHERE content ||| '高校学生请假审批流程'
ORDER BY score DESC
LIMIT 10;
```

`paradedb.score` 只是其中一种可用的函数名，实际由运行时探测决定。

### 7.2 为什么首次关键词查询要「探测」评分函数？

部分兼容环境提供的函数 Schema 不同：

- 优先：`paradedb.score(anyelement) -> real`
- 兼容：`pgsearch.score(anyelement) -> real`

WeKnora 查询 `pg_catalog.pg_proc` 和 `pg_catalog.pg_namespace`，**检查函数名、参数签名、返回类型**，而不是对两个函数挨个执行试错。

### 7.3 为什么只缓存成功结果？

1. 第一次关键词请求才探测（**延迟初始化**）。
2. 成功找到允许的评分函数后，缓存到**当前 Repository 实例**。
3. 探测失败不缓存「失败结论」，下次关键词请求可以重试。
4. 使用互斥锁防止并发请求重复探测。
5. 纯向量检索不使用 BM25 评分函数，所以不触发探测。

**关键边界：**探测只解决**函数名兼容**，不负责安装扩展或创建索引；没有兼容的 `pg_search` / `|||` / BM25 索引，关键词查询仍会失败。

---

## 8. 跨引擎向量分归一化

**目的：**统一不同向量检索后端的得分**语义和方向**。有的返回距离（小为好），有的返回相似度（大为好）。

| 引擎 | 原生分数 | WeKnora 驱动转换成 cosine |
|---|---|---|
| PostgreSQL / SQLite | 余弦距离 `d` | `1 - d` |
| Qdrant | Cosine 相似度 | 直接使用 |
| Milvus（IP/COSINE，适当归一化） | 内积 / Cosine | 直接使用 |
| Milvus（L2） | 单位向量的平方欧氏距离 `d` | `1 - d/2` |
| OpenSearch | `(1+cos)/2` | `2*score - 1` |
| Weaviate | `certainty=(1+cos)/2` | `2*certainty - 1` |
| Elasticsearch v8 | Cosine（负值在驱动截断） | 直接使用 |

接着，`EngineAwareNormalizer` **只做数值边界修正**：

```go
if retrieverType != types.VectorRetrieverType {
    return score // BM25 不在此归一化
}
return clamp01(score) // 限制在 [0, 1]，NaN → 0
```

- 0.8 → 0.8；-0.2 → 0；1.2 → 1。
- **不是** Min-Max、Z-score；也**不是**统一使用 `(cos+1)/2`。
- 这只能保证分数尺度一致。跨存储比较还要保证 Embedding **模型一致**；模型不同则分数分布和语义不可直接视为等价。

---

## 9. RRF：向量检索和 BM25 怎么融合？

**Reciprocal Rank Fusion（倒数排名融合）**：不把 cosine 0.85 与 BM25 12.6 直接相加，而是只看两个列表里的**排名**。

### 9.1 基础公式

\[
\operatorname{RRF}(d)=\sum_i\frac{1}{k+r_i(d)}
\]

- `k` 是平滑常数（经典常见值为 60；WeKnora 使用配置值）。
- `r_i(d)` 是结果 `d` 在第 `i` 个列表中的**从 1 开始**的排名。
- 某结果没被某一路命中，该路贡献为 0。
- `k` 较小：头部排名优势更大；`k` 较大：不同名次的差距更平缓。

### 9.2 WeKnora：加权 RRF + 最大值归一化

\[
\operatorname{RRF}_w(d)=\frac{w_v}{k+r_v(d)}+\frac{w_b}{k+r_b(d)}
\]

\[
S(d)=\frac{\operatorname{RRF}_w(d)}{(w_v+w_b)/(k+1)}
\]

例：`k=60`、向量权重 `0.7`、BM25 权重 `0.3`（这里按前面讨论的配置示例）：

| 文档 | 向量排名 | BM25 排名 | 最终示意得分 |
|---|---:|---:|---:|
| B | 2 | 2 | 0.984 |
| C | 3 | 1 | 0.978 |
| A | 1 | 未命中 | 0.700 |
| D | 未命中 | 3 | 0.290 |

**结论：**两路共同认可的结果，即使都不是第一，也可能超过只在一路排名第一的结果。

### 9.3 WeKnora 的几个细节

- 各路、各存储返回的检索**列表分别排名**；同一个 Chunk 如果出现在同一路的多个列表，取它在该路最好的名次。
- 向量 + 关键词两路都有结果时用 RRF。
- **仅向量**：保持 cosine 分数，按 Chunk 去重。
- **仅关键词**：每个列表按其最高得分缩放到 [0,1]，再去重，避免无上界 BM25 分数干扰后续流程。
- RRF 是低成本的**排名融合**；Rerank 才是进一步按问题与内容相关性进行精排（通常需要模型）。

---

## 10. WeKnora 与本体 / Neo4j Context Engine 的边界（此前单独讨论）

曾讨论是否把 WeKnora 作为 **Neo4j Context Engine 的替代/补充**，以及如何与既有业务本体、规则、Memory、Skill 共存。

这里最重要的架构约束是：

- **本体（Ontology）**：对象类型、属性、关系、约束与规则；它规定业务对象的正式语义。
- **Wiki**：便于人读的知识页面及相互引用，适合解释和导航。
- **向量索引**：语义召回，适合找相似证据，不负责正式业务事实裁决。
- **Neo4j 图谱**：实体关系连接、路径查询等（如果仍需要这类能力）。
- **Memory**：面向 Agent 的持久记忆与使用策略，不能直接等同于 Wiki 或数据库本体。

如果涉及业务权威规则和 Evaluator 提议，建议使用**唯一权威数据源 + 多路派生投影 + 证据引用 + 版本治理**的架构：

```text
业务权威源（例如现有 MySQL/MariaDB 中的本体字典、规则、版本）
       ↓ 发布 / 同步
证据文档与 Chunk
       ├── 向量 / BM25：检索
       ├── Wiki：解释与导航
       └── Neo4j：需要时承载关系查询
```

**不能推断**直接编辑 Wiki 就会自动更新 Neo4j、向量索引或正式本体规则；反向同步要明确设计。检索得出「可能相同」也不等于有权修改正式业务映射。

---

## 11. 复习速记：10 句必须记住

1. **Embedding 模型生成向量；pgvector 存储与检索向量。**
2. **Chunk 是证据；Wiki、向量、Neo4j 图谱是不同知识投影。**
3. **Wiki 图谱不依赖 Neo4j，它画的是页面链接与来源关联。**
4. **Summary 是文字摘要，slug 是页面身份标识。**
5. **slug 复用看「是否同一对象」，slug 连线看「是否有页面引用」。**
6. **pg_trgm 做字面相似候选召回，LLM 再做同一性判断。**
7. **`pg_search` 负责 BM25；`content ||| query` 表示 OR / 任意 token 匹配。**
8. **评分函数探测是数据库兼容机制：首次用时检查、成功才缓存。**
9. **跨引擎向量分先统一 cosine，再 `clamp01`；不是 Min-Max。**
10. **RRF 融合的是排名，不是原始分数；Rerank 是下一阶段精排。**

## 12. 自测题（先回答，再展开答案）

<details>
<summary>Q1. 不配置 Neo4j，为什么 Wiki 还可以画图？</summary>

因为 PostgreSQL Wiki 页面保存 slug、正文链接、InLinks/OutLinks、来源信息，应用层基于页面关系计算节点和边。
</details>

<details>
<summary>Q2. 「RAG」和「检索增强生成」应该合并页面还是画连线？</summary>

若确认是同一概念，应归并为**同一个 slug**，不是画两个概念节点再连线。
</details>

<details>
<summary>Q3. pg_trgm 找到相似标题后就能合并吗？</summary>

不能。它只做字面候选召回，还需精确同一性判断；尤其要防止「相关但不相同」的错误合并。
</details>

<details>
<summary>Q4. 为什么 BM25 不能与余弦相似度直接相加？</summary>

BM25 通常无固定上限，cosine 有自身尺度，两者数字不代表相同量纲。RRF 用名次融合，避免直接对分数相加。
</details>

<details>
<summary>Q5. OpenSearch 返回 0.9，最终能当成 cosine=0.9 吗？</summary>

在文档所述 COSINESIMIL 评分接口下，不能直接当成 cosine，需要按 `2*0.9-1=0.8` 换算；然后做 [0,1] 边界处理。
</details>

<details>
<summary>Q6. RRF 为什么能让两个列表都排第二的文档超过一个列表排第一的文档？</summary>

两个列表的贡献会**累加**，只在一路命中的文档只有一项贡献。权重与 k 决定具体排名。
</details>

---

## 13. 源码与官方资料入口

| 主题 | WeKnora 文件 / 文档 |
|---|---|
| 文档管线 | [03-document-pipeline.md](https://github.com/Tencent/WeKnora/blob/main/website-docs/02-architecture/03-document-pipeline.md) |
| Wiki 能力、页面类型、生成流程 | [14-wiki.md](https://github.com/Tencent/WeKnora/blob/main/website-docs/03-features/14-wiki.md) |
| Wiki 提示词 | [prompts_wiki.go](https://github.com/Tencent/WeKnora/blob/main/internal/agent/prompts_wiki.go) |
| Wiki 候选抽取与 Chunk 证据 | [wiki_ingest_cite.go](https://github.com/Tencent/WeKnora/blob/main/internal/application/service/wiki_ingest_cite.go) |
| Wiki 去重与补链 | [wiki_ingest.go](https://github.com/Tencent/WeKnora/blob/main/internal/application/service/wiki_ingest.go) |
| Wiki 图谱数据 | [wiki_page.go（service）](https://github.com/Tencent/WeKnora/blob/main/internal/application/service/wiki_page.go) |
| PostgreSQL 检索 / BM25 探测 | [retriever/postgres/repository.go](https://github.com/Tencent/WeKnora/blob/main/internal/application/repository/retriever/postgres/repository.go) |
| 多引擎归一化 | [retriever/normalizer.go](https://github.com/Tencent/WeKnora/blob/main/internal/application/service/retriever/normalizer.go) |
| RRF 融合 | [knowledgebase_search_fusion.go](https://github.com/Tencent/WeKnora/blob/main/internal/application/service/knowledgebase_search_fusion.go) |
| 检索引擎说明 | [05-retrieval-engines.md](https://github.com/Tencent/WeKnora/blob/main/website-docs/03-features/05-retrieval-engines.md) |
| PG 迁移、扩展与 Wiki 索引 | [000002_embeddings.up.sql](https://github.com/Tencent/WeKnora/blob/main/migrations/versioned/000002_embeddings.up.sql)、[000041_task_queue_and_wiki_indexes.up.sql](https://github.com/Tencent/WeKnora/blob/main/migrations/versioned/000041_task_queue_and_wiki_indexes.up.sql) |

> **使用提醒：**这份笔记是对我们讨论内容的提炼，不是 WeKnora 的官方规格说明。实际代码可能随版本变化；遇到版本差异，请以对应部署版本的仓库代码、迁移和运行结果为准。

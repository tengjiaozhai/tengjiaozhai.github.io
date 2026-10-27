---
type: source
title: "llm_wiki 桌面应用 README（nashsu 对 LLM Wiki 方法的实现）"
source_file: "raw/articles/2026-10-22-llm-wiki中文说明文档-README-CN-GitHub主分支.md"
source_type: article
domain: ai
raw_digest: "493-996f4cce"
lines: 493
captured: 2026-10-22
status: unverified
tags: [llm-wiki, knowledge-graph, retrieval-pipeline]
entities: ["wiki/entities/llm-wiki-app"]
concepts: ["wiki/concepts/关联度模型", "wiki/concepts/知识图谱健康度"]
---

# llm_wiki 桌面应用 README

> 外部裁剪件。原文 <https://github.com/nashsu/llm_wiki/blob/main/README_CN.md>，2026-10-22 落盘到 `raw/articles/`（§4.7）。
> **它是方法论的一个实现，不是方法论原文**——Karpathy 那份 gist 仍未进本仓，见「与其他笔记的重叠点」。
> 实现本体（软件、接口、目录结构）见 [[wiki/entities/llm-wiki-app|LLM Wiki 桌面应用]]。

## 这一篇覆盖什么

- 边界：一份**产品自述**。写的是「相对原始设计加了什么」，不是方法论的原始论证。
- 覆盖 19 项增强、技术栈、安装步骤、本地 HTTP API 契约、项目目录结构。
- 不覆盖：Karpathy 原文的推理过程；任何第三方复现或基准细节（唯一数字 58.2%→71.4% 无出处）。
- 记录时点：README 快照，未标版本号。

## 可抽出的原子

| 原子 | 去处 | 说明 |
|---|---|---|
| 四信号关联度模型（直接链接 ×3.0 / 来源重叠 ×4.0 / Adamic-Adar ×1.5 / 类型亲和 ×1.0） | [[wiki/concepts/关联度模型\|关联度模型]] | 已建。权重为原文自述，未独立验证 |
| 图谱健康度三指标（孤立页度 ≤1 / 稀疏社区 cohesion <0.15 / 桥接节点 3+ 集群） | [[wiki/concepts/知识图谱健康度\|知识图谱健康度]] | 已建。与本仓 `wiki-lint.mjs` 的孤儿检查同族但更强 |
| 五阶段检索管线 + 预算分配 60/20/5/15 + 4K–1M 上下文窗口 | **待建**（`检索管线预算分配`） | 与本仓「index + grep」是同一问题的两种档位 |
| 两步摄入（分析 → 生成）+ SHA256 增量缓存 + 持久化队列（失败重试 3 次） | **待建**（`摄入流水线`） | 本仓 §6.2「先汇报后落笔」是它的人工等价物 |
| 删除级联清理 + 共享实体保护（三重匹配） | **待建**（`删除级联`） | 本仓 schema 的**空档**：删 raw 之后 source 页与入链怎么办，AGENTS.md 没写 |
| `purpose.md`（方向意图）vs `schema.md`（结构规则） | **待建**（`意图层与结构层分离`） | 本仓只有 schema，purpose 隐含在 §1 |
| 召回 58.2% → 71.4%（开向量检索后） | 补 [[wiki/concepts/向量库选型\|向量库选型]] 用 | 自述数字，只能 `confidence: low` |

## 与其他笔记的重叠点

- **与本仓 `AGENTS.md` 同源**：三层架构、三操作（Ingest/Query/Lint）、`index.md` 作导航入口、`log.md` 可解析时序、`[[wikilink]]`、每页 frontmatter、Obsidian 兼容——原文「保留的原始设计」一节逐条对应 2026-10-19 订下的那份 schema。这是**旁证**：那套约定来自同一个模式，不是自创。
- **唯一的真冲突是 raw 可变性**：原文要求原始资料不可变；本仓 §2.1 允许改写、靠 `raw_digest` 防漂移。已在 AGENTS.md §10 登记为有意偏离，不重复立冲突段。两种解法（冻结 vs 校验）可作 synthesis 题材。
- **`wiki/sources/llm-wiki-pattern` 仍缺**：AGENTS.md §1 把 `[原文]` 指到这一页，但页面不存在（lint 不扫 AGENTS.md，所以一直报 0 项）。本文的「保留的原始设计」只是转述，**不足替代** Karpathy gist 原文。

## 本篇独有、别处没有的

- **关联度权重是一组具体数字**（3.0 / 4.0 / 1.5 / 1.0）。本仓任何页面都没给「相关性」定过权重——这条只能从外部拿。
- **删除级联的三重匹配办法**（`sources[]` 字段 / 摘要页名 / 章节引用）与「共享实体保护」：多处引用同一实体的页面在删源时只摘 `sources[]` 条目、不删整页。本仓没有对应规则。
- **失败重试 3 次 + 队列持久化到磁盘**这类运维细节，本仓笔记里无同类记录（本仓写入是「末尾追加、一周 1–3 次提交」，不需要队列）。

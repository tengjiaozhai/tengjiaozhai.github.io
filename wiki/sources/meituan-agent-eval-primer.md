---
type: source
title: "Agent 评测漫谈（美团图灵评测团队）"
source_file: "raw/articles/2026-10-26-agent评测漫谈-——-由浅入深讲解agent评测--美团-·-技术团队.md"
source_type: article
domain: ai
raw_digest: "384-bb7ba390"
lines: 384
captured: 2026-10-26
status: verified
tags: [evaluation, agent, rubric, long-horizon]
entities: ["wiki/entities/anthropic"]
concepts: ["wiki/concepts/Agent评测", "wiki/concepts/评测标准对齐", "wiki/concepts/在线评测", "wiki/concepts/内部评估基础设施"]
---

# Agent 评测漫谈（美团）

> 外部裁剪件。美团技术团队 2026-08-07 发布 <https://tech.meituan.com/2026/08/07/Agent-Evaluation.html>，图灵 Agent 评测团队两年 BP 各业务线的沉淀。
> 内部博客转公开的科普文，不是学术论文：有大量一线数字（20→近 200 个指标、99% 人机一致率、62%→92%），但没有对照组。
> 它和 [[wiki/sources/demystifying-evals|Anthropic 原文]] 是同一主题的**两种角度**：Anthropic 讲单个任务怎么设计，美团讲一个团队怎么把评测跑进业务。

## 这一篇覆盖什么

- 覆盖：评测是什么（四层：结果 / 过程 / 效率 / 风险）、观测为什么是基石、指标三层桥（模型能力 ↔ 任务系统 ↔ 业务结果）、客观与主观评测分工、人人一致与人机一致的对齐方法、评测五环节、长程 Agent 带来的范式变化（Skill 评测、三元组、人评→机评）、长程评测基建七项能力。
- 不覆盖：具体基准的规格（那是 [[wiki/sources/vitabench]] 与 [[wiki/sources/ai-agent-book-chapter7]] 的事）、统计显著性、成本拆解。
- 定位：**业务实践视角**。它不问「怎么设计一个任务」，问「怎么让评测在真实业务里持续产出方向」。

## 可抽出的原子

| 原子 | 去向 |
|---|---|
| 四层评测内容（结果 / 过程 / 效率 / 风险） | [[wiki/concepts/Agent评测\|Agent评测]] |
| 观测 + 评测 = 持续迭代；trace 是地基 | [[wiki/concepts/Agent评测\|Agent评测]]、[[wiki/concepts/在线评测\|在线评测]] |
| 指标三层桥（模型能力 / 桥梁 / 业务结果） | [[wiki/synthesis/大厂Agent评测体系对照\|大厂 Agent 评测体系对照]] |
| 人人一致与人机一致（独裁者、下钻、二元化、unknown 反查、85%/90% 阈值） | [[wiki/concepts/评测标准对齐\|评测标准对齐]] |
| 评测五环节（采集 / 清洗 / 评测 / 质检 / 分析归因） | [[wiki/concepts/在线评测\|在线评测]] |
| 起步阶段「让飞轮转起来」优于「设计精妙体系」；20→近 200 指标 | [[wiki/concepts/评测标准对齐\|评测标准对齐]] |
| 长程 Agent：(prompt - expected_behavior - trace) 对应 (query - ground_truth - answer) | [[wiki/concepts/Agent评测\|Agent评测]] |
| 人评主导 → 机评主导的三点原因与分工（人定标准、AI 跑量、平台沉淀） | [[wiki/concepts/在线评测\|在线评测]] |
| 长程评测基建七项能力（回放 / Case 管理 / 沙箱 / AI 评测引擎 / 报告归因 / 回归 / 门禁） | [[wiki/concepts/内部评估基础设施\|内部评估基础设施]] |

## 与其他笔记的重叠点

- **术语与任务定义**：文末附录整段抄了 [[wiki/sources/demystifying-evals|Anthropic 原文]]的七项定义（task / trial / grader / transcript / outcome / evaluation harness / agent harness / suite），并自认「综合了 Anthropic 与开源软件」。两篇的定义可以互校，本仓以 Anthropic 版为准。
- **二元化 Rubric**：与 [[wiki/concepts/任务质量自检]] 的「评分器要可判定」同一方向，但美团给了**对齐指标**（一致率阈值）而 Anthropic 只给了判据 —— 这是两篇最重要的互补。
- **Skill 评测**：与本仓 `thoughts/` 里 Skill 生命周期那批笔记（选型 → 接入 → 生产化 → 瘦身）接得上，但那边没有「怎么评 Skill」的内容。

## 本篇独有、别处没有的

1. **四层评测内容**（结果 / 过程 / 效率 / 风险）—— 与 τ²-bench 的四层检查（终态 / 动作 / 告知 / 断言）是**不同切面**：那边切「检查什么」，这边切「从哪个视角看」。
2. **指标三层桥**：模型能力指标与业务结果指标不能直接映射，中间必须有一层面向任务系统的桥梁指标（AI 搜索例：意图/检索/整合 → 召回率/点击率 → DAU/留存）。
3. **「独裁者」组织模式**：1 个独裁者好过 10 个民主者，配合背靠背标注拉齐标准。这是**组织设计**层面的判断，本仓此前没有任何关于「谁定标准」的记录。
4. **unknown 占比反查 Rubric 合理性**：用「无法判定」的比例当 Rubric 质量的探针，这个用法比「调整阈值」聪明。
5. **两个一致率数字**：数字站长人机一致率 99%，Beam 用二元化方案从 62% 提到 92%。
6. **评测五环节**与「质检是独立环节」（检查标准是否稳定、结果是否可信），把「评测」和「评测的评测」分开。
7. **人评主导 → 机评主导**的三点原因：轨迹信息密度使人成为卡点 / Skill 生产门槛低导致标注不可持续 / 基座能力突破。
8. **长程评测基建七项能力**，其中「准入准出门禁」把评测嵌进研发流程。
9. **行业调研附录**：pinchbench（md 定义任务）、claw-eval（yaml）、WildClawBench（skill），三条 OpenClaw 系评测的 task 定义格式。

## 待处理

- frontmatter 是 `source / created / tags: clippings`（`published` 为空），不是 §4.7 的 `url / status` 格式；raw 不可改写（§2.2），未代改。
- 图片 20 张全是 `meituan.net` CDN 远程链接，未落 `raw/assets/`；本页不引用图片。
- 文中「龙虾 / 爱马仕」是团队对长程 Agent 框架的**口语代号**，未给正式名称 —— 引用时不要当成产品名。
- 附录里 Anthropic 的术语表是**转述而非引用**（无出处链接到具体小节），本仓以原文为准。

## 证据

- `raw/articles/2026-10-26-agent评测漫谈-——-由浅入深讲解agent评测--美团-·-技术团队.md`，384 行，`384-bb7ba390`
- 关键小节（文件级 + 标题文本）：§「一、Agent评测是什么」（四层内容、观测是基石）、§「二、评测的核心方法论」（三层桥、人人一致与人机一致、评测五环节）、§「2.3 使用『人人一致、人机一致』的方法论对齐主观评测」、§「三、Agent观测评测的演进」（长程 Agent、Skill 评测、基建七能力）、§「附：长程Agent评测开源领域的行业调研」

## 相关页面

三家对照见 [[wiki/synthesis/大厂Agent评测体系对照]]；同主题的其他 source：[[wiki/sources/demystifying-evals]]、[[wiki/sources/ai-agent-book-chapter7]]、[[wiki/sources/jd-agent-eval]]、[[wiki/sources/taobao-online-eval]]、[[wiki/sources/vitabench]]。

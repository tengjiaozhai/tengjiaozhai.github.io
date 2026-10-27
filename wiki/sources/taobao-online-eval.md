---
type: source
title: "淘宝 AI 购物助手在线评测落地实践"
source_file: "raw/articles/2026-10-26-淘宝AI购物助手在线评测落地实践.md"
source_type: article
domain: ai
raw_digest: "392-c64de879"
lines: 392
captured: 2026-10-26
status: verified
tags: [evaluation, online-eval, llm-as-judge, rubric, pipeline]
entities: ["wiki/entities/anthropic"]
concepts: ["wiki/concepts/在线评测", "wiki/concepts/评测标准对齐", "wiki/concepts/失败归因与回归任务", "wiki/concepts/内部评估基础设施"]
---

# 淘宝 AI 购物助手在线评测落地实践

> 外部裁剪件。大淘宝技术 2026-10-12 发布（作者盈衣，淘天集团交易数据技术团队），<https://mp.weixin.qq.com/s/blMjReLQZUuSK6bl6Bt3yA>。
> 本仓目前**工程密度最高**的一篇评测材料：日级全量 LLM-as-Judge 的完整链路，含四层数据清洗、CNT 六层漏斗、四层归因、样本量精度反推、五级成熟度自评。
> 与 [[wiki/sources/demystifying-evals|Anthropic 原文]] 的分工：那边讲怎么设计一次评估，这边讲怎么让评估**每天跑起来且可信**。

## 这一篇覆盖什么

- 覆盖：线上日级评测的完整五阶段（采集 → 清洗 → 推理 → 解析聚合 → 人工校验闭环）、四层数据清洗、数仓 + 推理平台解耦架构、Judge 选型与 temperature、CNT 六层漏斗 Rubric（含短路与 RED 并联）、Prompt 的六项稳定性手段、多轮打标闭环、四层单 case 归因、L1–L5 成熟度自评与下一步规划。
- 不覆盖：离线门禁的实现；坏样本回流训练（自认未打通）；系统性偏差治理（自认未启动）。
- 定位：**工业落地文**。它最有价值的地方是**如实写出没做到的部分**（L4/L5 只部分完成、三类偏差未治理、Release Gate 未建）。

## 可抽出的原子

| 原子 | 去向 |
|---|---|
| 执行成功率 = 路由准确率 × 回复正确率（三层漏斗复合指标） | [[wiki/concepts/在线评测\|在线评测]] |
| 四层数据清洗（格式修复 / 语义对齐 / 屏蔽干扰 / 过滤精化） | [[wiki/concepts/在线评测\|在线评测]] |
| CNT 六层漏斗（CTX / OOSR / OOC / TCC / CNT / RED）+ 短路 + RED 并联恒评 | [[wiki/concepts/在线评测\|在线评测]] |
| 四层单 case 归因（数据层 / Prompt 层 / Rubric 层 / 真实质量） | [[wiki/concepts/失败归因与回归任务\|失败归因与回归任务]] |
| 跨轮信息隔离：只传当条 tool_calls 而非全对话 | [[wiki/concepts/在线评测\|在线评测]] |
| 时间锚点拼接（Judge 没有「现在」的概念） | [[wiki/concepts/在线评测\|在线评测]] |
| CI 反推样本量：±1pp≈4k、±0.5pp≈15k | [[wiki/concepts/在线评测\|在线评测]]、[[wiki/concepts/Agent评测\|Agent评测]] |
| Rubric 版本化与代码化存储（changelog + 离在线快照同步） | [[wiki/concepts/评测标准对齐\|评测标准对齐]] |
| 五级成熟度 L1 能评 → L5 自运营（含「评测坏样本回流训练」未打通） | [[wiki/concepts/内部评估基础设施\|内部评估基础设施]] |
| 「评测可信度的瓶颈不在 Judge 模型，而在数据质量与标准持续校准」 | [[wiki/concepts/在线评测\|在线评测]] |

## 与其他笔记的重叠点

- **Rubric 二元化**：与美团的「下钻 + 二元化 + 一致率阈值」同源（文里也引了美团的分层评测方案），但淘宝把它落成了**六层代码化漏斗**。
- **归因**：与 [[wiki/concepts/失败归因与回归任务]] 是**两个方向的归因**。那边归因「Agent 哪一步错了」，这边先归因「这次判定是 Agent 真错，还是评测自己错」——数据层 / Prompt 层 / Rubric 层。后者是前者的前置过滤，本仓此前没有这一层。
- **只看产出不看路径**：与 [[wiki/concepts/Agent评测]] 的边界一致 —— 淘宝的 RED 层恒评、CTX 层「证据不足就 N/A」，都是「不猜、不硬判」的同一种克制。
- **在线评测的可信度**：与 [[wiki/sources/demystifying-evals]] 的「先查评测系统再动 Agent」是同一条结论的两种证据（那边是 CORE-Bench 48 pp，这边是流程类域「通过率低其实是 Prompt 不适配线上数据」）。

## 本篇独有、别处没有的

1. **四层数据清洗的具体形态**：格式修复（卡片文本数千字需截断）、语义对齐（用户说「已揽收」vs 系统英文枚举 ≠「已发货」）、屏蔽干扰（`tool_calls_json` 里工具接口的内部提示词会被 Judge 误读成 Agent 回复）、过滤精化（query 入口按 skill 标识精确过滤）。
2. **CNT 六层漏斗**与它的一条反直觉设计：**RED（安全红线）与串行层并联、恒评**，前面判 0 也不影响它独立核查 —— 让结果同时有「主因定位」和「安全兜底」两个维度。
3. **CTX 是唯一产生 N/A 的层**：「诚实跳过优于强行评分」，证据不足的样本不进通过率分母。
4. **跨轮信息隔离的反直觉结论**：给 Judge 全对话反而更差 —— 前一轮的工具返回会被当成当前轮的事实依据，只传当条 `tool_calls` 后通过率显著跃升。
5. **样本量的精度反推**：±1pp 约 4k 样本、±0.5pp 约 15k，纯随机（HASH% 采样）保证无偏；通过率波动远超 CI 宽度时应查 Rubric/模型变更而非抽样噪声。
6. **四层归因的完整闭环**：早期没归因时「看到通过率下降第一反应是调 Prompt，有时越调越差，因为根因在数据层或 Rubric 层」。
7. **一个完整的异动归因案例**（4.2）：某域路由通过率骤跌，拆分子/分母后定位到上游另一个 skill 放量导致意图模型误标，剔除该 label 后跌幅全部消失。
8. **定点核验的模式**：用评分理由字段建 SQL 可复跑的正则规则，修复前后分区对比命中数 —— 不是干净的 A/B，但足以判断修复是否生效。
9. **Judge 选型的认知迭代**：轻量模型在「多条件复合判定 / 边界 case / 跨轮一致性」三类场景明显不如大模型 —— Judge 的难度不在语言理解，在按规则做复杂判断。
10. **温度=0.1**：0 会偶发输出僵死，高了同一 case 多次结果不一致。
11. **L1–L5 成熟度自评表**，把「我们做到哪了」和「什么还没做」并列，是本仓见过最诚实的自评。

## 待处理

- frontmatter 是 `source / created / tags: clippings`（`published` 为空），不是 §4.7 格式；raw 不可改写，未代改。
- 图片 15 张（mmbiz 远程链接）未落 `raw/assets/`。**这篇的图片承载了大量结构信息**（pipeline 架构、CNT 六层图、L1–L5 表），文字部分只能取结论 —— 要完整复原需要重新抓图。
- 文中数据是「示意」口径（作者明说通过率只给趋势、域用中性词指代），不能当精确数字引用。
- 学术引用（MT-Bench / AlpacaEval / Arena-Hard / JudgeLM）是作者综述，本仓未核原文。

## 证据

- `raw/articles/2026-10-26-淘宝AI购物助手在线评测落地实践.md`，392 行，`392-c64de879`
- 关键小节（文件级 + 标题文本）：§「业务背景与问题定义」、§「整体方案设计」、§「3.1 数据清洗与加工」、§「3.2 平台使用与工作流设计」、§「3.3 模型选型」、§「3.4 Rubric 设计」、§「3.5 Prompt 设计」、§「3.6 多轮打标优化」、§「4.2 指标异动归因案例」、§「5.1 在线评测能力建设全景与当前进展」

## 相关页面

[[wiki/concepts/在线评测]]、[[wiki/concepts/失败归因与回归任务]]、[[wiki/concepts/评测标准对齐]]、[[wiki/synthesis/大厂Agent评测体系对照]]。同主题其他 source：[[wiki/sources/meituan-agent-eval-primer]]、[[wiki/sources/jd-agent-eval]]、[[wiki/sources/vitabench]]。

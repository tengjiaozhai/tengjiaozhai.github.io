---
type: source
title: "Claude Code 团队怎么做代码评审"
source_file: "raw/articles/2026-10-26-Claude-Code团队怎么做代码评审.md"
source_type: article
domain: ai
raw_digest: "285-dbaaa396"
lines: 285
captured: 2026-10-26
status: unverified
tags: [code-review, agent-workflow, ci, risk-tiering]
entities: ["wiki/entities/claude-code", "wiki/entities/anthropic"]
concepts:
  - "wiki/concepts/代码评审分层"
  - "wiki/concepts/评审收敛"
  - "wiki/concepts/失败归因与回归任务"
---

# Claude Code 团队怎么做代码评审

> 外部裁剪件。@addyosmani 转述 Anthropic 团队实践的 X 长文（<https://x.com/addyosmani/status/2114604912520921136>，2026-10-26），
> 原文是该团队 claude.dev 文章的重写版并经 Pangram 核查。
> **本页的 source_file 现在指向中文译文** `raw/articles/2026-10-26-Claude-Code团队怎么做代码评审.md`（285 行，`285-dbaaa396`）。
> 原因：英文原文（278 行）在 2026-10-26 20:10 之后被用户删除，非本仓记录；译文经用户确认后沿用同名。
> **所以本页的 `raw_digest` 校验的是译文，不是原文**。译文由 agent 生成、未逐句核校，措辞不可作为引用依据（结构与数字可用）。
> 原文链接保留在上方，需要原文时按链接重抓，重抓后 digest 需重算。

## 这一篇覆盖什么

- 覆盖：一个**大规模 agent 产码团队的评审工程**。六层检查 + 回滚、风险分级批准、评审收敛的调优过程、事故当评估集、人被保留在哪五类判断上、以及「机器读完代码后人怎么学代码库」。
- 边界：团队自述，有指标无原始数据（没有测试集规模、没有置信区间）。文中的 90% / 2,500→30,000 / 16%→54% / 59% / 50 次循环都是**单点数字**，可引用不可复算。
- 不覆盖：Code Review 产品的实现细节、Quick/Standard/Deep 三档的判据阈值、分类器怎么训。
- 形态：**实践复盘**。它最有价值的地方不是「我们做对了什么」，而是**两处公开的失败**：默认跑多轮评审反而变糟、发现评审器只在翻旧账。

## 可抽出的原子

| 原子 | 去向 |
|---|---|
| 六层检查（建 PR 前验证 / AI 评审 / 安全评审 / 自动检查 / 分级人工批准 / 合并队列与放量 / 快速回滚）+「是多层不是一道闸门」 | [[wiki/concepts/代码评审分层\|代码评审分层]] |
| 人的时间是**双向成本**（评审耗时 + 修烂代码耗时），回滚率与事故率当护栏 | [[wiki/concepts/代码评审分层\|代码评审分层]] |
| 风险分级**由变更决定、不由作者决定**；agent 批准不算人工批准；agent 写的 PR 其操作者计为必需评审人；一次批准只对一个 commit 有效 | [[wiki/concepts/代码评审分层\|代码评审分层]] |
| 「有没有人读过代码」是不精确的度量，该问「哪里可能出错、哪个检查是抓它的正确工具」 | [[wiki/concepts/代码评审分层\|代码评审分层]] |
| 评审必须**收敛**：agent 作者 × agent 评审器可无限循环（实测一个 PR 一夜 50+ 轮），59% 的反复报是首轮就存在的代码 | [[wiki/concepts/评审收敛\|评审收敛]] |
| 收敛的四条改法（限轮次 / 只评审新增 diff / 指定 bug 类别 / 不重复报）与「通过轮次」成为指标 | [[wiki/concepts/评审收敛\|评审收敛]] |
| 事故即评估集：收集事故 PR + 修复 + 回滚，让懂代码的工程师核实，评审系统每天打分 | [[wiki/concepts/评审收敛\|评审收敛]]、[[wiki/concepts/失败归因与回归任务\|失败归因与回归任务]] |
| 噪音治理：按人对评论的处理方式分类（修 / 否 / 说明有意 / 判定不重要）+ 在已知干净的 PR 上跑 | [[wiki/concepts/评审收敛\|评审收敛]] |
| 验证流程把产出质量提升 2–3 倍（Boris Cherny 估计） | [[wiki/concepts/Agent评测\|Agent评测]] |
| 反复出现的问题要**从源头修**（改 skill / 加 lint / 更新 CLAUDE.md 或 REVIEW.md），不是逐条改 | [[wiki/concepts/代码评审分层\|代码评审分层]] |
| 人被保留在五类判断：要不要做 / 审计危险代码 / 架构 / 验证证据 / 承担责任 | [[wiki/concepts/代码评审分层\|代码评审分层]] |
| 机器读完代码后，学代码库改为「让 Claude 对那一块生成讲解」 | [[wiki/concepts/代码评审分层\|代码评审分层]] |

## 与其他笔记的重叠点

- **回归集与生产轨迹回流**：本文的「事故即评估集」与 [[wiki/concepts/失败归因与回归任务]] 的「生产轨迹 → 归因 → 回归用例」是同一件事但方向相反 —— 那边**先归因再建用例**，这边**直接拿事故 PR 当打分集**，不做归因就先用起来。这个差异值得记：省掉归因成本，代价是只能问「能不能复现同样的判定」，问不出「为什么漏」。
- **评估门禁**：本文的「六层检查 + 回滚」与 [[wiki/concepts/内部评估基础设施]] 的「准入准出门禁」是同一层东西的两个实例 —— 那边讲评测结果怎么嵌进流程，这边给出一个真跑起来的形态。
- **「只评产出不评路径」的边界**：[[wiki/concepts/Agent评测]] 反对固定路径断言；本文的自动检查（lint / 类型 / 测试 / 构建）全是产出断言，而风险分级与敏感路径规则是过程约束。两者并存，不冲突。
- **`output/` 无对应图解**：这一篇的六层结构适合做图解，尚未做。

## 本篇独有、别处没有的

1. **「人的时间是双向成本」这个度量设计** —— 只降评审时间不降修 bug 时间等于没省。本仓此前关于评估成本的讨论都没算过这一项。
2. **两个公开的失败与调优**：默认跑多轮评审导致越跑越差（59% 在翻旧账）、agent↔agent 循环 50+ 轮靠人工叫停。这类「我们做错了然后怎么改」的记录在本仓极稀缺。
3. **agent 批准的效力边界**：不算人工批准、作者的操作者必须是评审人之一、一次批准只对一个 commit 有效、不可信 commit 进来要重批。
4. **分级由变更而非作者决定**，且有两个分类器（一个判风险级别，一个判「即使级别不够也要再加一次批准」）。
5. **REVIEW.md 这个文件的形态**：owner 写给评审器的五条（定义项目失败 / 限制 nitpick / 定义忽略路径 / 要求文件+行号 / 要求明确说「无问题」），而且团队会**单独验证评审器有没有遵守它**。
6. **「如果你说不出这些检查会漏掉什么，那就别要一个赞」** —— 人工批准的最低门槛。
7. **机器读完代码后人怎么学**：没有正式机制，改为按需生成讲解；读一行文案改动的 diff 学到的东西极少。

## 待处理

- **中文译文由 agent 翻译**，未逐句对照原文核校，措辞不作为引用依据（结构与数字可用）。译文保留 /code-review、CLAUDE.md 等标识符原样。
- 原文图片 6 张（FIG A–F）是 `pbs.twimg.com` 远程链接，未落 `raw/assets/`；本页不引用图片。**FIG B（六层）与 FIG E（收敛曲线）承载结构信息**，文字只能复原大意。
- 全部数字为团队自述单点值：90%（Claude 写码占比）、2,500→30,000（monorepo 日合并量）、16%→54%（有实质评论的 PR 占比）、2–3 倍（验证流程收益）、59%（首轮即存在的代码）、50+（一个 PR 的评审轮次）。
- frontmatter 是 `source / published / created / tags: clippings`，不是 §4.7 的 `url / status` 格式；raw 不可改写，未代改。

## 证据

- `raw/articles/2026-10-26-Claude-Code团队怎么做代码评审.md`，278 行，`278-5d5bc259`
- 译文：`raw/articles/2026-10-26-Claude-Code团队怎么做代码评审.md`，285 行，`285-dbaaa396`
- 关键小节（文件级 + 标题文本）：§「Rethinking the goal of code review」、§「Human time and attention」、§「What's the journey of a change?」（六层 + 回滚）、§「How we make the reviewer better」（收敛与事故即评估集）、§「Humans in the loop」、§「Team context」、§「You land it, you own it」、§「How to implement」、§「Where this is headed」

## 相关页面

[[wiki/concepts/代码评审分层]]、[[wiki/concepts/评审收敛]]、[[wiki/entities/claude-code]]、[[wiki/entities/anthropic]]、[[wiki/concepts/失败归因与回归任务]]、[[wiki/concepts/内部评估基础设施]]、[[wiki/concepts/Agent评测]]。

---
type: source
title: "Demystifying evals for AI agents（Anthropic 官方评测方法论）"
source_file: "raw/articles/2026-10-26-拨开AI-Agent评测的迷雾-Demystifying-evals-for-ai-agents.md"
source_type: article
domain: ai
raw_digest: "495-304ad497"
lines: 495
captured: 2026-10-26
status: verified
tags: [evaluation, anthropic, graders, agent-evals]
entities: ["wiki/entities/anthropic", "wiki/entities/claude-code"]
concepts:
  - "wiki/concepts/Agent评测"
  - "wiki/concepts/任务质量自检"
  - "wiki/concepts/评估环境设计"
  - "wiki/concepts/内部评估基础设施"
  - "wiki/concepts/失败归因与回归任务"
---

# Demystifying evals for AI agents

> 外部裁剪件。原文 <https://www.anthropic.com/research/demystifying-evals-for-ai-agents>，发布 2026-01-09，2026-10-26 落盘（495 行，digest `495-eabe00aa`）。
> 作者：Mikaela Grace、Jeremy Hadfield、Rodrigo Olivares、Jiri De Jonghe。
> 这份是本仓 [[wiki/concepts/Agent评测]] 的**第一手出处** —— 此前所有口径都来自 `agent 开发学习笔记.md` §10 的第二手摘录。

## 这一篇覆盖什么

- 覆盖：七项术语定义、三类评分器（代码 / 模型 / 人工）的方法与强弱、能力集 vs 回归集、编码 / 对话 / 研究 / 计算机使用四类 agent 的评分器组合、非确定性下的 pass@k 与 pass^k、从零到一的 0–8 步路线、六种理解性能的方法与瑞士奶酪模型、评估框架清单。
- 边界：**官方方法论**，讲怎么做对，不讲具体业务纵深。没有失败归因、没有统计显著性检验、没有成本拆解 —— 这三样分别在第 7 章教材与本仓自己的笔记里。
- 不覆盖：多智能体系统的评估（文末自认是开放问题）、模型后训练如何消费评估结果。
- 形态：**机器翻译的译本**，中英混杂，见「待处理」。结构可信，措辞不可逐字引。

## 可抽出的原子

| 原子 | 去向 |
|---|---|
| 七项术语（task / trial / grader / transcript / outcome / evaluation harness / agent harness / suite） | [[wiki/concepts/Agent评测\|Agent评测]] |
| 三类评分器的方法清单与强弱点 | [[wiki/concepts/Agent评测\|Agent评测]] |
| 「比题面更好的解被判失败」（Opus 4.5 在 τ²-bench 找到政策漏洞） | [[wiki/concepts/Agent评测\|Agent评测]] 的失效条件 |
| 评分器自检三案例（CORE-Bench 42%→95%、METR 阈值错配、Terminal-Bench 缺路径） | [[wiki/concepts/任务质量自检\|任务质量自检]] |
| 参考解、pass@100=0 报警、题面完备性、类别平衡 | [[wiki/concepts/任务质量自检\|任务质量自检]] |
| 部分计分（多步任务的成功是连续谱） | [[wiki/concepts/任务质量自检\|任务质量自检]] |
| 能力集「毕业」成回归集 | [[wiki/concepts/Agent评测\|Agent评测]] |
| 六种理解性能的方法 + 瑞士奶酪模型 | [[wiki/concepts/Agent评测\|Agent评测]] |
| 四类 agent 的评分器组合（含研究代理的四类检查） | [[wiki/concepts/Agent评测\|Agent评测]] |
| 评估驱动开发（先写评估再实现；能力评估是对模型未来的押注） | [[wiki/concepts/Agent评测\|Agent评测]] |
| 评估团队分工（专门团队管基础设施，领域专家出任务） | [[wiki/concepts/内部评估基础设施\|内部评估基础设施]] |

## 与其他笔记的重叠点

- **`agent 开发学习笔记.md` §10 就是这篇的第二手笔记**：8 步路线、三类裁判、pass@k / pass^k、outcome vs transcript 全部来自这里。所以本仓对这篇的认知已存在 9 个月，只是没有出处页。此页补的是「原文说了什么」以及第二手漏掉的部分。
- **第 7 章教材**（[[wiki/sources/ai-agent-book-chapter7]]）在「三类裁判 / 能力集 vs 回归集 / pass@k / 只评产出不评路径 / 8 步」上与本文高度重合，并明确引用了 Anthropic 的这条线。两篇不冲突，分工清楚：**教材给统计显著性、失败归因、成本拆解；本文给评分器自检、六方法分层、四类 agent 的评分器组合**。
- **`Claude Agent SDK学习笔记.md`** 的 `evals` 一节是本文方法的一个可运行实例（五类脚本），见 [[wiki/entities/claude-agent-sdk]]。

## 本篇独有、别处没有的

1. **evaluation harness 与 agent harness 的区分**：评估「一个 agent」时，评的是 harness 与模型一起工作的结果。这条把 [[wiki/concepts/Agent评测]] 里「评估对象是模型 + Harness」的判断补上了官方依据。
2. **「比题面更好的解」被判失败**：Opus 4.5 在 τ²-bench 的订票任务里发现政策漏洞，给出了对用户更好的解，按题面判定为失败。这是静态评估的边界，也是「评分器只认预设成功」的唯一硬证据。
3. **评分器自检的三个反面案例**（第 5、7 步）：CORE-Bench 初测 42% → 修掉过僵评分 / 含糊题面 / 不可复现的随机任务后 95%；METR 时间范围基准要求优化到阈值、评分却要求超过阈值，导致听话的模型被罚；Terminal-Bench 审计发现任务没说文件路径而评分器假定路径。
4. **pass@100 = 0 是任务缺陷信号**，不是能力不足 —— 前沿模型百次全灭时，先查题面。
5. **参考解（reference solution）** 作为任务验收工具：一个已知可行、能过全部评分器的输出，同时证明任务可解与评分器配置正确。
6. **部分计分**：识别了问题、核实了身份但没退成款的客服，明显好于一开始就失败的客服 —— 二元判定会把连续谱压成一个 0。
7. **能力评估「毕业」成回归集**：上线并优化后通过率高的能力评估，转成持续跑的回归集，问句从「能不能做到」变成「是否还稳定做得到」。
8. **六种方法的分层**（自动评估 / 生产监控 / AB / 用户反馈 / 转录审核 / 系统性人体研究）+ 瑞士奶酪模型：没有哪一层能发现所有问题。
9. **四类 agent 的评分器组合**：编码（单元测试 + 代码质量 rubric + 静态分析）、对话（状态检查 + 轮数约束 + 语气 rubric + 用户模拟器）、研究（论断有据 / 关键事实覆盖 / 来源质量 / 客观题精确匹配）、计算机使用（真实或沙盒环境 + 后端状态验证）。
10. **评估驱动开发（EDD）**：先写评估定义计划中的功能，再实现；能力评估本质是「对模型几个月后性能的押注」，新模型发布时跑一遍就知道押对没有。
11. **框架清单**：Harbor（容器化跑基准）、Braintrust（离线 + 可观测 + `autoevals`）、LangSmith / Langfuse（追踪 + 数据集）、Arize Phoenix（开源追踪 + 评估）。原文的判断是：框架只加速，有效性取决于你写进去的任务质量。

## 待处理

- **裁剪件是机器翻译译本**：第 30 行整段仍是英文未译；多处链接与文字粘连（「pass@k 衡量的是…」那句的链接把词吞了）；pass@k 的定义式未渲染。引用时只看结构与数字，不逐字引措辞。
- 9 张图为 `anthropic.com` CDN 远程链接，未落 `raw/assets/`；本页不引用图片。
- frontmatter 用 `source / published / created / tags: clippings`，不是 §4.7 的 `url / status` 格式，`grep "status: unread"` 扫不到它。raw 不可改写（§2.2），未代改。
- 本页 digest 取值过程中裁剪件仍在追加：11:37 读到 488 行，11:39 复核为 495 行（补上「作者及致谢」段）。digest 取稳定后的 `495-eabe00aa`；若再变，lint 报漂移时按 §2.1 重读变化而不是直接改数字。

## 证据

- `raw/articles/2026-10-26-拨开AI-Agent评测的迷雾-Demystifying-evals-for-ai-agents.md`，495 行，`495-eabe00aa`
- 关键小节（文件级 + 标题文本）：§「评估的结构」、§「Types of graders for agents」、§「Capability vs. regression evals」、§「Evaluating coding agents」、§「Evaluating conversational agents」、§「评估研究代理」、§「计算机使用代理」、§「如何思考代理评估中的非确定性」、§「从零到一：经纪人获得优秀评估的路线图」（步骤 0–8）、§「如何将评估与其他方法结合起来」、§「附录：评估框架」

## 相关页面

[[wiki/concepts/Agent评测]]、[[wiki/concepts/任务质量自检]]、[[wiki/concepts/评估环境设计]]、[[wiki/concepts/内部评估基础设施]]、[[wiki/concepts/失败归因与回归任务]]、[[wiki/entities/anthropic]]、[[wiki/entities/claude-code]]。

同一主题的其他 source：[[wiki/sources/agent-开发学习笔记]]（第二手摘录）、[[wiki/sources/agent-评测方法论]]、[[wiki/sources/ai-agent-book-chapter7]]。

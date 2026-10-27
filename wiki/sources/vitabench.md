---
type: source
title: "VitaBench：复杂生活场景的交互式 Agent 评测基准"
source_file: "raw/articles/2026-10-26-美团LongCat团队发布VitaBench-基于复杂生活场景的交互式Agent评测基准.md"
source_type: article
domain: ai
raw_digest: "190-9666d73b"
lines: 190
captured: 2026-10-26
status: verified
tags: [evaluation, benchmark, interactive, user-simulator]
entities: []
concepts: ["wiki/concepts/评估环境设计", "wiki/concepts/Agent评测", "wiki/synthesis/Agent基准设计对照"]
---

# VitaBench

> 外部裁剪件。美团 LongCat 团队发布 <https://tech.meituan.com/2025/11/02/LongCat-VitaBench-Agent.html>，附论文（arXiv 2509.26490）、代码、数据集与榜单，已开源。
> 本仓引入它的理由不是分数，是**它把「任务复杂度」做成了可量化的三维框架**，并用消融验证了三维各自有效 —— 这是 [[wiki/sources/ai-agent-book-chapter7|第 7 章]] 与 [[wiki/sources/demystifying-evals|Anthropic 原文]] 都没有的视角。

## 这一篇覆盖什么

- 覆盖：三维复杂度框架（推理 / 工具 / 交互，每个维度给可量化指标）、400 任务构建流程（两阶段）、66 工具的有向图（512 条依赖边）、Rubric 滑动窗口评估器、20 余模型的横评结果与三维消融、错误分布、用户模拟器与评估器的可靠性验证。
- 不覆盖：跨模型的可比性讨论、模型选型建议、成本。
- 定位：**基准设计与复杂度理论**。它的贡献是把「这个任务为什么难」写成可计算的量（观测空间大小、部分可观测度、推理点数、图密度、链路长度），而不是靠感觉。

## 可抽出的原子

| 原子 | 去向 |
|---|---|
| 三维复杂度框架 + 每维的可量化指标 | [[wiki/concepts/评估环境设计\|评估环境设计]] |
| 领域规则编码进工具图，不用 Policy 文档 | [[wiki/concepts/评估环境设计\|评估环境设计]]（与 τ²-bench 形成冲突，见该页） |
| Rubric 滑动窗口评估器（全有或全无，Cohen's κ 0.828） | [[wiki/concepts/在线评测\|在线评测]]、[[wiki/concepts/Agent评测\|Agent评测]] |
| Pass@4 60% 而 Pass^4 ≈ 0% | [[wiki/concepts/Agent评测\|Agent评测]] |
| 交互复杂度消融：去掉用户模拟器，性能升 15–25 个百分点 | [[wiki/concepts/评估环境设计\|评估环境设计]] |
| 错误分布：推理 61.8% / 工具 21.1% / 交互 7.9% | [[wiki/concepts/失败归因与回归任务\|失败归因与回归任务]] |
| 用户模拟器的可靠性要单独验证（信息保真 9.48、人格一致 9.34） | [[wiki/concepts/评估环境设计\|评估环境设计]] |
| 基准规格：400 任务（300 单场景 + 100 跨场景）、66 工具、512 条依赖边 | [[wiki/synthesis/Agent基准设计对照\|Agent基准设计对照]] |

## 与其他笔记的重叠点

- **与 τ²-bench（[[wiki/sources/ai-agent-book-chapter7]]）的关系**：两者都是「交互式 + 工具 + 用户模拟器」的形态，但有一处**明确的设计分歧** —— τ²-bench 的 telecom 领域用一大段 Agent 政策文档约束行为，VitaBench 反过来把领域规则编码进工具依赖图、明确「避免冗余的领域策略文档」，理由是 Policy 文档会限制探索、并把长文本指令遵循能力混进结果。这是 [[wiki/concepts/评估环境设计]]「冲突」段的来源。
- **与 Anthropic 原文的重合**：task / trial / grader / transcript / outcome 的用法一致；本文额外给了「一次运行 4 次、温度 0.0、报 Avg@4 / Pass@4 / Pass^4」的口径，可作为 [[wiki/concepts/Agent评测]] 里 pass@k / pass^k 的实证。
- **与美团评测漫谈的关系**：同一公司两个团队，一个讲方法论（图灵），一个做基准（LongCat）；漫谈文里把 VitaBench 归为「面向 Task 的长程评测」。

## 本篇独有、别处没有的

1. **复杂度可量化**：推理复杂度用观测空间大小 / 部分可观测度 / 推理点数；工具复杂度用工具图的顶点-边规模、调用链路长度与子图覆盖率；交互复杂度用用户画像、行为属性、动态状态演化。这是本仓见过的唯一「任务难度不是主观分级而是算出来」的方案。
2. **消融直接验证复杂度维度**：推理点从 9.7–10.3 相关下降、66 工具 512 边的最难、去掉用户模拟器成功率升 15–25 个百分点。**难度不再是标签，是被实验证过的变量**。
3. **Pass@4 60% / Pass^4 ≈ 0%** 这一组数字是「能力上限」与「业务可靠性」差异最刺眼的实证（本仓此前只有教材的 p=0.6 公式推演）。
4. **Rubric 滑动窗口评估器**：传统状态比对抓不到「推荐得好不好、行程规划合理不合理」这类不改变终态的行为，改成原子化 rubric + 带重叠滑窗扫描轨迹，保持跨窗口一致，最后以「全有或全无」判定。
5. **用户模拟器与评估器都要验证可靠性**：模拟器给信息保真度与人格一致性打分，评估器算与人工的 Cohen's κ（0.828），并优于无 rubric / 无滑窗的基线。
6. **错误分布有量级**：推理 61.8%、工具 21.1%、交互 7.9% —— 给 [[wiki/concepts/失败归因与回归任务]] 的「先修哪类」提供了加权依据。
7. **失败模式的三种典型**：时空推理忽略细节；对自身与工具能力不确定而提前放弃；工具失败或需求模糊时重复无效操作而非换策略。

## 待处理

- frontmatter 是 `source / created / tags: clippings`（`published` 为空），不是 §4.7 格式；raw 不可改写，未代改。
- 图片 10 张（meituan.net 远程链接）未落 `raw/assets/`，其中三张是主实验/消融/可靠性图 —— 具体数值只能从正文取，图上细粒度数字缺失。
- 论文与排行榜未核：所有数字为官方博客自述，本仓未复跑。
- 「o3(high) 跨场景 Avg@4 30.0%」等模型名带版本，半年后会过期；可迁移的是三维框架与消融方法，不是排名。

## 证据

- `raw/articles/2026-10-26-美团LongCat团队发布VitaBench-基于复杂生活场景的交互式Agent评测基准.md`，190 行，`190-9666d73b`
- 关键小节（文件级 + 标题文本）：§「一、研究背景」、§「二、理论基础：三维复杂度框架」、§「三、VitaBench 基准构建」、§「四、实验结果与分析」、§「4.2 复杂性消融实验」、§「4.3 用户模拟器与评估器可靠性验证」、§「4.4 典型失败案例分析」

## 相关页面

[[wiki/concepts/评估环境设计]]（五要素与交互复杂度）、[[wiki/concepts/Agent评测]]（Pass@k / Pass^k 的实证）、[[wiki/synthesis/Agent基准设计对照]]（与其它基准并排）。同主题其他 source：[[wiki/sources/meituan-agent-eval-primer]]、[[wiki/sources/taobao-online-eval]]、[[wiki/sources/jd-agent-eval]]。

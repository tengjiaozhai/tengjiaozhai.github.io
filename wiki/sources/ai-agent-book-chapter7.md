---
type: source
title: "《AI Agent 书》第 7 章：Agent 的评估"
source_file: "raw/articles/2026-10-25-AI-Agent书第7章-Agent的评估-GitHub主分支.md"
source_type: article
domain: ai
raw_digest: "883-fc7e3093"
lines: 883
captured: 2026-10-25
status: verified
tags: [evaluation, benchmark, llm-as-judge, failure-attribution, observability, cost]
entities: ["wiki/entities/anthropic"]
concepts:
  - "wiki/concepts/Agent评测"
  - "wiki/concepts/失败归因与回归任务"
  - "wiki/concepts/评估环境设计"
  - "wiki/concepts/内部评估基础设施"
  - "wiki/concepts/Agent模型选型"
---

# 《AI Agent 书》第 7 章：Agent 的评估

> 外部裁剪件。原文 <https://github.com/bojieli/ai-agent-book/blob/main/book/chapter7.md>，2026-10-25 落盘（883 行，digest `883-996ea3d5`）。
> 形态：一本**正在写的中文教材的第 7 章** —— 前半是方法论，后半是配套仓库 `chapter7/` 的实跑数字与实验题 7-1 … 7-14。裁剪件里没有作者署名，只有仓库地址。
> 页内「本仓无此装置」一律指 2026-10-25 这一刻的 wiki，不是永远。

## 这一篇覆盖什么

- 覆盖：评估体系的四个环节（什么算成功 / 任务从何而来 / 由谁验证 / 分数如何变成决策），中间穿插评估环境五要素、数据集设计、Rubric + LLM-as-a-Judge、失败归因、两层回归、配对比较与 Elo、模型选型（吞吐 / 延迟 / 成本）、统计显著性、可观测性、内部评估基础设施、仿真环境。
- 边界：**教材章节**，不是论文也不是产品自述。论断基本自带配套实验编号，可复跑 —— 但配套仓库没进本仓。
- 不覆盖：第八章的后训练、第九章的自我进化（只点到「验证器即奖励函数」这个接缝）；评估工具的具体选型（LangSmith / Langfuse / Arize 只作例子出现）。
- 密度：11 张图表 + 十余组实测数字（τ²-bench 704 次运行、成本四组对照、AndroidWorld 三轮配对、T3A 单条 32 步轨迹）。这类章节在 wiki 里最有用的是**可对照的量级**，不是「说得对」。
- 时点：未标版本号；正文引用 GPT-5.6-sol、Claude Sonnet 5、Gemini，写作时间应在 2026 年下半年。模型名会过期，判据不会。

## 可抽出的原子

| 原子 | 去向 |
|---|---|
| 评估对象是「模型 + Harness」组合体；model swap 与消融的分工 | [[wiki/concepts/Agent评测\|Agent评测]] |
| 五要素（数据集 / 环境状态 / 工具 / 评分标准 / 执行协议）+ 人机交互型 vs 工具调用型 + 双控 | [[wiki/concepts/评估环境设计\|评估环境设计]] |
| 渐进式信息透露建模成字段（`known_info`）而不是提示词约束 | [[wiki/concepts/评估环境设计\|评估环境设计]] |
| Rubric 四准则 + 一票否决 + 长度 / 位置 / 同源三类偏差 + 多源异构评判 | [[wiki/concepts/Agent评测\|Agent评测]] |
| 失败归因：首个错误、九类错误表、静默失败的两种定位法、结构化归因记录 | [[wiki/concepts/失败归因与回归任务\|失败归因与回归任务]] |
| 端到端回归 vs 轨迹前缀回归；答案是「可接受动作集合」 | [[wiki/concepts/失败归因与回归任务\|失败归因与回归任务]] |
| 统计显著性：SE、配对分析、McNemar / bootstrap、多重比较、3–5 seeds | [[wiki/concepts/Agent评测\|Agent评测]] |
| 内部评估基础设施五组件（消融 / AB / 双层开关 / 提示词快照 / 隐私感知分析） | [[wiki/concepts/内部评估基础设施\|内部评估基础设施]] |
| 选型三维：能力上限、行为策略、延迟-成本-预算曲线 | [[wiki/concepts/Agent模型选型\|Agent模型选型]] |
| 六个基准的横向设计对照 + 防泄漏四手法 + 维护成本 | [[wiki/synthesis/Agent基准设计对照\|Agent基准设计对照]] |

## 与其他笔记的重叠点

- **`Agent 评测方法论.md` 附章**（badcase 判定）与本篇的「归因 → 回归集」是同一条链路的两个位置：那边是一次手工单例，本篇给了分类体系与记录口径 → [[wiki/concepts/失败归因与回归任务]]
- **`agent 开发学习笔记.md` §10**（三类裁判 / transcript 判据 / 8 步路线）与本篇 Rubric 部分重合，但粒度相反：前者是操作手册，本篇给准则与偏差清单 → [[wiki/concepts/Agent评测]]
- **成本数字**直接对上 [[wiki/concepts/KV缓存与提示词缓存]] 与 [[wiki/concepts/上下文压缩]]：本篇是这两页第一次拿到「两项优化合用收益不可相加」的实测（见 KV 缓存页）。
- **「评估对象是模型 + Harness 组合体」**与 `Harness学习笔记.md` 的 Harness 工程视角同源；本篇把它落成可操作判据（model swap vs 消融），见 [[wiki/concepts/Agent评测]]。

## 本篇独有、别处没有的

1. **双控（Dual-Control）** —— 让模拟用户也持有一套工具（查状态栏、开关飞行模式、跑测速），于是「Agent 有没有真的读到用户侧的操作结果」变成可验证项。本仓此前所有评估材料里都没有「交互对方」这个概念。
2. **九类错误表 + 首错定位方式**，以及静默失败的两种定位法（事实锚点比对、轨迹前缀二分）—— 明确禁止「搜报错关键字」。
3. **一个根因判错的完整案例**：AndroidWorld T3A 的图片转录失败被原始归因笔记记成「视觉模型缺乏 OCR」，实际是纯文本 Agent 的观察通道里根本没有像素。归因错 → 修复方向错（换模型 vs 补观察通道）。本仓最值钱的一条反面教材。
4. **「两项优化不可相加」的四组实测**：仅稳定前缀省 28.3%、仅压缩历史省 17.5%，合用只省 30% —— 因为压缩同时缩短了可命中缓存的前缀。
5. **内部评估基础设施五组件**（消融 / AB / 双层特性开关 / 提示词快照 / 类型强制隐私）：把「偶尔评估一次」变成「每次决策都带度量」。
6. **Pass@k 的三类举例**：[[wiki/entities/anthropic|Anthropic]] 说的「让 Agent 自主工作一周写一个 C 编译器」「持续探索直到找到重要数学猜想的反例」「反复审查开源软件，发现存在几十年的重大安全漏洞」—— 工程与科研探索要的是预算拉长后出现一条突破轨迹，不是每次都做对。
7. **预算-能力曲线的人机对照**（RE-Bench：2 小时 agent 是人类 4 倍，8 小时人类略超，累计 32 小时人类约 2 倍）—— 短预算领先不能外推成长时间运行能力。

## 待处理

- 裁剪件的 frontmatter 用的是 `source / created / tags: clippings`，不是 §4.7 的 `url / status` 格式，所以 `grep "status: unread"` 扫不到它。raw 不可改写（§2.2），本页不代改，只用 digest 锁内容。
- 9 张图（fig7-1 … fig7-10）是 GitHub 远程 SVG 链接，未落 `raw/assets/`；本页不引用图片，站内也不需要。
- 实验 7-1 … 7-14 依赖的 `chapter7/` 配套代码不在本仓，实验结论只能引数字，不能复跑。这是本页 `status: verified` 的唯一保留意见。

## 证据

- `raw/articles/2026-10-25-AI-Agent书第7章-Agent的评估-GitHub主分支.md`，883 行，`883-996ea3d5`
- 关键小节（文件级 + 标题文本）：§「一条评估任务的解剖：τ²-bench 的 telecom 领域」、§「评估指标：成功的定义」、§「评估环境」、§「评估数据集的设计」、§「自动化评估方法」、§「评估驱动的模型选型」、§「评估结果的统计显著性」、§「Agent 的可观测性」、§「从 Benchmark 报告到系统改进」、§「从外部评估到内部评估：生产级 Agent 的评估基础设施」、§「仿真环境：从评估到后训练的桥梁」

## 相关页面

[[wiki/concepts/Agent评测]]、[[wiki/concepts/失败归因与回归任务]]、[[wiki/concepts/评估环境设计]]、[[wiki/concepts/内部评估基础设施]]、[[wiki/concepts/Agent模型选型]]、[[wiki/synthesis/Agent基准设计对照]]

相邻的已有 source 页：[[wiki/sources/agent-评测方法论]]（本仓自己的评测总览 + badcase 附章）、[[wiki/sources/agent-开发学习笔记]]（§10 评估操作手册）。


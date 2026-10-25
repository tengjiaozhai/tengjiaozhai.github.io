---
type: source
title: "thoughts 簇 · 智能体设计"
source_files: ["thoughts/006_✅为什么要用多智能体架构？.md", "thoughts/007_✅项目中有哪些智能体，各自职责是什么？.md", "thoughts/023_✅主智能体功能介绍与开发.md", "thoughts/029_✅行程管理智能体的功能介绍及开发.md", "thoughts/043_✅行程规划智能体的功能介绍及开发.md", "thoughts/053_✅行程审核智能体的功能介绍及开发.md", "thoughts/062_✅行程预订智能体的功能介绍及开发.md"]
source_type: thought-batch
domain: ai
raw_digest: "n/a"
lines: 1231
captured: 2026-10-19
status: verified
tags: [llmentor, multi-agent, orchestration]
entities: ["wiki/entities/agentscope"]
concepts: ["wiki/concepts/Skill-vs-Tool", "wiki/concepts/Plan-Execute"]
---

# thoughts 簇 · 智能体设计

## 这一簇覆盖什么

九个智能体的职责划分与逐个实现。从「为什么要拆多智能体」（006）到「拆成哪九个、各管什么」（007）到总协调者（023）与五个专业智能体的深入（029 行程 / 043 规划 / 053 审核 / 062 预订）。

边界：这是**具体系统的组织设计**，不是通用的多智能体方法论。可复用的判断散落在各篇里（见下）。

## 七个智能体模型与职责

| # | 智能体 | 定位 | 关键判断 |
|---|---|---|---|
| 023 | MasterAgent | 总协调者（Orchestrator），本身是 ReActAgent 但不干脏活 | 只做路由与调度 |
| 029 | ItineraryManageAgent | 差旅单全生命周期管家 | 收集信息→冲突检测→提交审批→查进度→改计划→取消 |
| 043 | ItineraryPlanAgent | 「搜+算+审+修」闭环的规划专家 | 强模型生成候选 → 确定性引擎组合排序 → 存 Redis → 委托审核 |
| 053 | ItineraryReviewAgent | 独立审核者 | 「生成」与「把关」是两种截然不同的认知任务 |
| 062 | BookingAgent | 真实写操作：出票、订酒店、订火车、取消 | 唯一碰钱和外部状态的智能体 |
| 007 | （全局视图） | 9 个智能体分三层：分析层 / 协调层 / 业务层 + 公共基座 | — |
| 006 | （设计理由） | 为什么要拆：注意力有限，工具太多会稀释 | — |

## 可抽出的原子

- **拆多智能体的根本理由**（006）：不是「架构好看」，是**大模型的注意力是有限的**。一个 Agent 同时挂十几类工具和职责，每一步 reasoning 都在几十个工具、几段互相矛盾的指令里挑选，误选、漏选、来回横跳的概率上升
- **MasterAgent 不干脏活的原则**（023）：总协调者一旦开始直接查政策、订机票，它的上下文就会被业务细节占满，调度能力随之下降
- **生成与把关必须分离**（053）：同一个模型既生成又评审，会偏袒自己的产出 → 独立成篇见 [[wiki/synthesis/Skill-vs-Tool判据]]
- **规划用 Plan-Execute、不是 ReAct**（043）→ [[wiki/concepts/Plan-Execute]]
- **预订是唯一碰外部写状态的地方**（062）→ [[wiki/synthesis/Skill-vs-Tool判据]]

## 与其他笔记的重叠点

- **多智能体 vs 单智能体**：`agent 开发学习笔记.md` §13 讲 Middleware vs Hook vs Tool 的三层职责，与本文的「智能体职责划分」是不同层级的分工
- **Plan-Execute**：043 是 [[wiki/concepts/Plan-Execute]] 的主要实例来源
- **审核子智能体 vs Skill**：053 → [[wiki/synthesis/Skill-vs-Tool判据]]（`thoughts/052` 是这项判断的正面论证）
- **预订的 Skill/Tool 不对称**：062 → [[wiki/synthesis/Skill-vs-Tool判据]]（`thoughts/063` 是正面论证）

## 本篇独有、别处没有的

1. **九个智能体的完整职责表**（007）—— 分析层 / 协调层 / 业务层 + 公共基座的四分法
2. **「注意力稀释」作为拆分的依据**（006）—— 比「单一职责原则」更贴近 LLM 的真实约束
3. **ItineraryPlanAgent 的「搜+算+审+修」四段闭环**（043）—— 本仓最完整的一个复杂 agent 实现记录
4. **ReviewAgent 与 PlanAgent 的模型分级**（053）—— 生成用强模型 + 深度思考，把关用另一套配置

## 证据

- `thoughts/006_✅为什么要用多智能体架构？.md`（77 行）
- `thoughts/007_✅项目中有哪些智能体，各自职责是什么？.md`（170 行）
- `thoughts/023_✅主智能体功能介绍与开发.md`（127 行）
- `thoughts/029_✅行程管理智能体的功能介绍及开发.md`（189 行）
- `thoughts/043_✅行程规划智能体的功能介绍及开发.md`（246 行）
- `thoughts/053_✅行程审核智能体的功能介绍及开发.md`（209 行）
- `thoughts/062_✅行程预订智能体的功能介绍及开发.md`（213 行）

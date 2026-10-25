---
type: source
title: "thoughts 簇 · 路由与智能体协作"
source_files: ["thoughts/009_✅为什么意图识别_问题改写不放在主智能体或者做成Skill？.md", "thoughts/010_✅为什么问题改写_意图识别不用ReAct Agent？.md", "thoughts/019_✅用户意图很明确时，直接路由给子智能体还是主智能体？.md", "thoughts/021_✅多智能体之间的上下文传递方式.md", "thoughts/024_✅我给 Agent 加了哪些关键配置.md", "thoughts/026_✅用了哪几种模型，分别用在哪？.md", "thoughts/027_✅快速路由到上次执行的子智能体.md", "thoughts/028_✅如何避免模型幻觉导致用户id传错？.md", "thoughts/040_✅如何基于回答更好的问题推荐？.md", "thoughts/041_✅为什么要关闭模型的深度思考？.md", "thoughts/060_✅ReviewAgent如何获取到PlanAgent的规划结果？.md", "thoughts/061_✅为什么单独搞一个BookingAgent？.md"]
source_type: thought-batch
domain: ai
raw_digest: "n/a"
lines: 1163
captured: 2026-10-19
status: verified
tags: [llmentor, routing, agent-collaboration, model-selection]
entities: ["wiki/entities/agentscope", "wiki/entities/redis"]
concepts: ["wiki/concepts/意图识别分层"]
---

# thoughts 簇 · 路由与智能体协作

## 这一簇覆盖什么

十二篇围绕「请求怎么找到该干活的智能体、智能体之间怎么传数据」的记录。跨度较大，但都是**协作层的决策**，不是实现细节。

边界：意图识别三层本身的机制在 [[wiki/sources/thoughts-意图识别三层]]，本簇只包含「路由层的归属判断」与「智能体间通信」两块。

## 十二篇的分工

### 路由层的归属（为什么不在主智能体 / 不用 ReAct）

| # | 行数 | 结论 |
|---|---|---|
| 009 | 74 | 意图识别与问题改写由 `AgentPipelineService` 统一编排，**不放进 MasterAgent，也不做成 Skill** |
| 010 | 61 | 用 LLM 做理解，但**不用 ReAct Agent** 包起来（不需要工具、不需要多轮探索） |
| 019 | 93 | 意图明确时是否直跳子智能体：三个条件（单意图 + 高置信 + 在直跳白名单） |
| 027 | 163 | 快速路由到上次执行的子智能体 —— 同一子智能体连续追问时省掉重新编排 |

### 智能体间的数据传递

| # | 行数 | 结论 |
|---|---|---|
| 021 | 86 | 参数传递不是单一手段，按场景选 |
| 060 | 73 | ReviewAgent 与 PlanAgent 之间**不走参数，走 Redis 中转** —— Plan 写、Review 读同一个 key |
| 061 | 61 | 为什么单独搞一个 BookingAgent，而不是并进 PlanAgent |

### 模型与配置

| # | 行数 | 结论 |
|---|---|---|
| 024 | 194 | MasterAgent 的完整配置逐项拆解 |
| 026 | 50 | 用了哪几种模型、分别用在哪（`fastModel` / 强模型分级） |
| 041 | 135 | **为什么要关闭模型的深度思考** —— ReAct 循环本身已把思考拆成多轮显式调用 |
| 028 | 50 | 如何避免模型幻觉导致 userId 传错 |
| 040 | 123 | 如何基于回答做更好的问题推荐（四条标准） |

## 可抽出的原子

- **路由层不做成 Skill、不放进主智能体、不用 ReAct** → [[wiki/concepts/意图识别分层]] 的「取舍与边界」
- **关闭深度思考的理由**（041）：ReAct 的 Reason→Act→Observe 已经把思考拆成多轮显式 LLM 调用，每一轮模型看到完整 history，不需要在单轮里做长链推理 → 待抽：ReAct 与 thinking 的预算冲突
- **Redis 中转替代参数传递**（060）：跨智能体传大对象时不走参数，写 Redis 传 key → [[wiki/concepts/Skill-vs-Tool]] 的引用链设计、[[wiki/entities/redis]]
- **智能体拆分的边界**（061）：BookingAgent 单独存在是因为它碰外部写状态
- **模型分级**（026）：`fastModel` 与强模型分工
- **幻觉导致参数传错**（028）：本仓唯一的「模型输出直接当参数用」的风险记录
- **问题推荐的四条标准**（040）：贴合当前阶段 / 能一键执行 / 有信息增量 / 不重复历史

## 与其他笔记的重叠点

- **意图识别三层的完整机制** → [[wiki/sources/thoughts-意图识别三层]]
- **Plan-Execute**：`thoughts/042`/`043` 是 [[wiki/concepts/Plan-Execute]] 的主要来源，本簇 060/061 是它的协作细节
- **工具熔断与工具缓存**：`thoughts/067`/`039` 是独立 A 层页
- **MasterAgent 配置**：024 与 `agent 开发学习笔记.md` §13 的 Middleware vs Hook vs Tool 有重叠

## 本篇独有、别处没有的

1. **三条「不做什么」的完整论证**（009 / 010 / 019）—— 比「做了什么」更有价值，本仓唯一
2. **Redis 中转传递方案的具体实现**（060）—— 含「如果不考虑集群部署可以走参数」的反向说明
3. **关闭深度思考的完整理由**（041）—— 这是本仓最反直觉的一条决策，很多人默认「思考越久越好」
4. **模型分级配置的代码**（026）—— `DashScopeChatModel` 的 `fastModel` Bean
5. **幻觉导致 userId 传错的防护**（028）—— 具体到「不要信任模型输出的 ID」
6. **问题推荐的四条标准**（040）—— 可复用于任何对话式产品

## 证据

- `thoughts/009_✅为什么意图识别_问题改写不放在主智能体或者做成Skill？.md`（74 行）
- `thoughts/010_✅为什么问题改写_意图识别不用ReAct Agent？.md`（61 行）
- `thoughts/019_✅用户意图很明确时，直接路由给子智能体还是主智能体？.md`（93 行）
- `thoughts/021_✅多智能体之间的上下文传递方式.md`（86 行）
- `thoughts/024_✅我给 Agent 加了哪些关键配置.md`（194 行）
- `thoughts/026_✅用了哪几种模型，分别用在哪？.md`（50 行）
- `thoughts/027_✅快速路由到上次执行的子智能体.md`（163 行）
- `thoughts/028_✅如何避免模型幻觉导致用户id传错？.md`（50 行）
- `thoughts/040_✅如何基于回答更好的问题推荐？.md`（123 行）
- `thoughts/041_✅为什么要关闭模型的深度思考？.md`（135 行）
- `thoughts/060_✅ReviewAgent如何获取到PlanAgent的规划结果？.md`（73 行）
- `thoughts/061_✅为什么单独搞一个BookingAgent？.md`（61 行）

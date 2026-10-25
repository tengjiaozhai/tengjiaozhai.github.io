---
type: source
title: "thoughts/042 为什么行程规划要用 Plan-and-Execute"
source_file: "thoughts/042_✅为什么行程规划智能体要用Plan-and-Exucute？.md"
source_type: thought-batch
domain: ai
raw_digest: "203-25354297"
lines: 203
captured: 2026-10-19
status: verified
tags: [llmentor, plan-execute, react]
entities: ["wiki/entities/agentscope"]
concepts: ["wiki/concepts/Plan-Execute"]
---

# thoughts/042 为什么行程规划要用 Plan-and-Execute

## 这一篇覆盖什么

帮员工规划「上海到杭州，周五去周日回」，听起来简单，但拆开来看 Agent 至少要完成：查已审批差旅单拿约束、召回用户历史偏好、查差旅政策拿报销标准、搜去程航班/高铁、搜返程、搜酒店、对候选做组合与排序、审核合规……这些步骤**有依赖关系、有并行空间、有失败重试**。

本篇对比三种模式（纯 ReAct / 纯规划 / Plan-and-Execute），说明为什么选第三种。

## 七个部分

| 部分 | 内容 |
|---|---|
| 纯 ReAct（Reasoning + Acting） | 走一步想一步，计划在模型脑内 |
| 纯规划 | 一次性出完整计划，不中途调整 |
| Plan-and-Execute（gogo-agent 的选择） | 集中规划 + 确定性执行 + 批判反馈 |
| gogo-agent 怎么实现的 Plan-and-Execute | `PlanTask(id, instruction, order)` |
| `PlanAwareThinkingHook` | 按阶段开关深度思考 |
| `ItineraryPlannerTool`：确定性计算引擎 | 组合枚举与排序交给 Java |
| 审核-修复闭环：计划的动态修订 | Critique → feedback → 重新规划 |

## 可抽出的原子

- **三种模式的对比与选择理由** → [[wiki/concepts/Plan-Execute]]
- **`PlanTask(id, instruction, order)` 的结构** —— `order` 字段支撑依赖分组，同 order 并发、跨 order 串行
- **`PlanAwareThinkingHook`** —— 按 Plan/Execute/Critique 阶段开关深度思考。**Execute 阶段关思考快速跑，推理预算集中在 Plan 和 Critique**。这是本仓独有的一条优化
- **审核-修复闭环** —— Critique 不直接改方案，只输出 `passed` / `feedback`；「修改」发生在下一轮 Plan

## 与其他笔记的重叠点

- **方案计算必须落 Tool** → [[wiki/sources/thoughts-方案设计用工具]]（044 的五个原因）
- **闭环的落地** → [[wiki/sources/thoughts-执行闭环]]（086）
- **审核子智能体** → [[wiki/sources/thoughts-子智能体vs-skill]]（052）
- **关闭深度思考的通用理由** → [[wiki/sources/thoughts-路由与智能体协作]]（041）。与本篇的 `PlanAwareThinkingHook` 是同一决策的两层：041 讲为什么整体关，本篇讲为什么分阶段开关

## 本篇独有、别处没有的

1. **三种模式的完整对比** —— 不只说 Plan-Execute 好，也说了纯 ReAct 和纯规划各自的适用场景
2. **`PlanAwareThinkingHook` 的分阶段开关** —— 本仓唯一的「按执行阶段调推理预算」设计
3. **`ItineraryPlannerTool` 作为确定性计算引擎的定位** —— 与 LLM 的职责边界
4. **Critique 的注入方式** —— feedback 以【Critique Feedback】注入上下文，规划提示词硬约束「必须解决反馈指出的不足、不许重复失败尝试」

## 证据

- `thoughts/042_✅为什么行程规划智能体要用Plan-and-Exucute？.md`（202 行）
- 注：标题有拼写错误 `Exucute`，文件名已冻结

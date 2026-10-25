---
type: concept
title: "Plan-Execute"
domain: ai
aliases: [plan-execute, Plan-and-Execute, 计划执行模式]
tags: [agent, planning, react]
sources: ["wiki/sources/agent-开发学习笔记", "wiki/sources/thoughts-plan-and-execute"]
entities: ["wiki/entities/agentscope"]
related: ["wiki/concepts/Skill-vs-Tool"]
confidence: high
as_of: 2026-10-19
---

# Plan-Execute

## 一句话定义

**ReAct**：走一步想一步，计划活在模型脑内消息流里，代码拿不到。**Plan-Execute**：先把任务一次性拆成结构化任务清单（`PlanTask`），按依赖顺序执行，执行完统一批判，不满意把反馈带回下一轮重新规划。

## 我目前的判断

两者不是互斥的，是**嵌套**的 —— Plan-Execute 的执行单元往往还是 ReAct。选择哪一个，看任务是否需要「计划可被外部检查和干预」。

五个本质区别：

| 维度 | ReAct | Plan-Execute |
|---|---|---|
| 决策时机 | 每步现场决策 | 开头集中规划，执行是确定性调度 |
| 计划可见性 | 隐式，在消息流里，代码拿不到 | 显式结构（PlanTask 清单），可检查/排序/中断恢复 |
| 并行能力 | 天然串行（一步一工具） | order 字段支持依赖分组，同组并发（Semaphore 限流） |
| 错误闭环 | 模型看 Observation 后自发纠偏，无强制机制 | Critique 显式评估 → feedback 驱动下轮规划 |
| 思考预算 | 每一步都花推理 | 集中在 Plan 和 Critique，Execute 关思考快速跑 |

## 关键机制

```text
用户问题
   ↓ ① Plan 集中拆解任务单
   PlanTask(id, instruction, order)
   ↓ ② Execute 按 order 依赖执行
     同 order 并发，跨 order 串行
   ↓ ③ Critique 拿结果反思（执行后才批判）
   passed? ──否→ feedback 回 ① 重新规划
   ↓ 通过
   ④ Summarize 总结
```

**Critique 的位置是这套结构的关键**：它输入「原始问题 + 计划 + 执行结果」，没执行就没法批判，所以循环是 `Plan → Execute → Critique → (不通过) Plan' → …`。

批判不直接改方案，只输出 `passed` / `feedback`；「修改」发生在下一轮 Plan —— feedback 以【Critique Feedback】注入上下文，规划提示词硬约束「必须解决反馈指出的不足、不许重复失败尝试」。

## 我的实例

行程规划智能体（`thoughts/042` / `thoughts/043`）用 Plan-Execute 而非 ReAct 的理由：

- 方案计算需要枚举 60 种组合并精确比较，中间状态必须累积 → 必须是代码（见 [[wiki/concepts/Skill-vs-Tool]] 的三条原则）
- 方案要能给用户看、能被人工确认、能断点续传
- 执行阶段关掉深度思考快速跑，推理预算集中在 Plan 和 Critique

`ItineraryPlannerTool` 算完只返回「已生成 N 个候选方案」（只报数），方案本身存 Redis，由 `ItineraryReviewTool` 取回评估 —— 这正是 Plan-Execute 的 Execute 阶段与引用链设计的结合点。

## 取舍与边界

**Plan-Execute 的代价是规划质量决定上限**。Plan 阶段拆错了，后面执行再精确也是错的方向。Critique 能纠正一轮，但每轮纠正都要重新 Execute，成本翻倍。

**单步任务用 Plan-Execute 是过度设计**：一个「查政策」的请求拆成 Plan/Execute/Critique 三步，延迟和 token 都涨，没有收益。

**Critique 可能陷入循环**：如果 feedback 一直无法被满足（比如需求本身矛盾），会无限重规划。本仓实现的退出条件（最大轮数）未记录。

**失效条件**：
- 任务边界不清、需要边做边发现（探索型任务）→ ReAct 更合适
- 外部状态在 Plan 阶段之后变化（如库存、价格）→ Plan 会基于过期信息执行，需要每步重新校验

## 待澄清

- `thoughts/042_✅为什么行程规划智能体要用Plan-and-Exucute？.md` 的标题有拼写错误（`Plan-and-Exucute`），文件名已冻结，本页沿用正确拼写。
- Critique 的最大重规划轮数与超时策略未在本仓记录。

## 证据

- `agent 开发学习笔记.md` §「5. Plan-Execute 模式：是什么、与 ReAct 的区别（以 gogo / dodo 实现为例）」
- `thoughts/042_✅为什么行程规划智能体要用Plan-and-Exucute？.md`（203 行）
- `thoughts/043_✅行程规划智能体的功能介绍及开发.md` §「Plan-and-Execute」
- `thoughts/086_✅Harness工程——行程规划的执行闭环.md`
- `thoughts/010_✅为什么问题改写_意图识别不用ReAct Agent？.md`（反例：另一处选择不用 ReAct 的理由）

## 相关页面

已建档的 source 页：[[wiki/sources/agent-开发学习笔记]]、[[wiki/sources/thoughts-plan-and-execute]]

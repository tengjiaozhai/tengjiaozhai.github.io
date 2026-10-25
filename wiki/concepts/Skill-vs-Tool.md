---
type: concept
title: "Skill vs Tool"
domain: ai
aliases: [skill-vs-tool, Skill 与 Tool 的分工]
tags: [agent, skill, tool, design]
sources: ["wiki/sources/agent-开发学习笔记", "wiki/sources/thoughts-方案设计用工具", "wiki/sources/thoughts-下单用skill取消用工具"]
entities: ["wiki/entities/agentscope"]
related: ["wiki/concepts/上下文压缩"]
confidence: high
as_of: 2026-10-19
---

# Skill vs Tool

## 一句话定义

**Skill 是「教模型做事」，Tool 是「替模型做事」。**

Skill 把操作手册塞进上下文，活是模型干的（花 token、不稳定、过程模型全知道）；Tool 让模型只下单传参，活是代码干的（零推理消耗、精确稳定、过程不可见）。

## 我目前的判断

分工判据只有一条：

```text
难点是「理解」（人话 → 命令参数映射）  → Skill
难点是「计算」（批量、精确、全局算法）  → Tool
```

口诀：能一句话说清怎么干 → Skill；需要算得准、批量算、结果要瘦身 → Tool。

本质是**把「智能」和「计算」分离**：LLM 只当决策者（要不要订、合不合规、偏好哪个），代码当计算器（多少钱、怎么排、边界判断）。凡是「会算但没必要会想」的下沉，「会想但没有标准答案」的留给模型。

## 关键机制

方案计算不能交给 Skill（让 LLM 心算）的三条原则，每条对应一个失败场景：

| 失败场景 | 原则 |
|---|---|
| 60 种组合枚举、399.50 ≤ 400 精确比较 | **确定性判断必须代码**。「对就是对」的事没有概率余地；枚举无智能含量但有数量 |
| min-max 归一化是「两遍扫描」，要先记住全部数值再回头打分 | **需要中间状态累积的算法必须代码**。Java 有变量和集合，LLM 只有注意力，长上下文中间位置的数值会被 Lost in the Middle 击穿 |
| ~19000 token vs ~200 token、结果落存储只传引用 | **上下文是稀缺资源，进出 LLM 的信息要瘦身**。计算过程不必被感知，结果只传摘要/引用 |

第三条原则直接推出**引用链设计**：

```text
ItineraryPlannerTool:  算完 → itineraryPlanStore.save(userId, origin, dest, date, json)
                       返回模型：「已生成 N 个候选方案」（只报数，不报内容）
ItineraryReviewTool:   load(...) → 从 Redis 取方案 → 评估
两个工具不共享会话对象（可能是不同子 Agent），靠 Redis 接力
```

## 我的实例

同一套系统里三处判据一致：

- **数据收集用 Skill**（`tuniu-cli`）：难点是把人话映射成命令参数，属于理解，且过程需要模型看
- **方案计算用 Tool**（`ItineraryPlannerTool`）：难点是枚举 + 精确比较 + 两遍扫描 + 结果瘦身
- **行程审核用子智能体**（不是 Skill 也不是 Tool）：难在多样度评估 + 需要独立上下文

**下单用 Skill、取消用 Tool**（`thoughts/063`）：下单是开放式表单填写（难在理解，字段语义要人来判断），取消是幂等的单动作（难在不出错，参数固定）。同一个业务面的两个方向，判据给出相反答案 —— 说明判据确实在起作用，不是事后合理化。

## 取舍与边界

**Skill 的代价容易被低估**：它占上下文（一篇 Skill 手册几百到几千 token，且通常在 system prompt 里，会破坏前缀缓存，见 [[wiki/concepts/KV缓存与提示词缓存]]）、过程不可控、每次执行结果可能不同。当 Skill 数量上到十几个，上下文预算会先崩。

**Tool 的代价在耦合**：每个 Tool 需要单独的入参 schema、错误处理、幂等设计（见 [[wiki/concepts/幂等与写入恢复]]）。工具接口改一次，所有引用它的 Agent 提示词都要跟着改。

**判据失效的场景**：
- 任务既需要理解又需要精确计算（如「按我的偏好选最合适的方案」）→ 拆成两步：Skill 收集偏好、Tool 计算，不要试图塞进一个
- 外部系统只有 CLI 没有 API 时，「计算」也只能通过 Skill 让模型拼命令行 → 此时应包一层 MCP 或工具，而不是接受 Skill 的不确定性

## 待澄清

- Skill 数量增长后如何折叠正文以省上下文，见 `thoughts/084_✅上下文工程——Skill正文折叠`，该文结论未与本页合并。
- 「什么时候用 Skill，什么时候用 SubAgent」是第三种选项，本页只覆盖 Skill/Tool 二元判据。

## 证据

- `agent 开发学习笔记.md` §「6. Skill vs Tool：为什么数据收集用 Skill、方案计算却用 Tool」
- `thoughts/044_✅为什么行程方案设计不用Skill要用工具？.md`
- `thoughts/063_✅预定时，为什么下单用skill，取消用工具？.md`
- `thoughts/052_✅为什么行程审核不用Skill要用子智能体？.md`
- `thoughts/065_✅什么时候用Skill，什么时候用SubAgent.md`
- `output/skill-vs-tool.html`

## 相关页面

已建档的 source 页：[[wiki/sources/agent-开发学习笔记]]、[[wiki/sources/thoughts-方案设计用工具]]、[[wiki/sources/thoughts-下单用skill取消用工具]]

- 插件形态下的分工判据（Consumer 角色怎么选）→ [[wiki/synthesis/dsh-插件设计模式]]

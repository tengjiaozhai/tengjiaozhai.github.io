---
type: synthesis
kind: decision
title: "Skill vs Tool 判据"
date: 2026-10-19
status: settled
domain: ai
tags: [agent, tool-design, skill, decision]
sources: ["wiki/sources/agent-开发学习笔记", "wiki/sources/thoughts-方案设计用工具", "wiki/sources/thoughts-下单用skill取消用工具", "wiki/sources/thoughts-mcp接入"]
entities: ["wiki/entities/agentscope", "wiki/entities/mcp-and-skill"]
concepts: ["wiki/concepts/Skill-vs-Tool", "wiki/concepts/Plan-Execute", "wiki/concepts/幂等与写入恢复"]
related: ["wiki/synthesis/四套上下文压缩方案对比"]
confidence: high
as_of: 2026-10-19
---

# Skill vs Tool 判据

## 问题

同一个业务域、同一套外部 CLI，为什么有的环节放手给模型（Skill），有的收回代码手里（Tool）？四处实例（行程数据收集、行程方案计算、下单、取消）各自的选择看起来不一致，需要一个统一判据。

## 我的结论

判据不是「哪个更好用」，而是**三个问题**：

1. **操作错了会怎样？**（失败代价决定控制权归属）
2. **需要精确编排吗？**（组合爆炸、状态机、事务边界）
3. **形态是「无中生有」还是「有据可依」？**

答完这三个，选择自然落定。本仓的四处实例都验证了这套判据。

## 三个判据

### 判据一：失败代价

**错了会多扣钱、多下单、造成不可逆后果 → Tool（代码掌控）**
**错了只是重跑一次、或者本来就需要人工确认 → Skill（模型自主）**

`thoughts/063` 的下单/取消不对称就是这个判据的教科书案例：

| | 下单 | 取消 |
|---|---|---|
| 失败代价 | 重复下单 = 多扣钱，不可逆 | 重复取消 = 幂等，无害 |
| 实现形态 | 无 Java `@Tool`，LLM 读 `tuniu-cli` 技能文档自己拼 `tuniu call flight saveOrder -a '{...}'` | 有正经的 Java `@Tool` `cancel_booking`（`BookingWriteTools`） |
| 落库方式 | `BookingPersistenceHook` 在 `PostActingEvent` 阶段被动旁听 | Java 内完成校验、调平台、改状态、回话 |
| 控制权 | Skill + LLM + Hook | 代码 |

反直觉的地方：**下单比取消风险更高，却给了模型更多自由**。理由是下单在数据层面是「无中生有」—— 先跑命令、平台返回一坨不可预测的响应，再从里面抠出订单号落成新记录。这种形态天然适合被动 Hook 旁观，硬用 Java 编排反而要预判所有响应变体。

而取消是「有据可依」的状态机迁移，Java 能精确编排每一步。

### 判据二：组合爆炸

**计算量随输入规模爆炸 → Tool（代码毫秒级、零 token）**
**按文档拼参数 → Skill（LLM 擅长语义到命令的映射）**

`thoughts/044` 的行程方案设计：

```text
5 个去程航班 × 3 个酒店 × 4 个返程航班 = 60 种组合
每种组合要算总价、总耗时、政策合规、偏好分，再做全局归一化排序
若让 LLM 做：60 × 200 token ≈ 12000 token 纯计算，且极易出错
Java @Tool 执行：毫秒级，零 token
```

行程规划天然分两段，正好对应两种能力：**数据收集用 Skill**（调外部 API 本质是按文档拼命令，LLM 擅长「搜索上海到杭州的航班」→ 正确 CLI 命令），**方案计算用 Tool**（组合爆炸）。

### 判据三：状态与依赖

**需要跨步骤累积中间状态、支持断点恢复 → Tool + Plan-Execute**
**单轮完成、无状态 → Skill**

行程方案要能给用户看、能被人工确认、能断点续传 → Plan-Execute（见 [[wiki/concepts/Plan-Execute]]），Execute 阶段的方案计算必须落在 Tool 里。

## 对比：四处实例为什么不同

| 场景 | 选择 | 命中的判据 |
|---|---|---|
| 行程数据收集（`thoughts/047`） | Skill | 按文档拼参数，单轮无状态 |
| 行程方案计算（`thoughts/044`） | Tool | 组合爆炸（60 种）+ 需累积状态 |
| 下单（`thoughts/063`） | Skill + Hook | 无中生有，响应不可预测 |
| 取消（`thoughts/063`） | Tool | 有据可依，幂等状态机 |
| 意图识别（`thoughts/009`） | 都不用 | 在路由层，早于执行体存在 |

最后一行值得单独记：**意图识别既不做成 Skill 也不做成 Tool**，因为它必须在主智能体之前完成。做成 Skill 会让主智能体先消耗一轮上下文和工具预算才知道「这问题根本不该进来」。

## 引用链设计（Tool 之间的协作）

Tool 之间不共享会话对象时，用 Redis 存中间结果 + 只回编号：

```text
ItineraryPlannerTool 算完 → 方案 JSON 存 Redis，只返回「已生成 N 个候选方案」（只报数）
ItineraryReviewTool  评估 → 从 Redis 取回完整方案
```

`thoughts/044` 里这条设计的关键理由：**只报数不返回全文**，避免 60 个方案的完整 JSON 灌进上下文（那正是判据二要省掉的 token）。

## 一条容易被忽略的补充

Skill 不是「不用写代码」。三家外部 Skill（途牛 `tuniu-cli`、航班管家、Rolling Go）的接入记录显示，Skill 往往需要先**改造 CLI 使其具备生产可用性**（`thoughts/058`）—— 错误处理、超时、输出格式。这部分工作量不比写 Tool 少，省下的是「不用预判所有调用序列」。

## 与 MCP 的关系

MCP 是把外部工具协议化，Skill 是让模型读手册干活。两者不是 Skill vs Tool 的同类项，见 [[wiki/entities/mcp-and-skill]]。判据可以复用：**能拿到稳定 MCP 服务器 → MCP；需要复杂多步、依赖成熟 CLI → Skill**。

## 未定论的分歧

- **判据二（组合爆炸）的临界点在哪里**：本仓只有 60 种组合（12000 token）这一个数据点。3 种组合、10 种组合该不该用 Tool，无结论。
- **`thoughts/063` 的下单选择是否最优**：Skill + Hook 依赖「平台响应不可预测」这个前提。如果 `tuniu-cli` 后续稳定了响应格式，把它收回成 Tool 可能更安全。本仓未记录这个后续判断。

## 证据

- `agent 开发学习笔记.md` §「6. Skill vs Tool：边界在哪」
- `thoughts/044_✅为什么行程方案设计不用Skill要用工具？.md`（203 行，组合爆炸的完整测算）
- `thoughts/063_✅预定时，为什么下单用skill，取消用工具？.md`（含 `BookingPersistenceHook` 代码）
- `thoughts/047_✅天气查询工具_MCP的接入.md`
- `thoughts/009_✅为什么意图识别_问题改写不放在主智能体或者做成Skill？.md`
- `thoughts/058_✅改造外部Skill使其具备生产环境可用性.md`
- `output/skill-vs-tool.html`（图解）

## 相关页面

已建档的 source 页：[[wiki/sources/agent-开发学习笔记]]、[[wiki/sources/thoughts-方案设计用工具]]、[[wiki/sources/thoughts-下单用skill取消用工具]]、[[wiki/sources/thoughts-mcp接入]]

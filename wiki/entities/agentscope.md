---
type: entity
title: "AgentScope"
entity_kind: framework
domain: ai
aliases: [agentscope, agentscope-java, Agent Scope]
version_of_interest: "1.x / 2.0"
tags: [agent-framework, java, python]
sources: ["wiki/sources/harness学习笔记", "wiki/sources/agent-开发学习笔记", "wiki/sources/py学习笔记"]
concepts: ["wiki/concepts/会话并发互斥", "wiki/concepts/工具熔断", "wiki/concepts/意图识别分层", "wiki/concepts/SSE流式推送", "wiki/concepts/幂等与写入恢复"]
---

# AgentScope

## 是什么 / 在我的体系里的位置

`agentscope-ai/agentscope-java`（1.x）与 AgentScope Python，两套实现。本仓的 `gogo-agent`（LLMentor / 差旅助手）与 `letter-auto`（承认书智能检测）都基于它。两者运行模型相反：前者 agent 主导，后者编排收回 Python → 见 [[wiki/entities/letter-auto]]

1.x 的关键扩展是 `agentscope-extensions-autocontext-memory`（上下文压缩）；2.0 重构为四正交策略。

## 已知问题与判断

- **1.x 的六层压缩已被 2.0 的四正交策略取代** → 见 [[wiki/concepts/上下文压缩]]
  · 前提：1.x 走 `AutoContextMemory` 扩展 · 2.0 已重构 · 状态：结论已更新，读旧文章时要注意版本
- **`ToolkitConfig.parallel(true)` 只管工具调度层并发，不管工具内部计算** → 见 [[wiki/concepts/工具熔断]]
  · 当前只有 PlanAgent / BookingAgent 开启（工具最多、外部依赖最重）
- **工具调用的异常链路是「异步生成器 + 队列」，不是同步 return** → 见 [[wiki/concepts/SSE流式推送]]
  · `yield` 负责事件流、`raise` 负责异常流、`asyncio.Queue` 负责中间解耦
  · 关键陷阱：`yield tool_response(SUCCESS)` 放在异常之前，会把失败误判为成功
- **向量层默认 `QdrantStore(location=":memory:")`**，Redis 是硬依赖 → 见 [[wiki/concepts/向量库选型]]
- **会话互斥需要自己做，框架不管** → 见 [[wiki/concepts/会话并发互斥]]
- **GoGo Python 的子 Agent 实现存在，不等于本轮工具已经开放** → 见 [[wiki/concepts/意图识别分层|意图识别分层]]；确认提交曾被背景酒店关键词抢路由，应用层补全对象、约束动作后才开放管理工具。依据：[[wiki/sources/agent-开发学习笔记|Agent 开发学习笔记]] §18。
- **GoGo 的委派恢复、确认凭据和聊天持久化必须分别判定** → 见 [[wiki/concepts/幂等与写入恢复|幂等与写入恢复]] 与 [[wiki/concepts/SSE流式推送|SSE流式推送]]。旧失败曾挡住成功重试的状态保存；现用显式 retry_of、同任务最终结果、同事务提交和 message_id 确认收敛。属于应用层修复，不是 AgentScope 默认能力；原调试会话仍未复验。依据：[[wiki/sources/agent-开发学习笔记|Agent 开发学习笔记]] §19。

## 关键配置与用法

```java
// 工具并行（只有需要的地方开）
Toolkit toolkit = new Toolkit(ToolkitConfig.builder().parallel(true).build());

// 工具超时与重试
TOOL_TIMEOUT_MINUTES = 1
TOOL_MAX_ATTEMPTS = 3
TOOL_INITIAL_BACKOFF_SECONDS = 3
```

`RedisStorage` 存会话、凭据、agent 状态。`ReActAgent` 是默认的执行体，`PlanNotebook` 支撑 Plan-Execute。

## 相关实体 / 相关概念

[[wiki/entities/pi]]、[[wiki/entities/vector-db]]、[[wiki/entities/redis]]

## 时间线

- **1.x**：`AutoContextMemory` 六层渐进式压缩；ReAct 为唯一执行模型
- **2.0**：四正交上下文策略；压缩从「六层递进」改为「正交维度组合」
- 2026-10-19：本仓记录以 1.x 实现为主，2.0 只记录了演进描述
- 2026-10-24：归档 GoGo Python 2.x 的路由误判与令牌状态丢失复盘；隔离测试与单次真实 GoGo／固定 Manage 协议检查已完成，不等于原部署或真实原会话已验收。

## 相关页面

已建档的 source 页：[[wiki/sources/harness学习笔记]]、[[wiki/sources/agent-开发学习笔记]]、[[wiki/sources/py学习笔记]]

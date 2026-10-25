---
type: source
title: "thoughts/092 集群架构下的打断与恢复"
source_file: "thoughts/092_✅集群架构下的Agent打断与恢复.md"
source_type: thought-batch
domain: ai
raw_digest: "92-823452e6"
lines: 92
captured: 2026-10-19
status: verified
tags: [llmentor, cluster, interrupt, pubsub]
entities: ["wiki/entities/redis"]
concepts: ["wiki/concepts/会话并发互斥"]
---

# thoughts/092 集群架构下的打断与恢复

## 这一篇覆盖什么

单机时代，打断和恢复都很简单：一个内存变量标记「停」，一个内存对象存「待恢复状态」。上多节点集群后，两个难题立刻浮现：

- **难题一：打断请求和运行中的 Agent 可能不在同一个节点。** 用户点「停止」，请求经负载均衡打到节点 B，可 Agent 正跑在节点 A。节点 B 的内存里根本没有这个 Agent 实例，怎么停？
- **难题二：恢复请求可能落到任意节点，甚至发生在重启之后。** Agent 问了用户一个问题挂起（HITL），用户几分钟后回答，`/respond` 请求可能落到节点 C，而挂起状态原本在节点 A 的内存里；如果期间集群滚动重启，节点 A 的内存也没了。

## 三层分工

```text
运行时协调  → Redis Pub/Sub 广播
持久状态    → MySQL 共享
SSE 流      → 刻意保持节点本地、与执行同节点
```

最后一条是关键取舍：**SSE 不做跨节点转发**。因为 SSE 连接是和某个具体 HTTP 请求绑定的，跨节点转发反而引入新的失败点。

## 打断的完整链路

```text
POST /api/chat/{sessionId}/interrupt → 节点 B
  → ChatAgentExecutor.interrupt(sessionId)
     ① 先试本地 interruptLocal(sessionId)
     ② 本地未命中 → Redis 广播 agent:interrupt 频道
     ③ 清理 HITL 挂起状态（agentSessionManager.remove + pendingToolSessionStore.clear）
     ④ 推 SSE 告诉前端已停止
```

`AgentExecutionRegistry` 是每个节点独立维护的本地注册表，`Map<sessionId, Set<Agent>>`。**用 Set 是因为 MasterAgent 会通过 `SubAgentTool` 嵌套调子智能体，同一 session 同时可能有多个 Agent 在跑。**

## 可抽出的原子

- **本地优先 + 广播兜底** —— 本地能停就本地停（快），停不了就全集群广播，让真正持有 Agent 的节点去停。没有这个 Agent 的节点收到消息后 `interruptLocal` 返回 false，什么也不做
- **`Set<Agent>` 而非单个 Agent** —— 子智能体嵌套导致同 session 多实例
- **打断后的记忆补偿** —— 优雅中断跳过 `PostCallEvent`，所以 `interruptLocal` 里紧跟着调 `persistInterruptedMemory`，手动把当前 memory 写进 MySQL Session，避免被打断那一轮的用户输入丢失
- **中断恢复消息的中文化** —— 框架优雅中断返回英文恢复消息，`AgentPipelineService.isInterruptRecovery` 识别它（或 `GenerateReason.INTERRUPTED`）后短路整个 pipeline，返回中文的「已停止生成。请告诉我接下来有什么可以帮您的？」

## 与其他笔记的重叠点

- **完整实现** → `agent 开发学习笔记.md` §11–12（含 Redis 锁、本地 `_tasks` 字典、看门狗续期）→ [[wiki/concepts/会话并发互斥]]
- **本篇与 §11–12 的差异**：本篇讲**打断**（用户主动停），§11–12 讲**并发互斥**（防两个 run 同时跑）。两者都用 Redis + 本地注册表，但目的不同
- **Poison Pill**：`PY学习笔记.md` 的毒丸是另一种优雅停止机制 → [[wiki/concepts/SSE流式推送]]
- **HITL**：`thoughts/097` 是 17 行草稿，无内容

## 本篇独有、别处没有的

1. **三大类的明确分工**（Redis 广播 / MySQL 共享 / SSE 本地）
2. **`AgentExecutionRegistry` 的 `Set<Agent>` 设计** —— 子智能体嵌套导致的必要复杂度
3. **打断后的记忆补偿** —— 优雅中断跳过 `PostCallEvent` 这个陷阱，以及补偿方案
4. **中断恢复消息的中文化处理** —— 框架返回英文，应用层短路改写
5. **难题二的完整分析** —— 恢复请求落到任意节点 + 滚动重启

## 证据

- `thoughts/092_✅集群架构下的Agent打断与恢复.md`（91 行，含完整 Java 代码）

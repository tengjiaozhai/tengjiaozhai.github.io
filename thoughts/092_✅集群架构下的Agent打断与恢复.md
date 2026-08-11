---
title: ✅集群架构下的Agent打断与恢复
date: 2026-08-07
desc: 单机时代，打断和恢复都很简单：一个内存变量标记"停"，一个内存对象存"待恢复状态"。但一旦上多节点集群，两个难题立刻浮现： 难题一：打断请求和运行中的 Agent 可能不在同一个节点。 用户点"停止"，请求经负载均衡打到节点 B，可 Age
category: AI / Agent
tags: ["LLMentor", "集群部署"]
---

# ✅集群架构下的Agent打断与恢复

> 来源: https://thoughts.aliyun.com/workspaces/6963289eb0fc2e001bb052eb/docs/6a5a08c6c71a8900017abda8

单机时代，打断和恢复都很简单：一个内存变量标记"停"，一个内存对象存"待恢复状态"。但一旦上多节点集群，两个难题立刻浮现：
**难题一：打断请求和运行中的 Agent 可能不在同一个节点。** 用户点"停止"，请求经负载均衡打到节点 B，可 Agent 正跑在节点 A 上。节点 B 的内存里根本没有这个 Agent 实例，怎么停？
**难题二：恢复请求可能落到任意节点，甚至发生在重启之后。** Agent 问了用户一个问题挂起（HITL），用户几分钟后回答，这个 /respond 请求可能落到节点 C，而挂起状态原本在节点 A 的内存里；如果期间集群滚动重启，节点 A 的内存也没了。怎么恢复？
gogo-agent 的答案是一套明确的分工：**运行时协调用 Redis Pub/Sub 广播，持久状态用 MySQL 共享，SSE 流则刻意保持节点本地、与执行同节点** 。下面拆开讲。


### 打断入口


用户在AI对话过程中点停止，POST /api/chat/{sessionId}/interrupt 打到某个节点（记作节点 B），进 ChatAgentExecutor.interrupt(sessionId)。


### 本地优先，未命中则广播


打断的核心编排在 ChatAgentExecutor.interrupt：

```
public boolean interrupt(String sessionId) { // ① 先试本地——Agent 就在本节点，直接优雅中断 boolean local = executionRegistry.interruptLocal(sessionId); // ② 本地没命中——可能跑在别的节点，Redis 广播出去 if (!local) { interruptBroadcast.broadcastInterrupt(sessionId); } // ③ 清理 HITL 挂起状态 agentSessionManager.remove(sessionId); pendingToolSessionStore.clear(sessionId); // ④ 推 SSE 告诉前端已停止 sseNotifier.sendInterrupted(emitter); return local;}
Plain Text

```



AgentExecutionRegistry 是每个节点独立维护的本地注册表，Map<sessionId, Set<Agent>>——用 Set 是因为 MasterAgent 会通过 SubAgentTool 嵌套调子智能体，同一 session 同时可能有多个 Agent 在跑：



```
// AgentExecutionRegistry.interruptLocalpublic boolean interruptLocal(String sessionId) { Set<Agent> agents = localAgents.remove(sessionId); if (agents == null || agents.isEmpty()) { return false; // 本节点没有 → 交给广播 } boolean interrupted = false; for (Agent agent : agents) { agent.interrupt(); // 翻转中断标志 interrupted = true; // 关键补偿：优雅中断跳过 PostCallEvent，这里手动保存记忆 persistInterruptedMemory(agent, sessionId); } return interrupted;}
Plain Text

```



### 跨节点广播：Redis Pub/Sub
当本地未命中，AgentInterruptBroadcast 把 sessionId 发到统一频道，每个节点都订阅了它，持有该 Agent 的节点收到后执行本地中断：



```
// AgentInterruptBroadcast implements MessageListenerpublic static final String INTERRUPT_CHANNEL = "agent:interrupt";
@PostConstructpublic void init() { listenerContainer.addMessageListener(this, new ChannelTopic(INTERRUPT_CHANNEL));}
@Overridepublic void onMessage(Message message, byte[] pattern) { String sessionId = new String(message.getBody()); executionRegistry.interruptLocal(sessionId); // 只有持有者会真正命中}
public void broadcastInterrupt(String sessionId) { redisTemplate.convertAndSend(INTERRUPT_CHANNEL, sessionId);}
Plain Text

```

这就是**难题一的完整解法** ：本地能停就本地停（快），停不了就全集群广播，让真正持有 Agent 的那个节点去停。


每个节点启动时都 @PostConstruct 订阅了 agent:interrupt 频道。节点 A 收到消息，onMessage 里拿到 sessionId，再执行一次**自己的** interruptLocal——这次因为 Agent 真在 A 上，命中并真正中断。其他没有这个 session 的节点收到消息后 interruptLocal 返回 false，什么也不做。



```
@Overridepublic void onMessage(Message message, byte[] pattern) { String sessionId = new String(message.getBody()); executionRegistry.interruptLocal(sessionId); // 只有持有者会命中}
Plain Text

```

这就是解决"打断请求和运行中的 Agent 不在同一节点"的核心：**本地优先（快），广播兜底（全覆盖）** 。


### 打断后的记忆补偿
前面说过优雅中断跳过 PostCallEvent，所以 interruptLocal 里紧跟着调 persistInterruptedMemory，手动把当前 memory 写进 MySQL Session，避免被打断那一轮的用户输入丢失：



```
private void persistInterruptedMemory(Agent agent, String sessionId) { String sessionKey = sessionId + ":" + agent.getName(); Memory memory = resolveMemory(agent); // 只有 ReActAgent 有 memory if (memory == null) return; // 无状态识别器跳过 memory.saveTo(agentSession, sessionKey);}
Plain Text

```

同时，框架优雅中断返回的是一条英文恢复消息，AgentPipelineService.isInterruptRecovery 会识别它（或 GenerateReason.INTERRUPTED），短路整个 pipeline，返回中文的"已停止生成。请告诉我接下来有什么可以帮您的？"

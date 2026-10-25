---
type: source
title: "thoughts/067 工具级熔断机制"
source_file: "thoughts/067_✅引入工具级熔断机制避免重复失败.md"
source_type: thought-batch
domain: ai
raw_digest: "255-88f7c663"
lines: 255
captured: 2026-10-19
status: verified
tags: [llmentor, circuit-breaker, reliability]
entities: ["wiki/entities/agentscope", "wiki/entities/redis"]
concepts: ["wiki/concepts/工具熔断"]
---

# thoughts/067 工具级熔断机制

## 这一篇覆盖什么

真实痛点：`ItineraryPlanAgent` 规划行程时会调天气工具。如果工具网络抖动、服务不可用、连续返回错误会怎样？

ReAct 循环是「推理 → 调工具 → 看结果 → 再推理」。工具报错后模型看到错误信息，往往会**再试一次** —— 毕竟从模型视角看「可能只是偶然失败」。于是同一个坏掉的工具被反复调用：一次失败浪费一轮推理（一次 LLM 调用 + 一次外部请求 + 几秒延迟），连着失败十次就是十轮空转。**模型没有「这个工具现在坏了，别再叫它」的记忆。**

## 最核心的立意：让模型看不到

Agent 场景的熔断和传统微服务熔断有关键区别：

- **微服务熔断**：熔断器拦在调用方和被调方之间，OPEN 时**拦截请求、快速失败返回**。调用方代码照样会去 call，只是被熔断器挡回来
- **Agent 工具熔断**：最优雅的做法不是「拦截调用」，而是**直接让模型看不到这个工具**。工具从 Toolkit 里卸载后，模型下一轮推理压根不知道有这个工具，自然不会去调用 —— 从源头消灭「重复失败」。等冷却期过了再加回来

`ToolCircuitBreakerHook` 走的就是第二条路：**用 `ToolGroup.removeTool` / `addTool` 动态增删工具，让熔断对模型「透明」**。

## 三态状态机

| 状态 | 含义 |
|---|---|
| **CLOSED**（关闭/正常） | 电路接通，请求正常放行，背后默默数「连续失败了几次」。注意 CLOSED = 正常工作 |
| **OPEN**（打开/熔断） | 连续失败达阈值，开关跳闸。冷却期内所有请求不再真正打到下游 |
| **HALF_OPEN**（半开/试探） | 冷却期一过，放行少量试探请求。成功 → CLOSED；又失败 → 退回 OPEN |

## 指数退避

冷却时长 = 初始时长 × 倍数^(降级代数 - 1)，**封顶**。

参数：初始 60 秒、倍数 2.0、上限 600 秒 → 冷却序列 **60s → 120s → 240s → 480s → 600s**。

理由：**一个工具越是反复出问题，就说明它的故障越顽固，越应该隔离得久一点**。

## 三个类协作

| 类 | 职责 |
|---|---|
| `CircuitBreakerProperties` | 配置集中到 `app.circuit-breaker` 节点 |
| `CircuitBreakerStore` | Redis + Lua 原子脚本 |
| `ToolCircuitBreakerHook` | 卸载/装回工具 |

### 白名单机制

```yaml
app:
  circuit-breaker:
    enabled: ${TOOL_CB_ENABLED:true}
    monitored-tool-names: ${TOOL_CB_MONITORED_NAMES:query_weather,query_destination_news}
```

**熔断绝不是「对所有工具一视同仁」**：数据库读写、缓存这类基础设施工具偶尔失败是正常的，一旦被熔断卸载反而会让 Agent 彻底瘫痪。所以只有明确列入 `monitored-tool-names` 的**外部慢依赖/不稳定接口**才纳入监控，其余工具永远放行。黑名单 `excludeToolNames` 优先。

### 状态存储：每工具只用两把 key

```text
{prefix}fail:{toolName}  → 连续失败计数（String，INCR 原子自增）
{prefix}gen:{toolName}   → Hash { n: 降级代数, at: 开启时间戳(ms) }
```

**`at` 字段存在即代表 OPEN**，不额外存 `"open"` 布尔标记。`isOpen()` 就是判断 Hash 里有没有 `at` 字段。冷却时长**完全派生计算、不持久化** —— 由「降级代数 n」按指数退避算出来。

**并发安全靠 Lua 脚本**保证「多步操作原子完成」：进入 OPEN 要同时做三件事（代数 +1、记开启时间、续 TTL），用一个脚本一次搞定，杜绝「代数加了但时间没记」的中间态。

## 可抽出的原子

→ [[wiki/concepts/工具熔断]] 已完整收录三态、双 hook 分工、Redis 存状态理由、白名单机制、Lua 原子性

本篇是那一页的主要证据源。

## 与其他笔记的重叠点

- **三层治理的分工** → [[wiki/sources/thoughts-工具并行与重试]]（066：并行 / 重试 / 熔断各治什么）
- **`agent 开发学习笔记.md` §7** 是同一实现的另一种叙述（含 PostActing / PreReasoning 双 hook 分工）
- **Redis 用法** → [[wiki/entities/redis]]

## 本篇独有、别处没有的

1. **「让模型看不到」这个立意的完整论证** —— 与微服务熔断的对比是本仓最清晰的一处
2. **白名单机制的理由** —— 为什么不能对所有工具一视同仁
3. **`at` 字段存在即 OPEN 的紧凑设计** —— 不存布尔标记，冷却时长派生计算
4. **每工具两把 key 的极简设计** —— 全生命周期复用
5. **Lua 脚本保证的原子性场景** —— 「代数加了但时间没记」的中间态
6. **具体参数**：初始 60s / 倍数 2.0 / 上限 600s / 冷却序列 60→120→240→480→600

## 证据

- `thoughts/067_✅引入工具级熔断机制避免重复失败.md`（254 行）
- `agent 开发学习笔记.md` §7「工具熔断：Agent 的保险丝是「让模型看不到」，不是「报错」」

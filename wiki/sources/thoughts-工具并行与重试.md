---
type: source
title: "thoughts/066 工具并行执行与失败重试"
source_file: "thoughts/066_✅工具并行执行&失败重试.md"
source_type: thought-batch
domain: ai
raw_digest: "81-f55391c2"
lines: 81
captured: 2026-10-19
status: verified
tags: [llmentor, concurrency, retry]
entities: ["wiki/entities/agentscope"]
concepts: ["wiki/concepts/工具熔断"]
---

# thoughts/066 工具并行执行与失败重试

## 这一篇覆盖什么

Agent 每一轮 reasoning 之后往往要调一批工具：查差旅政策、查订单、查目的地天气/资讯、调外部平台（tuniu / 签证 MCP）、甚至把子 Agent 当工具委托出去。

这些调用有两个共同特征，直接决定性能优化必须落在**工具层**：

1. **多数工具是 I/O 密集且相互独立** —— 查政策和查天气之间没有依赖。串行等，端到端延迟就是各工具耗时之和；并行发出去，延迟压缩到最慢那个
2. **很多工具依赖不可控的外部服务** —— 会超时、会 5xx、会限流。没有重试，一次网络抖动就让整轮对话失败；没有熔断，一个持续挂掉的下游会被 LLM 反复选中、反复超时

## 三层治理

| 层 | 手段 | 治什么 |
|---|---|---|
| **调度层** | `ToolkitConfig.parallel(true)` | 抢延迟（并行发起工具调用） |
| **单次调用层** | 框架 `ExecutionConfig` 的超时 + 有限重试 + 退避 | 吸收瞬时抖动 |
| **工具生命周期层** | 自研 `ToolCircuitBreakerHook` | 熔断卸载 + 指数退避恢复，止损 |

## 关键细节：并行是按 Agent 显式开启的

```java
// agent/ItineraryPlanAgent.java（第 63–69 行）
@Bean(name = "itineraryPlanAgent")
@Scope("prototype")
public ReActAgent build() {
    Toolkit toolkit = new Toolkit(ToolkitConfig.builder()
        .parallel(true)     // ★ 唯一的并行开关：本轮多个工具调用并行发起
        .build());
    ...
}
```

`BookingAgent.java`（第 80–82 行）用同一套写法。**只有这两个 Agent 开启并行** —— 工具最多、外部依赖最重的两个。

## 可抽出的原子

- **三层治理的分工** —— 调度层 / 单次调用层 / 生命周期层各管一段，不重叠
- **并行不全局默认，按 Agent 显式开启** —— 理由见原文「为什么只有这两个开」
- **`ToolkitConfig.parallel(true)` 只影响调度层，不影响工具内部计算** —— 这个区分容易混
- **重试与熔断的分界** —— 重试治「偶发」，熔断治「持续」。没有熔断的重试会让坏工具被反复选中

## 与其他笔记的重叠点

- **熔断的完整机制** → [[wiki/concepts/工具熔断]]、[[wiki/sources/thoughts-工具熔断]]（067，254 行，本仓最详细）
- **代理层的并行** → `agent 开发学习笔记.md` §7 的 `ToolCircuitBreakerHook` 与 §13 的 Hook 生命周期
- **工具返回值裁剪** → [[wiki/sources/thoughts-上下文工程]]（080）—— 并行会放大返回值总量

## 本篇独有、别处没有的

1. **三层治理的清晰划分** —— 一句话讲清「并行、重试、熔断」各治什么
2. **并行只在两个 Agent 开启的决定与理由**
3. **`ToolkitConfig.parallel(true)` 的作用边界**（只影响调度层）

## 证据

- `thoughts/066_✅工具并行执行&失败重试.md`（80 行）
- 代码位置：`agent/ItineraryPlanAgent.java:63-69`、`agent/BookingAgent.java:80-82`

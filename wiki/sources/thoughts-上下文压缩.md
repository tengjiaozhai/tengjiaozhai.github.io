---
type: source
title: "thoughts/078 记忆自动压缩（AutoContextMemory 配置）"
source_file: "thoughts/078_✅上下文工程——记忆自动压缩.md"
source_type: thought-batch
domain: ai
raw_digest: "88-558416dd"
lines: 88
captured: 2026-10-19
status: verified
tags: [llmentor, context-compression, agentscope]
entities: ["wiki/entities/agentscope"]
concepts: ["wiki/concepts/上下文压缩"]
---

# thoughts/078 记忆自动压缩

## 这一篇覆盖什么

gogo-agent 引入 AgentScope 框架的 `AutoContextMemory`：**在 LLM 推理前自动检测 token 膨胀、按六级策略递进压缩、且保留原文可召回**的记忆引擎。应用侧无需手动管理何时压缩、压哪些，只需配好参数。

边界：压缩的**算法机制**在 `Harness学习笔记.md`（见 [[wiki/concepts/上下文压缩]] 与 [[wiki/synthesis/四套上下文压缩方案对比]]）。本篇只记录**应用侧的参数调优**。

## 参数配置（`AgentMemoryFactory`）

```java
public final class AgentMemoryFactory {
  /** 单条消息超过该字符数即卸载。 */
  private static final long LARGE_PAYLOAD_THRESHOLD = 4 * 1024L;
  /** 卸载后保留的预览长度（字符），足够 LLM 判断是否需要重新拉取完整内容。 */
  private static final int OFFLOAD_SINGLE_PREVIEW = 300;
  /** 上下文窗口 token 上限。 */
  private static final long MAX_TOKEN = 128 * 1024L;
  /** 达到 MAX_TOKEN * TOKEN_RATIO 即触发压缩。 */
  private static final double TOKEN_RATIO = 0.75;
  /** 消息条数阈值：超过即触发压缩。 */
  private static final int MSG_THRESHOLD = 60;
  /** 保留最近多少条消息不被压缩/卸载，保证近期上下文完整。 */
  private static final int LAST_KEEP = 20;
}
```

## 两套参数与 AgentScope 默认值的差异（重要）

| 参数 | gogo-agent 实际值 | AgentScope 默认值 |
|---|---|---|
| `LARGE_PAYLOAD_THRESHOLD` | **4 KB** | 5 KB |
| `OFFLOAD_SINGLE_PREVIEW` | **300 字符** | 200 字符 |
| `LAST_KEEP` | **20 条** | 50 条 |
| `TOKEN_RATIO` | 0.75（即 96K token） | — |
| `MSG_THRESHOLD` | 60 | — |

**三个值都被下调了**：大消息阈值更严（4KB < 5KB）、预览更长（300 > 200，这个反而上调）、保护条数更少（20 < 50）。这是应用侧的实际调优结果，比默认值更激进。

## 两道并行的触发线

```text
MSG_THRESHOLD = 60 条   ←── 任一条达到即开始压缩
TOKEN_RATIO = 0.75      ←── 即 128K × 0.75 = 96K token
```

任一条达到即触发。`LAST_KEEP = 20` 保护最近 20 条不被压缩，保证 LLM 对「当前正在做什么」有完整记忆。

## 可抽出的原子

- **应用侧参数与框架默认值的差异** —— 本仓唯一一处记录「实际调优 vs 默认」，比读文档更有价值
- **两道并行触发线的设计** —— 条数与 token 双阈值，防单一指标失效
- **`LARGE_PAYLOAD_THRESHOLD=4KB` 的作用** —— 单条超 4096 字符的大消息（如完整工具返回 JSON）优先卸载为 300 字符摘要预览
- **`agentscope_sessions` 表的 `state_key` 变化** —— 用了 `AutoContextMemory` 后持久化的结构会变

## 与其他笔记的重叠点

- **压缩算法本身** → [[wiki/concepts/上下文压缩]]、[[wiki/synthesis/四套上下文压缩方案对比]]
- **工具返回裁剪** → [[wiki/sources/thoughts-上下文工程]]（080）—— 应用侧的另一个方向
- **中间文件卸载** → [[wiki/sources/thoughts-上下文工程]]（083）—— 落盘 vs 内存 map 的两种卸载
- **KV 缓存被压缩破坏** → [[wiki/concepts/KV缓存与提示词缓存]]

## 本篇独有、别处没有的

1. **`AgentMemoryFactory` 的完整参数与注释**
2. **实际值与 AgentScope 默认值的逐项对比** —— 本仓唯一
3. **两道并行触发线的具体数字**（60 条 / 96K token）
4. **`state_key` 的几种形态** —— 用了 `AutoContextMemory` 之后 session 持久化结构的变化

## 证据

- `thoughts/078_✅上下文工程——记忆自动压缩.md`（87 行）

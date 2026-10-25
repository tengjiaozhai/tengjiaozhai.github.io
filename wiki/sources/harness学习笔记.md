---
type: source
title: "Harness 学习笔记：四套上下文压缩方案完整拆解"
source_file: "Harness学习笔记.md"
source_type: note
domain: ai
raw_digest: "4011-0f49259c"
lines: 4011
captured: 2026-10-19
status: verified
tags: [harness, context-compression, pi, agentscope, grok-build, durable-runtime]
entities: ["wiki/entities/pi", "wiki/entities/agentscope", "wiki/entities/grok-build"]
concepts: ["wiki/concepts/上下文压缩", "wiki/concepts/幂等与写入恢复"]
---

# Harness 学习笔记

## 这一篇覆盖什么

三块相对独立的内容拼在一起（文件名只反映第一块）：

1. **四套上下文压缩方案**（pi / AgentScope 1.x / AgentScope 2.0 / Grok Build）+ 四方对比 + 两两对比六对
2. **ChatGPT Dreaming**（长期记忆，与压缩分工）
3. **Harness 设计：从 Agent Loop 到 Durable Runtime**（Tree / Lane / Operation / Operation Log 四层）

边界：这是本仓最大的单文件（4010 行 / 88 个 h2），前 1/3 是压缩对比，后 2/3 是 Durable Runtime 与幂等恢复。**读的时候要按需跳，不要通读**。

## 可抽出的原子

| 块 | 主题 | 已抽出 |
|---|---|---|
| 压缩 | 六层渐进式压缩 / 大消息卸载 / offload map | [[wiki/concepts/上下文压缩]] |
| 压缩 | 四方对比与五维判断 | [[wiki/synthesis/四套上下文压缩方案对比]] |
| 压缩 | 实战：一次 98 万 token 的压缩 | 上文实例节引用 |
| 压缩 | Grok Build 的两层 / 四模式 / 三守卫 / 事务回滚 | [[wiki/entities/grok-build]] |
| 记忆 | ChatGPT Dreaming 三代演进、三个评估目标 | 待抽：长期记忆与压缩的分工 |
| Runtime | Tree / Lane / Operation / Operation Log | 待抽：Session 四层结构 |
| Runtime | Run / Turn / Step 三层时间粒度 | 待抽：执行粒度模型 |
| Runtime | Durability Rule（Effect 前写 Intent） | [[wiki/concepts/幂等与写入恢复]] |
| Runtime | Tool Recovery 的 replay policy | [[wiki/concepts/幂等与写入恢复]] |
| Runtime | 工具到达路径 direct / deferred / codemode | 待抽：工具暴露策略 |

## 与其他笔记的重叠点

- **AgentScope 的压缩实现**：`agent 开发学习笔记.md` 有 `AutoContextMemory` 的配置参数，本文有完整六层算法 → 两处合并见 [[wiki/concepts/上下文压缩]]
- **AgentScope 2.0 四正交策略**：仅本文一处记录，`agent 开发学习笔记.md` 未涉及
- **Durable Runtime 与 §11 取消恢复**：`agent 开发学习笔记.md` §11 讲跨进程 cancel，本文讲写入幂等，两者共同构成「中断后怎么办」→ [[wiki/concepts/幂等与写入恢复]]
- **pi 的工具缓存 / 上下文缓存**：`大模型工程基础.md` 讲 KV 缓存（模型侧），本文讲上下文压缩（对话侧）→ 见 [[wiki/concepts/KV缓存与提示词缓存]]

## 本篇独有、别处没有的

1. **四方案横向对比矩阵 + 两两对比六对** —— 本仓唯一的系统性比较，含 `max_reduction_ratio 0.8`、`<500 字符` 退化检测、9 段模板等 Grok 专属细节
2. **98 万 token 压缩的完整实战记录** —— 全链路日志级拆解
3. **「pi vs Grok 谁的压缩更好」的五维判断与最终立场** —— 明确结论「Grok 配置成 HistoryOnly ≈ pi 的保守姿态 + Grok 的工程件」
4. **Durability Rule 的代码级论证** —— `R tool_started` 必须先于 `executeTool()`
5. **Tree 里为什么不能塞 Runtime 状态** —— 本仓唯一的 Session 结构设计论证
6. **AgentScope 1.x issue #1026** —— 压缩破坏 ReAct 结构的真实事故，pi 的切点红线正是为它设计的

## 证据

- 全文件 4010 行 / 88 个 h2
- 本页 raw_digest `4010-0f49259c`
- 对应图解：`output/harness-v2-eli5.html`、`output/pi-tool-reach.html`、`output/pi-durable-recovery.html`（见 [[wiki/outputs/图解索引]]）

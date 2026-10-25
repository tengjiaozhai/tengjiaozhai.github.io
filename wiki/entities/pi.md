---
type: entity
title: "pi"
entity_kind: tool
domain: ai
aliases: [pi-coding-agent, pi agent]
version_of_interest: "0.3x"
tags: [coding-agent, harness, durable-runtime]
sources: ["wiki/sources/harness学习笔记"]
concepts: ["wiki/concepts/上下文压缩", "wiki/concepts/幂等与写入恢复"]
---

# pi

## 是什么 / 在我的体系里的位置

编码 agent（`@earendil-works/pi-coding-agent`），同时是 Harness 设计的参考实现。本仓的 `Harness学习笔记.md` 前 1/3 讲 pi 的上下文压缩，后 2/3 讲它背后的 Durable Runtime。

## 已知问题与判断

- **上下文压缩是六层渐进式，从温和到激进** → 见 [[wiki/concepts/上下文压缩]]
  · 保护最近 `lastKeep`（默认 50）条 · 大消息阈值 5KB · 当前轮按 0.3 比例压缩
- **工具到达路径有三种：direct / deferred / codemode** → 这是 pi 独有的设计
  · `direct`：工具声明在请求里，模型直接调
  · `deferred`：先 `tool_search` 搜，搜到才变成直接调用
  · `codemode`：模型写 JS，沙箱里真的去调工具
- **崩溃恢复靠「Effect 前写 Intent，Effect 后写 Result」** → 见 [[wiki/concepts/幂等与写入恢复]]
  · 写工具默认不标 safe，中断后交给模型判断，不自动重跑
- **Session 结构是 Tree / Lane / Operation / Operation Log 四层**，不是「一个 messages 数组」
  · Tree 里不放 Runtime 状态 · Lane 支撑 Subagent · 所有 Durable Writes 共享一个 seq

## 关键配置与用法

```text
largePayloadThreshold     = 5KB     # 大消息卸载阈值
offloadSinglePreview      = 200     # 卸载后保留的预览字符数
lastKeep                  = 50      # 保护最近 N 条
currentRoundCompressionRatio = 0.3  # 当前轮压缩目标比例
```

## 相关实体 / 相关概念

[[wiki/entities/agentscope]]、[[wiki/entities/grok-build]]

## 时间线

- 2026-08：编写 `Harness学习笔记.md`，覆盖 pi 的压缩 + Durable Runtime
- 2026-10-19：`pi-tool-reach.html` 与 `pi-durable-recovery.html` 两份图解已发布在 `output/`

## 相关页面

已建档的 source 页：[[wiki/sources/harness学习笔记]]

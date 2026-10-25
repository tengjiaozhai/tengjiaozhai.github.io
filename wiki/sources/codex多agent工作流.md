---
type: source
title: "Codex 多 Agent 工作流"
source_file: "Codex多Agent工作流.md"
source_type: note
domain: ai
raw_digest: "320-95e6310f"
lines: 320
captured: 2026-10-19
status: verified
tags: [codex, multi-agent, handoff, harness, loop]
entities: ["wiki/entities/codex"]
concepts: ["wiki/concepts/Plan-Execute"]
---

# Codex 多 Agent 工作流

## 这一篇覆盖什么

两件事：

1. **把 `~/.codex/agents/` 里的 custom agents 串成固定工作流** —— 六个 agent 的 handoff 链，附总控 prompt 与交接模板
2. **从 agent loop 到 loop engineering 再到 harness engineering 的三阶段演进** —— 概念性总结

边界：这是**操作文档 + 概念澄清**的组合，不含代码实现。三阶段演进部分与 `Harness学习笔记.md` 的 Durable Runtime 是同一脉络的不同层次。

## 可抽出的原子

| 主题 | 去向 |
|---|---|
| Handoff 模板（11 个字段）与六 agent 链路 | [[wiki/entities/codex]] |
| Agent loop / Loop engineering / Harness engineering 三阶段 | [[wiki/entities/codex]]、[[wiki/entities/pi]] |
| 「loop 能跑，但脆弱」的问题定义 | 待抽：为什么需要 Harness |

## 与其他笔记的重叠点

- **Harness**：本文给三阶段演进的定义，`Harness学习笔记.md` 给具体实现（Tree/Lane/Operation/Log）。两者是同一条线的概念层与实现层 → [[wiki/entities/pi]]
- **Loop Engineering**：`Claude Agent SDK学习笔记.md` 有一节同名内容，视角不同（本文是宏观演进，那边是 SDK 内怎么做）
- **多 agent 协作**：`Harness学习笔记.md` §6–8 讲 Lane 如何支撑 Subagent，本文讲 handoff 链怎么串人（agent）→ 互不重叠

## 本篇独有、别处没有的

1. **Handoff 模板的 11 个字段** —— Goal / Confirmed Decisions / Scope / Interfaces / Files Likely to Change / Implementation Order / Acceptance Criteria / Verification / Risks / Open Questions / Next Agent。这是本仓唯一的多 agent 交接规范
2. **`Next Agent` 字段的作用** —— 每个 agent 结束时必须明确交给谁，链式交接靠这个字段自解释
3. **三阶段演进的时间线** —— Agent loop（2023，ReAct/AutoGPT）→ Loop engineering → Harness engineering，含每个阶段「关注什么」与「问题是什么」
4. **总控 prompt 的原文** —— 可直接复用的 `integration_coordinator` 开场白

## 待处理

- 工作流里的六个 agent 定义在 `~/.codex/agents/`，不在本仓。模板可用，但具体 agent 的能力边界需另查
- `Harnes 团队.md` 已于 2026-10-19 并入本文件（99% 相似度，纯改名）

## 证据

- 全文件 319 行
- 本页 raw_digest `319-95e6310f`
- date: 2026-07-04

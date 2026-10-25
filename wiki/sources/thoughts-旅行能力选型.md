---
type: source
title: "thoughts/048 第三方旅行能力横向对比"
source_file: "thoughts/048_✅市面上可用的旅行相关skill_mcp工具对比.md"
source_type: thought-batch
domain: ai
raw_digest: "151-8d0fc798"
lines: 151
captured: 2026-10-19
status: verified
tags: [llmentor, vendor-comparison, mcp, skill]
entities: ["wiki/entities/mcp-and-skill"]
concepts: ["wiki/concepts/Skill-vs-Tool"]
---

# thoughts/048 第三方旅行能力横向对比

## 这一篇覆盖什么

项目需要查酒店、机票、火车票，还要预订、取消。这些没法自己做，必须依赖第三方。市面上的旅行平台很多，提供的能力形态（MCP / Skill / API）各不相同。

本篇横向对比五家：**途牛、航班管家、飞猪、Rolling-Go、携程问道**。

## 五家对比的结构

```text
各平台详细分析
├── 途牛（Tuniu）           MCP + Skill
├── 航班管家（133.cn）      按服务拆成两个 Skill
├── 飞猪（Fliggy / FlyAI）
├── Rolling-Go（RGH）       MCP + Skill，CLI 是 rgh
└── 携程问道（Wendao）
```

## 可抽出的原子

- **能力形态对比表** —— 是否提供 MCP、是否提供 Skill、覆盖哪些业务
- **选型判据**：能力覆盖 × 接入成本 × 稳定性
- **「同一平台可能同时提供 MCP 和 Skill」** —— 此时选哪个要看工具集是否稳定 → [[wiki/entities/mcp-and-skill]]
- **按服务粒度拆 Skill**（航班管家）——「一个服务一个 Skill」能按需加载省上下文

## 与其他笔记的重叠点

- **选中之后的具体接入** → [[wiki/sources/thoughts-外部skill接入]]（049 途牛 / 050 航班管家 / 051 Rolling Go）
- **MCP vs Skill 的取舍判据** → [[wiki/sources/thoughts-mcp与skill]]（096）
- **把 Skill 改造成生产可用** → [[wiki/sources/thoughts-第三方skill生产化]]（058）

## 本篇独有、别处没有的

1. **五家的横向对比总览** —— 本仓唯一的选型记录
2. **各家的能力覆盖面差异** —— 比如「航班管家是市面上唯一提供专车预约 Skill 的」
3. **飞猪与携程问道的评估** —— 最终没选，但评估过程留下了

## 证据

- `thoughts/048_✅市面上可用的旅行相关skill_mcp工具对比.md`（150 行）

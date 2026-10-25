---
type: source
title: "thoughts 簇 · 外部 Skill 接入"
source_files: ["thoughts/049_✅途牛 Skill介绍及接入.md", "thoughts/050_✅航班管家Skill介绍及接入.md", "thoughts/051_✅Rolling Go Skill介绍及接入.md"]
source_type: thought-batch
domain: ai
raw_digest: "n/a"
lines: 126
captured: 2026-10-19
status: verified
tags: [llmentor, skill, third-party]
entities: ["wiki/entities/mcp-and-skill"]
concepts: ["wiki/concepts/Skill-vs-Tool"]
---

# thoughts 簇 · 外部 Skill 接入

## 这一簇覆盖什么

三家外部旅行平台的 Skill 接入记录：途牛（`tuniu-cli`）、航班管家（机票+酒店 / 专车两个 Skill）、Rolling Go（`rgh`）。

边界：三篇都很短（43 / 33 / 50 行），是**接入清单**而不是深度分析。改造这些 Skill 使其生产可用是另一篇（`thoughts/058`，已单独成 A 层页）。

## 三家平台

| # | 平台 | 提供形态 | 特点 |
|---|---|---|---|
| 049 | 途牛（Tuniu） | MCP + Skill | 主流 OTA，`tuniu call <cmd>` 系列命令 |
| 050 | 航班管家 | 按服务拆成两个 Skill：机票+酒店 / 专车 | **市面上唯一提供专车预约 Skill 的** |
| 051 | Rolling Go | MCP + Skill | 全球旅行服务数字化分发平台，CLI 是 `rgh`（`@rollinggo/hotel`） |

## 可抽出的原子

- **同一平台同时提供 MCP 与 Skill** → [[wiki/entities/mcp-and-skill]] 的取舍判据在实践中如何用
- **按服务粒度拆 Skill**（050）：不是「一个平台一个 Skill」，而是「一个服务一个 Skill」，这样按需加载能省上下文 → [[wiki/concepts/Skill-vs-Tool]]、[[wiki/concepts/KV缓存与提示词缓存]]
- **Skill 依赖 CLI**：三家都是 CLI 封装，不是纯文档 → [[wiki/entities/mcp-and-skill]]
- **横向对比在 `thoughts/048`** —— 那一篇比较了市面上可用的旅行 Skill / MCP，已单独成 A 层页

## 与其他笔记的重叠点

- **Skill 的生产化改造**：`thoughts/058`（[[wiki/sources/thoughts-第三方skill生产化]]）—— 三篇接入记录的后续，讲怎么把「能跑」改成「生产可用」
- **Skill 瘦身**：`thoughts/079`（[[wiki/sources/thoughts-上下文工程]]）—— Skill 正文折叠、工具返回裁剪
- **MCP vs Skill 的取舍**：`thoughts/096`（[[wiki/sources/thoughts-mcp与skill]]）
- **第三方鉴权**：三家都需要用户登录才能下单 → [[wiki/sources/thoughts-鉴权与密钥体系]]
- **下单为什么用 Skill 不用 Tool**：`thoughts/063`（[[wiki/synthesis/Skill-vs-Tool判据]]）—— 这三个 Skill 正是那条结论的实例

## 本篇独有、别处没有的

1. **三家的具体 CLI 命令形态** —— `tuniu call flight saveOrder -a '{...}'`、`rgh` 等，可直接复用
2. **航班管家的服务粒度拆分** —— 一个服务一个 Skill，本仓唯一的案例
3. **「市面上唯一提供专车预约」** —— 选型时的差异化信息

## 证据

- `thoughts/049_✅途牛 Skill介绍及接入.md`（43 行）
- `thoughts/050_✅航班管家Skill介绍及接入.md`（33 行）
- `thoughts/051_✅Rolling Go Skill介绍及接入.md`（50 行）

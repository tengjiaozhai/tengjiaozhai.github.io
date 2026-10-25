---
type: source
title: "thoughts/047 天气查询双通道（免费 + 付费 MCP）"
source_file: "thoughts/047_✅天气查询工具_MCP的接入.md"
source_type: thought-batch
domain: ai
raw_digest: "153-e75f704a"
lines: 153
captured: 2026-10-19
status: verified
tags: [llmentor, mcp, routing, cost]
entities: ["wiki/entities/mcp-and-skill", "wiki/entities/agentscope"]
concepts: ["wiki/concepts/工具缓存"]
---

# thoughts/047 天气查询双通道（免费 + 付费 MCP）

## 这一篇覆盖什么

天气查询的现实约束：`wttr.in` 开箱即用、无需 API Key、免费，但**只能给出今天起 3 天内**的预报。差旅场景经常要查更远的日期:「我下周三去成都出差，那天天气怎么样」—— 这时候 `wttr.in` 无能为力。

要覆盖更远的日期就得上付费服务。选的是阿里云云市场的一个天气 MCP：支持 15 日/40 日预报、天气预警、空气质量，但**按调用量收费**。

取舍：**不要让付费 MCP 承担所有查询，而是让免费的 wttr.in 打头阵，只有当它够不着（日期超出 3 天）时才把请求交给付费 MCP。**

## 双通道结构

```text
通道一：原生免费工具 query_weather   → WebClient 直连 wttr.in
通道二：付费 MCP weather-mcp         → 15/40 日预报、预警、空气质量
```

**两条通道之间的「交接」不是代码里 if-else 判断出来的，而是靠工具返回值里的一个 `beyond_range` 信号，让模型自己在下一轮推理时决定改调 MCP。**

这是本篇最重要的判断：**Agent 编排和传统后端编排最不一样的地方 —— 路由逻辑外置给了 LLM。**

## 可抽出的原子

- **`beyond_range` 信号驱动的模型自路由** —— 不用代码判断，让模型看到信号后自己换通道。这是本仓最独特的一条设计
- **免费打头阵 + 付费兜长尾** —— 成本与覆盖面的分层
- **工具白名单：只暴露 6 个差旅核心工具** —— 与本篇的双通道并存，说明白名单不是「全部工具」而是「核心工具 + MCP 补充」
- **两条通道装配到同一个 Agent** —— 模型要同时看到两者才能做路由决策

## 与其他笔记的重叠点

- **MCP 接入的两种传输** → [[wiki/entities/mcp-and-skill]]（`thoughts/096`）
- **不该缓存的工具返回值** → [[wiki/concepts/工具缓存]]（天气是强时效数据，缓存等于骗模型）
- **工具白名单** → [[wiki/sources/thoughts-命令执行护栏]]（088 的命令白名单是另一层）
- **成本梯度** → [[wiki/sources/thoughts-工具缓存]]（039 的「外部配额」是最该缓存的一档，但天气例外）

## 本篇独有、别处没有的

1. **`beyond_range` 信号 + 模型自路由** —— 本仓唯一一处「把编排逻辑外置给 LLM」的实践记录
2. **免费/付费分层的原因与边界** —— 3 天这个硬阈值
3. **两条通道装配到同一 Agent 的具体配置**
4. **「工具白名单只暴露 6 个核心工具」** —— 与 MCP 补充的关系

## 值得警惕的一点

`beyond_range` 自路由依赖模型正确理解这个信号。如果模型忽略它，会直接返回「查不到」而不是切换到 MCP。本仓未记录这个失败模式的实际发生率。

## 证据

- `thoughts/047_✅天气查询工具_MCP的接入.md`（152 行）

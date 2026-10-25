---
type: source
title: "thoughts/096 外部能力集成：MCP 与 Skill"
source_file: "thoughts/096_✅外部能力集成 — MCP 与 Skill.md"
source_type: thought-batch
domain: ai
raw_digest: "150-be25e0fd"
lines: 150
captured: 2026-10-19
status: verified
tags: [llmentor, mcp, skill, integration]
entities: ["wiki/entities/mcp-and-skill", "wiki/entities/agentscope"]
concepts: ["wiki/concepts/Skill-vs-Tool"]
---

# thoughts/096 外部能力集成：MCP 与 Skill

## 这一篇覆盖什么

> 一个只会聊天的 LLM 是没有价值的，它必须能查天气、查签证、搜航班、订酒店、开发票 —— 这些都是「外部能力」。

gogo-agent 里接入外部能力有两条截然不同的路径：

- **MCP（Model Context Protocol）**：把外部服务包装成标准协议的「工具服务器」，框架用 `McpClientWrapper` 直接对话（stdio 拉起子进程，或走 HTTP）。工具的名字、入参 schema 由 MCP 服务器自己声明，框架自动把它们变成 LLM 可直接调用的原生工具。**协议化、强类型、框架托管连接**
- **Skill（技能）**：把「如何使用某个外部能力」写成一篇 Markdown 操作手册（含参考文档、脚本），放进技能仓库。运行期让模型按需加载这篇手册，然后通过一个受限的 `ShellCommandTool` 去执行 CLI 命令或 curl 调用。**文档化、灵活、模型自主 shell-out**

## 取舍判据（原文原话）

> **能拿到标准 MCP 服务器、且工具集稳定的，走 MCP；需要复杂多步骤操作、依赖成熟 CLI、或想让模型「看着手册干活」的，走 Skill。**

## 结构

| 部分 | 内容 |
|---|---|
| MCP 接入：两个客户端，两种传输 | stdio（Orizn 签证 MCP，`npx` 拉起本地 Node 子进程）+ HTTP（天气 MCP） |
| Skill 接入：把「怎么用外部能力」写成手册 | 途牛 `tuniu-cli`、航班管家、Rolling Go |

## 可抽出的原子

→ [[wiki/entities/mcp-and-skill]] 已完整收录两条路径的对比表与判据

本篇是那一页的主要证据源。

## 与其他笔记的重叠点

- **MCP 双通道（免费 + 付费）的具体设计** → [[wiki/sources/thoughts-mcp接入]]（047）—— 那一篇讲同一套 MCP 怎么分层使用
- **三家 Skill 的具体接入** → [[wiki/sources/thoughts-外部skill接入]]（049–051）
- **Skill 的生产化改造** → [[wiki/sources/thoughts-第三方skill生产化]]（058）
- **Skill 瘦身** → [[wiki/sources/thoughts-上下文工程]]（079）
- **Skill vs Tool vs SubAgent 三层判据** → [[wiki/synthesis/Skill-vs-Tool判据]]
- **Shell 安全** → [[wiki/sources/thoughts-命令执行护栏]]（088）—— Skill 依赖 Shell，所以必须有护栏

## 本篇独有、别处没有的

1. **两条路径的完整对比表** —— 协议化/文档化、强类型/灵活、托管连接/自主 shell-out
2. **「取舍判据」的一句话说清** —— 本仓最凝练的表述
3. **两个 MCP 客户端恰好演示两种传输** —— stdio（npx 子进程）+ HTTP

## 证据

- `thoughts/096_✅外部能力集成 — MCP 与 Skill.md`（149 行）

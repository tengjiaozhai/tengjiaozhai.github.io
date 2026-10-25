---
type: entity
title: "MCP 与 Skill"
entity_kind: protocol
domain: ai
aliases: [mcp, model-context-protocol, skill, 外部能力集成]
tags: [mcp, skill, integration]
sources: ["wiki/sources/thoughts-mcp与skill", "wiki/sources/claude-agent-sdk学习笔记"]
concepts: ["wiki/concepts/Skill-vs-Tool"]
---

# MCP 与 Skill

## 是什么 / 在我的体系里的位置

接入外部能力的两条截然不同的路径：

| | MCP | Skill |
|---|---|---|
| 形态 | 标准协议的「工具服务器」，框架用 `McpClientWrapper` 直接对话 | 一篇 Markdown 操作手册（含参考文档、脚本），放进技能仓库 |
| 传输 | stdio（拉本地子进程）或 HTTP | 模型按需加载手册，通过受限 `ShellCommandTool` 执行 CLI / curl |
| 工具声明 | MCP 服务器自己声明名字与入参 schema，框架自动变成原生工具 | 手册里写怎么做，模型自己拼命令 |
| 特点 | 协议化、强类型、框架托管连接 | 文档化、灵活、模型自主 shell-out |

## 已知问题与判断

- **取舍判据**：能拿到标准 MCP 服务器且工具集稳定 → MCP；需要复杂多步骤操作、依赖成熟 CLI、或想让模型「看着手册干活」→ Skill
- **这是 Skill vs Tool 之外的第三种划分** → 见 [[wiki/concepts/Skill-vs-Tool]]
  · Tool 是代码实现、MCP 是把外部工具协议化、Skill 是让模型读手册干活
- **MCP 的代价是连接托管**：子进程崩溃、端口冲突、工具集变更都由框架承担的复杂度不低
- **Skill 的代价是上下文**：一篇手册几百到几千 token，通常在 system prompt 里，会破坏前缀缓存 → 见 [[wiki/concepts/KV缓存与提示词缓存]]

## 关键配置与用法

本仓记录的两个 MCP 客户端恰好演示两种传输：

- **Orizn 签证 MCP**：stdio 传输，`npx` 拉起本地 Node 子进程
- **天气 MCP**：HTTP 传输

Skill 侧的例子：`tuniu-cli`（途牛）、航班管家、Rolling Go 三个外部 Skill，各有接入记录。

## 相关实体 / 相关概念

[[wiki/entities/agentscope]]、[[wiki/entities/claude-code]]

## 时间线

- 2026-08：`thoughts/047`–`051` 记录天气 MCP、三家旅行 Skill 的接入
- 2026-08：`thoughts/058` 记录「改造外部 Skill 使其具备生产环境可用性」的完整流程
- 2026-08：`thoughts/096` 系统化总结两条路径的取舍

## 相关页面

已建档的 source 页：[[wiki/sources/thoughts-mcp与skill]]、[[wiki/sources/claude-agent-sdk学习笔记]]

---
type: entity
title: "Claude Agent SDK"
entity_kind: library
domain: ai
aliases: [claude-agent-sdk, anthropic-managed-agents, Claude Agent]
tags: [agent-sdk, anthropic, loop-engineering]
sources: ["wiki/sources/claude-agent-sdk学习笔记"]
concepts: ["wiki/concepts/Agent评测", "wiki/concepts/上下文压缩"]
---

# Claude Agent SDK

## 是什么 / 在我的体系里的位置

Anthropic 的 agent 构建 SDK。本仓记录的是它的 Loop Engineering、上下文效率、`memory_stores`、`evals`、`read_file` 工具要点，外加两个可独立成篇的附录（DevSpace MCP 配置、Claude Code 400 问题修复复盘）。

## 已知问题与判断

- **`memory_stores` 是跨 session 的持久化记忆 API** —— 让 agent 跨会话保留学到的知识。这是官方托管的记忆层，不需要自己实现 [[wiki/concepts/上下文压缩]] 里的长期记忆部分
- **`evals` 是 SDK 内置的评估接口**，与本仓的 [[wiki/concepts/Agent评测]] 是不同抽象层：SDK 提供的是运行器，方法论仍需自己设计
- **`read_file` 工具的关键在于按需加载而非全量注入** —— 与本仓「工具返回内容裁剪」的思路一致
- **附录里的 DevSpace MCP 配置与 400 问题修复是两篇独立材料**，被并入本笔记，不是 SDK 本身的内容

## 关键配置与用法

`Loop Engineering` 一节记录的是如何设计 agent 的主循环：什么时候停、什么时候继续、什么时候交给工具。`保持上下文高效` 一节与 [[wiki/concepts/上下文压缩]] 互补 —— 前者讲设计，后者讲机制。

## 相关实体 / 相关概念

[[wiki/entities/anthropic]]、[[wiki/entities/claude-code]]、[[wiki/entities/mcp-and-skill]]

## 时间线

- 2026-06-28：DevSpace MCP 配置指南写入（附录）
- 2026-07：Claude Code 第二轮会话 400 问题修复复盘写入（附录）
- 2026-08：`memory_stores` / `evals` / Loop Engineering 主体内容补充

## 相关页面

已建档的 source 页：[[wiki/sources/claude-agent-sdk学习笔记]]

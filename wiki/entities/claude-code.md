---
type: entity
title: "Claude Code"
entity_kind: tool
domain: ai
aliases: [claude-code]
tags: [coding-agent]
sources: ["wiki/sources/大模型工程基础", "wiki/sources/claude-agent-sdk学习笔记", "wiki/sources/claude-code-code-review"]
concepts: ["wiki/concepts/KV缓存与提示词缓存", "wiki/concepts/上下文压缩", "wiki/concepts/代码评审分层", "wiki/concepts/评审收敛"]
---

# Claude Code

## 是什么 / 在我的体系里的位置

Anthropic 的编码 agent 产品。在本仓里它主要作为**大规模使用下的实测样本**出现，而不是作为工具使用记录。

## 已知问题与判断

- **它是提示词缓存经济性的最佳示范** → 92% cache hit rate、81% 成本下降，见 [[wiki/concepts/KV缓存与提示词缓存]]
  · 「一次 30 分钟的编程会话」是这套机制在真实负载下的完整案例
- **第二轮会话 400 问题**：历史 transcript 里残留 thinking-only assistant 会导致 400 → 见 [[wiki/synthesis/claude-code-400修复]]
  · 官方协议不接受「只有 thinking 没有 text」的 assistant 消息
  · 解法是在本地代理做双向过滤
- **它的代码评审是「多层 + 回滚」而非一道闸门** → 见 [[wiki/concepts/代码评审分层]]
  · 前提：monorepo 日合并量 5 月 2,500 → 9 月 30,000（团队自述）· 状态：外部实践记录，非本仓经验
- **agent 互评会无限循环，必须靠机制收敛** → 见 [[wiki/concepts/评审收敛]]
  · 实测一个 PR 一夜 50+ 轮靠人工叫停；59% 的反复报是首轮已存在的代码

## 关键配置与用法

400 问题的最小定位方法：抓请求体看 messages 里有没有 `content: [{type: "thinking"}]` 而 text 为空的 assistant 消息。

## 相关实体 / 相关概念

[[wiki/entities/anthropic]]、[[wiki/entities/claude-agent-sdk]]、[[wiki/entities/codex]]

## 时间线

- 2026-06-16：`大模型工程基础.md` 记录缓存实测数字
- 2026-07：第二轮会话 400 问题修复复盘写入（后并入 `Claude Agent Sdk学习笔记.md` 附录）
- 2026-06→09：合并 PR 量翻倍以上，回滚率下降 40% 以上（团队自述，见 [[wiki/sources/claude-code-code-review]]）
- 2026-10-26：Code Review for Claude Code 对 Team / Enterprise 开放

## 相关页面

已建档的 source 页：[[wiki/sources/大模型工程基础]]、[[wiki/sources/claude-agent-sdk学习笔记]]、[[wiki/sources/claude-code-code-review]]

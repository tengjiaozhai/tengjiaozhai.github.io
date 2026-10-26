---
type: entity
title: "Anthropic"
entity_kind: org
domain: ai
aliases: [anthropic, claude]
tags: [llm-provider]
sources: ["wiki/sources/大模型工程基础", "wiki/sources/claude-agent-sdk学习笔记", "wiki/sources/agent-开发学习笔记", "wiki/sources/demystifying-evals"]
concepts: ["wiki/concepts/KV缓存与提示词缓存", "wiki/concepts/Agent评测"]
---

# Anthropic

## 是什么 / 在我的体系里的位置

模型与 agent 产品的提供方。本仓从三个角度接触它：

1. **提示词缓存**（`大模型工程基础.md`）：Claude Code 的 92% cache hit rate、81% 成本下降是最重要的实测数字
2. **Agent SDK 与 `memory_stores`**（`Claude Agent SDK学习笔记.md`）
3. **Agent 评估方法论**：原文《Demystifying evals for AI agents》已于 2026-10-26 进仓（[[wiki/sources/demystifying-evals]]），此前只在 `agent 开发学习笔记.md` §10 读到第二手摘录

## 已知问题与判断

- **提示词缓存是 agent 架构设计的成本前提** → 见 [[wiki/concepts/KV缓存与提示词缓存]]
  · 「如果你正在构建 agent，却没有围绕 prompt caching 来做架构设计，那你其实正在把绝大部分利润空间白白留在桌上」
- **评估是「可执行的成功约定」，outcome 与 transcript 是两回事** → 见 [[wiki/concepts/Agent评测]]
- **官方评测方法论强调「只评产出、不评路径」的边界** —— 授权、必要澄清、禁止操作这类过程约束仍应查
- **官方也承认静态评估的边界**：Opus 4.5 在 τ²-bench 的订票任务里发现政策漏洞、给出对用户更好的解，按题面仍判失败 → 见 [[wiki/concepts/Agent评测]] 的失效条件；评分器与题面不一致会惩罚听话的模型（CORE-Bench 42%→95%）→ 见 [[wiki/concepts/任务质量自检]]

## 关键配置与用法

`cache_control` 显式缓存断点是 Anthropic 相对 DashScope 隐式缓存的控制力优势，但本仓只实测了 DashScope 的 20% 计费，Anthropic 侧未实测（见 [[wiki/concepts/KV缓存与提示词缓存]] 的「待澄清」）。

## 相关实体 / 相关概念

[[wiki/entities/claude-agent-sdk]]、[[wiki/entities/claude-code]]、[[wiki/entities/codex]]

## 时间线

- 2026-01-09：*Demystifying evals for AI agents* 发布（2026-10-26 进仓，[[wiki/sources/demystifying-evals]]）
- 2026-06-16：`大模型工程基础.md` 记录 KV 缓存与 Claude Code 的实测数字
- 2026-08：`Claude Agent SDK学习笔记.md` 补 `memory_stores` / `evals`

## 相关页面

已建档的 source 页：[[wiki/sources/大模型工程基础]]、[[wiki/sources/claude-agent-sdk学习笔记]]、[[wiki/sources/agent-开发学习笔记]]、[[wiki/sources/demystifying-evals]]

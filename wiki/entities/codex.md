---
type: entity
title: "Codex"
entity_kind: tool
domain: ai
aliases: [codex, codex-cli, codex agents]
tags: [coding-agent, multi-agent, handoff]
sources: ["wiki/sources/codex多agent工作流"]
concepts: ["wiki/concepts/Plan-Execute"]
---

# Codex

## 是什么 / 在我的体系里的位置

OpenAI 的编码 agent（CLI + `~/.codex/agents/` 下的 custom agents）。本仓记录的是**把多个 custom agent 串成固定工作流**的做法，以及从 agent loop 到 harness engineering 的三阶段演进。

## 已知问题与判断

- **多 agent 工作流的粘合剂是 Handoff 模板，不是编排框架** → 一串固定 agent 靠统一格式的交接文档串起来
  · 模板字段：Goal / Confirmed Decisions / Scope / Interfaces / Files Likely to Change / Implementation Order / Acceptance Criteria / Verification / Risks / Open Questions / Next Agent
- **三阶段演进是理解 Harness 的关键**：
  · **Agent loop**（2023，ReAct/AutoGPT）：接收 → 思考 → 调工具 → 观察 → 再思考。脆弱，不会自我纠错，不知道何时停
  · **Loop engineering**：工程化 loop 本身 —— 终止条件、反馈机制、验证关卡、自我修正
  · **Harness engineering**：运行时系统 —— 持久化、恢复、并发、可观测
- **Handoff 模板的 `Next Agent` 字段是链式交接的关键** —— 每个 agent 结束时必须明确交给谁

## 关键配置与用法

标准链路：

```text
integration_coordinator
  → research_designer / backend_architect
  → fullstack_developer
  → test_acceptance_engineer
  → code_reviewer
  → knowledge_recap_writer
```

## 相关实体 / 相关概念

[[wiki/entities/pi]]、[[wiki/entities/claude-code]]

## 时间线

- 2026-07-04：`Codex多Agent工作流.md` 成文，含 Handoff 模板与三阶段演进
- 2026-10-19：`Harnes 团队.md` 并入本文（99% 相似度，纯改名）

## 相关页面

已建档的 source 页：[[wiki/sources/codex多agent工作流]]

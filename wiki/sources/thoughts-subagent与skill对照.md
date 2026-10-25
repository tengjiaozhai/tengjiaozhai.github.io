---
type: source
title: "thoughts/065 Skill 与 SubAgent 六维度对照"
source_file: "thoughts/065_✅什么时候用Skill，什么时候用SubAgent.md"
source_type: thought-batch
domain: ai
raw_digest: "29-5cd2006e"
lines: 29
captured: 2026-10-19
status: verified
tags: [llmentor, subagent, skill]
entities: ["wiki/entities/agentscope"]
concepts: ["wiki/concepts/Skill-vs-Tool"]
---

# thoughts/065 Skill 与 SubAgent 六维度对照

## 这一篇覆盖什么

28 行，本仓最短的一篇，但一张表把 Skill 与 SubAgent 的区别讲透了。

| 维度 | Skill（说明书） | SubAgent（独立大脑） |
|---|---|---|
| 推理能力 | 无（依赖父 Agent） | 有（独立 ReAct 循环） |
| LLM 调用 | 0 次（纯文本） | 多次（每次迭代一次） |
| 模型选择 | 固定用父 Agent 的模型 | 可独立配置最优模型 |
| 工具集 | 共享父 Agent 的（无隔离） | 独立最小化工具集 |
| 上下文 | 混在父 Agent 上下文里 | 干净独立的上下文 |
| 认知框架 | 和父 Agent 相同 | 可完全不同（审核 vs 规划） |

## 可抽出的原子

- **「LLM 调用 0 次 vs 多次」是最本质的差异** —— Skill 是纯文本注入，SubAgent 是真的一次次推理。这一条决定了其余五条
- **上下文隔离** —— Skill 混在父 Agent 上下文里，会稀释父 Agent 的注意力（呼应 `thoughts/006` 的「注意力有限」）
- **认知框架可完全不同** —— 这是 `thoughts/052` 审核场景的核心：审核与规划是两种认知任务
- **模型与工具集可独立控制** —— 成本与安全两个角度

## 与其他笔记的重叠点

- **具体场景的论证** → [[wiki/sources/thoughts-子智能体vs-skill]]（052 的四条理由）
- **拆多智能体的根本理由** → [[wiki/sources/thoughts-智能体设计]]（006 注意力稀释）
- **Skill vs Tool** → [[wiki/synthesis/Skill-vs-Tool判据]]（三层里的另外两层）

## 本篇独有、别处没有的

1. **六维度对照表** —— 本仓最凝练的一张三选一表
2. **「0 次 vs 多次 LLM 调用」的判据定位** —— 一句话就能区分两者的本质

## 证据

- `thoughts/065_✅什么时候用Skill，什么时候用SubAgent.md`（28 行）

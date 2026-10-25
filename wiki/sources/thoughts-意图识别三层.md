---
type: source
title: "thoughts 簇 · 意图识别三层"
source_files: ["thoughts/008_✅什么是意图识别_问题改写，为什么要做？.md", "thoughts/012_✅基于规则+RAG+LLM构建三层意图识别.md", "thoughts/013_✅基于规则的L0_L1意图识别详解.md", "thoughts/014_✅基于RAG的L2意图识别详解.md", "thoughts/015_✅L1_L2意图识别针对多意图的支持.md", "thoughts/016_✅单次对话多意图识别与执行.md", "thoughts/017_✅意图识别与问题改写的流水线编排.md", "thoughts/018_✅引入L1_L2之后意图识别不准确问题修复.md", "thoughts/020_✅问题改写、意图识别、MasterAgent、SubAgent的执行顺序.md"]
source_type: thought-batch
domain: ai
raw_digest: "n/a"
lines: 840
captured: 2026-10-19
status: verified
tags: [llmentor, intent-recognition, pipeline]
entities: ["wiki/entities/agentscope"]
concepts: ["wiki/concepts/意图识别分层"]
---

# thoughts 簇 · 意图识别三层

## 这一簇覆盖什么

一条完整链路的十个连续篇章：从「什么是意图识别 / 问题改写、为什么要做」（008）到三层实现（012–014）到多意图（015–016）到流水线编排（017）到上线后的问题修复（018）到执行顺序（020）。

边界：这一簇是**同一套机制的不同侧面**，单篇看只是连续叙事的一段，合起来才是完整设计。这正是「簇汇总页」而非「独立 A 层页」的判据。

## 十个篇章的分工

| # | 标题 | 讲什么 |
|---|---|---|
| 008 | 什么是意图识别/问题改写，为什么要做？ | 两道预处理工序的定义与合起来的流水线理由 |
| 012 | 基于规则+RAG+LLM 构建三层意图识别 | 三层架构总纲 + `IntentRecognitionResult` 同构约束 |
| 013 | 基于规则的 L0/L1 意图识别详解 | L0 负责多意图识别，L1 负责高频模板化 |
| 014 | 基于 RAG 的 L2 意图识别详解 | 语料如何变成向量库、运行期检索 |
| 015 | L1/L2 针对多意图的支持 | **关键转折**：L1/L2 原本是单意图短路，会把多意图误判为单意图 |
| 016 | 单次对话多意图识别与执行 | 多意图的执行编排 |
| 017 | 意图识别与问题改写的流水线编排 | 嵌在 `AgentPipelineService` 主流水线的两个工程优化 |
| 018 | 引入 L1/L2 之后意图识别不准确问题修复 | 上线后准确率下降的真实问题与修复 |
| 020 | 问题改写、意图识别、MasterAgent、SubAgent 的执行顺序 | 全链路顺序图 |

> 019（能否直跳子智能体）归 [[wiki/sources/thoughts-路由与智能体协作]]，本簇不重复登记。

## 可抽出的原子

- **三层架构与同构约束** → [[wiki/concepts/意图识别分层]]
- **L1/L2 单意图短路是多意图的死角**（015）→ 待抽：短路优化的覆盖面代价
- **引入廉价层反而降低准确率**（018）→ [[wiki/concepts/意图识别分层]] 的「取舍与边界」
- **执行顺序的因果链**（020）→ 待抽：预处理流水线的时序约束

## 与其他笔记的重叠点

- **为什么不放在主智能体 / 不做成 Skill**：`thoughts/009` 是独立 A 层页（[[wiki/sources/thoughts-路由与智能体协作]]），本簇只引用
- **为什么不用 ReAct**：`thoughts/010` 同上
- **快速路由到上次执行的子智能体**：`thoughts/027`（[[wiki/sources/thoughts-路由与智能体协作]]）是另一条加速路径，与 019 的直跳互为补充
- **三层架构的代码实现**：`agent 开发学习笔记.md` §17 从「瀑布级联短路 vs 前置层级分类」的架构抉择角度讲了同一件事

## 本篇独有、别处没有的

1. **`IntentCategory` 公共词表**（012）—— 意图类别与 `defaultTargetAgent` 的完整映射
2. **`IntentRecognitionResult` 的 Java 实现**（012）—— `Source` / `Confidence` / `IntentItem` / `single()` 工厂 / `toJsonMap()`
3. **L2 语料如何变成向量库的流水**（014）—— 本仓唯一记录，`thoughts/095` 只有 RAG 的整体介绍
4. **多意图从「不支持」到「支持」的完整演进**（015–016）—— 包括为什么最初会漏
5. **`AgentPipelineService` 的两个工程优化**（017）
6. **上线后准确率下降的修复过程**（018）—— 罕见的「自己的设计出了问题」的记录

## 证据

- `thoughts/008_✅什么是意图识别_问题改写，为什么要做？.md`（35 行）
- `thoughts/012_✅基于规则+RAG+LLM构建三层意图识别.md`（161 行）
- `thoughts/013_✅基于规则的L0_L1意图识别详解.md`（183 行）
- `thoughts/014_✅基于RAG的L2意图识别详解.md`（151 行）
- `thoughts/015_✅L1_L2意图识别针对多意图的支持.md`（84 行）
- `thoughts/016_✅单次对话多意图识别与执行.md`（68 行）
- `thoughts/017_✅意图识别与问题改写的流水线编排.md`（62 行）
- `thoughts/018_✅引入L1_L2之后意图识别不准确问题修复.md`（67 行）
- `thoughts/020_✅问题改写、意图识别、MasterAgent、SubAgent的执行顺序.md`（29 行）

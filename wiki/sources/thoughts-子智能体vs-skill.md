---
type: source
title: "thoughts/052 子智能体 vs Skill"
source_file: "thoughts/052_✅为什么行程审核不用Skill要用子智能体？.md"
source_type: thought-batch
domain: ai
raw_digest: "112-c1e8e144"
lines: 112
captured: 2026-10-19
status: verified
tags: [llmentor, subagent, skill]
entities: ["wiki/entities/agentscope"]
concepts: ["wiki/concepts/Skill-vs-Tool"]
---

# thoughts/052 子智能体 vs Skill

## 这一篇覆盖什么

行程规划之后要审核：检查时间是否正确、目的地是否正确、是否符合差旅政策。这个「审核」为什么不用 Skill 写手册，而要单独起一个子智能体？

四条理由 + 一条补充：

1. 审核需要**独立的判断立场**
2. 审核需要**多步推理**
3. 审核需要**独立模型**
4. 审核工具集需要**隔离**
5. 上下文隔离

## 可抽出的原子

- **独立判断立场的必要性** —— 同一个上下文里既生成又审核，会偏袒自己的产出。「生成」和「把关」是两种截然不同的认知任务
- **多步推理要求独立 ReAct 循环** —— Skill 只是文本，不能自己调工具。审核要查政策、查订单、比对时间，是多步的
- **独立模型的理由** —— 生成用强模型 + 深度思考，把关用另一套配置（`thoughts/026` 的模型分级）
- **工具集隔离** —— 审核者不该看到生成者的中间工具，否则会被生成路径带偏

## 与其他笔记的重叠点

- **通用对照表** → [[wiki/sources/thoughts-subagent与skill对照]]（065，六维度表）
- **审核智能体的完整实现** → [[wiki/sources/thoughts-智能体设计]]（053）
- **最终审核工具** → [[wiki/sources/thoughts-工具家族定义]]（054）
- **Skill vs Tool vs SubAgent 三层选择** → [[wiki/synthesis/Skill-vs-Tool判据]]

## 本篇独有、别处没有的

1. **四条理由的完整论证**（065 只有表格，本篇有推理）
2. **「上下文隔离」作为独立的一条** —— 不只是工具隔离，是整个对话上下文隔离
3. **生成与把关的认知任务差异** —— 本仓最清晰的表述

## 证据

- `thoughts/052_✅为什么行程审核不用Skill要用子智能体？.md`（111 行）

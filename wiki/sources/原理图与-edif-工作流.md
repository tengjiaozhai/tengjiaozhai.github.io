---
type: source
title: "原理图与 EDIF 工作流"
source_file: "原理图与 EDIF 工作流.md"
source_type: note
domain: eda
raw_digest: "2478-8507fe68"
lines: 2478
captured: 2026-10-19
status: verified
tags: [edif, edf, schematic, rag, anti-hallucination, repair-diagnosis]
entities: []
concepts: []
---

# 原理图与 EDIF 工作流

## 这一篇覆盖什么

硬件原理图方向的四条工作线，290 个 h2，是本仓 h2 密度最高的文件：

1. **一、读懂 EDF / EDIF 原理图** —— 术语解释、42 页目录分区、原理图符号设计、术语速查卡片
2. **二、EDIF JSON 瘦身：343M → 22M** —— 两次改进的完整流程与验证数据
3. **三、PDF Drawing Diff Skill** —— 能力、边界、工作流程、最佳实践、常见问题
4. **四、原理图 AI 评审方案** —— `schematic-review-rag` 的证据组织系统（设计文档 / 知识文档 / evidence pack / guardrails）
5. **下篇：防幻觉双层防御** —— Wrench Board 双层架构、Arthur AI Guardrails、NeuBird 工程修复、Anthropic 设计模式、四份素材交叉对比

边界：`domain: eda`，与 `ai` 域的其他笔记几乎不重叠 —— 除了第五部分讲防幻觉方法论，那部分有跨域价值。

## 可抽出的原子

| 主题 | 去向 |
|---|---|
| EDIF JSON 瘦身（343M → 22M，两次改进） | 待抽：大 JSON 的渐进式瘦身策略 |
| PDF Drawing Diff Skill | 待抽：把比对能力做成 Skill 的边界与工作流 |
| 原理图 AI 评审的 evidence pack 设计 | 待抽：RAG 的证据组织（含「不允许把本地临时路径当证据」） |
| 防幻觉双层防御（Pre-LLM / Post-LLM guardrail） | 待抽：防幻觉的工程护栏（跨域可复用） |
| `api/agent/sanitize.py` 的位号正则（`U9`/`U999`/`C12`/`Wifi3`/`DP1`） | 待抽：结构化实体识别的正则边界 |
| `Repair 流程` / `scout 流程` | 待抽：维修诊断的 agent 编排 |
| 四份素材的交叉对比（Arthur AI / NeuBird / Anthropic / 自研） | 待抽：防幻觉方法论的横向对比 |
| 面试 90 秒版本 | 保留在 source，不外抽（表述模板而非知识） |

## 与其他笔记的重叠点

- **防幻觉 / 证据可追溯**：与 `agent 开发学习笔记.md` §10 的「只评产出、不评路径」、`Agent 评测方法论.md` 的「输入指纹可溯源」是同一类工程直觉，但视角不同（本文件从 LLM 输出侧防，另两处从评估侧查）
- **RAG**：`agent 开发学习笔记.md` §8 讲向量库选型，本文件 §四 讲 RAG 的证据组织，前者是基础设施，后者是应用设计
- **Skill**：`agent 开发学习笔记.md` §6 讲 Skill vs Tool 判据，本文件 §三 的 PDF Drawing Diff 是一个 Skill 实例
- **模型适配 / 调用参数**：本文件记录了第三方模型适配与 ~35.6 tokens/s 的生成速度估算，`大模型工程基础.md` 讲 KV 缓存与成本，可互补

## 本篇独有、别处没有的

1. **EDIF 术语体系** —— EDIF 专业术语 + 硬件电路术语 + 42 页目录分区，本仓唯一的 EDA 领域知识
2. **343M → 22M 的两次瘦身** —— 有 UTАH 样本的验证数据与命令视角的执行流程
3. **`COPY`-类风险的另一面：证据污染** —— 「不把图片 asset_id、本地路径、临时文件名当成业务证据」这条禁令，是 RAG 系统里最难守的一条
4. **防幻觉的「双层」定义** —— Pre-LLM（输入清洁）与 Post-LLM（grounding 验证 / 毒性 / 工具验证 / 格式合规）的分工
5. **四份素材交叉对比的共识** —— 本仓唯一的跨厂商防幻觉方法论对比
6. **`sanitize.py` 的位号正则** —— 领域实体识别的具体实现（`api/agent/sanitize.py` line 156-163）

## 可关联的成品

`output/` 目录暂无对应图解。防幻觉部分若单独成页，可与 [[wiki/synthesis/copy-from-program处置]] 的「证据可追溯」对照（一个从输出侧防、一个从处置侧查）。

## 待处理

- 290 个 h2 里有大量是代码块的注释行被误判成标题（如 `## - 不要捏造调研记录中不存在的组件或信号。`、`##                ↑ 假设模型生成 128k token 需要 1 小时`），这会影响 `index.html` 的 TOC 渲染。修不修取决于用户：修的话要改原文，破坏 `raw_digest`
- 目录导航只覆盖到 §四，下篇的防幻觉部分没有对应目录条目
- 文件内图片有一处 URL 编码陷阱：`images/ai/Pasted%20image%2020260630174010.png`（第 1894 行），实际文件名是 `images/ai/Pasted image 20260630174010.png`。浏览器能正常显示（URL 解码），只有 grep 会踩坑

## 证据

- 全文件 2477 行 / 290 个 h2
- 本页 raw_digest `2477-8507fe68`
- date: 2026-10-16

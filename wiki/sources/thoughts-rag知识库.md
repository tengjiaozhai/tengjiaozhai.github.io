---
type: source
title: "thoughts/095 接入 RAG 知识库"
source_file: "thoughts/095_✅接入RAG 知识库，让 Agent 拥有领域知识.md"
source_type: thought-batch
domain: ai
raw_digest: "139-a89bde09"
lines: 139
captured: 2026-10-19
status: verified
tags: [llmentor, rag, vector-db]
entities: ["wiki/entities/vector-db", "wiki/entities/agentscope"]
concepts: ["wiki/concepts/向量库选型"]
---

# thoughts/095 接入 RAG 知识库

## 这一篇覆盖什么

大模型的参数里装着「世界的常识」，但装不下三类东西：

1. **私域知识** —— 公司的差旅报销制度、住宿超标规则、差旅行为准则，从没进过预训练语料
2. **长尾/时效知识** —— 小众景点的开放时间、某国最新签证政策，模型要么不知道要么记的是两年前的
3. **可追溯的事实** —— 用户问「差旅制度对超标住宿怎么规定」，不能让模型自由发挥，必须有出处、可复核

硬办法是把所有制度文档塞进 system prompt，但既撑爆上下文窗口，又无法按问题动态取用。RAG 的思路是：切片 → 向量化 → 存向量库 → 提问时语义检索取回最相关的几段 → 作为「参考资料」喂给模型。**模型负责语言组织和推理，知识库负责事实供给，二者解耦。**

## 应用场景

gogo-agent 里真正吃到 RAG 红利的是 **InfoAgent（信息查询助手）**：回答景点、差旅政策、差旅注意事项、行为准则这类查询。

## 两种 VDB 策略（同一份配置里并存）

所有知识库在 `RagKnowledgeConfig` 里以 Spring Bean 形式装配，暴露三个 `io.agentscope.core.rag.Knowledge` 实例，对应两种截然不同的向量数据库策略：

- **景点库：`BailianKnowledge`（远程托管索引）**
- （另两个见原文）

## 可抽出的原子

- **「三类模型装不下的知识」的划分** —— 私域 / 长尾时效 / 可追溯事实。比笼统说「RAG 解决知识不足」精确
- **RAG 的分工定义** —— 模型管语言，知识库管事实，二者解耦
- **两种 VDB 并存** —— 托管索引 vs 自建，同一系统里按场景选 → [[wiki/concepts/向量库选型]]
- **哪些 Agent 真正需要 RAG** —— 不是所有子智能体都挂知识库，只有 InfoAgent

## 与其他笔记的重叠点

- **向量库选型** → [[wiki/concepts/向量库选型]]、[[wiki/synthesis/四类向量库对比]]（`agent 开发学习笔记.md` §8）
- **为什么政策要 Tool + RAG 双通道** → [[wiki/sources/thoughts-工具家族定义]]（034）—— 那一篇讲「只有 Tool 会出什么问题」，本篇讲 RAG 侧怎么接
- **L2 意图识别的向量检索** → [[wiki/sources/thoughts-意图识别三层]]（014）—— 同样是向量库，但用途不同（意图匹配 vs 知识检索）
- **防幻觉** → `原理图与 EDIF 工作流.md` 的证据组织系统

## 本篇独有、别处没有的

1. **「三类模型装不下的知识」的完整划分**
2. **`RagKnowledgeConfig` 的三个 `Knowledge` 实例** 与两种 VDB 策略的具体装配
3. **`BailianKnowledge` 远程托管索引** —— 与自建向量库的对照
4. **RAG 只给 InfoAgent 用的判断** —— 不是所有 Agent 都需要知识库

## 证据

- `thoughts/095_✅接入RAG 知识库，让 Agent 拥有领域知识.md`（138 行）

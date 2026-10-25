---
type: source
title: "thoughts/081 优化系统提示词利用 KV 缓存"
source_file: "thoughts/081_✅上下文工程——优化系统提示词利用KV缓存.md"
source_type: thought-batch
domain: ai
raw_digest: "126-ee20e0d6"
lines: 126
captured: 2026-10-19
status: verified
tags: [llmentor, kv-cache, prompt-caching, context-engineering]
entities: ["wiki/entities/agentscope"]
concepts: ["wiki/concepts/KV缓存与提示词缓存"]
---

# thoughts/081 优化系统提示词利用 KV 缓存

## 这一篇覆盖什么

从 Manus 的《Context Engineering for AI Agents》出发，讲 KV 缓存的原理、百炼（DashScope）的隐式缓存，以及 gogo-agent 怎么改造 system prompt 让前缀稳定。

## 原理部分

大模型是自回归的：生成第 N 个 token 时要「看到」前面所有 token。Transformer 注意力机制里每个历史 token 都被算成一对 Key/Value 向量（KV）。**这些 KV 只跟「这个 token 及它前面的内容」有关**，跟后面还没生成的内容无关 —— 这是关键性质，也是缓存成立的前提。

**铁律：前缀必须逐字节一致，且一旦中间某个 token 变了，从那个位置往后的所有缓存全部失效。**

## 百炼的隐式缓存

- 不需要显式声明缓存哪一段，平台自动识别请求之间相同的前缀并复用
- 命中前缀的部分 **按约 20% 计费**

## 核心命题

> 想尽办法让长长的 system prompt 前缀在多轮之间逐字节稳定，从而稳定命中隐式缓存。

**最大的敌人是「藏在 system prompt 里的动态内容」。**

## 反面案例：时间戳

最自然的写法：

```text
你是差旅助手……
当前日期：2026-07-27，当前时间：14:32:07
（后面还有几千 token 的规则）
```

`当前时间：14:32:07` 这一行**每秒都在变**，位于 system prompt 内部、靠近开头。按前缀缓存的铁律，这一行一变，它后面那几千 token 规则的缓存全部作废 —— 每轮对话都得从这行往后全量重算。

## 解法：静态前缀 + 独立的时间消息

（见原文 `## 静态前缀 + 独立的时间消息`）

## 可抽出的原子

→ [[wiki/concepts/KV缓存与提示词缓存]] 已完整收录原理、铁律、静态/动态分野、脆弱性、经济效益

本篇是那一页的主要证据源之一，提供了 **DashScope 隐式缓存的 20% 计费** 与**时间戳反面案例**的具体形态。

## 与其他笔记的重叠点

- **KV Cache 的原理与 Claude Code 的实测数字** → [[wiki/sources/大模型工程基础]]（176 行，92% / 81%）
- **显式缓存** → [[wiki/sources/thoughts-上下文工程]]（082）—— 百炼隐式之外的另一条路
- **动态变量注入的两难** → [[wiki/sources/thoughts-提示词工程]]（076）
- **压缩会破坏前缀** → [[wiki/concepts/上下文压缩]]

## 本篇独有、别处没有的

1. **百炼隐式缓存的 20% 计费** —— 本仓唯一的 DashScope 具体数字
2. **「时间戳放在 system prompt 开头」这个反面案例** —— 最容易被写出来的错误
3. **`## 静态前缀 + 独立的时间消息` 的解法** —— 把动态内容从 system prompt 挪到独立消息
4. **Manus 文章作为参照** —— 本仓记录的上下文工程三大来源之一

## 证据

- `thoughts/081_✅上下文工程——优化系统提示词利用KV缓存.md`（125 行，含 DashScope 截图）

---
type: source
title: "thoughts/011 多轮对话改写"
source_file: "thoughts/011_✅通过问题改写融合多轮对话.md"
source_type: thought-batch
domain: ai
raw_digest: "229-9395f344"
lines: 229
captured: 2026-10-19
status: verified
tags: [llmentor, query-rewrite, multi-turn]
entities: ["wiki/entities/agentscope"]
concepts: ["wiki/concepts/意图识别分层"]
---

# thoughts/011 多轮对话改写

## 这一篇覆盖什么

多轮对话里，用户的后续提问往往依赖前文：「那第二天呢」「改成下午的」「这个太贵了」。这些句子单独看没有主语也没有对象，直接送给意图识别会判错。

`QueryRewritingAgent` 在识别意图之前，把当前问题结合历史对话改写成一句自包含的完整问题。

## 四个部分

| 部分 | 内容 |
|---|---|
| 代码实现详解 | `QueryRewritingAgent` 继承 `AgentBase` 的轻量实现 |
| 历史对话的加载 | 加载多少轮、怎么截断 |
| System Prompt 的改写策略 | 提示词怎么写 |
| 改写规则 | 相关性判断等四条 |

## 可抽出的原子

- **`QueryRewritingAgent` 继承 `AgentBase` 的轻量实现** —— 不挂工具，只做文本变换。这是「意图识别/改写不用 ReAct Agent」结论的具体形态（见 `thoughts/010`）
- **历史对话的加载与截断策略** —— 这是改写的成本上限，加载越多改写得越准但越贵
- **四条改写规则**：相关性判断（这句到底在问什么）+ 原文其余三条

## 与其他笔记的重叠点

- **定位**：`thoughts/008` 讲问题改写在流水线里的位置，本篇讲实现
- **与其他预处理的关系**：`thoughts/020` 给出「问题改写 → 意图识别 → MasterAgent → SubAgent」的完整顺序
- **为什么不放主智能体 / 不做成 Skill**：`thoughts/009`（[[wiki/sources/thoughts-路由与智能体协作]]）
- **多轮改写与 KV 缓存的冲突**：改写会重写历史，等于破坏前缀 → [[wiki/concepts/KV缓存与提示词缓存]]

## 本篇独有、别处没有的

1. **多轮改写的完整代码** —— 本仓仅此一处
2. **历史对话的加载与截断策略** —— 含具体轮数
3. **四条改写规则的具体内容** —— 相关性判断怎么判

## 证据

- `thoughts/011_✅通过问题改写融合多轮对话.md`（228 行）

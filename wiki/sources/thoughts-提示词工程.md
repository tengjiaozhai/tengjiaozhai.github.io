---
type: source
title: "thoughts 簇 · 提示词工程"
source_files: ["thoughts/068_✅提示词工程——注意力引导.md", "thoughts/069_✅提示词工程——要不要在prompt中写清楚工具该怎么用？.md", "thoughts/070_✅提示词工程——角色与人格设定.md", "thoughts/072_✅提示词工程——Few Shot.md", "thoughts/073_✅提示词工程——Step-back Prompting.md", "thoughts/074_✅提示词工程——Reflexion.md", "thoughts/075_✅提示词工程——决策表 _ 路由表.md", "thoughts/076_✅提示词工程——动态变量注入.md", "thoughts/077_✅提示词工程——职责边界与拒绝策略.md"]
source_type: thought-batch
domain: ai
raw_digest: "n/a"
lines: 805
captured: 2026-10-19
status: verified
tags: [llmentor, prompt-engineering]
entities: ["wiki/entities/agentscope"]
concepts: ["wiki/concepts/KV缓存与提示词缓存"]
---

# thoughts 簇 · 提示词工程

## 这一簇覆盖什么

九篇提示词技巧，每篇一个具体手法，全部挂在 gogo-agent 的真实 prompt 文件上（11 个 system prompt 对应 11 个智能体）。

边界：`thoughts/071`（结构化输出约束，385 行）体量远超其余各篇且有独立的模板体系，单独成 A 层页。

## 九个手法

| # | 手法 | 解决什么 | 行数 |
|---|---|---|---|
| 068 | 注意力引导 | `lost in the middle` —— 排在中间的规则最容易被「读过但没执行」 | 113 |
| 069 | 要不要在 prompt 里写清楚工具怎么用？ | 工具注册后框架自动注入名称/JSON Schema/描述，那还需不需要人写用法 | 86 |
| 070 | 角色与人格设定 | 每个 prompt 第一行「你是 XXX」是提示词工程的**锚点** | 44 |
| 072 | Few-shot | 「唯一可以偷懒但仍然管用」的技巧 —— 把规则表达外包给样本 | 174 |
| 073 | Step-back Prompting | 用户问得太具体，具体到隐藏了真正想要的答案 | 53 |
| 074 | Reflexion | 模型「糊弄」过去的方案，怎么让它自己发现不对 | 71 |
| 075 | 决策表 / 路由表 | 条件有限、分支明确的判断，本质是「如果 X → 走 A」的表 | 124 |
| 076 | 动态变量注入 | 相对时间（明天/下周）必须换算成绝对日期，锚点只有运行时才有 | 42 |
| 077 | 职责边界与拒绝策略 | 不能做什么和能做什么同样重要 | 98 |

## 可抽出的原子

- **`lost in the middle` 与注意力分布**（068）：提示词越长、约束越多，中间位置越容易被忽略 → 待抽：长提示词的位置策略
- **工具用法该不该写进 prompt**（069）：框架自动注入 schema，但「什么时候用、按什么顺序用」仍需人写 → [[wiki/entities/mcp-and-skill]]、[[wiki/concepts/Skill-vs-Tool]]
- **角色锚点**（070）：11 个 prompt 的第一行都是「你是 XXX」
- **Few-shot 的四种形态**（072）：输入→输出对 / 示例 / 完整输出模板 / 正反例对照
- **Step-back 的适用场景**（073）：用于问题改写，解决「问得太具体反而掩盖真实需求」
- **决策表优于散文式描述**（075）：条件有限、分支明确的场景
- **动态变量注入与缓存的冲突**（076）：变量注入越靠前，KV 缓存命中率越低 → [[wiki/concepts/KV缓存与提示词缓存]] 的核心权衡
- **拒绝策略的必要性**（077）：只写「能做什么」会让模型越界

## 与其他笔记的重叠点

- **结构化输出**：`thoughts/071`（[[wiki/sources/thoughts-结构化输出约束]]）是本簇的姊妹篇
- **KV 缓存**：076 的动态变量注入与 `thoughts/081` 的静态前缀优化是同一矛盾的两面 → [[wiki/concepts/KV缓存与提示词缓存]]
- **上下文工程**：本簇讲「怎么写」，[[wiki/sources/thoughts-上下文工程]] 讲「怎么省」
- **IntentCategory 决策表**：075 的决策表在意图识别里落地 → [[wiki/concepts/意图识别分层]]

## 本篇独有、别处没有的

1. **`lost in the middle` 的具体表现**（068）：不是「模型没读到」，是「读到了但没执行」
2. **「工具用法还要不要写」的明确回答**（069）—— 本仓最容易产生分歧的一个问题
3. **11 个 system prompt 的共同锚点**（070）—— 全部以「你是 XXX」开头，这不是随手一写
4. **Few-shot 作为「可以偷懒的技巧」的定位**（072）—— 反直觉但准确：它把规则的表达成本转移给样本
5. **Reflexion 在防止模型糊弄上的具体用法**（074）—— 「看起来无懈可击，线下核对全崩」的场景
6. **动态变量注入的两难**（076）—— 注入位置与缓存命中的直接冲突

## 证据

- `thoughts/068_✅提示词工程——注意力引导.md`（113 行）
- `thoughts/069_✅提示词工程——要不要在prompt中写清楚工具该怎么用？.md`（86 行）
- `thoughts/070_✅提示词工程——角色与人格设定.md`（44 行）
- `thoughts/072_✅提示词工程——Few Shot.md`（174 行）
- `thoughts/073_✅提示词工程——Step-back Prompting.md`（53 行）
- `thoughts/074_✅提示词工程——Reflexion.md`（71 行）
- `thoughts/075_✅提示词工程——决策表 _ 路由表.md`（124 行）
- `thoughts/076_✅提示词工程——动态变量注入.md`（42 行）
- `thoughts/077_✅提示词工程——职责边界与拒绝策略.md`（98 行）

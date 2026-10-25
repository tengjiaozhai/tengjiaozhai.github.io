---
type: source
title: "thoughts/071 结构化输出约束"
source_file: "thoughts/071_✅提示词工程——结构化输出约束.md"
source_type: thought-batch
domain: ai
raw_digest: "385-47b88be5"
lines: 385
captured: 2026-10-19
status: verified
tags: [llmentor, prompt-engineering, structured-output, json]
entities: ["wiki/entities/agentscope"]
concepts: []
---

# thoughts/071 结构化输出约束

## 这一篇覆盖什么

在多 Agent 系统里，LLM 的输出不只是给用户看 —— 它经常是**下游程序的输入**。gogo-agent 里：意图识别结果直接被 Java 代码解析成路由指令、问题推荐的 JSON 数组会被前端渲染成气泡按钮、对话标题会被存进数据库当索引。

只要一次输出格式跑偏（多输出一句话、少一个引号、把 `true` 写成 `"true"`），整个后端就崩了。**结构化输出约束不是「锦上添花」，是 Agent 系统的生命线。**

384 行，本仓最长的提示词单篇。

## 三种输出形态

| 形态 | 用于 | 容错 |
|---|---|---|
| **严格 JSON** | Agent-to-Agent、Agent-to-Backend 数据流 | 零容错，出错即系统崩溃 |
| **模板化 Markdown** | 面向用户的富文本呈现 | 结构可控，出错是体验下降 |
| **短文本片段** | 对话标题、单值输出 | 最简约束，语义为准 |

## 各 Agent 的输出形态与出错代价

| Agent | 形态 | 消费者 | 出错代价 |
|---|---|---|---|
| IntentRecognitionAgent | 严格 JSON | Java 反序列化 → 路由 | 系统崩溃 |
| QueryRewritingAgent | 严格 JSON | 上游 Agent 消费 | 意图丢失 |
| QuestionRecommendationAgent | 严格 JSON | 前端渲染气泡 | 按钮消失 |
| ItineraryPlanAgent | 模板化 Markdown | 用户阅读 | 体验下降 |
| ItineraryReviewAgent | 模板化 Markdown | Plan Agent 消费 | 审核失效 |
| ConversationTitleAgent | 短文本片段 | 存数据库 | 标题异常 |

## 严格 JSON 的六种叠加手法

1. 开门见山声明「只输出 JSON」：`必须只输出以下 JSON 格式，禁止附加任何自然语言解释，禁止调用任何工具：`
2. 给出完整可复制的 JSON 模板
3. 紧跟字段说明表
4. 用示例对齐输出格式（单意图 / 多意图等）
5. 用外部规则约束枚举值
6. （第六种见原文后半）

## 模板化 Markdown 的四类约束

结构与顺序强制 / 区块级细粒度规则 / **反编造的溯源约束** / 区分事实与主观。

## 六个常见陷阱（本仓最有价值的部分）

| 陷阱 | 现象 |
|---|---|
| 1. 格式说了没模板 | 「输出 JSON」但没给模板，模型自由发挥 |
| 2. 模板有省略号 | `...` 被模型当成字面内容输出 |
| 3. 多个 code block 混淆 | 提示词里有多个代码块，模型不知道抄哪个 |
| 4. 字段说明写在模板里 | 说明文字被当成字段值输出 |
| 5. 忘记禁止 code block 包裹 | 输出被 ` ```json ` 包住，解析器失败 |
| 6. 多语言混用不一致 | 中文提示词 + 英文模板，字段名混用 |

## 可抽出的原子

- **「输出给程序」vs「输出给人」的约束强度分档** —— 这是本篇的框架
- **六个陷阱** —— 每个都是踩过的坑，可直接用作检查清单
- **「反编造的溯源约束」** —— 在模板化 Markdown 里如何防止模型编造数据
- **检查清单**（文末）—— 写结构化输出约束时逐条过

## 与其他笔记的重叠点

- **Few-shot** → [[wiki/sources/thoughts-提示词工程]]（072）
- **意图识别的 JSON schema** → [[wiki/concepts/意图识别分层]]（`IntentRecognitionResult` 的同构约束）
- **决策表** → [[wiki/sources/thoughts-提示词工程]]（075）
- **工具参数 schema** → [[wiki/sources/thoughts-工具设计规范]]（031）

## 本篇独有、别处没有的

1. **三种输出形态的分档框架** —— 按出错代价决定约束强度
2. **六个陷阱的完整清单** —— 本仓唯一，可直接复用
3. **完整可复制的 JSON / Markdown 模板** —— 实际在用的，不是示例
4. **文末的检查清单** —— 写新 prompt 时的对照表

## 证据

- `thoughts/071_✅提示词工程——结构化输出约束.md`（384 行）

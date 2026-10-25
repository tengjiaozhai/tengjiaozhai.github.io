---
type: source
title: "Agent 评测方法论"
source_file: "Agent 评测方法论.md"
source_type: note
domain: ai
raw_digest: "165-02437a82"
lines: 165
captured: 2026-10-19
status: partial
tags: [evaluation, testing, golden-fixture, refactor]
entities: []
concepts: ["wiki/concepts/金标", "wiki/concepts/Agent评测"]
---

# Agent 评测方法论

## 这一篇覆盖什么

作为「Agent 与复杂业务系统的评测 / 验收」的总览页，主章是**金标（Golden Master / Golden Fixture）**；另有附章记一次 **badcase 判定**——agent 未查证就向用户索要公共可查的信息（2026-10-23）。

边界：文件自己在开头写明「后续可在同文件继续扩展离线基准（如 SWE-bench）、线上 LLM-as-Judge、分层 Rubric、Release Gate 等主题」。这些还没有内容，所以 `status: partial`。

## 可抽出的原子

| 主题 | 去向 |
|---|---|
| 金标定义与五条生产原则 | [[wiki/concepts/金标]] |
| 金标的日常使用方法（pytest 断言逐格比对） | [[wiki/concepts/金标]] |
| 金标与 Agent 上层决策的分工 | [[wiki/concepts/金标]]、[[wiki/concepts/Agent评测]] |
| 一次 badcase 的判定设计（transcript vs 自述、判据不能写成「必须调搜索」、pass^k 口径） | [[wiki/concepts/Agent评测]] |

## 与其他笔记的重叠点

- **Agent 评测的完整方法论**：`agent 开发学习笔记.md` §10 是操作手册（三类裁判 / pass@k / 8 步路线），本文是总览页。当前两者内容几乎不重叠 —— 本文讲确定性部分（金标），§10 讲非确定性部分（决策质量）→ [[wiki/concepts/Agent评测]]
- **`evals`**：`Claude Agent SDK学习笔记.md` 记录 SDK 内置的评估接口，是运行器层，与方法论不同层

## 本篇独有、别处没有的

1. **金标的五条生产原则** —— 零侵入老代码 / 必须走 Web 真实路径 / 杀掉所有易变字段 / 自校验比对字节流 / 输入指纹可溯源。这是本仓唯一的工业级夹具生产规范
2. **「自校验」这一条的具体做法** —— 脚本内部连续执行两次生成，逐字节比较两次的二进制流，差一个字节直接报错中断
3. **金标价值的定性表述** —— 「把主观的『我觉得重构得差不多了』，变成了客观的、可以用机器一键验证的『0 差异，100% 逐格吻合』」
4. **`x6728` 的具体断言数字** —— 组合数量 20、展开候选底稿 60、默认收敛初稿 28（一供 20 + 二供 4 + 三供 4），0.06 秒跑完
5. **一次 badcase 的完整判定** —— 附章把「未查证就索要公共信息」写成可判定用例：判据是「澄清请求是否只索要用户独占信息」，不是「有没有调搜索」；归类为回归集掉分；口径用 pass^k 防第二轮补上洗分。本库目前唯一的 badcase 判定样例

## 待处理

- 文件里三个 `<sheet sheet-id="..." token="...">` 标签是阿里文档的表格嵌入，在本仓渲染不出来（`index.html` 不处理这种标签）。金标的具体输入输出样例可能存在于这些 sheet 里，当前不可读
- 后续章节（SWE-bench / LLM-as-Judge / 分层 Rubric / Release Gate）待补，补齐后 `status` 可改 `verified`

## 证据

- 全文件 165 行
- 本页 raw_digest `165-02437a82`（附章记于 2026-10-23）
- date: 2026-10-13

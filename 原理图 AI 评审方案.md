---
title: 原理图 AI 评审方案
date: 2026-06-16
desc: 在结构化差异之上引入大模型做原理图评审，让 AI 不只发现差异，还能解释差异、评估设计优劣。
category: 原理图 / EDA
tags: [原理图, AI 评审, Agent]
---

# 原理图 AI 评审方案

## 背景描述：

当前工具已经能够较好地支持自有原理图在不同版本之间的结构化比对，能够从器件、管脚、网络等维度识别新增、删除、属性变更、网络重命名和连接变化，适用于版本迭代过程中的差异追踪与人工复核。但在面对 MTK、高通等官方平台参考设计与公司自有设计之间的对比时，差异往往远大于普通版本变更，页面结构、器件位号、网络命名、模块划分和实现方式都可能存在较大偏移，导致传统规则式差异对比难以判断哪些差异是合理设计变更，哪些差异可能引入风险。因此，需要在现有结构化比对能力之上，引入大模型对原理图上下文、官方参考设计、公司规则和历史经验进行综合理解与评审，让模型基于差异证据进一步判断设计的合理性、潜在风险和优化方向，从而突破当前工具只能“发现差异”、难以“解释差异和评估设计优劣”的瓶颈。

```Markdown
Agent System Prompt / Soul

你是一个面向硬件原理图评审的 Schematic Review Agent。

你的使命不是替代硬件工程师做最终裁决，而是把官方参考原理图、自有设计原理图、公司规则知识库、历史案例、图片/表格知识和当前检索证据组织成可追溯的评审 finding，帮助工程师更快定位风险、理解差异和形成判断。

核心原则：
1. 证据优先：所有结论必须基于 evidence pack 中的证据，不允许凭空补全、不允许把常识当成项目事实。
2. 结构化评审：必须围绕器件、管脚、网络、页面、模块、规则和历史案例输出判断，而不是输出泛泛建议。
3. 区分评审模式：有官方参考原理图时，重点判断“自有设计相对官方参考设计的差异是否合理”；没有官方参考原理图时，只能基于公司规则知识库和目标设计事实做合规性与风险提示。
4. 保守表达：证据不足时必须明确输出“需人工确认”，不能把不确定内容包装成确定结论。
5. 可追溯：每个 finding 必须引用 evidence_id，并说明证据来自设计差异、规则文档、视觉摘要、历史案例或人工反馈。
6. 工程语言：输出要让硬件工程师可直接评审，包含风险等级、影响对象、判断依据、建议动作和需要人工确认的点。
7. 持续学习：当工程师纠正结论、补充规则或确认误报/漏报时，必须把反馈沉淀为可复用的学习记录，经过验证后再提升为规则、profile、检索策略或提示词改进。

禁止行为：
- 不直接读取完整 EDF 后凭感觉判断。
- 不把图片 asset_id、本地路径、临时文件名当成业务证据。
- 不引用 evidence pack 之外的内容作为结论依据。
- 不在无官方参考原理图时声称某个设计点偏离了 MTK、高通等官方平台参考。
- 不把未经人工确认的单次反馈直接升级为稳定规则。
```

来源：当前 `schematic-review-rag` 初步实现  参考风格：飞书云文档《EDF手机主板原理图 · 小白解读指南》  适用读者：硬件负责人、原理图评审工程师、AI 平台工程师、数据平台工程师  阅读目标：理解这套方案要解决什么问题、系统如何工作、每个模块承担什么责任，以及后续讨论应聚焦哪些设计取舍。

## 目录

1. 这套方案到底是什么？
2. 方案中的关键对象
3. 总体架构地图
4. 知识文档如何变成可检索证据
5. 设计图如何进入评审流程
6. RAG 如何减少幻觉
7. LLM 在系统中的边界

## 这套方案到底是什么？

![](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=OGFiMjAzNzM2ZGRiNmZmOWJjYTI2ZGM0MmVlZDExNWFfOTUwMGIxYmYzNTFiODc5ODJhNTY5YTNlYjkwNDc3OWZfSUQ6NzYzNjk2Mjk4OTE1MzAyOTMyOV8xNzgxNTk0ODc3OjE3ODE1OTg0NzdfVjM)

这套方案不是一个“把 EDF 文件丢给大模型，然后让它直接评价好坏”的工具。

它更接近一个面向原理图评审的证据组织系统：先把官方参考设计、自有设计、公司规则文档、图片表格知识和历史经验拆成可查询、可引用、可追溯的数据，再让大模型只基于这些证据输出评审意见。

它要解决的核心问题有三个：

- EDF/EDIF 数据太大，不能一次性塞进模型上下文。
- 原理图设计差异复杂，不能只靠简单文本对比判断合理性。
- 公司经验文档里有大量图片、表格、测试截图和口径描述，直接切 chunk 会产生噪声，甚至把本地临时图片路径当作证据。

所以系统的基本思路是：数据先结构化，证据先检索，结论再生成。

## 方案中的关键对象

### 2.1 设计文档

设计文档指官方参考 EDF 和自有设计 EDF。系统会把 EDF/EDIF 抽取成结构化 fact nodes，包括元件实例、网络、页面、模块、位号、网络名等信息。

设计文档承担两个角色：

- 官方参考设计：作为平台原始设计或标准设计的比较基准。
- 自有设计：作为需要评审的目标设计。

### 2.2 知识文档

知识文档指公司标准、经典问题分析、平台设计规则、历史评审经验等材料。

这类材料的问题不是“没有文字”，而是内容形态不稳定：Word 里有正文、表格、图片、公式、截图、图片域路径。系统需要先把它们拆成干净的结构化元素，再决定哪些内容适合进入检索。

### 2.3 证据包

证据包是给 LLM 的输入，不是原始数据库内容的简单拼接。

一个合格证据包至少要包含：

- evidence_id：每条证据的唯一标识。
- evidence_type：证据来源类型，例如规则、设计差异、视觉摘要。
- text：可被模型阅读的证据正文。
- metadata：检索来源、向量距离、父元素、图片资产、视觉路由等追溯信息。

LLM 输出的每个 finding 都必须引用 evidence_id，否则结论不可追踪。

### 2.4 finding

finding 是结构化评审结论，代表系统对某个风险、优点、疑点或证据不足点的表达。

它不是最终裁决，而是工程师评审前的证据化草稿。工程师可以据此快速定位规则、差异和判断依据。

## 总体架构地图

![](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NjUwNTAxMWU1MmNkNjJhZDllMTI4MjA3MzcyYTVmNTRfNjU4ZDFlMGQxNDAxY2EwYjM2YWFlMDlkMWYzZGVmMmRfSUQ6NzYzNjk2MzAxNTYxMTQzNjI1M18xNzgxNTk0ODc3OjE3ODE1OTg0NzdfVjM)

整体架构可以分成四层。

第一层是设计输入层。官方参考设计和自有设计都通过 EDF/EDIF 解析进入数据库，形成实体级结构化事实。

第二层是知识输入层。公司规则文档被解析成文本、表格、图片资产。图片会经过路由，表格和公式走 OCR，工程图走 VLM。

第三层是证据存储层。MariaDB 保存权威结构化事实，pgvector 保存知识 chunk 的 embedding，用于语义召回。

第四层是评审输出层。系统根据审查问题做混合检索，生成 evidence pack，再由 LLM 生成结构化 findings，最后汇总成工程师可读报告。

这四层之间的关系不是“数据越多越好”，而是“证据越准越好”。系统应尽量减少无效 chunk、空图片摘要、重复目录文本和本地路径噪声进入检索链路。

## 知识文档如何变成可检索证据

![](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ODRhZjEyNTUwMjJiNWQ4NDBkOGRhNmRkNWM5ZWRkY2JfMGQ0MGU3MDZhN2YyNzE2ZTc3ZGNhMjA5NmNiZTA3NjVfSUQ6NzYzNjk2MzA0NzQ1MzYwOTE2MV8xNzgxNTk0ODc3OjE3ODE1OTg0NzdfVjM)

知识文档入库的关键不是切分，而是先判断内容类型。

旧版 Word 文档经常存在 `INCLUDEPICTURE` 图片域、本地临时路径、截图占位符等噪声。如果这些内容直接进入 chunk，RAG 会把无意义文本召回给 LLM，模型就可能基于错误证据输出错误结论。

当前方案把知识文档处理成三个层级：

- 父元素：保留文档原始顺序，包括 text、table、image。
- 图片资产：保存真实图片字节、哈希、来源关系、路由决策和模型输出。
- 检索 chunk：只保存可用于检索的正文、表格文本或有效图片摘要。

图片资产不会天然进入检索。只有当图片经过 OCR 或 VLM 得到有效 `ocr_text` 或 `visual_summary` 后，系统才会生成 image_summary chunk。

这个约束很重要。它避免了类似“图片证据 + asset_id”这种没有业务语义的内容进入向量库。

## 设计图如何进入评审流程

![](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=OTQ0YWI1MWE0MzEwYTgxMzE4ZGNkZTYyYWZmNzAxYzlfZGFlMmI4OGUyZjM4ODlmZTU3ZDdjMTFhNjg5NTQ0MDJfSUQ6NzYzNjk2MzA3MDA5OTYyMzEzN18xNzgxNTk0ODc3OjE3ODE1OTg0NzdfVjM)

### 5.1 有官方参考原理图：参考设计差异 + 自有规则知识库

如果项目提供 MTK、高通等官方平台参考原理图，系统会同时解析官方参考原理图和自有设计原理图，先生成实体级 diff evidence，再结合公司规则知识库进行评审。

实体级 diff 按 refdes、net_name、page_name、module_type 等维度聚合，回答“自有设计相对官方参考设计改了什么”；规则知识库、经典问题分析、视觉知识摘要和模块 profile 回答“这些变化应该用什么规则来判断”。

因此，有官方参考原理图时，evidence pack 由两类证据组成：一类是官方参考设计与自有设计之间的差异证据，另一类是公司规则知识库、历史经验和图片知识召回出的规则证据。LLM 不直接凭感觉比较两张原理图，而是在读取“差异证据 + 规则证据”后输出结构化 finding，重点评估差异是否合理、是否存在保护电路缺失、关键网络变化、器件参数不一致、连接拓扑改变等风险。

### 5.2 无官方参考原理图：自有设计 + 自有规则知识库

如果项目没有官方参考原理图，系统就不再生成“官方参考 vs 自有设计”的实体级 diff，也不能声称某个设计点偏离了 MTK 或高通平台参考。

此时评审只能基于自有设计抽取出的结构化事实，以及公司规则知识库、实时更新规则库、经典问题分析、模块 profile 和视觉知识摘要进行判断。evidence pack 只包含“目标设计事实 + 规则证据”，没有官方差异证据。

因此，无官方参考原理图时，LLM 的输出重点应从“与官方参考是否一致”转为“是否违反公司规则、是否命中已知风险、是否缺少必要保护、是否需要人工确认”。这种模式下 finding 的结论要更保守，证据不足时必须标记为“需人工确认”，不能把规则库没有覆盖的内容推断成平台设计错误。

## RAG 如何减少幻觉

![](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=Njk2NDY1ODJiYjU4NDUwOTUyY2NjMTJjNzVhMjNmYzNfNjNhNDE1OTUxNTY3MjkyMGY5MWZiN2YyN2NmMWE1ZGFfSUQ6NzYzNjk2MzExNTg2NzAzMjUxNl8xNzgxNTk0ODc3OjE3ODE1OTg0NzdfVjM)

这套 RAG 的目标不是让模型更会聊天，而是让模型更少胡说。

减少幻觉主要依赖四个机制。

第一，事实不靠模型记忆。EDF 实体、知识文档元素、图片资产、检索 chunk 都落入数据库。模型不需要记住完整原理图，只需要阅读本轮证据。

第二，检索采用混合召回。关键词检索适合网络名、位号、模块名和规则关键词；向量检索适合同义表达和经验类规则。两路结果通过融合排序，降低单一路径漏召风险。

第三，证据包带 metadata。每条证据都能追溯到 chunk、父元素、图片资产或设计实体。报告中的 finding 可以回查证据来源。

第四，prompt 明确约束。LLM 不允许使用证据之外的常识；证据不足时必须输出需要人工确认，而不是自行补全。

## LLM 在系统中的边界

LLM 在这套系统里不是数据库，也不是规则引擎。

它主要负责三件事：

- 把召回证据和设计差异组织成工程师能读懂的判断。
- 在证据足够时输出风险、优点、合理性或弱点。
- 在证据不足时明确指出缺口，而不是强行判断。

它不应该做三件事：

- 不应该直接读取完整 EDF 后凭感觉评审。
- 不应该把没有 OCR/VLM 结果的图片占位符当成证据。
- 不应该把本地路径、临时文件名、图片 asset_id 当作业务结论依据。

这个边界决定了后续评审质量的上限：如果证据包干净、结构化、覆盖面合理，LLM 输出会更稳定；如果证据包混入噪声，LLM 会放大噪声。

## Agent 如何持续进化学习

原理图评审系统不能只做一次性问答。平台参考设计会变化，公司规则会持续补充，工程师也会在评审过程中不断纠正模型的误判。因此，这个 agent 需要具备 **self-improving agent** 的持续学习机制：把人工反馈、误报漏报、规则补充和非显而易见的修正沉淀下来，再经过验证后变成后续评审可复用的能力。

这里的“学习”不是让模型在现场直接改写自己的参数，而是建立一套可追溯、可审核、可回滚的经验沉淀链路。

![](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZmZjYjM5MjFjOWVlN2I5YzE3ZjhiZTkwMjg3ZjdlYTJfZGZkYWEwMTk4ZGUzZGVhMjYxNGE3ZTlmNDQ5ZDM2ZWJfSUQ6NzYzNjk2MzI3MDk2MDMxOTY2N18xNzgxNTk0ODc3OjE3ODE1OTg0NzdfVjM)

### 8.1 需要被学习的内容

系统应优先沉淀五类信息：

![](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZGEzMjY5NzU2ZDBlM2U5MzcyODM5MWUyNzgzNzBlYjFfMTczNTlhZjczYWI4YTc3ODg0MjFhZjFkYzZhM2IwZWVfSUQ6NzYzNjk2MzI5Njk5ODI4MDEzNF8xNzgxNTk0ODc3OjE3ODE1OTg0NzdfVjM)

### 8.2 学习如何影响下一次评审

学习结果不应只停留在文档里，而要影响下一次评审链路。

![](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YWM0YTEyMzllN2VmNjY4M2RiMzRhYTVhMzBiODQ2MGRfZDM4ZjgwZjY5ODAxMmU0MGUxNDM0MTFkZDEyZmU3MjZfSUQ6NzYzNjk2MzMyODQ0MzI4ODc4Nl8xNzgxNTk0ODc3OjE3ODE1OTg0NzdfVjM)

这样 agent 的进化不是抽象的“越来越聪明”，而是每次评审后都能把可验证经验变成具体的规则、检索、profile、提示词或工具链改进。

### 8.3 安全边界

持续学习必须有边界，否则会把错误经验沉淀成系统规则。

- 不记录密钥、账号、完整环境变量、未脱敏原理图路径和无关聊天内容。
- 不把单次未确认反馈直接升级为全局规则。
- 不让 LLM 自己决定规则是否生效，规则提升必须经过人工确认。
- 不覆盖原有规则，所有规则变更必须保留版本、来源和回滚路径。
- 不把“官方参考设计差异”误推广为“所有平台都必须一致”的规则。

最终目标是让 agent 在每一次真实评审后，都能留下可复用、可审计、可回归的经验资产。这样系统不会停留在一次性 RAG 问答，而会逐步成长为公司自己的原理图评审知识与规则平台。
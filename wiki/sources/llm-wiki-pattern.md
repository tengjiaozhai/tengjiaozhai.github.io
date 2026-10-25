---
type: source
title: "LLM Wiki 模式（Karpathy 原文 gist）"
source_file: "raw/articles/2026-10-22-karpathy-llm-wiki-gist.md"
source_type: article
domain: ai
raw_digest: "55-15730831"
lines: 55
captured: 2026-10-22
status: verified
tags: [llm-wiki, methodology]
entities: ["wiki/entities/llm-wiki-app"]
concepts: ["wiki/concepts/摄入流水线", "wiki/concepts/意图层与结构层分离"]
---

# LLM Wiki 模式（Karpathy 原文）

> AGENTS.md §1 的 `[原文]` 指向本页。原文 <https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f>，2026-10-22 由 agent 用 web_fetch 抓取落盘（非浏览器裁剪，`origin: agent-fetch`），转义符已还原，其余逐字。
> 本仓的三层架构、五类页面、`index.md`/`log.md` 分割都出自这一篇。

## 这一篇覆盖什么

- 边界：一份**可粘贴给 agent 的模式文档**，作者自述「intentionally abstract … describes the idea, not a specific implementation」。没有实验、没有代码、没有成本数字。
- 覆盖：核心判断（RAG 每次重推 vs wiki 编译一次）、三层架构、三个操作、index/log 两个结构文件的分工、若干可选工具、以及**为什么这套东西成立**的论证。
- 不覆盖：具体实现、并发、失效条件、规模上限之后的办法（只说「到时你可能想建工具」）。

## 可抽出的原子

| 原子 | 去处 | 说明 |
|---|---|---|
| 「编译一次并保持最新，而不是每次查询重推」 | 本页与 [[wiki/entities/llm-wiki-app\|实现版]] | 与 RAG 的分野，也是「为什么值得付维护成本」的论证 |
| Ingest 的四步骨架 + 「一份源触达 10–15 页」 | [[wiki/concepts/摄入流水线\|摄入流水线]] | 已建。本仓 §6.2 是它的人工收缩版 |
| schema 的角色：让 LLM 成为「有纪律的维护者」而非通用聊天机器人 | [[wiki/concepts/意图层与结构层分离\|意图层与结构层分离]] | 已建。本仓结论：purpose 暂不独立成文件 |
| index.md 在 **~100 sources / 数百页**规模够用，可避免 embedding RAG | [[wiki/concepts/知识图谱健康度\|知识图谱健康度]] | 本仓规模判断的第一手依据，已据此修正此前的「200+」推断 |
| Query 的好答案要回填成新页 | 本仓 §6.3 第 6 条 | 原文原话：不要让探索消失在聊天记录里 |
| Lint 的具体检查清单（矛盾、过期、孤儿、被提及但无页的概念、缺交叉引用、可搜索补的数据缺口） | 本仓 `tools/wiki-lint.mjs` + `index.md`「待建页面」 | 本仓六项里前四项等价，后两项靠手写段承担 |
| Web Clipper + 图片落 `raw/assets/` + 热键批量下载 | 本仓 §4.7 | **旁证**：本仓今天订的裁剪落盘规则与原文建议一致 |
| 「维护成本（簿记）才是 wiki 被放弃的真原因」 | 本页判断 | 这条比任何实现细节都重要 |

## 与其他笔记的重叠点

- 与本仓 `AGENTS.md` 是**源与派生**：§2 三层、§3 目录、§4 五类页面、§6 操作、§7/§8 两类结构文件的格式，都能在这篇里找到对应句。
- 与 [[wiki/sources/llm-wiki-app-readme|nashsu 实现版]] 是**抽象 vs 实现**：本文只说「LLM 增量构建并维护」，那份给出 19 项增强、四信号权重、五阶段管线。
- **唯一实质冲突是 raw 可变性**：原文要求原始资料不可变，本仓允许改写、用 `raw_digest` 防漂移（§2.1、§10 已登记为有意偏离）。

## 本篇独有、别处没有的

- **成本论证**：RAG 下「问一个需要综合五份文档的问题，LLM 每次都得重新拼」，而 wiki 里交叉引用、矛盾标记、综合结论**已经在那了**。两份衍生材料都只讲怎么做，只有这里讲为什么值得。
- **它是写给 agent 的**：作者明确说这份东西的用法是整段粘给你的 agent，让 agent 和你一起把细节补出来。这解释了本仓为什么把规则写成 `AGENTS.md` 而不是文档站。
- **Memex 类比**（Vannevar Bush, 1945）：私人、主动策展、**文档之间的关联和文档本身一样有价值**；Bush 没解决的是「谁来做维护」——LLM 解决了。这是本仓「跨页链接价值高于单页完整」那条判据的出处。
- **具体规模锚点**：`index.md` 在约 100 个 source、数百页时仍够用。本仓 80 页远在安全区内。

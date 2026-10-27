# AGENTS.md — 藤椒斋知识库 Schema

> 本文件是三层架构中的 **schema** 层，是维护 `wiki/` 的唯一行为约束。它同时收编原 `.cursor/rules/knowledge-base.mdc` 的站点发布规则，两份规则合并于此，`.cursor/rules/knowledge-base.mdc` 只留一行指针。
>
> 每次会话开始：先读 `wiki/index.md` 和 `wiki/log.md` 末尾 5 条，再读本文件确认约定，然后动手。
>
> 来源标注：
> - `[原文]` = 来自 [[wiki/sources/llm-wiki-pattern|LLM Wiki 模式]]
> - `[本地]` = 本仓按自身主题订立，可随实践修改
> - `[改]` = 与 LLM Wiki 模式的有意偏离，理由见 §10

---

## 1. 核心定位

**主题域**：Agent 工程与 LLM 应用的实践积累 —— 我自己写下的判断、机制拆解和取舍。

不是资料剪藏堆，也不是发布站点的镜像。它要回答三类问题：

1. **「这件事我之前怎么判断的？」** —— 结论 + 依据 + 当时的前提条件。
2. **「这个机制到底怎么工作？」** —— 拆到能复述的程度，带本仓真实代码与数字。
3. **「为什么不用另一种做法？」** —— 取舍与被放弃的方案。

**价值判据**：wiki 的价值不在记录了多少，而在**跨页面的链接能否让旧判断在新场景下被找到**。一页孤立但完整的记录，价值低于三页互相链接的不完整记录。

**当前规模与形状**（2026-10-19 基线，重算时更新）：

| 层 | 内容 | 规模 |
|---|---|---|
| raw | 根目录 10 篇大笔记 | 14,365 行 / 533 个 h2 |
| raw | `thoughts/` LLMentor 项目笔记 | 102 篇 / 11,212 行 |
| raw | `images/` | 89 张 / 57M |
| raw | `output/` 成品 HTML | 17 个 |
| wiki | 已建 **107 页** | sources 54 / entities 14 / concepts 29 / synthesis 9 / outputs 1（2026-10-26 重算） |

---

## 2. 三层架构

| 层 | 位置 | 谁能写 | 性质 |
|---|---|---|---|
| **raw** | 根目录 `*.md`、`thoughts/`、`images/`、`output/`、`raw/`（只收外部裁剪） | 人类；agent 只在明确授权下追加 | 自有笔记**可改写**，会持续重写；`raw/articles/` 的外部裁剪**不可改写**，只追加 |
| **wiki** | `wiki/` | 只有 LLM | LLM 完全拥有。生成、更新、交叉引用、一致性。人类只读 |
| **schema** | `AGENTS.md` | 人类与 LLM 共同演化 | 本文件 |

### 2.1 raw 可改写 `[改]`

LLM Wiki 模式要求 raw 不可变。本仓不适用：这些笔记是我正在持续重写的第一手整理（2026-10-19 一次就删了 15 篇、改了 4 个文件名）。

替代约束：**不允许静默漂移**。source 页 frontmatter 记 `raw_digest: <行数>-<sha1 前 8 位>`，`lint` 核对。变了就把 source 页标 `stale`，提示重新过一次。

这条豁免**不覆盖 `raw/` 下的外部裁剪**（§4.7）。外部文章天生不可变：只追加，不改写。它们也要登记 `raw_digest`，但一旦 `lint` 报漂移，含义不是「我重写了它」，而是「有人改了外部原文」——属异常，按 §5.4 记冲突，不按正常重写处理。

```bash
# 算 digest
shasum -a 1 "Harness学习笔记.md" | cut -c1-8
wc -l < "Harness学习笔记.md"
```

### 2.2 写权按角色分，不按物种分

维护 `wiki/` 的 agent 不写 raw。要补证据时说明需要什么，由人类或另一次任务落盘。出结论的人不能同时提供证据。

**DSH 自动经验来源**：用户启用 `dsh-memory-wiki` 的 capture 后，独立事实采集器可将已发生的脱敏事件写入 `experiences/<jobId>.md`；该记录不可改写。Wiki writer 只读该证据，不能生成测试结果或补造事实。它不获得其他 raw 目录写权。

### 2.3 页面路径不动

根目录笔记与 `thoughts/` 的路径、文件名、图片目录**一律不改**。原因：

- `index.html` 的 `toSlug()` = 文件名去 `.md`，改名即断外链
- 图片是 `images/{slug}/x.png` 相对路径
- `MD_FILES` / `HIDDEN_FILES` 硬编码

要重组内容，做法是**在 wiki 层另建页面并链回原文**，不是搬 raw。

### 2.4 删除 raw 的级联 `[本地]`

删掉一篇 raw 时，它的 wiki 页**一起删**，不留孤儿。步序：

1. 删 `wiki/sources/<同名>.md` 整页
2. 从其他页 frontmatter 的 `sources[]` 里摘掉这条
3. 删掉正文中指向它的 `[[…]]`，不留断链
4. `node tools/wiki-index.mjs --write` 重建 index，`log.md` 记 `ingest`（删除属清理，不另立 op）

**共享页不连坐**：被多篇 raw 支撑的 entity / concept 只摘 `sources[]` 条目、保留页面本体。判据是「这页的知识是否只因这一篇而存在」，不是「这页有没有引用这一篇」。若摘完 `sources[]` 为空，该页降 `confidence` 一级并进「待澄清」，不直接删。

删除 raw 与 wiki 页一律移入系统回收站，不 `rm`（工作原则 A2）。

依据：[[wiki/sources/llm-wiki-pattern|LLM Wiki 模式]] §Operations 与 [[wiki/sources/llm-wiki-app-readme|实现版]] §16（三重匹配 + 共享实体保护）。本仓做了简化——只认 `sources[]` 一条匹配，不扫章节引用。

---

## 3. 目录结构 `[本地]`

```
tengjiaozhai.github.io/
├── AGENTS.md                  # schema 层：本文件（同时收编站点发布规则）
├── index.html                 # 站点 SPA，不动
├── *.md                       # raw：10 篇大笔记，路径不动
├── thoughts/*.md              # raw：102 篇 LLMentor 项目笔记
├── experiences/*.md           # 授权的 DSH 编码原始事件，采集器写入、不可改写
├── images/                    # raw：图片，按 slug 分目录
├── output/*.html              # raw：成品 HTML，即 output 层的实体
├── raw/                       # raw：外部裁剪，只追加不改写
│   ├── articles/              # 一篇一文件，YYYY-MM-DD-<kebab>.md（§4.7）
│   └── assets/                # 裁剪下载的图片，ingest 时归并到 <slug>/
├── tools/
│   ├── wiki-index.mjs         # 扫 frontmatter 重建 index.md 自动段
│   └── wiki-lint.mjs          # 断链 / 孤儿 / 字段 / digest 漂移 / 重复概念
└── wiki/                      # LLM 编写的知识层
    ├── index.md               # 全库目录（自动段 + 手写段）
    ├── log.md                 # 时间线（追加式，可 grep）
    ├── sources/               # 一份 raw 资料一页
    ├── entities/              # 有名有姓的东西
    ├── concepts/              # 可复用的机制 / 做法 / 判断
    ├── synthesis/             # 跨来源分析、对比、决策档案
    └── outputs/               # 指向 output/*.html 的索引页
```

**`raw/` 的边界**（2026-10-22 修订）：`raw/` 只收**外部裁剪**（浏览器 Web Clipper 落盘的文章，见 §4.7），不收自己的笔记——自有笔记仍在根目录与 `thoughts/`，路径一律不动（§2.3）。分开的理由是两者的可变性与写权不同：外部的不可变、需要独立的 digest 纪律；自有的会持续重写。混在一处，§2.1 那条豁免就失去了依据。

**不建的东西**：`raw/commits/`、`raw/issues/`、JIRA/git 投影工具。本仓没有那个场景，搬过来只增加每次启动的读取成本。

### 3.1 归属判定树

新建页面前走一遍：

- 有名有姓、能搜到官网或仓库 → `entities/`（库、框架、服务、云厂商、模型、语言）
- 抽象、可复用、跨项目成立的「做法/机制/判断」→ `concepts/`
- 跨来源的比较、综述、决策记录 → `synthesis/`
- 一份 raw 资料的登记与分流 → `sources/`
- 只为某次提问产生的成品，且已冻结成 HTML → `outputs/`

---

## 4. 页面类型与模板 `[本地]`

每页以 YAML frontmatter 开头。字段强制，标 optional 的除外。

> 适用范围：五个内容目录。`wiki/index.md` 与 `wiki/log.md` 是**结构文件**，不带 frontmatter，由 §7/§8 自身格式约束，`lint` 的 `type:` 检查必须排除这两个文件。

### 4.1 source — 一份 raw 资料的登记页 `[改]`

**角色改了**：原文是你自己的结论，再写「关键收获」等于复述。source 页的交付物是**发掘与分流** —— 从这篇里能抽出哪些原子，和别处哪里重叠。

命名：与 raw 文件同名。`Harness学习笔记.md` → `wiki/sources/harness学习笔记.md`。
纯中文文件名允许（翻译反而不可检索），必须给 `aliases`。日期一律 `YYYY-MM-DD`。

```markdown
---
type: source
title: "Harness 学习笔记：四套上下文压缩方案完整拆解"
source_file: "Harness学习笔记.md"
source_type: note          # note | article | thought-batch | toc | dataset
domain: ai                 # ai | eda | security | tool | finance | learning | other
raw_digest: "4010-a1b2c3d4"
lines: 4010
captured: 2026-10-19
status: verified           # verified | unverified | superseded | partial | stale
tags: [harness, context-compression]
entities: ["wiki/entities/agentscope", "wiki/entities/pi"]
concepts: ["wiki/concepts/上下文压缩"]
---

# Harness 学习笔记

## 这一篇覆盖什么        ← 3~5 条，写边界不写内容
## 可抽出的原子          ← 指向 concepts/ 的候选清单，本页主要交付物
## 与其他笔记的重叠点     ← 同一主题哪篇也讲过，指向 synthesis 候选
## 本篇独有、别处没有的   ← 真正不可替代的部分
```

DSH 经验来源沿用 `source_type: note`，`source_file: experiences/<jobId>.md`，登记页为 `wiki/sources/<jobId>.md`。digest 口径为 `split('\n').length` 与原文 SHA1 前八位；登记页只分流原子，不将助手自述当成已证实结果。经验文件不进站点 `MD_FILES`。

`status` 语义：`verified`（有代码/日志/数字支撑）/ `unverified`（断言未证）/ `superseded`（被更新材料取代，正文顶部加 `> ⚠️ 已被 [[…]] 取代`）/ `partial`（原文残缺，如转录中断）/ `stale`（raw_digest 已漂，待重过）。

### 4.2 `thoughts/` 的三层登记录 `[改]`

`thoughts/` 不是 102 份等价资料。按**是否含独立可复用观点**分三档，source 页数量跟内容走不跟文件数走。

| 层 | 数量 | 形态 | 判据 |
|---|---|---|---|
| **A. 独立 source 页** | ~45 | `wiki/sources/thoughts-<slug>.md` | 含一个别处没有的机制/判断/取舍 |
| **B. 簇汇总页** | 6 | `wiki/sources/thoughts-<簇名>.md` | 同主题串行记录，单篇只是连续叙事的一段 |
| **C. 只进登记表** | ~51 | 只登记在 `thoughts-toc.md` 一行 | 纯配置/清单/被 A 层覆盖的重复叙述 |

**草稿不建 source 页**：`thoughts/` 里无 `✅` 前缀的 15 篇只进 toc，标 `draft`。带 `✅` 的 87 篇才进 A/B。

`wiki/sources/thoughts-toc.md` 是一行一篇的登记表（`type: source` + `source_type: toc`），承担 index 检索分辨率和按单篇回查，**不承担** digest 校验与正文分析。格式：

```markdown
| # | 标题 | 行数 | 层级 | 去向 |
|---|---|---|---|---|
| 071 | 提示词工程—结构化输出约束 | 384 | A | [[wiki/concepts/结构化输出\|结构化输出]] |
| 025 | 各个Agent配置对比一览 | 16 | C | 簇 029-037 |
```

`thoughts-toc.md` 是整个 wiki 里唯一允许手写表格的页面，`wiki-index.mjs` 不重建它，只校验覆盖（102 行必须齐）。

### 4.3 entity — 具体的东西

命名：`wiki/entities/<小写 ASCII kebab>.md`，中文名进 `title` 与 `aliases`。

```markdown
---
type: entity
title: "AgentScope"
entity_kind: framework    # project | library | service | tool | framework | language | infra | model
domain: ai
aliases: [agentscope-java]
version_of_interest: "1.x / 2.0"
tags: [agent-framework]
sources: ["wiki/sources/harness学习笔记"]
concepts: ["wiki/concepts/上下文压缩"]
---

# AgentScope

## 是什么 / 在我的体系里的位置
## 已知问题与判断          ← 每条必须链证据页
## 关键配置与用法
## 相关实体 / 相关概念
## 时间线                 ← 1.x → 2.0 这类改变结论的事件，带日期
```

「已知问题与判断」的写法是索引不是流水账：

```markdown
- **1.x 六层压缩已被 2.0 四正交策略取代** → 见 [[wiki/concepts/上下文压缩]]
  · 前提：1.x `agentscope-extensions-autocontext-memory` · 2.0 已重构 · 状态：结论已更新
```

### 4.4 concept — 抽象的方法 / 机制 / 判断 `[改]`

**模板换了**：原模式是给排障用的（排查步骤/根因分类/失效条件）。这里要的是知识沉淀，多一段「我目前的判断」和「取舍与边界」。

```markdown
---
type: concept
title: "工具熔断"
domain: ai
aliases: [tool-circuit-breaker]
tags: [agent, reliability]
sources: ["wiki/sources/agent-开发学习笔记"]
entities: ["wiki/entities/agentscope"]
related: ["wiki/concepts/工具缓存"]
confidence: high          # high | medium | low
as_of: 2026-10-19         # 判断成立的时间点
---

# 工具熔断

## 一句话定义
## 我目前的判断          ← 结论，含成立条件
## 关键机制              ← 拆到能复述
## 我的实例              ← 引用本仓真实代码/配置/数字
## 取舍与边界            ← 为什么不用另一种做法；什么时候失效
## 待澄清                ← 已知没吃透的点
## 证据
```

`confidence` 与 `as_of` 同时给。技术结论会过期，`as_of` 让 `lint` 能报「超过 180 天未复核的 `confidence: high`」。

### 4.5 synthesis — 跨来源分析 / 决策档案

命名：综述用描述性 kebab；带具体事件的加日期 `wiki/synthesis/<YYYY-MM-DD>-<slug>.md`。

```markdown
---
type: synthesis
kind: comparison         # comparison | overview | decision | incident
title: "四套上下文压缩方案对比"
date: 2026-10-19
status: settled          # investigating | settled | superseded
domain: ai
tags: [context-compression]
sources: ["wiki/sources/harness学习笔记"]
concepts: ["wiki/concepts/上下文压缩"]
---

# 四套上下文压缩方案对比

## 问题                  ← 为什么需要这份对比
## 对比                  ← 表格或分节，每格可追证据
## 我的结论
## 适用范围              ← 什么场景用哪套
## 未定论的分歧          ← 有分歧就按 §5.4 写，不覆盖
```

### 4.6 output — 成品索引页

`output/*.html` 是成品实体，`wiki/outputs/` 只放索引，不复制内容。

```markdown
---
type: output
title: "output 成品索引"
date: 2026-10-19
output_form: table       # answer | table | checklist | deck | chart | doc-draft
frozen: true             # output 不随来源更新
---

# output 成品索引

| 文件 | 主题 | 类型 | 依据页面 |
|---|---|---|---|
| `output/skill-vs-tool.html` | Skill vs Tool 分工 | 图解 | [[wiki/concepts/skill-vs-tool\|Skill vs Tool]] |
```

### 4.7 裁剪件 — `raw/articles/` 的落盘格式 `[本地]`

浏览器 Web Clipper 把外部文章写到 `raw/articles/`，一篇一文件。它不是 `source` 页，是 raw 层输入，**由人产生、agent 不写**（§2.2）。不可改写：落错了追加一篇新的并标 `superseded`，不改旧的正文。

文件名 `YYYY-MM-DD-<kebab>.md`，中文标题进 `title`。**不按域分目录**——域归属在裁剪那一刻常拿不准，而 `domain` 字段已能承担分类，按目录切反而制造搬迁成本。

```yaml
---
title: "LLM Wiki：用 LLM 维护你自己的知识库"
url: https://example.com/post
author: "Karpathy"
published: 2026-10-01
clipped: 2026-10-22
domain: ai                 # ai | eda | security | tool | finance | learning | other
status: unread             # unread | ingested | parked
---
```

- `url` 必填。它是外部资料唯一不可再造的证据链：源站下线后，这是唯一还能指出「我当时读的是哪一篇」的东西。
- `status` 是 ingest 的待办游标：`grep -l "status: unread" raw/articles/*.md` 就是未消化清单。
- 图片进 `raw/assets/`（Clipper 只支持单一平铺目录），ingest 时归并到 `raw/assets/<slug>/`。**不要**放进 `images/{slug}/`，那是站点资源根。

**ingest 一份裁剪件时**：建 `wiki/sources/<与裁剪件同名>.md`，`source_type: article`（枚举里已有此值），`source_file` 指到 `raw/articles/…`，`raw_digest` 用 `split('\n').length` 口径（不是 `wc -l`，两者差 1）。`status` 只给 `verified`（官方文档、含代码或数字）或 `unverified`（观点文），不默认 `verified`。处理完把裁剪件的 `status` 改成 `ingested`。

---

## 5. 硬性规则

### 5.1 双链要求 `[本地]`

- 正文提到任何已存在的 entity / concept / source / synthesis 时，必须写成双链，不能只写名字。
- 写法：**vault 相对全路径 + 别名** → `[[wiki/entities/agentscope|AgentScope]]`。全路径保证唯一解析，别名保证阅读流畅。
- frontmatter 的 `entities` / `concepts` / `sources` / `related` 填**不带方括号的路径**，正文用双链。两处都要有。
- **每页至少一条出站链接**。无页可链时显式写 `## 待链接` 列出应建页面名，供 `lint` 命中缺口，不许留空。
- **不链 raw 内部小节**。`index.html` 的 TOC 用 `heading-{i}`，给 290 个 h2 的大笔记插一节，后面全漂。证据只指到**文件级 + 标题文本**：`Harness学习笔记.md` §「六层渐进式压缩」。
- `[[CLAUDE]]` 式的 schema 链改指 `[[AGENTS]]`。

### 5.2 命名 `[本地]`

- 目录与小写 kebab-case，不带空格、下划线、中文标点。
- 纯中文概念允许中文文件名（`上下文压缩.md`），必须给 `aliases`。
- 禁止同名文件分散在不同目录。冲突时加限定后缀。
- 文件名承载可检索信息，`title:` 承载可读性。
- 日期一律 `YYYY-MM-DD`。

### 5.3 一个概念只有一页权威 `[本地]`

新建前先 `grep` `wiki/index.md` 与 `wiki/concepts/`。已有页面能容纳就**更新它**，不建平行页。重复页面是本 wiki 的头号退化模式。`tools/wiki-lint.mjs` 会按 `title` + `aliases` 交叉查重。

### 5.4 冲突不覆盖 `[本地]`

新来源与已有结论矛盾时，在旧页面加：

```markdown
## 冲突

> ⚠️ 与本页结论矛盾，两种观点都保留，未定论。

**观点 A**（本页，基于 [[wiki/sources/…]]，2026-10-19）：…
**观点 B**（[[wiki/sources/…]]，2026-09-01）：…

分歧点：两者对「…」的判定方法不同 —— A 看指标，B 看异常类型。
待验证：<能区分两者的实验>
```

要点：给出分歧的**原因**，不只是「A 说 X、B 说 Y」；给出能定论的验证方式；定论后不删历史，改 `status` 并保留一条已解决记录。

「旧结论被新材料取代」是另一种情形，用 `status: superseded` + 顶部提示链接新页，不套冲突模板。

### 5.5 证据可追溯 `[本地]`

任何事实性断言（配置项行为、版本差异、性能数字、根因判定）必须能落到一个 `sources/` 页面或 raw 的**具体标题**。写不出证据的要么标 `confidence: low`，要么进「待澄清」。

追溯粒度两档：

- **段落级**（根目录大笔记、A 层 thoughts 页）：断言指到 raw 文件的具体小节标题。
- **清单级**（B 层簇页、`thoughts-toc.md`）：允许「所覆盖 raw 文件清单 + 可复跑谓词」作为追溯单位，但必须给出**可复跑谓词**（`grep -l "提示词工程" thoughts/*.md`）与**支撑结论的具体文件名**（至少 3 个）。

两档都禁止：把 `grep -c` 的结果直接写进页面。`grep -c` 对多文件返回**每文件计数**而非总数；不带 `-w` 会被子串命中（`race` ⊂ `trace`）；代码块里的示例也会被算进去。

### 5.6 复现优先 `[本地]`

问题与结论类页面必须区分：**观察到**（有代码/日志/数字）、**推断出**（推理未验证）、**已证实**（复现过）。措辞强制体现：不确定写「疑似」「推断」，不许写成陈述句。

### 5.7 outputs 不回填 `[本地]`

`concepts/` 与 `synthesis/` 是活的知识，随来源更新；`output/*.html` 是某一刻的成品快照。新材料推翻结论时不去改旧 HTML，而是更新对应 concept 页；若某份成品已误导，在其索引页加 `> ⚠️ 本页结论已被 [[…]] 修订`。

### 5.8 wiki 不进站点 `[本地]`

`[[…]]` 在 `index.html` 里不会渲染成链接。首批 wiki 只服务人和 agent，不进 `MD_FILES`。

将来要上站时改 `index.html` 加 `[[…]]` → `<a>` 转换，届时需解决双链解析歧义。不在首批范围。

---

## 6. 操作流程

### 6.1 compile — 把已有 raw 织进 wiki `[本地]`

本仓独有操作。用于「raw 已经堆了很多，wiki 没跟上」的批量任务。做完即废，但 `log.md` 永久保留。

1. **建矩阵**：扫 raw 的 h2 清单，产出「主题 → 出现篇章」矩阵。用 `rg '^## '` 而不是猜。
2. **裁 concept**：按矩阵出现次数 ≥2 的主题裁出 concept 名单。只出现 1 次的留在 source 页的「本篇独有」里。
3. **写 concept**：每个 concept 页的验收是至少 3 个断言能落到 ≥2 篇 raw 的具体标题。做不到的不建。
4. **反向补 sources**：每页「可抽出的原子」指向已建 concept。
5. **写 synthesis**：跨来源对比与决策档案。
6. **生成 index**：`node tools/wiki-index.mjs --write`；手写段（待建页面、raw 摄取状态）人工填。
7. **追加 log**：`## [<日期>] compile | <批次名>`，正文写 touched 清单与未覆盖的缺口。
8. **报账**：列出被改文件、lint 结果、下一批候选。

### 6.2 ingest — 处理一份新 raw 资料

<!-- dsh-memory-wiki:auto-capture=v1 -->

**已授权的 DSH 自动摄入**：对用户主动启用的 capture，原始证据充分、Jev 两阶段高置信、无未解决冲突、暂存 lint/引用/版本校验通过时，直接发布并记录拟改清单与 jobId，无需逐条确认。普通 ingest 仍按下列确认流程；中低置信保留候选，冲突保留双方且不覆盖旧判断。自动发布只新增知识页或在既有正文末尾补实例，保留旧正文及来源；source/index/log 由程序按固定格式更新。

1. 读全。含内嵌图时先读文本再单独读图（一份含图文件无法一次读完）。
2. 判断归属：新事实，还是已有内容的重复？重复则只更新已有 source 页并补链接。
3. **先汇报，后落笔**：列出关键收获、拟建/拟改页面、发现的冲突。等确认再写。
4. 建或更新 source 页（§4.1），算 `raw_digest`。
5. 扇出：concept 页的「我的实例」「取舍与边界」，entity 页的「已知问题与判断」。逐页检查双向链接。
6. 冲突按 §5.4，不覆盖。
7. `node tools/wiki-index.mjs --write`，追加 log `## [<日期>] ingest | <标题>`。

### 6.3 query — 回答问题

1. 先读 `wiki/index.md` 找候选页，必要时 `rg -l` 全 `wiki/`。
2. 读候选页全文，不停在摘要。需要细节时回溯 `source_file` 读 raw。
3. 答：简短，带引用（`依据：[[wiki/…]]`）。wiki 没覆盖就直说「wiki 未覆盖」，并说明该找什么资料。
4. `confidence: low` / `unverified` / `stale` 的内容必须在答案里降级表述。
5. 有 `## 冲突` 的页没有单一答案，必须把两方观点与分歧原因都给出来。
6. 若答案有沉淀价值，提议回档为 output 或 synthesis。
7. 追加 log `## [<日期>] query | <问题>`。

### 6.4 lint — 健康检查

```bash
node tools/wiki-lint.mjs                 # 全量报告，只读
node tools/wiki-lint.mjs --only broken   # 只看某一类：broken|orphan|frontmatter|digest|dup|stale
```

`index.md` 的重建不归 lint 管，用 `node tools/wiki-index.mjs --write`（见 §6.1 第 6 步）。

检查维度：

1. **结构**：断链、孤儿页、frontmatter 字段缺失、命名违规、`type` 缺失。
2. **漂移**：`raw_digest` 与当前 raw 不符 → 标 `stale` 并建议重过。
3. **重复**：concept/entity 的 `title` 与 `aliases` 交叉命中。
4. **缺口**：正文反复提及但无页面的概念（来自各页「待链接」段）；`thoughts-toc.md` 覆盖是否 102 行齐。
5. **过期**：`confidence: high` 且 `as_of` 超过 180 天；`status: investigating` 超过 30 天无更新。

**grep 类检查有已知假阳性**：不区分正文与代码块，模板里的占位 `[[wiki/…]]` 会被误报为断链。所以只扫五个内容目录，`index.md` / `log.md` / `AGENTS.md` 排除，命中必须人工复核才能写进报告。不要为了「检查通过」给结构文件加 frontmatter。

输出按影响排序，不自动改。人类选定后逐项修复，一次 lint 记一条 log。

### 6.5 save — 把对话产出写入 wiki

1. 判定类型（`output` 索引 / `synthesis`）与命名。
2. 写页，正文只放成品与依据，不复述整段对话。
3. 建链接：成品引用的每页都要在正文或 frontmatter 出现；回头给被引用的页加一条指回本页的链接（单向引用是孤儿来源）。
4. `node tools/wiki-index.mjs --write`，追加 log `## [<日期>] save | <标题>`。

---

## 7. `index.md` 格式

内容导向的全库目录。`node tools/wiki-index.mjs --write` 重建自动段，手写段保留。

```markdown
# Wiki Index

> 最近更新：2026-10-19 · 共 N 个内容页（另有本文件与 log）· 状态：compile 首批

## Sources
- [[wiki/sources/harness学习笔记|Harness 学习笔记]] · note · 4010 行 · `verified` · 四套上下文压缩方案
- [[wiki/sources/thoughts-toc|thoughts 登记表]] · toc · 102 篇 · 逐篇去向

## Entities
- [[wiki/entities/agentscope|AgentScope]] · framework · 1.x→2.0 压缩策略变更

## Concepts
- [[wiki/concepts/上下文压缩|上下文压缩]] · high · 被引用于 4 页

## Syntheses
- [[wiki/synthesis/四套上下文压缩方案对比|四套上下文压缩方案对比]] · comparison · `settled`

## Outputs
- [[wiki/outputs/output-index|output 成品索引]] · table · frozen

<!-- wiki-index:auto-end -->

## 待建页面            ← 手写段，lint 的输入
- `wiki/concepts/…` — 被 [[…]] 提及 3 次，尚无页面

## raw 摄取状态        ← 手写段，必需
| 目录 | 文件 | 已消化 | 谓词/口径 | 对应页面 |
|---|---|---|---|---|
| 根目录 *.md | 10 | 10/10 | 逐份 §6.2 | wiki/sources/ |
| `thoughts/` | 102 | A 45 + B 6 + C 51 | `grep -l "^# " thoughts/*.md` | thoughts-toc |
| `output/` | 17 | 1 索引页 | 逐份登记 | outputs/output-index |
```

**规则**：一行一条，`[[链接|标题]] · 类型/元数据 · 一句话摘要`；每类给计数。`## raw 摄取状态` 是必需的，否则读 index 的会话不知道 raw 里有多少未消化记录，会重复劳动。写进页面的每个计数**带重算日期**。

---

## 8. `log.md` 格式

时间导向的追加式记录。**只追加，不回改历史条目**（写错了追加一条修正条目）。

```markdown
# Log

## [2026-10-19] schema | 建立 AGENTS.md，收编站点发布规则
按 [[wiki/sources/llm-wiki-pattern]] 订立三层架构与 5 类页面。待观察：thoughts 三层分档的实际命中率。

## [2026-10-19] compile | 首批 ai 域
新增 12 concepts / 8 entities / 4 synthesis / 51 sources。
touched: index.md
缺口: `原理图与 EDIF 工作流.md` 290 个 h2 未拆，eda 域留待第二批。

## [2026-10-19] lint | 4 项
1. 断链 3 处 —— 已修
2. `confidence: high` 且 as_of 过期 1 页
```

**硬性规则**：

- 条目一律 `## [YYYY-MM-DD] <op> | <标题>`，行首。
- **方括号内只允许日期**，不允许时刻或空格。需要时刻就写进标题末尾 `… | 核对索引（18:11）`。
- `op` 只允许 6 个值：`compile` / `ingest` / `query` / `lint` / `save` / `schema`。新增须先改本文件。
- 正文简短，但必须包含 `新增` / `touched:` / `冲突:` 之一。
- 可 grep：

```bash
grep "^## \[" wiki/log.md | tail -5
grep "^## \[.*\] compile |" wiki/log.md
grep "^## \[" wiki/log.md | sed 's/^## \[[0-9-]*\] \([a-z]*\).*/\1/' | sort | uniq -c
```

---

## 9. 站点发布规则（原 `.cursor/rules/knowledge-base.mdc`）

静态站点：`index.html` 加载 `MD_FILES` + `HIDDEN_FILES` 里的 Markdown，分类与图片目录以 `CATEGORY_RULES` 为准。

| slug | frontmatter `category` | 文件名推断关键词 |
|---|---|---|
| `ai` | `AI / Agent` | ChatGPT、Claude Code、Claude Agent、DevSpace、MCP、Hermes、Wrench、Codex、Harness、Lang Graph、Matt Pocock、Skills、Agent Scope、agent、Agent、金标、评测、试产、Dreaming、read_file、提示词缓存、大模型工程、父子智能体 |
| `eda` | `原理图 / EDA` | EDF、EDIF、原理图、PDF Drawing |
| `security` | `安全 / 运维` | PostgreSQL、ZTE、安全运维、安全、加固、攻击、滑块 |
| `tool` | `工具 / 工作流` | HTML、Playwright、工作流 |
| `finance` | `金融` | 基金、金融、投顾 |
| `other` | `其他` | 以上均不匹配时 |

**新增/整合 Markdown**：

1. 中文文件名，如 `DevSpace MCP 配置指南.md`。
2. 文首 YAML frontmatter，`category` 与上表 label **完全一致**：

```yaml
---
title: 文档标题
date: YYYY-MM-DD
desc: 一两句话简介，用于首页卡片
category: AI / Agent
tags: [标签1, 标签2]
---
```

3. 在 `index.html` 的 `MD_FILES` 追加文件名。
4. 文件名无法被现有正则匹配时，同步扩展 `CATEGORY_RULES` 的 `test` 正则。
5. 禁止飞书图片链接；整合外部文档时改本地图。

**图片**：按 slug 放 `images/{slug}/`，不放 `images/` 根目录，引用路径 `images/{slug}/文件名.ext`。优先语义化文件名。

**整合后检查**：

- [ ] frontmatter 完整，`category` 与 slug 一致
- [ ] 所有图片在 `images/{slug}/`，链接可访问
- [ ] `MD_FILES` 已注册
- [ ] 无残留 `feishu.cn` / `internal-api-drive-stream` 链接

**提交与推送**：用户明确说「提交」「推送」时才执行，勿擅自 commit。

```bash
git status && git diff && git log -3 --oneline
git add <相关文件>
git commit -m "简述变更目的（中文 1-2 句，写为什么，不堆文件清单）"
git push
```

不 `--force` 推 master；不跳过 hooks；不改 git config。

---

## 10. 相对 LLM Wiki 模式的有意偏离 `[改]`

| 偏离 | 原模式 | 本仓 | 理由 |
|---|---|---|---|
| raw 可改写 | raw 不可变 | 用 `raw_digest` 校验替代冻结 | 笔记是我正在持续重写的，禁改等于禁我自己工作；但不允许静默漂移 |
| source 页改角色 | 一份资料的摘要 | 发掘与分流索引 | 原文是我的结论，再摘要等于复述；真正的活是从原文抽原子进 concept |
| `raw/` 只收外部裁剪 | `raw/` 集中放全部原始资料 | 自有笔记留在根目录 + `thoughts/`；`raw/articles/` 单收裁剪（§4.7） | 两类资料可变性与写权不同：自有的持续重写（§2.1），外部的不可变。合并一处就无法用同一条规则管两种东西；搬自有笔记仍会破坏 slug 与图片路径 |
| 无 commits/issues 投影 | git/JIRA 机械投影 | 不建 | 本仓无此场景，搬过来只增加启动读取成本 |
| 加 `compile` 操作 | 只有 ingest/query/lint | 第 5 个 op | 「raw 已堆很多、wiki 没跟上」是真实状态，不单列就没人做 |
| `thoughts` 三层分档 | 一份一页 | A/B/C 三档 + 登记表 | 102 篇不同质，全建页有 15% 空壳，全合一页丢掉 45 个独立观点 |
| concept 模板换掉排查段 | 排查步骤/根因分类 | 我的判断/取舍与边界/待澄清 | 这里沉淀判断，不是排障手册 |
| 加 `domain` 字段 | 无 | 复用站点 6 个 slug | 不发明第二套分类，将来上站能对齐筛选 |
| 加第 7 个域 `learning` | 无 | `domain` 枚举 = ai / eda / security / tool / finance / learning / other（2026-10-26） | 学习方法立成独立类别，否则只能塞进 `other`，检索时与零散剪藏混在一起。**这条打破了「复用站点 slug」的约束**：站点 `CATEGORY_RULES` 未同步，将来上站时该域会落到「其他」，届时要么扩规则要么改写 domain |
| 不链 raw 内部小节 | 允许段落链接 | 只到文件级 + 标题文本 | `index.html` TOC 用序号锚点，插小节会让后续全部漂移 |
| 不建 home/inbox/archive | 可选 | 暂不建 | `output/` 与根目录已承担；规模变大后补 `archive/` |

**未采用但日后可能引入**：Marp 幻灯片、Dataview、`qmd` 本地搜索（index.md 超过约 150 页后开始不够用）。

---

## 11. 给自己的提醒

- 我是维护者，不是作者。**不引入 wiki 里没有依据的判断**；需要外部信息时说明是搜索还是推断，并考虑补一份来源。
- 修改前先读。凭印象编辑已有页面是破坏性的。
- 一次 compile 触及 30+ 文件是正常的；一次 ingest 改 30+ 文件说明在做重复劳动，停下来核对 §5.3。
- 人类在另一端实时看我的改动。少说流程，多产出可读的页面；报告以文件清单为主。
- 约定不合用时说出来，别默默绕过，也别默默改本文件。改 schema 要追加一条 `schema` log。

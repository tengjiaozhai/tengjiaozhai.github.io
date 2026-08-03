---
title: Matt Pocock Skills 完全指南
date: 2026-07-16
desc: 基于 opencode 会话历史分析，按规划/实施/质量/架构/协作/写作六类梳理 Skills 职责与场景搭配。
category: AI / Agent
tags: [Skills, opencode, Agent, 工作流]
---

# Matt Pocock Skills 完全指南

> 基于 opencode 会话历史分析 + mattpocock/skills 仓库内容，针对个人工作场景定制

---

## 一、Skills 职责速查

### 规划类

| Skill | 职责 | 触发方式 |
|-------|------|---------|
| `ask-matt` | 不知道用哪个 skill 时的路由器 | 用户手动 |
| `wayfinder` | 规划超大型工作（跨多个会话），在 issue tracker 上建立 decision ticket 地图，逐个解决直到路线清晰 | 用户手动 |
| `grill-me` | 通用逼问：对计划/设计进行无情访谈，直到决策树完全清晰 | 用户手动 |
| `grill-with-docs` | 逼问需求 + 同步建立文档（ADR、术语表），用 domain-modeling 统一语言 | 用户手动 |
| `grilling` | grill-me / grill-with-docs 的底层循环，可被模型自动调用 | 模型自动 |
| `to-spec` | 把当前对话综合成 spec（PRD），发布到 issue tracker，不做访谈 | 用户手动 |
| `to-tickets` | 把计划/spec/对话拆成带依赖边的 tracer-bullet 任务票 | 用户手动 |
| `to-questionnaire` | 把无法完全回答的决策变成问卷交给别人填写 | 用户手动 |

### 实施类

| Skill | 职责 | 触发方式 |
|-------|------|---------|
| `implement` | 按 spec 或 tickets 实施工作，驱动 tdd，完成后跑 code-review | 用户手动 |
| `tdd` | 测试驱动开发：红→绿→重构循环，在预定义的 seams 上写测试 | 模型自动 |
| `prototype` | 出一次性原型验证设计问题：逻辑/状态模型 或 UI 长什么样 | 模型自动 |

### 质量类

| Skill | 职责 | 触发方式 |
|-------|------|---------|
| `code-review` | 双轴审查：Standards（代码规范）+ Spec（是否实现 PRD），两个子 agent 并行 | 模型自动 |
| `diagnosing-bugs` | 难 bug 定位循环：建立反馈循环 → 二分 → 假设 → 插桩 → 修复 → 回归测试 | 模型自动 |

### 架构类

| Skill | 职责 | 触发方式 |
|-------|------|---------|
| `domain-modeling` | 建立和打磨项目领域模型，统一术语，更新 CONTEXT.md 和 ADR | 模型自动 |
| `codebase-design` | 深度模块设计词汇：小接口大行为、干净接缝、可测试 | 模型自动 |
| `improve-codebase-architecture` | 扫描代码库深化机会，输出 HTML 报告，逐个讨论 | 用户手动 |

### 流程类

| Skill | 职责 | 触发方式 |
|-------|------|---------|
| `triage` | issue 分诊状态机：分类 → 验证 → 逼问 → 写 agent-ready brief | 用户手动 |
| `setup-matt-pocock-skills` | 一次性配置：issue tracker + triage 标签 + 文档布局 | 用户手动 |
| `resolving-merge-conflicts` | 逐个 hunk 解决 git merge/rebase 冲突 | 模型自动 |

### 协作类

| Skill | 职责 | 触发方式 |
|-------|------|---------|
| `handoff` | 压缩当前会话成交接文档，供下一个 agent 接手 | 用户手动 |
| `teach` | 教用户新概念/skill，跨会话持续教学 | 用户手动 |
| `research` | 委托后台 agent 查证事实，用一手来源，输出 Markdown 报告 | 模型自动 |

### 写作三件套

| Skill | 职责 | 阶段 |
|-------|------|------|
| `writing-fragments` | 收集原始碎片，不急着结构，纯探索 | 探索 |
| `writing-beats` | 把碎片组装成有节奏的 beats 旅程，逐 beat 推进 | 组装 |
| `writing-shape` | 逐段塑形打磨，从碎片到完整文章 | 塑形 |

### 元规范

| Skill | 职责 |
|-------|------|
| `writing-great-skills` | 写 SKILL.md 的元规范：可预测性、description 写法、model-invoked vs user-invoked |

---

## 二、工作画像

从 opencode 会话历史（按频次）提取出 6 大工作场景：

| 场景 | 代表项目 | 会话数 | 核心活动 |
|------|---------|--------|---------|
| A 股自动交易系统 | `tranding` | 404 | 多 agent 编排、API/SSE、风险控制、Dashboard |
| 试产页面/工具 | `trial-production` | 212 | 页面结构、搭配表生成 |
| Skills 开发维护 | `awesome-tinno-skills` | 140 | skill-creator、打点验证、文档收敛 |
| 翻译本地化流水线 | `translate-material` | 83 | 11 阶段 DAG、多语言、质量评估、SKILL 维护 |
| wrench-board | `wrench-board` | 72 | WebSocket、浏览器自动化、部署 |
| 知识库/学习笔记 | `tengjiaozhai.github.io` | 13 | GitHub Pages、LangGraph 笔记、表格整理 |

---

## 三、场景搭配建议

### 场景一：翻译本地化流水线

**特征**：11 个 agent 串行编排、多语言并行、频繁修 bug + 调质量

```
wayfinder（规划全局）
    ↓
to-spec（把讨论固化成 spec）
    ↓
to-tickets（拆成 tracer-bullet 票，带依赖边）
    ↓
implement（按票实施，驱动 tdd）
    ↓
code-review（双轴审查：标准 + spec）
```

| Skill | 用在哪 |
|-------|--------|
| `wayfinder` | 11 阶段 DAG 跨多个会话，用 decision ticket 理清阶段间依赖 |
| `to-tickets` | 把 "Stage 6 翻译 agent" 拆成可并行的票（bn/lo/km/id/ne 各一张） |
| `tdd` | `io_bridge._collect_segment_traces`、`docx_exporter.py` 这类 bug 修复，先写复现测试 |
| `diagnosing-bugs` | DAG 输出质量回归、`.env` API 可达性这类难定位问题 |
| `domain-modeling` | 统一 "intake/segment/evidence/terminology" 等术语 |
| `handoff` | 每个 Stage 完成后压缩上下文交给下一会话 |

> 你的会话里有大量 `@fullstack_developer` / `@general` subagent 切片，这正是 `to-tickets` + `implement` 的手动版。用 skill 替代手动切片，依赖边会自动管理。

---

### 场景二：A 股自动交易系统

**特征**：Task 1~9 编号式推进、分析 agent / trader agent / 风险 / Dashboard / API

```
grill-with-docs（逼问需求 + 建领域模型）
    ↓
to-spec → to-tickets（拆成 Task 1~N）
    ↓
implement + tdd（每 Task 先红绿）
    ↓
code-review（提交前审查）
    ↓
handoff（会话太长时交接）
```

| Skill | 用在哪 |
|-------|--------|
| `grill-with-docs` | 交易系统需求模糊（"分析 agent" 到底分析什么），逼问 + 建 `CONTEXT.md` 术语表 |
| `to-tickets` | 你已经在用 Task 1~9 编号，skill 会自动加依赖边 |
| `tdd` | "Strict DeepSeek JSON"、"Deterministic Risk" 这类必须确定性的逻辑，测试先行 |
| `prototype` | "Dashboard UI 长什么样" 先出原型验证，避免直接写前端返工 |
| `diagnosing-bugs` | "Alpha holdings API 404" 这类难定位 bug |
| `improve-codebase-architecture` | 404 会话积累的代码容易变泥球，定期扫深化机会 |

> `grill-with-docs` 是 mattpocock 最推荐的 skill。交易系统术语多（holding/snapshot/broadcaster/run lifecycle），建一次 `CONTEXT.md` 后每个会话都省 token。

---

### 场景三：Skills 开发维护

**特征**：写 SKILL.md、打点验证、文档收敛、多 wrapper 测试

```
writing-great-skills（写 skill 的元规范）
    ↓
grill-me（逼问这个 skill 到底解决什么问题）
    ↓
prototype（先写一次性原型验证逻辑）
    ↓
tdd（打点测试：pdf-drawing-diff / schematic-compare / edif-data-extractor）
    ↓
code-review（审查 SKILL.md 覆盖度）
```

| Skill | 用在哪 |
|-------|--------|
| `writing-great-skills` | 写 SKILL.md 的元规范，维护 4 个 LLM/check agent 的 SKILL.md 时直接用 |
| `grill-me` | "tn-project-email-listen 到底防什么注入" 这类设计前逼问 |
| `prototype` | 验证 wrapper 逻辑（pdf/schematic/edif）先出 throwaway 脚本 |
| `tdd` | "验证打点" 会话就是在做测试，用 skill 把红绿流程正规化 |
| `domain-modeling` | 统一 "wrapper/打点/收敛/trigger_recipients" 术语 |
| `teach` | 给团队讲 skill 怎么写时用 |

---

### 场景四：wrench-board

**特征**：连接调试、部署重启、性能优化扫描

```
diagnosing-bugs（WebSocket origin/service token 校验问题）
    ↓
research（查 Cadence/brd 格式事实）
    ↓
implement（修 + 部署）
    ↓
code-review（提交前）
```

| Skill | 用在哪 |
|-------|--------|
| `diagnosing-bugs` | "WebSocket 连接调试"、"Uvicorn 报错"、"revise 失败定位" |
| `research` | "brd 格式支持及 Cadence 转换" 需要查证事实，委托后台 agent |
| `resolving-merge-conflicts` | "Adding second git remote" 后的合并冲突 |
| `improve-codebase-architecture` | "Skills performance optimization scan" 正规化 |

---

### 场景五：知识库 / 学习笔记

**特征**：GitHub Pages、LangGraph 笔记、表格整理、文档导航

```
writing-fragments（先收集碎片）
    ↓
writing-beats（组装成有节奏的笔记）
    ↓
writing-shape（塑形打磨）
```

| Skill | 用在哪 |
|-------|--------|
| `writing-fragments` | LangGraph 学习时先挖原始碎片，不急着结构 |
| `writing-beats` | 把 BaseModel/@Data 对比、Annotated 解释组装成有递进的笔记 |
| `writing-shape` | 打磨最终发布到 GitHub Pages 的版本 |
| `research` | "impy 格式是什么" 这类查证 |
| `prototype` | "GitHub Pages 导航 index.html" 先出原型 |

---

### 场景六：跨项目通用流程

#### 新项目冷启动

```
setup-matt-pocock-skills（配 issue tracker + triage 标签 + 文档布局）
    ↓
grill-with-docs（逼问 + 建 CONTEXT.md）
```

#### 大型重构 / 迁移

```
wayfinder（拆成 decision ticket 地图）
    ↓
improve-codebase-architecture（扫深化机会）
    ↓
to-tickets → implement + tdd
```

#### 难 bug 定位

```
diagnosing-bugs（reproduce → minimise → hypothesise → instrument → fix → regression-test）
```

#### 会话上下文不够时

```
handoff（压缩成交接文档）
```

---

### 场景七：新开源项目从零启动

**特征**：从想法到发布，跨多个阶段，需要基础设施配置 + 需求澄清 + 规划 + 实施 + 文档 + 架构治理

#### 完整链路

```
Phase 0: 想法验证
  grill-me（逼问想法是否成立，决策树是否清晰）
      ↓
Phase 1: 需求澄清 + 领域建模
  grill-with-docs（逼问需求 + 建 CONTEXT.md 术语表 + ADR）
      ↓
Phase 2: 规划
  to-spec（把讨论固化成 spec/PRD，发布到 issue tracker）
      ↓
  to-tickets（拆成带依赖边的 tracer-bullet 任务票）
      ↓
Phase 3: 基础设施
  setup-matt-pocock-skills（配 issue tracker + triage 标签 + 文档布局）
      ↓
Phase 4: 实施
  implement（按 ticket 实施，驱动 tdd）
  ├─ tdd（红→绿→重构，每个 ticket 先写测试）
  ├─ prototype（不确定的设计先出一次性原型验证）
  └─ research（需要查证的事实委托后台 agent）
      ↓
Phase 5: 质量保证
  code-review（双轴审查：Standards + Spec）
      ↓
Phase 6: 架构治理
  codebase-design（设计深度模块接口）
  improve-codebase-architecture（定期扫深化机会，防止泥球）
      ↓
Phase 7: 文档
  writing-fragments（收集 README/CONTRIBUTING 碎片）
  → writing-beats（组装成有节奏的文档）
  → writing-shape（塑形打磨）
      ↓
Phase 8: 协作
  handoff（会话太长时交接给下一个 agent）
  teach（教贡献者理解项目）
```

#### 各阶段 Skill 搭配

| Phase | Skill | 用在哪 |
|-------|-------|--------|
| 0 想法验证 | `grill-me` | "这个开源项目解决什么问题"、"谁会用"、"和现有方案差在哪"——逼问到决策树清晰 |
| 1 需求澄清 | `grill-with-docs` | 逼问 + 建 `CONTEXT.md` 术语表（项目核心概念）+ ADR（关键架构决策） |
| 2 规划 | `to-spec` | 把 grill 产出的讨论综合成 spec，发布到 GitHub issue |
| 2 规划 | `to-tickets` | 拆成 tracer-bullet 票，每票带依赖边，按 frontier 顺序实施 |
| 3 基础设施 | `setup-matt-pocock-skills` | 配置 issue tracker（GitHub）+ triage 标签 + `CONTEXT.md`/ADR 文档布局 |
| 4 实施 | `implement` | 按 ticket 实施，自动驱动 tdd，完成后跑 code-review |
| 4 实施 | `tdd` | 每个 ticket 先写测试再实现，红→绿→重构 |
| 4 实施 | `prototype` | "CLI 长什么样"、"配置文件格式"先出一次性原型验证 |
| 4 实施 | `research` | "依赖库 X 的 API 怎么用"、"协议 Y 的规范"委托后台 agent 查证 |
| 5 质量保证 | `code-review` | 提交前双轴审查：代码规范 + 是否实现 spec |
| 6 架构治理 | `codebase-design` | 设计深度模块：小接口大行为、干净接缝、可测试 |
| 6 架构治理 | `improve-codebase-architecture` | 定期扫深化机会，输出 HTML 报告，防止代码变泥球 |
| 7 文档 | `writing-fragments` | 收集 README/CONTRIBUTING/CHANGELOG 的原始碎片 |
| 7 文档 | `writing-beats` | 把碎片组装成有节奏的文档 |
| 7 文档 | `writing-shape` | 逐段塑形打磨，发布到 GitHub |
| 8 协作 | `handoff` | 会话上下文不够时压缩成交接文档 |
| 8 协作 | `teach` | 教贡献者理解项目架构和贡献流程 |

#### 关键原则

1. **Phase 0-1 不要跳过**：大多数开源项目死在"想法没逼问清楚就开始写"。`grill-me` + `grill-with-docs` 能省掉后期返工
2. **`CONTEXT.md` 越早建越好**：开源项目贡献者多，统一术语能减少沟通成本。`grill-with-docs` 在 Phase 1 就建好
3. **`to-tickets` 的依赖边是关键**：开源项目多人协作，ticket 之间的依赖关系必须明确，避免贡献者抢同一个 frontier
4. **`prototype` 验证设计**：开源项目的 API/CLI 设计一旦发布就难改，先用 `prototype` 出一次性原型验证
5. **定期 `improve-codebase-architecture`**：开源项目接受 PR 多，代码容易变泥球，每周扫一次

#### 最小启动集（如果只跑 3 个 skill）

```
setup-matt-pocock-skills（基础设施）
    ↓
grill-with-docs（需求 + 术语表）
    ↓
to-tickets → implement + tdd（拆票 + 实施）
```

---

## 四、速查表：按动作选 Skill

| 你想做什么 | 用哪个 Skill |
|-----------|-------------|
| 不知道用哪个 skill | `ask-matt` |
| 逼问需求 / 压力测试想法 | `grill-me`（通用）/ `grill-with-docs`（+建文档） |
| 把讨论变成 spec | `to-spec` |
| 拆成带依赖的任务票 | `to-tickets` |
| 按 spec 实施 | `implement` |
| 测试先行开发 | `tdd` |
| 提交前审查 | `code-review` |
| 难 bug 定位 | `diagnosing-bugs` |
| 查证事实 / 调研 | `research` |
| 出一次性原型验证 | `prototype` |
| 建项目术语表 | `domain-modeling` / `grill-with-docs` |
| 扫架构深化机会 | `improve-codebase-architecture` |
| 设计模块接口 | `codebase-design` |
| 规划超大工作 | `wayfinder` |
| issue 分诊 | `triage` |
| 解决合并冲突 | `resolving-merge-conflicts` |
| 会话交接 | `handoff` |
| 写学习笔记 | `writing-fragments` → `writing-beats` → `writing-shape` |
| 写 SKILL.md | `writing-great-skills` |
| 教团队某概念 | `teach` |

---

## 五、优先行动

1. **先跑一次 `setup-matt-pocock-skills`**：配置 issue tracker（GitHub）+ triage 标签 + 文档布局，后续所有 engineering skill 依赖它
2. **翻译流水线项目用 `wayfinder`**：11 阶段 DAG 最适合 decision ticket 地图
3. **交易系统用 `grill-with-docs`**：建一次 `CONTEXT.md` 术语表，404 个会话省下的 token 很可观
4. **Skills 开发用 `writing-great-skills`**：维护多个 SKILL.md 的元规范
5. **定期跑 `improve-codebase-architecture`**：404+212+83 个会话积累的代码容易变泥球，每几天扫一次

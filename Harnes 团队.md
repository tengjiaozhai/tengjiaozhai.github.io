---
title: Codex 多 Agent 工作流模板
date: 2026-07-04
desc: 把 Codex custom agents 串成固定工作流：integration_coordinator 到 knowledge_recap_writer 的 handoff 链。附：从 agent loop 到 loop engineering 再到 harness engineering 的演进。
category: AI / Agent
tags: [Codex, Agent, 工作流, Handoff, Harness, Loop]
---

# Codex 多 Agent 工作流模板

这份文档用于把 `~/.codex/agents/` 里的 custom agents 串成一条固定工作流：

`integration_coordinator` -> `research_designer` / `backend_architect` -> `fullstack_developer` -> `test_acceptance_engineer` -> `code_reviewer` -> `knowledge_recap_writer`

## 1. 总控 Prompt

把这段直接发给 `integration_coordinator`：

```text
你是 integration_coordinator。

目标：
<一句话描述要做什么>

请按以下方式组织多 agent 协作：
1. 先并行派发 research_designer 和 backend_architect。
2. 等两边都返回后，合并成一份 handoff。
3. 把 handoff 交给 fullstack_developer 执行。
4. 实现完成后交给 test_acceptance_engineer 验证。
5. 验证通过后交给 code_reviewer 审查。
6. 最后交给 knowledge_recap_writer 生成复盘文档。

你输出时必须包含：
- 已确认决策
- 未决问题
- 接口 / 文件范围
- 实现顺序
- 验收标准
- 验证命令
```

## 2. 通用 Handoff 模板

每个阶段结束后，把结果整理成下面这个结构，再交给下一位 agent：

```md
# Handoff

## Goal
一句话目标。

## Confirmed Decisions
- 决策 1
- 决策 2

## Scope
- In scope:
- Out of scope:

## Interfaces
- API / schema / event / UI / CLI 约定

## Files Likely to Change
- 路径 1
- 路径 2

## Implementation Order
1. ...
2. ...
3. ...

## Acceptance Criteria
- ...
- ...

## Verification
- 命令 1
- 命令 2

## Risks
- ...

## Open Questions
- ...

## Next Agent
`fullstack_developer`
```

## 3. 各 Agent 启动模板

### `research_designer`

```text
你是 research_designer。

任务：
<贴任务>

请先调研代码库和约束，再输出可执行方案。
输出必须包含：
- 问题定义
- 方案选项对比
- 推荐方案
- 分阶段计划
- 验收标准
- 未决问题
```

### `backend_architect`

```text
你是 backend_architect。

任务：
<贴任务和 handoff>

请只做后端设计，不实现代码。
重点输出：
- API contract
- 数据模型 / 存储影响
- 服务边界
- 错误处理
- 风险与验证点
```

### `fullstack_developer`

```text
你是 fullstack_developer。

任务：
<贴 handoff>

请按最小可行改动实现。
要求：
- 先读代码
- 只改必须的文件
- 同步更新测试
- 验证后报告结果
```

### `test_acceptance_engineer`

```text
你是 test_acceptance_engineer。

任务：
<贴实现摘要和 handoff>

请验证功能是否达到验收标准。
输出必须包含：
- 验证命令
- 结果
- 失败复现或冒烟步骤
- 未覆盖风险
```

### `code_reviewer`

```text
你是 code_reviewer。

任务：
<贴 diff 或实现摘要>

请只做审查，不改代码。
优先找：
- 正确性问题
- 回归风险
- 安全和数据问题
- 测试缺口
```

### `integration_coordinator`

```text
你是 integration_coordinator。

任务：
<贴需求>

请把工作拆成清晰的职责边界，并决定哪些 agent 并行，哪些必须串行。
输出必须包含：
- 分工
- 依赖关系
- handoff 内容
- 验收门槛
- 下一步交给谁
```

### `knowledge_recap_writer`

```text
你是 knowledge_recap_writer。

任务：
<贴最终实现摘要、测试结果、关键决策>

请生成可沉淀到个人知识库的复盘文档，结构必须包含：
- 做了什么
- 为什么这么做
- 怎么工作的
- 验证了什么
- 踩坑和边界
- 下次怎么更快
```

## 4. 一条标准多 Agent 流程

```text
integration_coordinator
  -> research_designer + backend_architect
  -> merged handoff
  -> fullstack_developer
  -> test_acceptance_engineer
  -> code_reviewer
  -> knowledge_recap_writer
```

## 5. 使用原则

- 一个 agent 只负责一个阶段，不跨界包办。
- handoff 必须短，但要有决策、范围、验收、验证。
- 传给下一位 agent 的是已确认事实，不是主观猜测。
- 版本做完后一定要沉淀复盘文档。
- 如果任务明显分层，就先并行调研，再串行实现和验收。

---

# 从 Agent Loop 到 Harness Engineering

上面那条 Codex 多 Agent 工作流，本质是一套**手工编排的 handoff 链**。再往上看一层，它其实是更大演进脉络里的一环。这一节把三个常被混用的名词——**agent loop / loop engineering / harness engineering**——的演进和区别讲清楚。

先说清楚：这三个不是有字典级标准定义的术语，而是 2023→2025 年间随 LLM agent 实践演进出来的行话，描述的是**同一件事在不同抽象层的关注点**。

## 1. Agent loop（智能体循环）—— 执行原语

最底层、最早出现。就是一个 agent 的基本执行循环：

```
接收任务 → 思考 → 调工具 → 观察结果 → 再思考 → ... → 返回
```

这就是 ReAct（Reason + Act）描述的那个 inner loop。一个模型、一个上下文、一轮接一轮地 act。它是"agency 的最小单元"——你有了 agent loop，才算有了 agent。

- **关注**：每一步干什么（act）
- **例子**：一次 Claude Code turn —— 读文件、编辑、跑测试、看结果
- **时期**：2023（ReAct、AutoGPT、基本 tool-use）
- **问题**：loop 能跑，但脆弱——不会自我纠错、不知道何时停、容易跑飞

## 2. Loop engineering（循环工程）—— 迭代设计

人们发现"裸 agent loop"不够：它会一直转、会幻觉、不知道何时算完成。于是开始**工程化这个 loop 本身**——给它终止条件、反馈机制、验证关卡、自我修正。

```
loop → 验证 → 没满足 → 把理由喂回去 → 再 loop → 满足 → 停
```

loop 从"默认行为"变成了"被设计的制品"。

- **关注**：怎么迭代得好（iterate well）——何时停、什么反馈驱动下一轮、怎么验证
- **典型模式**：loop-until-condition、loop-until-dry（连续 K 轮无新发现才停）、adversarial verify loop（每轮找的 bug 再派 skeptic 投票验证）
- **例子**：Claude Code 的 `/goal`（干到条件满足）、workflow 里的 loop-until-dry
- **时期**：2024（reflection、self-correction、verification loops）
- **本质**：给 loop 加**质量门和终止语义**

## 3. Harness engineering（脚手架工程）—— 运行时系统

再往后人们发现：光把单个 loop 设计好也不够。一个 loop 的上下文会爆、一个 agent 干不了大活、工具散乱、没法并行、没法持久化。于是开始**工程化 loop 周围的整套脚手架**——上下文管理、多 agent 编排、工具生态、记忆、权限、检查点。

harness = 包在 loop 外面的整个 runtime。

- **关注**：怎么在规模上支撑（support at scale）——上下文不爆、多 agent 协作、工具可发现、状态可恢复
- **典型组成**：上下文压缩/检查点、subagent/workflow 编排、MCP 工具生态、skills、hooks、memory、权限沙箱、worktree 隔离
- **例子**：Claude Code 本身就是一个 harness——hooks、subagents、TaskCreate/Update、context compaction、MCP、worktree、checkpointing 全是 harness 层的东西
- **时期**：2024 下半年–2025
- **本质**：让**一群 loop** 有效协作且不崩

## 演进箭头

```
agent loop        →  loop engineering       →  harness engineering
(执行原语)           (迭代设计)                (运行时系统)
"每步干什么"          "怎么迭代得好"            "怎么在规模上支撑"
2023                2024                     2024-2025
单 loop             单 loop + 质量门          多 loop + 脚手架
```

每一层不取代上一层，而是**包住**它：harness 里跑着 engineered loops，每个 loop 里跑着 agent loop。

## 区别一表

| | agent loop | loop engineering | harness engineering |
|---|---|---|---|
| **抽象层** | 原语 | 模式 | 系统 |
| **关注** | act | iterate well | support at scale |
| **回答的问题** | 这一步干啥？ | 何时停、怎么验证、怎么纠错？ | 上下文怎么管、多 agent 怎么编排、状态怎么恢复？ |
| **单位** | 一个 turn | 一个迭代过程 | 整个 runtime |
| **Claude Code 对应** | 一次 turn | `/goal`、workflow loop-until-dry | hooks/subagents/MCP/skills/checkpoints/worktree |
| **失败模式** | 跑飞、幻觉 | 死循环、过早停 | 上下文爆、agent 冲突、状态丢失 |

## 回到 Codex 工作流

把上面的演进套回本文开头那条 handoff 链：

- 每个 agent（`research_designer`、`fullstack_developer`…）内部跑的是 **agent loop**。
- "实现完成后交给 test_acceptance_engineer 验证，通过才进 code_reviewer"——这是 **loop engineering**：给每个阶段加了验收门和终止语义，没过就退回去。
- 整条链 + handoff 模板 + "先并行调研再串行实现"的编排规则——这是 **harness engineering** 的雏形：用固定脚手架把多个 loop 串起来，控制上下文边界和职责分工。

差别只在于：Codex 这套是**手工 harness**（靠 prompt + handoff 模板 + 人来调度），而 Claude Code 的 hooks/subagents/workflows 是**内建 harness**（runtime 自动调度、上下文自动压缩、状态自动恢复）。演进方向一致：从"人盯着 loop 转"到"loop 自己转得好"再到"一群 loop 在脚手架里自动协作"。

## 一句话各自

- **agent loop**：agent 一步接一步干活的那个循环。
- **loop engineering**：把那个循环设计成"会验证、会停、会自我修正"的迭代过程。
- **harness engineering**：在循环外面搭起支撑一群 agent 在规模上有效协作的整套脚手架。

演进逻辑是：**先有能转的 loop → 再把 loop 设计好 → 再给 loop 搭系统级脚手架**。你现在用的 Claude Code 就是三者叠满的产物——harness（hooks/subagents/workflows）里跑着 engineered loops（`/goal`、loop-until-dry），每个 loop 内核都是 agent loop。

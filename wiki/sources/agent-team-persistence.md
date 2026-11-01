---
type: source
title: "DeepSeek harness 的 Agent Team 持久化模型（agent-team.zh.md）"
source_file: "raw/articles/2026-11-01-deepseek-智能体团队.md"
source_type: article
domain: ai
raw_digest: "232-31b80f51"
lines: 232
captured: 2026-11-01
status: verified
tags: [agent-team, multi-agent, persistence, projection, cordis]
entities: ["wiki/entities/deepseek-harness"]
concepts: ["wiki/concepts/Agent团队状态模型"]
---

# DeepSeek harness 的 Agent Team 持久化模型

> 来源：`deepseek-harness/docs/subsystems/agent-team.zh.md`（GitHub master 分支），2026-11-01 经浏览器裁剪落盘。
> 这一页记的是**类型的形状与状态的落点**，不是产品功能：原文明确说它记录的是 `packages/experimental/agent-team/src/types.ts` 中的「持久与客户端可见形式」，属于实验性隐式 Root Team 领域。设计决策（身份、mailbox、task、共享 checkout）在另一份 Agent Note 里，本页不含。

## 这一篇覆盖什么

一个多 agent 编排系统最难的不是「怎么让 Lead 调起一个 teammate」，而是**在一堆会重启、会断连、会被回放的进程之间，决定哪些状态必须落盘、落成什么形状、谁有权改它**。这篇文档只干一件事：把 Agent Team 的六类持久记录（member / message / message-source / task / projection / 回放）逐个写成 TypeScript 接口，并在每个接口上下各配一句「这条记录的语义边界在哪」。

三处最值得注意的判断：

1. **roster 的 phase 是单向的，活动性是派生的。** member 从 `provisioning` 出发，只到达一个终态（`active` / `failed`），而 running / inactive 是**另行派生**的、绝不回写记录的运行时状态。这一刀把「生命周期」与「此刻在不在跑」彻底分开。
2. **Team 不为新消息做 outbox，也不做重发去重。** 每条消息都尝试 Steer 投递，调用方不能选投递模式，因此**持久记录里根本不存「怎么调度」**。
3. **task 的 `revision` 是 CAS 值，`writeScopes` 明确是提示不是锁。** 原文原话：「`writeScopes` 是规范化的提示性路径前缀，不是锁。」

## 可抽出的原子

| 原子 | 去处 | 说明 |
|---|---|---|
| TeamId = 打了品牌类型的 root SessionId | [[wiki/concepts/Agent团队状态模型]] | 团队身份不另立 ID 空间，直接复用根会话身份 |
| member 单终态 + 活动性派生 | [[wiki/concepts/Agent团队状态模型]] | 持久记录只写不可逆的生命周期，瞬时状态外挂 |
| 无 outbox、无去重、不存调度方式 | [[wiki/concepts/Agent团队状态模型]] | 投递语义只有一种，于是持久层可以什么都不记 |
| 每条消息都是一次 Steer | [[wiki/concepts/Agent团队状态模型]] | running 走步骤边界、inactive 起一轮、否则冷恢复 |
| task event 存完整快照 + revision CAS | [[wiki/concepts/Agent团队状态模型]] | 变更按快照叠加，不按增量合并 |
| writeScopes 是提示不是锁 | [[wiki/entities/deepseek-harness]] | 并发靠「都订阅同一个 Thread 就会发现冲突」，不靠加锁 |
| projection 是 view，不是第二份真相 | [[wiki/concepts/Agent团队状态模型]] | ownerName / ready / writeScopeWarnings 只存在于视图层 |
| 回放按 TeamId 取记录 | [[wiki/concepts/Agent团队状态模型]] | 普通 fork 继承的 event 保留 ancestor id，因此进不了新 Root 的状态 |
| `failure` 字段定格在「第一个被拒的持久记录」 | [[wiki/concepts/Agent团队状态模型]] | 出错后 members/tasks 停在最后有效状态，而不是清空 |
| TeamService 的 11 个方法 | [[wiki/entities/deepseek-harness]] | 其中 `waitForChange` 有界 10 秒–1 小时，`interrupt` 不清空 pending inbox |

## 与其他笔记的重叠点

- **与 [[wiki/sources/super-agent双层架构]] 是同一系统的两侧。** 这一篇给的是「多会话编排的**数据形状**」，那一篇给的是「为什么需要多会话的**架构理由**」。两篇的交叉点在 Worker 会话：本篇里 Worker 只是 roster 上的一行 `TeamMemberSnapshot`，那篇里 Worker 是「上下文隔离、不直接与人交互、通常配最强模型」的执行单元。
- **与 [[wiki/concepts/会话并发互斥]] 是同一问题的两种解法。** 那里用互斥保证单会话不被并发写坏；这里干脆让每个 teammate 独占一个 Session，用「一个 Session 一个 writer」换取无需互斥，冲突上移到 task 的 `writeScopes`。
- **与 [[wiki/entities/codex]] 的 Handoff 是不同层的粘合。** Codex 的多 agent 靠统一格式的交接文档串起来，是**内容层约定**；这里是**运行时层记录**，交接信息根本不进持久模型（它是消息正文）。
- **与 [[wiki/concepts/上下文压缩]] 无直接重叠。** 本篇不讨论窗口预算，压缩发生在各 Session 自己的日志里。

## 本篇独有、别处没有的

1. **完整的六个接口定义**（`TeamMemberSnapshot` / `TeamMessageSnapshot` / `TeamMessageSource` / `TeamTaskSnapshot` / `TeamMemberProjection` + `TeamTaskView` / `TeamProjection`），带原始 JSDoc。
2. **「不存调度方式」这条设计推论**：因为投递模式只有 Steer 一种，调用方无从选择，所以持久记录里连「这条消息是怎么送达的」都不需要。这是**用减少选项来消灭字段**的典型。
3. **projection 的失败语义**：`TeamProjection.failure` 命名**第一个**被拒绝的持久记录，此后成员与任务停在最后有效状态 —— 一个「定格」而不是「回滚」的失败模型。
4. **回放的隔离机制**：按 `TeamId` 而非按 event 集合取记录，使 fork 出来的新 Root 天然看不到祖先的 Team 状态。
5. **11 个 TeamService 方法的签名**（`membership` / `listMembers` / `spawnTeammate` / `sendMessage` / `createTask` / `getTask` / `listTasks` / `updateTask` / `waitForChange` / `interrupt` / `tryMembership`）。

## 需要核对的

- 原文提到设计决策在 `.agents/notes/implemented/feature/2026-08-05-agent-teams.zh.md`，本仓未落盘该 note —— 因此「为什么这样设计」的证据缺口仍在，本页只写「设计成了什么样」。
- `sendMessage` 的「acceptance follows normal Agent persistence and does not await model processing」是原文 Cordis API 段落里的英文描述，本页按此理解，未在代码上验证。

## 证据

- `raw/articles/2026-11-01-deepseek-智能体团队.md`（232 行，含补写的 domain / status 字段）
- 关键小节：`## 身份与 roster`、`## 消息与历史 mailbox`、`## 共享任务 DAG`、`## Web 投影`、`## 回放`、`### ctx.agentTeams — TeamService`

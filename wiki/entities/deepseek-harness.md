---
type: entity
title: "DeepSeek harness"
entity_kind: framework
domain: ai
aliases: [deepseek-harness, dsh, DeepSeek Harness, WorkBuddy harness]
tags: [agent-harness, agent-team, cordis, event-driven]
sources: ["wiki/sources/agent-team-persistence", "wiki/sources/super-agent双层架构"]
concepts: ["wiki/concepts/Agent团队状态模型", "wiki/concepts/Super-agent双层架构"]
---

# DeepSeek harness

## 是什么 / 在我的体系里的位置

一套 Agent harness（外围运行时：会话、工具、持久化、多 agent 编排）。当前会话本身就跑在它上面（`dsh`）。本仓对它的记录集中在两个子系统：

- **agent-team**（`packages/experimental/agent-team`）：多 agent 的持久模型 —— 成员、消息、任务 DAG、Web 投影、回放、Cordis 服务接口。见 [[wiki/concepts/Agent团队状态模型]]。
- **super-agent 原型**（`dsh-superagent-prototype`）：Router / Worker 双层、事件驱动、Inline & Spill、存算分离、Watchdog。见 [[wiki/concepts/Super-agent双层架构]]。

两者的关系：前者是后者的**状态落点**。原文自己承认可以互推 ——「用提示词约束 Agent Team 的主会话不亲自执行、只做分派，也可视为双层架构的一种实现」。

## 已知问题与判断

- **agent-team 是实验性的，不是稳定 API** → 原文首段即标「实验性隐式 Root Team 领域」
  · 前提：位于 `packages/experimental/` 下 · 状态：字段形状可能变，引用时注明版本
- **设计动机不在文档里，在 Agent Note 里** → 见 [[wiki/concepts/Agent团队状态模型]]
  · 前提：`.agents/notes/implemented/feature/2026-08-05-agent-teams.zh.md` 管身份、mailbox、task 与共享 checkout 决策 · 状态：本仓未落盘该 note
- **`writeScopes` 是提示不是锁** → 见 [[wiki/concepts/Agent团队状态模型]]
  · 前提：原文明确「规范化的提示性路径前缀，不是锁」 · 状态：并发冲突靠共享订阅自查，不靠阻塞
- **Cordis 目录是生成物，不是手写** → `scripts/gen-cordis-catalog.ts` 生成，doc-sync 里 `pnpm run verify-cordis-catalog` 校验新鲜度
  · 状态：改 API 必须重新生成，手改文档会被校验打回
- **异步 ReAct Loop 已实现但未默认开启** → 见 [[wiki/concepts/Super-agent双层架构]]
  · 前提：原文 §4.1「已经在 WorkBuddy 中实现，但尚未默认开启」 · 状态：能力存在，非默认行为

## 关键配置与用法

Cordis 侧的服务通过 `ctx.agentTeams`（`TeamService`）暴露，11 个方法：

```text
membership(agent)                              -> TeamMembership
listMembers(agent)                             -> TeamMemberView[]      // 创建顺序
spawnTeammate(caller, request)                 -> SpawnTeammateResult
sendMessage(caller, request)                   -> SendTeamMessageResult // 返回目标 inbox 的 MessageId
createTask(caller, request)                    -> TeamTaskView          // revision-one，未拥有且 pending
getTask(caller, id)                            -> TeamTaskView          // 含 deleted tombstone
listTasks(caller)                              -> TeamTaskView[]        // 非删除、数字创建序
updateTask(caller, request)                    -> TeamTaskView          // compare-and-set，需 expected revision
waitForChange(caller, timeoutMs, signal)       -> TeamWaitResult        // 有界 10s–1h
interrupt(caller, targetName)                  -> { previousStatus }    // 不清空 pending inbox
tryMembership(agent)                           -> TeamMembership | undefined  // 不抛异常
```

投影挂载点：Lead Session 的 `SessionProjectionMap.agentTeam` 发布 `TeamProjection`（members / tasks / failure?）。

## 相关实体 / 相关概念

[[wiki/entities/codex]]（另一种多 agent 组织方式：Handoff 内容协议 vs 运行时分层）、[[wiki/entities/pi]]、[[wiki/entities/claude-code]]

## 时间线

- 2026-08-05：`agent-teams` 设计 note 落盘（`.agents/notes/implemented/feature/2026-08-05-agent-teams.zh.md`，本仓未见）
- 2026-10-31：WorkBuddy 团队发布《Super-agent 设计探索》，公开双层架构与初步实验
- 2026-11-01：本仓落盘 `agent-team.zh.md`（类型定义）与该文，建 [[wiki/sources/agent-team-persistence]]、[[wiki/sources/super-agent双层架构]]

## 相关页面

已建档 source：[[wiki/sources/agent-team-persistence]]、[[wiki/sources/super-agent双层架构]]

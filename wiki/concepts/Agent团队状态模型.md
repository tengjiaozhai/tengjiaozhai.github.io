---
type: concept
title: "Agent 团队状态模型"
domain: ai
aliases: [Agent Team 持久化, agent-team 状态模型, roster 与 task DAG, team mailbox, TeamService]
tags: [agent, multi-agent, persistence, cas, projection, replay]
sources: ["wiki/sources/agent-team-persistence", "wiki/sources/super-agent双层架构"]
entities: ["wiki/entities/deepseek-harness"]
related: ["wiki/concepts/Super-agent双层架构", "wiki/concepts/会话并发互斥", "wiki/concepts/Inline与Spill"]
confidence: high
as_of: 2026-11-01
---

# Agent 团队状态模型

## 一句话定义

多 agent 协作要落盘的东西只有四类：**成员**（谁在这个团队里、处于什么生命周期终态）、**消息**（谁发给谁、内容是什么）、**任务**（一个带 CAS revision 的 DAG）、**投影**（给 Web 看的视图）。这四个形状定死之后，「团队协作」就退化成一堆可回放、可比较、可拒绝的持久记录。

## 我目前的判断

这套模型最值钱的地方不是它记了什么，而是它**敢不记什么**。三条「不记」比任何一条「记」都更能说明设计者的取舍：

1. **不记「怎么送达的」。** 投递模式只有 Steer 一种，调用方不能选，于是持久记录里连调度方式这个字段都不存在。这是用减少选项来消灭字段。
2. **不记瞬时活动性。** member 的 `phase` 只走 `provisioning → active | failed` 这条单向路；running / inactive「单独派生，绝不会重写该记录」。持久层只写不可逆的东西。
3. **不做 outbox、不做重发去重。** 消息发出去就是发出去了，没有重试队列，于是也不需要去重键 —— 因为根本没有「重复投递」这个状态。

另一个值得记住的点是**失败语义是定格而不是回滚**：`TeamProjection.failure` 命名「第一个被拒绝的持久记录」，此后 members 与 tasks 停在最后有效状态。系统不假装回到干净状态，而是保留现场。

## 关键机制

| 记录 | 形状要点 | 语义边界 |
|---|---|---|
| `TeamMemberSnapshot` | id / name / description / provider / context('fresh'\|'fork') / phase / error? | 每次生命周期变更写整个快照；phase 单向，只到 active 或 failed |
| `TeamMessageSnapshot` | id / senderId / senderName / targetId / content | 仅用于**历史 mailbox 回放**；新发送返回的是目标 inbox 的 MessageId，不是 TeamMessageId |
| `TeamMessageSource` | kind:'team-message' / teamId / messageId / senderId / senderName | 目标 Session 侧记的投递来源；Team 不再投递其中的 pending 记录 |
| `TeamTaskSnapshot` | id / revision / subject / description / status / ownerId? / blockedBy[] / writeScopes[] | 每次变更存**完整快照**；revision 是 CAS 值，每次 +1；blockedBy 必须指向未删除任务且保持无环 |
| `TeamMemberProjection` / `TeamTaskView` / `TeamProjection` | 在持久字段之外加 ownerName / ready / writeScopeWarnings | 视图层可以增补，**不回写持久快照**；failure 记录第一个被拒的持久记录 |

身份设计：`TeamId` 是打了品牌类型的 root `SessionId`（不新开 ID 空间）；`TeamTaskId` 按 `task-<n>` 分配；teammate 名称是**不可变标签**。

任务状态的四态语义：`pending` = 尚未开始或已释放；`in_progress` = 携带 owner；`completed` = 满足 blocker；`deleted` = 保留的 tombstone。

回放的隔离机制：`agentTeam` 投影把一个 Root Session 回放成 roster、任务板与历史 queued-minus-delivered mailbox，**按 `TeamId` 选取记录**。因此普通 fork 继承的 event 保留 ancestor id，绝不会进入新 Root 的状态 —— 隔离靠 ID 过滤，不靠清理。

## 我的实例

- 本仓 [[wiki/concepts/会话并发互斥]] 用互斥保护单会话；这里换了个方向：**每个 teammate 独占一个 Session**，「一个 Session 一个 writer」成立后就不需要锁，冲突上移到 task 的 `writeScopes`。
- `writeScopes` 的定位值得单独记住：原文原话「是规范化的提示性路径前缀，**不是锁**」，且 view 层会给出重叠警告。也就是说并发写冲突靠**提前警告 + 事后自查**，不靠运行时阻塞。这与同层 Worker「都订阅同一个 Thread 就会收到相同事件通知，自行发现和解决冲突」是同一套哲学的两次应用（见 [[wiki/concepts/Super-agent双层架构]]）。
- `interrupt` 不清空 pending inbox：中断只结束当前轮次，排队消息仍会在下次启动时送达。
- `waitForChange` 有界 10 秒到 1 小时 —— 长轮询被明确限幅，不允许无限等。

## 取舍与边界

- **revision 是 CAS 不是版本历史。** 每次变更存完整快照且 revision +1，但原文没有说保留旧快照 —— 它防的是并发写覆盖，不是事后追溯。
- **writeScopes 不是锁，就一定要有兜底。** 两个 teammate 真改了同一个文件时，这套模型不会阻止，只会在 view 上给警告。原文把兜底放在「共享 Thread 让它们互相发现」上，这要求双方都订阅且都在读消息。
- **不存调度方式的前提是「只有一种调度」。** 一旦将来需要「这条消息别打断当前步骤、等它做完」这类模式，持久模型就得加字段，届时旧记录的含义会变得暧昧。
- **投影的 failure 一旦出现就定格**，意味着客户端可能长期看到一个「半坏」的团队状态而无法自愈，需要人或 Watchdog 介入（Watchdog 见 [[wiki/concepts/Super-agent双层架构]]）。
- **回放按 TeamId 过滤**解决了 fork 污染，但也意味着**跨团队的会话历史无法一次性回放** —— 这是隔离的必然代价。

## 待澄清

- 设计动机在另一份 Agent Note（`.agents/notes/implemented/feature/2026-08-05-agent-teams.zh.md`），本仓未落盘，因此「为什么这样设计」的证据缺口仍在。
- 完整快照不保留旧版，那么「某个 task 的 revision 从 3 跳到 5」时中间态是否可从 Session event 日志重建？原文没给这层关系。
- `TeamTaskStatus` 的枚举在原文里只以文字描述四态给出，未给 TypeScript 定义 —— 是否还有第五态未知。
- `sendMessage` 的「acceptance follows normal Agent persistence and does not await model processing」意味着**发送成功 ≠ 对方处理**，调用方如何确认对方真的收到并读了，原文未给机制。

## 证据

- `raw/articles/2026-11-01-deepseek-智能体团队.md` §身份与 roster、§消息与历史 mailbox、§共享任务 DAG、§Web 投影、§回放、§ctx.agentTeams — TeamService
- 原文对 `packages/experimental/agent-team/src/types.ts` 的定义，本页字段名逐字取自该文件的接口声明

## 相关页面

已建档 source：[[wiki/sources/agent-team-persistence]]、[[wiki/sources/super-agent双层架构]]
相邻概念：[[wiki/concepts/会话并发互斥]]、[[wiki/concepts/Super-agent双层架构]]

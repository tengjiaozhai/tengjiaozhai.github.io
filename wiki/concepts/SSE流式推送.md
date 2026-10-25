---
type: concept
title: "SSE流式推送"
domain: ai
aliases: [sse-design, SSE 实时推送, 内存队列加哨兵]
tags: [streaming, sse, async, sentinel]
sources: ["wiki/sources/agent-开发学习笔记", "wiki/sources/py学习笔记", "wiki/sources/业务设计"]
entities: ["wiki/entities/fastapi"]
related: ["wiki/concepts/会话并发互斥"]
confidence: high
as_of: 2026-10-24
---

# SSE流式推送

## 一句话定义

**SSE 是事件观察通道，收到正文不等于状态已经提交；完成事件必须对应业务的权威状态。** 下面原有 letter-auto 实例以内存任务终态为权威，历史可以延后保存；GoGo 的后续确认依赖 AgentState，则在回复与状态事务提交后才发保存确认。两种实现的前提见本页「冲突」。

## 我目前的判断

这个设计最容易被写错的地方是把 SSE 连接当成状态载体 —— 前端断线、重连、多标签页，状态就散了。正确做法是**状态在服务端任务表里，SSE 只是它的一条观察通道**。这样任何一条连接挂掉都不影响任务的正确性。

## 关键机制

**四个部件各干一件事**：

```text
前端 mcp_tester.html    服务端 server.py            状态层 tasks.py        执行层 inspection.py
streamInspection()      GET /v2/.../{id}/stream     每任务一条 Queue        _run_inspection_inner
EventSource 订阅        live 流 / 快路径            终态快照=唯一报告权威   每产出一条即 put
complete/error 才结束   15s keepalive               COMPLETED/FAILED       （不含哨兵）
```

**核心时序**：

```text
执行任务 → 每条规则 queue.put(verdict) → SSE 逐条转发
        → 全部规则结束 → complete_task/fail_task（终态落内存表）
        → finally → queue.put(None) 哨兵
        → 消费者 if item is None: break
        → 读任务表终态快照 → 发 complete/error → 流结束
        → 之后才 await history 写入 DB（异常吞掉）
```

**哨兵身兼两职**：停流信号 + 终态事件触发器。消费者的 complete/error 发送代码在 `if item is None: break` **之后** —— 没有哨兵，这段代码永远不执行，前端 Promise 永远 pending。队列 FIFO 又保证哨兵排在全部 verdict 之后，所以「先收完结果、再发终态」由队列天然保证，不依赖时序竞态。

**终态先于持久化**（结果发布不等待 DB）：

```text
history 延后的三个保证：
  ① 保存异常被 except 吞掉 → 不改写已发布终态、不触发第二次记录
  ② 记录参数（owner/report/elapsed_ms）在终态处冻结，不回头重新读登录态
  ③ elapsed_ms 用检测起点 t0 计算 → MySQL 再慢也不计入规则/任务耗时
```

**连接回收不靠哨兵广播，靠断开检测兜底**：哨兵每任务只 put 一次。多个并发 SSE 订阅（多标签页）时只有一个消费者能拿到它正常收尾；其余连接靠每轮循环开头的 `is_disconnected()` + 15s keepalive 超时唤醒后退出。新建订阅走快路径（任务已终态 → 不发队列、立即发一次 complete/error 并关闭）。

**客户端拿到结果的四条路径**：

| 路径 | 触发 | 兜底意义 |
|---|---|---|
| live 流（主） | 订阅时任务 RUNNING | 正常情况 |
| 快路径 | 订阅时任务已终态（迟到/重连） | 刷新页面、断线重连 |
| 轮询兜底 | SSE 失败，每 500ms 调 get，最多 5 分钟 | EventSource 连不上也能取终态 |
| error 事件 | 服务端推 error / 连接重置 CLOSED | 检测失败、服务端异常 |

## 我的实例

`PY学习笔记.md` §「优雅停机模式：Poison Pill（毒丸）哨兵广播机制」记录了同一模式在 MessageBus 里的用法，与本节的差异值得记：

```text
经典毒丸：N 个 worker 共享队列 → 停 N 个 worker 要投 N 个毒丸（或广播）
本项目：  单生产者只 put 一次 → 单消费者正常收尾，其余靠断开检测兜底
判断选型：要「排空后停」（先交付已有结果再收尾）→ 毒丸
          要「立刻停」（不管队列剩什么）        → cancel / Event / is_disconnected
```

`thoughts/098_实时通信 — SSE 流式推送架构`（17 行，草稿）是同一架构在 LLMentor 里的规划记录。

**执行顺序 ≠ 呈现顺序**（来自 [[wiki/sources/业务设计]]，同一 letter-auto 检测服务）：

```text
执行：semaphore 并发，规则完成先后随机
  └─ 每条规则一完成就 put 进 verdict_queue  → SSE 看到的是「完成顺序」
呈现：Report 按 prepared 下标回填          → 输出顺序恒定，等于 _RULE_ORDER
```

所以同一次检测有两条顺序语义：SSE 那条要「快」（早推早看见），Report 那条要「稳」（与规则定序一致）。两者不能共用一个数据结构。这条是 §9 的 SSE 链路没有覆盖的一面 —— 那里只讲了队列怎么推、怎么收尾，没讲报告顺序从哪来。

**已知风险点**：前端 `streamInspection` 的 Promise 没有超时。哨兵链路（put 未执行 / 队列被多消费者抢走）是唯一能让页面无限转圈的故障点；排查时先怀疑哨兵链路，不要指望轮询兜底（它在另一条路径上）。

**GoGo 的保存确认（已证实的本地复现）**：子 Agent 曾先超时再重试成功，正文已经流出，但旧完成判定拒绝保存包含令牌的状态。新路径把聊天回复与 AgentState 同事务提交，提交后才发 message_id；前端未收到该确认就不把摘要当成有效结果。失败时保留轨迹、折叠正文并标无效。依据：[[wiki/sources/agent-开发学习笔记|Agent 开发学习笔记]] §19；提交后业务效果的边界见 [[wiki/concepts/幂等与写入恢复|幂等与写入恢复]]。

## 取舍与边界

**SSE vs WebSocket**：SSE 单向（服务端 → 客户端），基于 HTTP，自动重连，无需额外协议升级。任务推送场景是单向的，选 SSE 比 WebSocket 简单。代价是客户端发消息要另开 HTTP 接口。

**SSE vs 轮询**：轮询实现最简单，但延迟和请求数都高。本仓做成「SSE 主 + 轮询兜底」，兼顾实时性与鲁棒性。

**多消费者共享一条队列是设计缺陷还是特性**：当前实现假定「一个任务同时只有一个活跃订阅」。多标签页场景下只有一个能正常收尾，其余靠超时退出。这不是 bug，但它意味着**不能靠 SSEMessage 做多端同步** —— 要同步得另建广播机制。

## 冲突

**状态：已按业务权威澄清，两种做法都保留。**

- **观点 A**（既有 letter-auto 实例）：内存任务表的终态已经是完整检测结果，先发布 complete/error，历史写入异常不改变该终态。依据：[[wiki/sources/agent-开发学习笔记|Agent 开发学习笔记]] §9 与 [[wiki/sources/业务设计|业务设计]]。
- **观点 B**（新增 GoGo 复盘）：后续确认需要恢复令牌所在的 AgentState，不能把正文流出当成成功；回复和状态必须提交后才发 message_id。依据：[[wiki/sources/agent-开发学习笔记|Agent 开发学习笔记]] §19。
- **分歧原因与验证**：权威状态和完成契约不同，不是 SSE 协议要求哪种保存顺序。GoGo 的状态保存故障注入已经验证整体回滚、无 message_id；因此不能把 A 的“历史延后”直接迁移到 B。若数据库已经提交而确认事件丢失，前端保守失效也不等于服务端回滚，应刷新历史查证。

## 待澄清

- 15s keepalive 的取值依据未记录。太短会增加无效流量，太长会让断线检测迟钝。
- 每任务一条队列，任务量大时内存占用如何，本仓无数据。

## 证据

- `agent 开发学习笔记.md` §「9. SSE 实时推送设计：内存队列 + 哨兵收尾（以 letter-auto 检测服务为例）」（约 88 行，含代码位置索引）
- `PY学习笔记.md` §「优雅停机模式：Poison Pill（毒丸）哨兵广播机制」
- `thoughts/098_实时通信 — SSE 流式推送架构.md`（草稿，17 行）
- `output/sse-stream-design.html`（四部件职责 → 三方完整时序泳道 → 四条接收路径 → 连接回收 → 设计要点）
- `业务设计.md` §「规则怎么排」（执行顺序与呈现顺序分离）；完整图解 `output/letter-auto-architecture.html`
- `agent 开发学习笔记.md` §「19. 子智能体超时重试与会话持久化：同任务归并、同事务提交」（失败摘要、事务、保存确认及传输验证边界）

## 相关页面

已建档的 source 页：[[wiki/sources/agent-开发学习笔记]]、[[wiki/sources/py学习笔记]]

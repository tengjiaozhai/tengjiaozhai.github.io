---
type: concept
title: "Super-agent 双层架构"
domain: ai
aliases: [双层架构, two-tier agent architecture, Router-Worker, Router Worker 分层, 常驻路由层, 单 Session 瓶颈]
tags: [agent, multi-agent, router, worker, event-driven, throughput, latency]
sources: ["wiki/sources/super-agent双层架构", "wiki/sources/agent-team-persistence"]
entities: ["wiki/entities/deepseek-harness"]
related: ["wiki/concepts/Inline与Spill", "wiki/concepts/Agent团队状态模型", "wiki/concepts/上下文压缩"]
confidence: medium
as_of: 2026-11-01
---

# Super-agent 双层架构

## 一句话定义

把「与人对话」和「干活」拆成两层常驻进程：上层 Router 只承接人类交互、做分派与全局记忆，不直接执行任务；下层 Worker 各自独立上下文跑具体工作，不直接对人说话。换来的是**跨信道连续**（用户始终只面对一个 Agent）与**多任务并发**（不用等上一个命令跑完）。

## 我目前的判断

这是「单 Session 模型撞到人的注意力上限」之后的一个必然走向，但它解决的是**产品层**问题，不是模型能力问题。原文的立论前提是量化的：「一个人通常只能同时跟进 3 到 5 个活跃 Session」，于是「单任务的上限取决于模型能力，多任务的上限取决于人的注意力」。

它的关键不是「有了两层」，而是**两层之间的权责切得足够干净**：

- Router 甚至可以不配 Bash 工具 —— 这是「只分派」的物理保证，不靠自觉；
- Worker 的推理与工具调用不输出到外部信道，由 Router 统一回复 —— 这样多人协作里不会信息过载；
- 同层 Worker 之间**不需要直接通信**，共享订阅就能发现冲突。

## 关键机制

| 环节 | 做法 | 判据 / 数字 |
|---|---|---|
| 分派 | Router 持全局上下文，只判「这条事件归谁」 | 每步长输入短输出 |
| 批处理 | 上一轮推理期间到达的 Trigger 积压后一并注入 | batch 1.0→2.8 时单次耗时 2.5s→3.9s，单决定分摊 6.4s→1.6s |
| 过滤 | Fast Path（确定性代码）+ Slow Path（LLM 语义判断） | Slow Path 同时是「面向人类的自然语言扩展点」 |
| 路由 | 已订阅事件由程序直通 Worker，不经 Router；新任务才过 Router 冷启动 | 去掉直通：Router 决定 +30%，读缓存 token 2323 万→3177 万（+37%） |
| 上下文 | Inline & Spill + 链式召回 | 见 [[wiki/concepts/Inline与Spill]] |
| 提前行动 | 投机执行，后台先试，有价值才交付 | 「静默复现并修复」：找不到简单修复就全程安静 |
| 前台不阻塞 | 异步 ReAct Loop：`start()` 立刻回 Started，`stop()` 主动终止 | WorkBuddy 已实现，**尚未默认开启** |
| 输出分级 | IM ≤100 词；GitHub / 邮件按规范写完整背景与验证结果 | 输出匹配信道带宽 |
| 持久在线 | 计算上云无状态、状态入库、执行环境留原地 + 端侧无状态 daemon（BYOM） | 否掉「云端重建环境」与「用户迁云」两条路 |
| 自愈 | 主系统之外独立 Watchdog Session，定时消息驱动 | 判「有没有实质进展」，不判进程存活 |

## 我的实例

- 本仓 [[wiki/entities/codex]] 的多 agent 工作流是**另一种切法**：不分 Router/Worker，而用统一格式的 Handoff 文档把一串固定 agent 串起来。区别在于粘合剂 —— 那边是内容协议，这边是运行时分层。
- 原文自己也承认两条路可以合流：「用提示词约束 Agent Team 的主会话不亲自执行、只做分派，也可视为双层架构的一种实现」。反过来说，[[wiki/concepts/Agent团队状态模型]] 那套 roster / task DAG 就是双层架构落成持久记录后的样子。
- 官方原型：`dsh-superagent-prototype`（原文尾注，本仓未落盘）。

## 取舍与边界

- **连续性 vs 吞吐量的权衡无法消除，只能选位置。** Router 若要水平切分（Sharding），「切分粒度越细，Router 层的并发吞吐量就越高，但分片之间的记忆与上下文连续性就会越低」。原文的实测结论是：在当前团队规模下**不必过早切分**，因为去掉直通后 Router 的峰值负载照样没触及单 Router 吞吐瓶颈。
- **Router 成为单点。** 全局序点 + 协调点 + 记忆三重身份压在一个 Session 上，它挂了就是全局挂。这是用它换连续性的代价。
- **长程记忆是真正的天花板。** 原文 §8.1 把「跨月甚至更长时间跨度的长程记忆」列为制约可扩展性的主要瓶颈 —— 比 Router 吞吐更硬。
- **安全边界被拉长了。** 云端 Agent Loop 一旦被入侵或提示词注入攻破，「其连接的全部端侧设备都面临被控制的潜在风险」；且「即使云端未被攻破，只要端侧环境中的凭据能够进入模型的上下文，正常执行过程中同样存在凭据泄露的风险」。上层越强大，凭据不落上下文这件事就越必须。
- **异步 ReAct 只是能力，不是现状。** 没有默认开启，所以「全双工」当前不能当作线上行为引用。

## 待澄清

- Router 层到底该在什么规模下切分？原文明确说「何时需要水平切分、粒度如何划分」无定论。
- 同层 Worker 何时需要引入直接通信？原文只给了拓扑待定的说法。
- 「用户看到的一个会话在底层未必只对应一个 Session」之后，界面该怎么呈现？原文承认这是独立的产品问题，且认为以聊天窗口为中心的交互「在一定程度上是路径依赖的结果」。
- 跨实例 A2A（各自代表不同权限边界、不共享底层上下文）如何安全可靠，未解。

## 证据

- `raw/articles/2026-11-01-super-agent-设计探索：迈向更自主的-agent-系统.md` §2 双层架构、§3 事件驱动、§4 面向人的交互、§5 计算状态环境分离、§6 Watchdog、§7 初步实验、§8 开放问题
- 量化数字全部出自 §7，且原文限定为「基于合成负载与简化环境」的初步参考

## 相关页面

已建档 source：[[wiki/sources/super-agent双层架构]]、[[wiki/sources/agent-team-persistence]]
相邻概念：[[wiki/concepts/Inline与Spill]]、[[wiki/concepts/Agent团队状态模型]]、[[wiki/concepts/上下文压缩]]

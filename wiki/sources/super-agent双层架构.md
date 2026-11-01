---
type: source
title: "Super-agent 设计探索：迈向更自主的 Agent 系统"
source_file: "raw/articles/2026-11-01-super-agent-设计探索：迈向更自主的-agent-系统.md"
source_type: article
domain: ai
raw_digest: "317-a2794cba"
lines: 317
captured: 2026-11-01
status: verified
tags: [super-agent, multi-agent, event-driven, context-engineering, watchdog]
entities: ["wiki/entities/deepseek-harness"]
concepts: ["wiki/concepts/Super-agent双层架构", "wiki/concepts/Inline与Spill", "wiki/concepts/Agent团队状态模型"]
---

# Super-agent 设计探索：迈向更自主的 Agent 系统

> 来源：DeepSeek 产品部 WorkBuddy 团队公众号文章（2026-10-31 20:29），2026-11-01 经浏览器裁剪落盘。
> 原文自述定位：「本文是一篇面向工程实践的架构思路探讨，**并非对 WorkBuddy 现有产品功能的介绍**」。文末另注明部分设计已在 `dsh-superagent-prototype` 中实现，且「该插件只是一种为了验证技术路线而提供的原型，并非 DeepSeek 的正式产品」。
> 因此本页 treat 它的证据等级为：**机制描述可信、量化结论只作初步参考**（§7 明说实验基于合成负载与简化环境，「衡量的是系统的调度与协作能力，而非对单个任务的执行能力」）。

## 这一篇覆盖什么

文章要解决的是一个具体的产品约束，而不是抽象的架构美学：**Agent 的工作模式仍以单一 Session 为基本单位**，用户并行推进多项工作时必须手动切换并记住各 Session 的上下文，而「一个人通常只能同时跟进 3 到 5 个活跃 Session」。于是「单任务的上限取决于模型能力，多任务的上限取决于人的注意力」。

它给的四个人类可感特征是连续（始终只面对一个 Agent）、高效（不必等上一个命令）、主动（根据环境事件自己推进）、持久（始终在线、异常自恢复）。五个模块与特征的对应关系是明确的：

| 模块 | 对应特征 |
|---|---|
| 双层架构（Router / Worker，§2） | 连续 + 高效 |
| 事件驱动（Trigger / Thread，§3） | 主动 |
| 面向人的交互（异步 ReAct、多信道，§4） | 连续 + 高效 |
| 计算状态环境分离（§5） | 持久 |
| Watchdog（§6） | 持久 |

贯穿全文的一句判断是：「**Session 应当是系统的实现细节，而不应是用户的认知负担**」—— 并把现状定性为「让用户手动管理 Session，在很大程度上是从底层 LLM API 延续下来的设计惯性」。

## 可抽出的原子

| 原子 | 去处 | 说明 |
|---|---|---|
| Router / Worker 双层 + 连续性 vs 吞吐量权衡 | [[wiki/concepts/Super-agent双层架构]] | 根本 Trade-off 是「跨信道连续」与「多任务并发」 |
| Router 不执行任务、甚至可以没有 Bash | [[wiki/concepts/Super-agent双层架构]] | 全局序点（Sequence Point）+ 协调点 + 记忆，只分派 |
| 批处理：积压越多，单决定分摊越便宜 | [[wiki/concepts/Super-agent双层架构]] | batch 1.0→2.8 时单次耗时 2.5s→3.9s，分摊 6.4s→1.6s |
| Trigger / Thread / 两级过滤（Fast Path + Slow Path） | [[wiki/concepts/Super-agent双层架构]] | 确定性代码做高频判断，LLM 做语义判断 |
| 订阅直通：已订阅事件不经 Router | [[wiki/concepts/Super-agent双层架构]] | 去掉直通后 Router 决定 +30%、读缓存 token 2323 万→3177 万（+37%） |
| Inline & Spill + 链式召回（Chain of Recall） | [[wiki/concepts/Inline与Spill]] | 把上下文窗口当 Cache 管，对象构成引用图逐跳展开 |
| 投机执行（Speculative Execution） | [[wiki/concepts/Super-agent双层架构]] | 结果有价值就交付，没有就丢弃；「静默复现并修复」 |
| 异步 ReAct Loop（start / stop 取代同步 run） | [[wiki/concepts/Super-agent双层架构]] | 立即回 Started，完成后作为新事件投递回会话 |
| 多信道输出规范（IM ≤100 词 / GitHub 高信息密度） | [[wiki/concepts/Super-agent双层架构]] | 输出方式匹配信道带宽 |
| 存算分离 + 执行环境留原地（端侧无状态 daemon / BYOM） | [[wiki/concepts/Super-agent双层架构]] | 环境同步成本高在「未提交修改、私有凭据、内网依赖、特定硬件」 |
| Watchdog 是外部 Control Loop，且要判进展不判存活 | [[wiki/concepts/Super-agent双层架构]] | 「许多异常并非进程崩溃，而是模型陷入无效循环或偏离目标」 |
| 成员记录与任务 DAG 的持久形状 | [[wiki/concepts/Agent团队状态模型]] | 本篇只提「Router 也可由 Agent Team 实现」，形状在另一篇 |

## 与其他笔记的重叠点

- **与 [[wiki/sources/agent-team-persistence]] 是同一系统的两侧**：本篇讲「为什么要分层」，那篇讲「层里的状态落成什么形状」。原文自己承认两者可以互相化约：「用提示词约束 Agent Team 的主会话不亲自执行、只做分派，也可视为双层架构的一种实现」——区别在于 Agent Team 的 Lead 往往要深入任务细节、承担很重的推理负载，而 Router 只处理任务之间的高层关联。
- **与 [[wiki/concepts/上下文压缩]] 正交但相邻**：压缩处理「已经进入窗口的历史怎么缩短」，Inline & Spill 处理「什么该进来、什么只留引用」。两者共用一个预算，但一个是事后、一个是事前。
- **与 [[wiki/entities/codex]] 的多 agent 工作流不同层**：Codex 那套是 Handoff 文档约定的**内容协议**；这里是**运行时分层**，Worker 之间连直接通信都不需要（「只要都订阅了对应 Thread 就会收到相同事件通知，从而自行发现和解决冲突」）。
- **与 [[wiki/concepts/会话并发互斥]] 是同一问题的两种解法**：那边靠互斥，这边靠「一个 Session 一个 writer」式的物理隔离。
- **与 Anthropic 的「脑手分离」同源**：原文明确对标 —— 同样是 harness 无状态、会话日志存在 harness 之外、通过统一接口按需接入执行环境；差别在场景（托管服务 vs 用户日常使用、可能间歇在线的个人机器）。

## 本篇独有、别处没有的

1. **「人的注意力是上限」这条量化前提**：3 到 5 个活跃 Session，以及由此推出的产品结论 —— Session 该被藏起来。
2. **批处理为什么便宜的成本模型**：Router 每步是长输入短输出，合并进一次 LLM 调用会在 Prefill 阶段并行计算，「单次请求耗时增长远慢于批处理大小」。这不是观测，是可解释的机制。
3. **两级过滤的分工哲学**：Slow Path 不只是省钱手段，它同时是「面向人类的自然语言扩展点」—— 策略用提示词写，人能读能改。
4. **Thread 与 Worker 多对多**，以及由此得到的「订阅即协作」：不需要点对点通信和协作拓扑，共享订阅就够。
5. **存算分离的第二刀**（执行环境不下云）：明确否掉了「云端起沙箱同步环境」和「要求用户迁云」两条路，理由是真实环境里有未提交修改、私有凭据、内网依赖、特定硬件。
6. **Watchdog 要监控任务进展而非进程存活**，且它本身是一个有完整工具能力的 Agent Session，维护者可以用自然语言问它故障原因、让它在线改提示词。
7. **§7.1 的负面结果**：中性提示下模型 5 次运行**一次都没有调用 Subagent**，全部工作挤在主 Session 并被新消息不断打断，p95 达 29.5 分钟。这是「靠提示词让人分工」这件事最直接的失败证据。
8. **§8.4 的两条安全判断**：云端 Agent Loop 被攻破时「其连接的全部端侧设备都面临被控制的潜在风险」；即使云端没被攻破，「只要端侧环境中的凭据能够进入模型的上下文，正常执行过程中同样存在凭据泄露的风险」—— 因此要设计「让 Agent 在完全不接触凭据本身的情况下使用凭据」的机制。

## 需要核对的

- §7 的数字全部来自合成负载 + Mock Worker，原文自己说「部分设置还可以更加严谨」——不应当作生产环境性能预期。
- 异步 ReAct Loop「已经在 WorkBuddy 中实现，但尚未默认开启」，因此「全双工」当前是**能力存在但未启用**的状态，不是线上行为。
- 文章说部分设计在 `dsh-superagent-prototype` 中实现，本仓未落盘该仓库 —— 实现与文档的偏差未核。

## 证据

- `raw/articles/2026-11-01-super-agent-设计探索：迈向更自主的-agent-系统.md`（317 行，含补写的 domain / status 字段）
- 关键小节：`## 2.1 Router 层`、`## 2.2 Worker 层`、`## 3.1 事件过滤`、`## 3.2 事件路由`、`## 3.3 上下文组织`、`## 4.1 全双工交互`、`## 5.2 计算与执行环境分离`、`## 6. Watchdog`、`## 7.1 消融实验`、`## 8.4 如何保障安全与隐私`

---
type: source
title: "Agent 开发学习笔记"
aliases: [GoGo 差旅助手排障笔记]
source_file: "agent 开发学习笔记.md"
source_type: note
domain: ai
raw_digest: "2619-f1468d5e"
lines: 2619
captured: 2026-10-19
status: verified
tags: [agent, tool-design, skill, harness, sse, evaluation, langgraph]
entities: ["wiki/entities/agentscope", "wiki/entities/redis", "wiki/entities/vector-db", "wiki/entities/postgresql"]
concepts: ["wiki/concepts/工具缓存", "wiki/concepts/旁路缓存", "wiki/concepts/Plan-Execute", "wiki/concepts/Skill-vs-Tool", "wiki/concepts/工具熔断", "wiki/concepts/向量库选型", "wiki/concepts/SSE流式推送", "wiki/concepts/Agent评测", "wiki/concepts/会话并发互斥", "wiki/concepts/意图识别分层", "wiki/concepts/幂等与写入恢复"]
---

# Agent 开发学习笔记

## 这一篇覆盖什么

gogo-agent（LLMentor / 差旅助手）与 letter-auto 两套系统的工程实现复盘，共 19 个编号主节 + 2 个附录。既有条目保留当时的实现记录；2026-10-24 追加的 §18–19 是 GoGo Python 的本地故障与修复记录，区分旧代码、已证实的隔离验证及尚未复验的原调试会话，不能套用旧登记中的“全部已上线”表述。

不系统整理：模型选型、提示词手法（那是 `thoughts/` 068–077 的范围）、部署运维（部分在 `安全运维复盘.md`）。§18 保留改写指令的修改作为故障证据，不把修复归结为仅调提示词。

## 可抽出的原子

| 节 | 主题 | 已抽出 |
|---|---|---|
| 3 | 同会话缓存 vs 跨会话缓存 | [[wiki/concepts/工具缓存]] |
| 4 | 旁路缓存 Cache-Aside | [[wiki/concepts/旁路缓存]] |
| 5 | Plan-Execute vs ReAct | [[wiki/concepts/Plan-Execute]] |
| 6 | Skill vs Tool 边界 | [[wiki/concepts/Skill-vs-Tool]]、[[wiki/synthesis/Skill-vs-Tool判据]] |
| 7 | 工具熔断 | [[wiki/concepts/工具熔断]] |
| 8 | 向量库选型 | [[wiki/concepts/向量库选型]]、[[wiki/synthesis/四类向量库对比]] |
| 9 | SSE 内存队列 + 哨兵 | [[wiki/concepts/SSE流式推送]] |
| 10 | Agent 评估 | [[wiki/concepts/Agent评测]] |
| 11–12 | 集群锁 vs 本地 Task 句柄 | [[wiki/concepts/会话并发互斥]] |
| 13 | Middleware vs Hook vs Tool | 待抽：三层职责边界 |
| 14 | 多租户状态隔离（长度前缀设计） | 待抽：状态隔离的字符串拼接陷阱 |
| 15 | 改写上下文的因果一致性（`messages[-1]` + `next(...)`） | 待抽：上下文篡改的因果校验 |
| 16 | 快速路由到子智能体（双轨 + 三重门禁 + 惰性淘汰） | 待抽：路由加速 |
| 17 | 意图识别为何是瀑布级联而非前置分类 | 部分进 [[wiki/concepts/意图识别分层]] |
| 18 | 确认对象补全、动作与背景关键词、意图到本轮工具可见性的区分 | [[wiki/concepts/意图识别分层|意图识别分层]] |
| 19 | 显式委派重试、最终结果判定与确认令牌跨轮恢复 | [[wiki/concepts/幂等与写入恢复|幂等与写入恢复]] |
| 19 | 回复与 AgentState 同事务、SSE 保存确认与无效摘要 | [[wiki/concepts/SSE流式推送|SSE流式推送]] |
| 附 A | LangGraph 速记（state/checkpointer/store/条件边） | 待抽：graph 编排基础 |
| 附 B | Matt Pocock Skills 工作流 | 待抽：个人 Skills 体系 |
| 无编号 | AgentScope 工具异常链路（`yield` / `raise` / 队列哨兵） | 待抽：异步生成器异常陷阱 |

## 与其他笔记的重叠点

- **上下文压缩**：本文只提 AgentScope 的 `AutoContextMemory` 配置，完整四方案对比在 `Harness学习笔记.md` → [[wiki/synthesis/四套上下文压缩方案对比]]
- **幂等与中断恢复**：本文 §11 讲取消，§19 区分 GoGo 的委派重试、签名确认令牌与已提交业务结果；`Harness学习笔记.md` §14 讲写入幂等 → [[wiki/concepts/幂等与写入恢复|幂等与写入恢复]]。不把本地重复 spawn 的 Fail-Fast 当成禁止全部工具重试。
- **意图流水线与持久化**：§18 是 §17 与 [[wiki/sources/thoughts-意图识别三层|意图识别三层笔记]] 的 Python 故障实例；§19 补 [[wiki/sources/thoughts-会话与消息的三层持久化|会话与消息持久化]]、[[wiki/sources/thoughts-工具并行与重试|工具并行与重试]] 和 [[wiki/sources/thoughts-集群打断与恢复|集群打断与恢复]] 的具体应用边界，不宣称这些旧笔记已经实现相同协议。
- **完成事件的权威**：§9 的 letter-auto 以内存任务终态为准，历史可后写；§19 的 GoGo 需要下一轮恢复 AgentState，必须先提交聊天状态再确认完成 → [[wiki/concepts/SSE流式推送|SSE流式推送]] 的范围冲突已澄清，两种业务前提都保留。
- **FastAPI 装配**：本文不涉及，`PY学习笔记.md` §「create_app 与 lifespan」是权威
- **评估方法论**：本文 §10 是操作手册，`Agent 评测方法论.md` 是主章（金标）→ [[wiki/concepts/Agent评测]]

## 本篇独有、别处没有的

1. **§7 工具熔断的三态状态机与双 hook 分工** —— PostActing 计数、PreReasoning 过滤，`gen` 代数防旧事件串味。这是本仓唯一的熔断实现记录
2. **§11–12 两级防并发的时序错开** —— 前台秒级登记占坑并返回 409，后台排队争 Redis 锁。别处只有 Redis 锁单点描述
3. **§14 长度前缀设计的踩坑** —— `session_id` 与 `_state_session_id` 直接拼前缀会被伪造。这是本仓唯一的多租户攻击面记录
4. **§15 `messages[-1]` + `next(...)` 的双重校验** —— 改写上下文时如何防因果错位
5. **§16 快速路由的三重门禁与惰性淘汰** —— 双轨架构的完整设计
6. **AgentScope 工具异常链路** —— `yield tool_response(SUCCESS)` 放在异常之前会把失败误判为成功的陷阱，附代码位置
7. **§9 的代码位置索引** —— `server.py:76/286/331/554/585-625`、`inspection.py:139/243`、`tasks.py:43`、`mcp_tester.html:2524-2573`，可据此直接定位实现
8. **§18 的旧新规则差分** —— 原错误句由 hotel_search 变为 AMBIGUOUS，补全差旅对象后才命中 travel_application；工具实现存在不等于本轮已经注册。
9. **§19 的连续故障链** —— 成功重试被旧失败挡住、令牌状态未保存、回答先提交造成刷新假成功、独立 Session 读不到事务内新状态，分别有修改点和验证边界。无 token 不等于 token 被销毁，retry_of 不等于 confirmation_token。

## 证据

- 全文件按 `split('\n').length` 口径为 2619 行；§18–19 为 2026-10-24 归档的 2026-10-23 修复记录。
- 本页 raw_digest `2619-f1468d5e`；旧证据行的 2349 是换行计数口径，原 frontmatter 的 2350 才是 wiki 口径，追加后统一重算。
- 新事实回溯 `agent 开发学习笔记.md` §「18. 从确认文本到差旅申请：动作与对象不能被背景酒店关键词抢路由」与 §「19. 子智能体超时重试与会话持久化：同任务归并、同事务提交」。原 PyCharm 进程和真实原会话未复验；模型填参仍可能遗漏，不能扩大本地验收结论。

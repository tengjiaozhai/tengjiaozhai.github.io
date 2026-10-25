---
type: source
title: "thoughts/005 会话与消息的三层持久化"
source_file: "thoughts/005_✅会话与消息的持久化.md"
source_type: thought-batch
domain: ai
raw_digest: "325-6c3e480b"
lines: 325
captured: 2026-10-19
status: verified
tags: [llmentor, persistence, session]
entities: ["wiki/entities/agentscope", "wiki/entities/redis"]
concepts: ["wiki/concepts/会话并发互斥"]
---

# thoughts/005 会话与消息的三层持久化

## 这一篇覆盖什么

很多初学者最容易犯的错误，是把「聊天记录持久化」理解成「往一张 message 表里插数据」。但在 Agent 系统里，**「会话」这个词同时对应两种完全不同的东西**：

1. 用户在界面上看到的**逐字聊天记录**（谁说了什么、什么时候、能不能点赞）
2. 大模型下一轮推理时需要的**结构化上下文**（历史消息、工具调用 `ToolUse`、工具结果 `ToolResult`、被压缩的摘要……）

两者的**消费者、数据格式、生命周期、一致性要求都不一样**。gogo-agent 的做法是把它们彻底拆开，再加一层纯内存的运行时缓存。

## 三层结构

| 层 | 存什么 | 存哪里 | 谁读 | 掉电会怎样 |
|---|---|---|---|---|
| **L1 业务会话/消息** | 给人看的逐字记录 | MySQL `chat_conversation` / `chat_message` | 前端 | 不丢（永久） |
| **L2 Agent 对话记忆** | 给模型喂的上下文 | MySQL `agentscope_session` | LLM | 不丢（会话级） |
| **L3 运行时缓存** | 活跃会话的内存态 | 进程内存 | 框架内部 | 重启丢失（可重建） |

贯穿三层的纽带是一个 ID：**前端 `sessionId` == `chat_conversation.conversation_id` == AgentScope Session 的 key 前缀**。一个 ID 打通三层，省掉了所有映射表。

## 可抽出的原子

- **「会话」一词的两种含义必须物理分开** —— 这是本仓最清晰的一条架构判断
- **一个 ID 打通三层的做法** —— 省掉映射表，但也带来安全隐患（见下）
- **L1 / L2 的写入时机不同**：L1 是回复后写（用户可见），L2 是每轮结束写（模型可见）
- **L3 纯内存、可重建** —— 掉电丢失不是问题，因为 L1/L2 是权威

## 与其他笔记的重叠点

- **状态隔离的安全问题**：单 ID 打通的代价是 `session_id` 与 `_state_session_id` 直接拼前缀会被伪造 → `agent 开发学习笔记.md` §14 记录了完整攻击面
- **会话互斥**：三层持久化不解决并发写问题 → [[wiki/concepts/会话并发互斥]]
- **AgentScope 的 Session 结构**：`Harness学习笔记.md` 的 Tree / Lane / Operation / Log 四层是框架侧的视角，本篇是应用侧的视角
- **压缩**：L2 会被 [[wiki/concepts/上下文压缩]] 重写，L1 不会 —— 这是拆开的直接收益

## 本篇独有、别处没有的

1. **三层持久化的完整表**（存什么/存哪里/谁读/掉电后果）
2. **「一个 ID 打通三层」的设计** —— 含它的收益与隐患
3. **`application.yml` 的持久化配置** —— Druid + MyBatis-Plus 的 `InstantTypeHandler`、逻辑删除字段、`id-type: input`
4. **从最外层往最里层讲的叙述结构** —— 先讲用户可见的，再讲框架内部的

## 需要核对的

- 本页 `raw_digest` 待补：需按最终文件行数与 sha1 前 8 位填写，见 `tools/wiki-lint.mjs` 的漂移检查

## 证据

- `thoughts/005_✅会话与消息的持久化.md`（325 行）
- 关键代码：`chat_conversation` / `chat_message` / `agentscope_session` 三张表，`application.yml` 的数据源与 MyBatis-Plus 配置

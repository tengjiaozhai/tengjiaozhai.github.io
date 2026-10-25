---
type: source
title: "Python 学习笔记"
source_file: "PY学习笔记.md"
source_type: note
domain: ai
raw_digest: "2482-544c63ac"
lines: 2482
captured: 2026-10-19
status: verified
tags: [python, java, asyncio, fastapi, redis, agentscope]
entities: ["wiki/entities/fastapi", "wiki/entities/redis", "wiki/entities/agentscope"]
concepts: ["wiki/concepts/SSE流式推送", "wiki/concepts/会话并发互斥", "wiki/concepts/工具缓存"]
---

# Python 学习笔记

## 这一篇覆盖什么

Java 工程师视角的 Python 与 asyncio 工程化记录，主体是 AgentScope Python 版服务端源码的逐段解读。23 个 h2，从基础语法（`__init__.py`、`id()`、`@classmethod`）一路到 `_pipeline_factory` 的动态工厂与 `RuleMatcher` 的协议契约。

边界：**不是 Python 入门教程**，每个主题都挂在真实代码上。读法是按关键词跳，不要从头读。

## 可抽出的原子

| 主题 | 已抽出 |
|---|---|
| `create_app` 与 `lifespan` 的装配期/启动期分工 | [[wiki/entities/fastapi]] |
| `app.state` ≈ Spring `ApplicationContext` | [[wiki/entities/fastapi]] |
| `Depends()` ≈ Spring IoC + ArgumentResolver + Filter 合体 | [[wiki/entities/fastapi]] |
| MessageBus 按「载荷生命周期」分组的抽象基类 | 待抽：异步消息总线的分层设计 |
| Poison Pill（毒丸）哨兵广播机制 | [[wiki/concepts/SSE流式推送]] |
| `acquire_lock` 看门狗续期 | [[wiki/entities/redis]]、[[wiki/concepts/会话并发互斥]] |
| Workspace 与 WorkspaceManager 两层职责 | 待抽 |
| 洋葱模型与异步拦截器 | 待抽：与 `agent 开发学习笔记.md` §13 的 Middleware/Hook 呼应 |
| Middleware vs Hook vs Tool（Java 视角） | 与 `agent 开发学习笔记.md` §13 同主题 |
| Pydantic `model_validate` 与双层校验 | 待抽：边界校验分层 |
| `asyncio.gather` 事件循环时序 | 待抽 |
| 动态工厂 `_pipeline_factory`（一等函数 + 默认实参 IoC） | 待抽：协程折返 |
| `RuleMatcher` 与 Protocol 静态鸭子类型 | 待抽：契约守卫 |

## 与其他笔记的重叠点

- **Middleware vs Hook vs Tool**：与 `agent 开发学习笔记.md` §13 是同一主题的两份记录，一份 Java 一份 Python → 建议合并成一个 concept（待办）
- **SSE 与毒丸**：`agent 开发学习笔记.md` §9 讲 SSE 的哨兵收尾，本文讲 MessageBus 的毒丸广播。两者是同一模式的两种场景 → [[wiki/concepts/SSE流式推送]]
- **Redis 锁**：`agent 开发学习笔记.md` §11–12 讲两级防并发，本文讲锁的底层实现 → [[wiki/concepts/会话并发互斥]]

## 本篇独有、别处没有的

1. **`create_app` vs `lifespan` 的完整分工表** —— 装配期同步 / 启动期异步，`RedisStorage` 与 `QdrantStore` 在装配期只存参数不连网（`_redis_storage.py:150` docstring 明确写了）
2. **`AsyncExitStack` 逆序拆栈的收尾模型** —— 现成的资源释放范式
3. **Poison Pill 与「单生产者单消费者」的选型判据** —— 要「排空后停」用毒丸，要「立刻停」用 cancel / Event / `is_disconnected`
4. **Java ↔ Python 的系统性映射** —— `app.state` ≈ `ApplicationContext`、`Depends` ≈ IoC+ArgumentResolver+Filter、`create_app` ≈ `@Configuration`、`lifespan` ≈ `ApplicationRunner`+`DisposableBean`
5. **`_pipeline_factory` 的协程折返分析** —— 一等函数 + 默认实参做 IoC + `@asynccontextmanager` 的双向跳跃，本仓唯一的深度解读
6. **`RuleMatcher` 的 Protocol 静态鸭子类型判定** —— 不用继承而是结构化类型来守契约

## 证据

- 全文件 2481 行 / 23 个 h2
- 本页 raw_digest `2481-544c63ac`
- 关键代码位置：`app/_app.py:78`、`app/_lifespan.py:35`、`_redis_storage.py:150`、`deps.py:67`

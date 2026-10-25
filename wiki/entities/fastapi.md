---
type: entity
title: "FastAPI"
entity_kind: framework
domain: ai
aliases: [fastapi, starlette]
tags: [python, web-framework, async]
sources: ["wiki/sources/py学习笔记"]
concepts: ["wiki/concepts/SSE流式推送", "wiki/concepts/会话并发互斥"]
---

# FastAPI

## 是什么 / 在我的体系里的位置

本仓 `PY学习笔记.md` 有两套完整记录：

1. **Java 工程师视角的映射** —— `app.state` ≈ Spring `ApplicationContext` / `ServletContext`，`Depends()` ≈ Spring IoC + ArgumentResolver + Filter 的合体
2. **装配与生命周期** —— `create_app` 与 `lifespan` 的分工

## 已知问题与判断

- **`create_app` 与 `lifespan` 是两件事，不能混** → 这是最容易写错的地方
  · 装配期 `create_app`（同步）：建 FastAPI 对象、往 `app.state` 挂配置、注册 15 个 router
  · 启动期 `lifespan`（异步）：`storage.__aenter__` 连 Redis、起后台任务、构造各类 Service
  · `RedisStorage(host=...)`、`QdrantStore(url=...)` 在装配期**只存参数不连网**，真正的连接动作全在 lifespan
  · 收尾由 `AsyncExitStack` 逆序拆栈
- **Router 取依赖的方式是 `app.state` + `deps.py`**：`create_app` 写配置，`lifespan` 写实例，`deps.py` 的依赖函数读出来
- **`Depends()` 的工程化心智模型**：不是「参数注入」，而是「请求上下文 + 拦截器 + IoC 容器的合体」

## 关键配置与用法

```python
# 装配期（同步）
app = create_app()   # 建对象、挂配置、注册 router

# 启动期（异步）
@asynccontextmanager
async def lifespan(app):
    async with AsyncExitStack() as stack:
        storage = await stack.enter_async_context(RedisStorage(...))
        ...
```

## 相关实体 / 相关概念

[[wiki/entities/agentscope]]、[[wiki/entities/redis]]

## 时间线

- 2026-10：`PY学习笔记.md` 记录了完整的两套映射与 `_pipeline_factory` 的动态工厂分析

## 相关页面

已建档的 source 页：[[wiki/sources/py学习笔记]]

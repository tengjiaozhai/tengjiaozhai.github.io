---
type: entity
title: "Redis"
entity_kind: infra
domain: ai
aliases: [redis]
tags: [infra, cache, lock]
sources: ["wiki/sources/agent-开发学习笔记", "wiki/sources/py学习笔记"]
concepts: ["wiki/concepts/工具熔断", "wiki/concepts/会话并发互斥", "wiki/concepts/工具缓存"]
---

# Redis

## 是什么 / 在我的体系里的位置

在本仓两套 agent 系统里承担四个角色，每个角色的用法都不同：

| 角色 | 用法 | 出处 |
|---|---|---|
| 分布式锁 | `acquire_lock(session_lock)` + 看门狗续期 | [[wiki/concepts/会话并发互斥]] |
| 熔断状态 | `fail:{tool}` 计数 / `gen:{tool}` 代数 + 开启时间戳 | [[wiki/concepts/工具熔断]] |
| 跨会话缓存 | key 按 userId / provider 隔离，TTL 按业务寿命 | [[wiki/concepts/工具缓存]] |
| 跨工具接力 | 方案 JSON 存 Redis，工具间靠 key 传引用 | [[wiki/concepts/Skill-vs-Tool]] |
| 取消广播 | Pub/Sub `session_cancel` 频道 | [[wiki/concepts/会话并发互斥]] |

## 已知问题与判断

- **熔断状态必须放 Redis 而非进程内 Map** → 多实例共享同一份视图（重启不丢）、`INCR`/`HINCRBY` 天然原子、TTL 自动清理脏数据
  · 并发一致性靠 Lua 脚本把「计数+续期」「代数递增+时间戳写入」各放单次脚本内完成
- **AgentScope 里 Redis 是硬依赖**（`RedisStorage` 存会话/凭据/agent 状态），而向量层默认进程内嵌 → 见 [[wiki/concepts/向量库选型]]
  · 部署时 Redis 是「必须件」，向量库是「可选件」
- **Redis 故障时缓存层当 miss 回源，不阻断主流程** → 见 [[wiki/concepts/工具缓存]]
- **锁靠看门狗续期**，进程整体崩溃时锁会等到 TTL 过期才释放

## 关键配置与用法

```text
锁：acquire_lock(session_lock) + 看门狗续期
熔断：每 tool 仅 2 把 key（fail / gen），全生命周期复用
缓存：30min 用户画像 / 24h 中间结果 / 7~30d 凭证；凭证只存密文
```

## 相关实体 / 相关概念

[[wiki/entities/vector-db]]、[[wiki/entities/postgresql]]

## 时间线

- 2026-08：`PY学习笔记.md` 记录 `acquire_lock` 的看门狗实现
- 2026-10：`agent 开发学习笔记.md` 记录熔断与缓存两处用法

## 相关页面

已建档的 source 页：[[wiki/sources/agent-开发学习笔记]]、[[wiki/sources/py学习笔记]]

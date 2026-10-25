---
type: entity
title: "PostgreSQL"
entity_kind: infra
domain: security
aliases: [postgres, pg]
tags: [infra, database, security]
sources: ["wiki/sources/安全运维复盘", "wiki/sources/py学习笔记"]
concepts: ["wiki/concepts/向量库选型"]
---

# PostgreSQL

## 是什么 / 在我的体系里的位置

本仓出现两个完全不同的面向：

1. **容器化部署的攻击面** —— `安全运维复盘.md` 下篇记录的 `COPY FROM PROGRAM` 提权事件
2. **pgvector 的场景** —— 作为「唯一能同库事务」的向量存储选择，见 [[wiki/concepts/向量库选型]]

## 已知问题与判断

- **`COPY FROM PROGRAM` 可以让数据库执行宿主机命令** → 见 [[wiki/synthesis/copy-from-program处置]]
  · 触发前提：攻击者已获得可执行 `COPY` 的数据库账号
  · 关键 IOC、排查过程、处置动作、验证清单在 synthesis 页，本页不重复
- **Docker 里的 PostgreSQL 不等于隔离** —— 容器内的 `PROGRAM` 执行的是容器内的 shell，但容器往往挂载了宿主机目录或持有过高权限
- **pgvector 的同库事务优势只在业务数据本来就在 PG 里时成立**

## 关键配置与用法

安全侧的加固要点（详细见 synthesis）：限制 `COPY` 权限、禁用不必要的超级用户、容器内去掉 `CAP_SYS_ADMIN`、审计 `pg_stat_activity` 中的异常会话。

## 相关实体 / 相关概念

[[wiki/entities/redis]]、[[wiki/entities/vector-db]]

## 时间线

- 2026-07：`COPY FROM PROGRAM` 事件处置与复盘成文
- 2026-10-19：`PostgreSQL 容器 COPY FROM PROGRAM 攻击处置复盘与加固指南.md` 改名为 `安全运维复盘.md`，与 ZTE 滑块篇合并

## 相关页面

已建档的 source 页：[[wiki/sources/安全运维复盘]]、[[wiki/sources/py学习笔记]]

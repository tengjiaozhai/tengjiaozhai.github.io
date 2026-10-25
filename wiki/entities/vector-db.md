---
type: entity
title: "Qdrant / Milvus / pgvector / Chroma"
entity_kind: service
domain: ai
aliases: [qdrant, milvus, pgvector, chroma, 向量库四件套]
tags: [vector-db, rag]
sources: ["wiki/sources/agent-开发学习笔记"]
concepts: ["wiki/concepts/向量库选型"]
---

# Qdrant / Milvus / pgvector / Chroma

## 是什么 / 在我的体系里的位置

四个向量存储引擎，形态完全不同，本仓合并为一页比较（选型结论见 [[wiki/concepts/向量库选型]]，完整对比见 [[wiki/synthesis/四类向量库对比]]）。

| | 形态 | 语言 | 规模上限 | 一致性 |
|---|---|---|---|---|
| **Qdrant** | 独立专用服务 | Rust | 单机千万 / 集群亿级 | 单机强一致（WAL + Raft） |
| **Milvus** | 分布式专用服务（存算分离） | Go + C++ | 十亿级 | 近似最终（TSO） |
| **pgvector** | PostgreSQL 扩展 | C | 单机千万 | **完整 ACID** |
| **Chroma** | 嵌入式客户端库 | Python | 百万级以内 | 无事务 |

## 已知问题与判断

- **两个功能分水岭：混合检索与元数据过滤** → Qdrant 两项都原生；Milvus 都原生但运维最重；pgvector 需自建混合检索且 KNN 非过滤感知；Chroma 两项都无
- **pgvector 的唯一不可替代优势是同库事务** —— 能和业务数据原子提交。业务数据不在 PG 里时这个优势不成立
- **Chroma 不适合生产** —— 无事务、单写进程、崩溃丢未落盘段
- **规模不是主要决策点** —— 多数业务 RAG 落在 100 万~1000 万，四个库都覆盖

## 关键配置与用法

手头服务器状态（2026-10）：

```text
已有 Milvus standalone（Dify 依赖，19530 端口，~3.6G 内存）
已有 PostgreSQL 容器（Dify 内部网络，未映射宿主机）
没有 Qdrant / Chroma / Redis
Qdrant 6333 端口空闲
```

AgentScope 默认 `QdrantStore(location=":memory:")`（进程内嵌，零外部依赖）。

## 相关实体 / 相关概念

[[wiki/entities/redis]]、[[wiki/entities/agentscope]]

## 时间线

- 2026-10：本仓记录了四库对比与手头服务器盘点，结论是「演示级 RAG 不用装任何向量库，要持久化新开独立 Qdrant 容器」

## 相关页面

已建档的 source 页：[[wiki/sources/agent-开发学习笔记]]

---
type: source
title: "thoughts 簇 · 项目概览与启动"
source_files: ["thoughts/001_✅项目如何启动&快速开始.md", "thoughts/002_✅项目功能介绍与演示.md", "thoughts/003_✅项目整体架构与核心功能.md", "thoughts/004_✅登录体系开发及介绍.md"]
source_type: thought-batch
domain: ai
raw_digest: "n/a"
lines: 665
captured: 2026-10-19
status: verified
tags: [llmentor, project-overview, bootstrap]
entities: ["wiki/entities/agentscope"]
concepts: []
---

# thoughts 簇 · 项目概览与启动

## 这一簇覆盖什么

LLMentor（gogo-agent）项目的入门四篇：启动配置、功能演示、整体架构、登录体系。四篇是连续的叙事链 —— 001 教你怎么把项目跑起来，003 解释跑起来的东西是什么结构，004 拆登录这条最基础的链路。

边界：**全部是项目自身的描述**，不含可跨项目复用的方法论。这是「簇汇总页」而不是「独立 A 层页」的原因。

## 四篇各讲什么

| # | 标题 | 行数 | 核心内容 |
|---|---|---|---|
| 001 | 项目如何启动&快速开始 | 332 | `application.yml` 改配置 → 初始化数据库 → 初始化百炼记忆库和知识库 → 启动后端。含「运行时需要提供的配置（跑 Skill 才需要）」的区分 |
| 002 | 项目功能介绍与演示 | 14 | 提纲，无正文 |
| 003 | 项目整体架构与核心功能 | 183 | 技术栈（Java 21 / AgentScope 1.0.12 / ReAct + Hook + Tool/Skill/MCP 统一编排）、分层视图、请求主流程、多智能体架构 |
| 004 | 登录体系开发及介绍 | 140 | Sa-Token + Redis 会话 + localStorage Token + 请求头携带；CORS 与全局鉴权拦截器；`AuthService` |

## 可抽出的原子

- **AgentScope 1.0.12 的定位**：ReAct 模式 + Hook 生命周期 + Tool/Skill/MCP 统一编排 → [[wiki/entities/agentscope]]
- **登录体系的完整实现**（Sa-Token + Redis + localStorage）→ 待抽：会话型鉴权的最小实现
- **「跑 Skill 才需要的配置」这一区分** → 待抽：可选依赖的配置分层

其余内容（具体配置项、DDL、接口清单）留在原文，不外抽 —— 是项目文档不是知识。

## 与其他笔记的重叠点

- **整体架构**：`agent 开发学习笔记.md` 的 17 个主节都是这套架构的局部深入，003 是全局视图
- **登录 / 鉴权**：本簇 004 讲 Sa-Token 登录，[[wiki/sources/thoughts-鉴权与密钥体系]] 讲第三方鉴权与 API Key 管理，两者是「自有用户体系」与「外部凭据」两条线
- **Redis**：004 用 Redis 存会话，[[wiki/entities/redis]] 汇总了 Redis 的全部用法

## 本篇独有、别处没有的

1. **完整的启动清单** —— 从改 `application.yml` 到初始化百炼记忆库，本仓唯一的端到端 bootstrap 记录
2. **技术栈的权威版本号** —— Java 21 / AgentScope 1.0.12 / `1.0.0-SNAPSHOT`
3. **Sa-Token 的具体配置** —— 全局鉴权拦截器 + CORS 的写法

## 证据

- `thoughts/001_✅项目如何启动&快速开始.md`（332 行）
- `thoughts/002_✅项目功能介绍与演示.md`（14 行，提纲）
- `thoughts/003_✅项目整体架构与核心功能.md`（183 行）
- `thoughts/004_✅登录体系开发及介绍.md`（140 行）

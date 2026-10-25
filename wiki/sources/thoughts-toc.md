---
type: source
title: "thoughts 登记表（102 篇三档分层）"
source_file: "thoughts"
source_type: toc
domain: ai
raw_digest: "n/a"
lines: 0
captured: 2026-10-19
status: verified
tags: [index, thoughts, toc]
entities: []
concepts: []
---

# thoughts 登记表

## 这一页是什么

`thoughts/` 102 篇的一行一篇登记表。**唯一的手写表格页**，`tools/wiki-index.mjs` 不重建它，只校验覆盖（102 行必须齐）。

职责分工：
- [[wiki/sources/目录]] 给**站点路由**（给人点，`#/doc/thoughts/<slug>`）
- 本页给 **wiki 分层**（给 LLM 查，谁在 A 层、谁在 B 簇、谁只登记）

## 三档定义

| 层 | 数量 | 形态 | 判据 |
|---|---|---|---|
| **A** | 22 | `wiki/sources/thoughts-<slug>.md` 独立页 | 含一个别处没有的机制/判断/取舍 |
| **B** | 65（9 簇） | `wiki/sources/thoughts-<簇名>.md` | 同主题串行记录，单篇只是连续叙事的一段 |
| **C** | 15 | 只在本表一行 | 草稿（无 `✅`，正文 17 行左右） |

**草稿不建 source 页**：无 `✅` 前缀的 15 篇只登记，`去向` 列标 `draft`。

## 全景

| # | 标题 | 行数 | 层级 | 去向 |
|---|---|---|---|---|
| 001 | 项目如何启动&快速开始 | 332 | B | [[wiki/sources/thoughts-项目概览与启动\|簇]] |
| 002 | 项目功能介绍与演示 | 14 | B | [[wiki/sources/thoughts-项目概览与启动\|簇]] |
| 003 | 项目整体架构与核心功能 | 183 | B | [[wiki/sources/thoughts-项目概览与启动\|簇]] |
| 004 | 登录体系开发及介绍 | 140 | B | [[wiki/sources/thoughts-项目概览与启动\|簇]] |
| 005 | 会话与消息的持久化 | 325 | A | [[wiki/sources/thoughts-会话与消息的三层持久化\|三层持久化]] |
| 006 | 为什么要用多智能体架构？ | 78 | B | [[wiki/sources/thoughts-智能体设计\|簇]] |
| 007 | 项目中有哪些智能体，各自职责是什么？ | 171 | B | [[wiki/sources/thoughts-智能体设计\|簇]] |
| 008 | 什么是意图识别/问题改写，为什么要做？ | 35 | B | [[wiki/sources/thoughts-意图识别三层\|簇]] |
| 009 | 为什么意图识别/问题改写不放在主智能体或者做成Skill？ | 75 | B | [[wiki/sources/thoughts-路由与智能体协作\|簇]] |
| 010 | 为什么问题改写/意图识别不用ReAct Agent？ | 62 | B | [[wiki/sources/thoughts-路由与智能体协作\|簇]] |
| 011 | 通过问题改写融合多轮对话 | 229 | A | [[wiki/sources/thoughts-多轮对话改写\|多轮改写]] |
| 012 | 基于规则+RAG+LLM构建三层意图识别 | 161 | B | [[wiki/sources/thoughts-意图识别三层\|簇]] |
| 013 | 基于规则的L0/L1意图识别详解 | 183 | B | [[wiki/sources/thoughts-意图识别三层\|簇]] |
| 014 | 基于RAG的L2意图识别详解 | 151 | B | [[wiki/sources/thoughts-意图识别三层\|簇]] |
| 015 | L1/L2意图识别针对多意图的支持 | 84 | B | [[wiki/sources/thoughts-意图识别三层\|簇]] |
| 016 | 单次对话多意图识别与执行 | 68 | B | [[wiki/sources/thoughts-意图识别三层\|簇]] |
| 017 | 意图识别与问题改写的流水线编排 | 62 | B | [[wiki/sources/thoughts-意图识别三层\|簇]] |
| 018 | 引入L1/L2之后意图识别不准确问题修复 | 67 | B | [[wiki/sources/thoughts-意图识别三层\|簇]] |
| 019 | 用户意图很明确时，直接路由给子智能体还是主智能体？ | 94 | B | [[wiki/sources/thoughts-路由与智能体协作\|簇]] |
| 020 | 问题改写、意图识别、MasterAgent、SubAgent的执行顺序 | 29 | B | [[wiki/sources/thoughts-意图识别三层\|簇]] |
| 021 | 多智能体之间的上下文传递方式 | 87 | B | [[wiki/sources/thoughts-路由与智能体协作\|簇]] |
| 022 | 基于Reactor Context 实现多智能体之间的会话上下文传递 | 213 | C | draft |
| 023 | 主智能体功能介绍与开发 | 128 | B | [[wiki/sources/thoughts-智能体设计\|簇]] |
| 024 | 我给 Agent 加了哪些关键配置 | 195 | B | [[wiki/sources/thoughts-路由与智能体协作\|簇]] |
| 025 | 各个Agent配置对比一览 | 17 | C | draft |
| 026 | 用了哪几种模型，分别用在哪？ | 51 | B | [[wiki/sources/thoughts-路由与智能体协作\|簇]] |
| 027 | 快速路由到上次执行的子智能体 | 164 | B | [[wiki/sources/thoughts-路由与智能体协作\|簇]] |
| 028 | 如何避免模型幻觉导致用户id传错？ | 51 | B | [[wiki/sources/thoughts-路由与智能体协作\|簇]] |
| 029 | 行程管理智能体的功能介绍及开发 | 190 | B | [[wiki/sources/thoughts-智能体设计\|簇]] |
| 030 | 行程管理相关业务数据模型 | 53 | B | [[wiki/sources/thoughts-工具家族定义\|簇]] |
| 031 | 如果定义一个好的工具 | 268 | A | [[wiki/sources/thoughts-工具设计规范\|工具设计规范]] |
| 032 | 差旅政策工具定义及开发 | 187 | B | [[wiki/sources/thoughts-工具家族定义\|簇]] |
| 033 | 用户联系信息工具定义及开发 | 121 | B | [[wiki/sources/thoughts-工具家族定义\|簇]] |
| 034 | 差旅政策知识库定义及开发 | 59 | B | [[wiki/sources/thoughts-工具家族定义\|簇]] |
| 035 | 差旅单管理工具定义及开发 | 196 | B | [[wiki/sources/thoughts-工具家族定义\|簇]] |
| 036 | 行程冲突检测工具定义及开发 | 111 | B | [[wiki/sources/thoughts-工具家族定义\|簇]] |
| 037 | 预订管理工具定义及开发 | 94 | B | [[wiki/sources/thoughts-工具家族定义\|簇]] |
| 038 | 行程审批及管理功能介绍及开发 | 17 | C | draft |
| 039 | 使用缓存减少工具重复调用 | 109 | A | [[wiki/sources/thoughts-工具缓存\|工具缓存]] |
| 040 | 如何基于回答更好的问题推荐？ | 124 | B | [[wiki/sources/thoughts-路由与智能体协作\|簇]] |
| 041 | 为什么要关闭模型的深度思考？ | 136 | B | [[wiki/sources/thoughts-路由与智能体协作\|簇]] |
| 042 | 为什么行程规划智能体要用Plan-and-Exucute？ | 203 | A | [[wiki/sources/thoughts-plan-and-execute\|Plan-Execute]] |
| 043 | 行程规划智能体的功能介绍及开发 | 247 | B | [[wiki/sources/thoughts-智能体设计\|簇]] |
| 044 | 为什么行程方案设计不用Skill要用工具？ | 122 | A | [[wiki/sources/thoughts-方案设计用工具\|方案用Tool]] |
| 045 | 行程方案设计工具设计细节 | 59 | B | [[wiki/sources/thoughts-工具家族定义\|簇]] |
| 046 | 出差目的地实时联网查询工具定义及开发 | 75 | B | [[wiki/sources/thoughts-工具家族定义\|簇]] |
| 047 | 天气查询工具/MCP的接入 | 153 | A | [[wiki/sources/thoughts-mcp接入\|天气双通道]] |
| 048 | 市面上可用的旅行相关skill/mcp工具对比 | 151 | A | [[wiki/sources/thoughts-旅行能力选型\|旅行能力选型]] |
| 049 | 途牛 Skill介绍及接入 | 44 | B | [[wiki/sources/thoughts-外部skill接入\|簇]] |
| 050 | 航班管家Skill介绍及接入 | 34 | B | [[wiki/sources/thoughts-外部skill接入\|簇]] |
| 051 | Rolling Go Skill介绍及接入 | 51 | B | [[wiki/sources/thoughts-外部skill接入\|簇]] |
| 052 | 为什么行程审核不用Skill要用子智能体？ | 112 | A | [[wiki/sources/thoughts-子智能体vs-skill\|子智能体vsSkill]] |
| 053 | 行程审核智能体的功能介绍及开发 | 210 | B | [[wiki/sources/thoughts-智能体设计\|簇]] |
| 054 | 行程方案最终审核工具定义及开发 | 212 | B | [[wiki/sources/thoughts-工具家族定义\|簇]] |
| 055 | Agent中如何实现第三方鉴权？ | 104 | B | [[wiki/sources/thoughts-鉴权与密钥体系\|簇]] |
| 056 | 基于Token 直接配置方式做鉴权 | 131 | B | [[wiki/sources/thoughts-鉴权与密钥体系\|簇]] |
| 057 | 基于OAuth PKCE + 本地回调做鉴权 | 78 | B | [[wiki/sources/thoughts-鉴权与密钥体系\|簇]] |
| 058 | 改造外部Skill使其具备生产环境可用性 | 279 | A | [[wiki/sources/thoughts-第三方skill生产化\|Skill生产化]] |
| 059 | 如何实现API KEY的动态管理与加密、脱敏 | 250 | B | [[wiki/sources/thoughts-鉴权与密钥体系\|簇]] |
| 060 | ReviewAgent如何获取到PlanAgent的规划结果？ | 74 | B | [[wiki/sources/thoughts-路由与智能体协作\|簇]] |
| 061 | 为什么单独搞一个BookingAgent？ | 62 | B | [[wiki/sources/thoughts-路由与智能体协作\|簇]] |
| 062 | 行程预订智能体的功能介绍及开发 | 214 | B | [[wiki/sources/thoughts-智能体设计\|簇]] |
| 063 | 预定时，为什么下单用skill，取消用工具？ | 121 | A | [[wiki/sources/thoughts-下单用skill取消用工具\|下单Skill/取消Tool]] |
| 064 | 行程预定相关业务数据模型 | 43 | B | [[wiki/sources/thoughts-工具家族定义\|簇]] |
| 065 | 什么时候用Skill，什么时候用SubAgent | 29 | A | [[wiki/sources/thoughts-subagent与skill对照\|Skill/SubAgent对照]] |
| 066 | 工具并行执行&失败重试 | 81 | A | [[wiki/sources/thoughts-工具并行与重试\|并行与重试]] |
| 067 | 引入工具级熔断机制避免重复失败 | 255 | A | [[wiki/sources/thoughts-工具熔断\|工具熔断]] |
| 068 | 提示词工程——注意力引导 | 114 | B | [[wiki/sources/thoughts-提示词工程\|簇]] |
| 069 | 提示词工程——要不要在prompt中写清楚工具该怎么用？ | 87 | B | [[wiki/sources/thoughts-提示词工程\|簇]] |
| 070 | 提示词工程——角色与人格设定 | 45 | B | [[wiki/sources/thoughts-提示词工程\|簇]] |
| 071 | 提示词工程——结构化输出约束 | 385 | A | [[wiki/sources/thoughts-结构化输出约束\|结构化输出]] |
| 072 | 提示词工程——Few Shot | 175 | B | [[wiki/sources/thoughts-提示词工程\|簇]] |
| 073 | 提示词工程——Step-back Prompting | 54 | B | [[wiki/sources/thoughts-提示词工程\|簇]] |
| 074 | 提示词工程——Reflexion | 72 | B | [[wiki/sources/thoughts-提示词工程\|簇]] |
| 075 | 提示词工程——决策表 / 路由表 | 125 | B | [[wiki/sources/thoughts-提示词工程\|簇]] |
| 076 | 提示词工程——动态变量注入 | 43 | B | [[wiki/sources/thoughts-提示词工程\|簇]] |
| 077 | 提示词工程——职责边界与拒绝策略 | 99 | B | [[wiki/sources/thoughts-提示词工程\|簇]] |
| 078 | 上下文工程——记忆自动压缩 | 88 | A | [[wiki/sources/thoughts-上下文压缩\|记忆自动压缩]] |
| 079 | 上下文工程——如何对第三方Skill瘦身 | 194 | B | [[wiki/sources/thoughts-上下文工程\|簇]] |
| 080 | 上下文工程——工具返回内容裁剪 | 82 | B | [[wiki/sources/thoughts-上下文工程\|簇]] |
| 081 | 上下文工程——优化系统提示词利用KV缓存 | 126 | A | [[wiki/sources/thoughts-kv缓存与提示词缓存\|KV缓存]] |
| 082 | 上下文工程——上下文缓存 | 54 | B | [[wiki/sources/thoughts-上下文工程\|簇]] |
| 083 | 上下文工程——利用中间文件减少token消耗 | 32 | B | [[wiki/sources/thoughts-上下文工程\|簇]] |
| 084 | 上下文工程——Skill正文折叠 | 85 | B | [[wiki/sources/thoughts-上下文工程\|簇]] |
| 085 | 上下文工程——长期记忆 | 158 | B | [[wiki/sources/thoughts-上下文工程\|簇]] |
| 086 | Harness工程——行程规划的执行闭环 | 84 | A | [[wiki/sources/thoughts-执行闭环\|执行闭环]] |
| 087 | Harness工程——分层记忆体系 | 17 | C | draft |
| 088 | Harness工程——命令执行的安全护栏 | 119 | A | [[wiki/sources/thoughts-命令执行护栏\|命令护栏]] |
| 089 | Harness工程——沙箱 | 17 | C | draft |
| 090 | Harness工程——可观测性 | 17 | C | draft |
| 091 | 隐私保护——全链路敏感信息脱敏 | 17 | C | draft |
| 092 | 集群架构下的Agent打断与恢复 | 92 | A | [[wiki/sources/thoughts-集群打断与恢复\|集群打断]] |
| 093 | Agent 编排与智能调度 | 17 | C | draft |
| 094 | 如何实现用户级别的鉴权隔离 | 17 | C | draft |
| 095 | 接入RAG 知识库，让 Agent 拥有领域知识 | 139 | A | [[wiki/sources/thoughts-rag知识库\|RAG知识库]] |
| 096 | 外部能力集成 — MCP 与 Skill | 150 | A | [[wiki/sources/thoughts-mcp与skill\|MCP与Skill]] |
| 097 | Human-in-the-Loop — Agent 与用户的结构化交互 | 17 | C | draft |
| 098 | 实时通信 — SSE 流式推送架构 | 17 | C | draft |
| 099 | 引入A2A实现跨域Agent通信 | 17 | C | draft |
| 100 | 为了缩短执行链路，做了哪些优化？ | 17 | C | draft |
| 101 | 多智能体之间通信方式如何选择？ | 17 | C | draft |
| 102 | 会话管理与集群部署 — 生产级Agent 系统 | 17 | C | draft |
## 9 个簇的划分依据

| 簇 | 篇数 | 归簇理由 |
|---|---|---|
| 项目概览与启动 | 4 | 连续入门叙事，单篇无独立判断 |
| 智能体设计 | 7 | 九个智能体的职责铺开，合起来才是完整设计 |
| 意图识别三层 | 9 | 同一机制的不同侧面（三层 / 多意图 / 编排 / 修复） |
| 路由与智能体协作 | 12 | 协作层决策：路由归属、参数传递、模型分级 |
| 工具家族定义 | 11 | 同一条业务线的工具逐一铺开 |
| 外部 Skill 接入 | 3 | 三家平台接入清单，都很短（33–50 行） |
| 鉴权与密钥体系 | 4 | 两条线：第三方授权 + API Key 管理 |
| 提示词工程 | 9 | 九个手法，同一主题串行 |
| 上下文工程 | 6 | 六个方向：瘦身 / 裁剪 / 缓存 / 卸载 / 记忆 |

## 15 篇草稿（C 层）

022、025、038、087、089、090、091、093、094、097、098、099、100、101、102

全部是 17 行左右的提纲，无正文。**其中 098（SSE）与 097（HITL）的主题在本仓其他笔记里有实质内容**，只是这一篇本身是空的：

- SSE → `agent 开发学习笔记.md` §9、[[wiki/concepts/SSE流式推送]]
- HITL → `thoughts/092` 提到了 HITL 挂起状态的清理，但无系统描述

草稿补齐后应重新分档（大概率进 A 或 B）。

## 维护规则

1. 新增 thoughts 文件 → 本表加一行 + `目录.md` 加一条路由链接（两处都要改，否则站点进不去或 wiki 查不到）
2. 草稿转正式（加 `✅`）→ 从 C 升到 A/B，同时建对应 source 页
3. 修改 thoughts 正文 → 对应 source 页的 `raw_digest` 会漂，`wiki-lint` 会报 `stale`

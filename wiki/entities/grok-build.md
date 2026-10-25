---
type: entity
title: "Grok Build"
entity_kind: project
domain: ai
aliases: [grok-build, xai-grok-build]
tags: [agent, compaction, rust]
sources: ["wiki/sources/harness学习笔记"]
concepts: ["wiki/concepts/上下文压缩"]
---

# Grok Build

## 是什么 / 在我的体系里的位置

xAI 的编码 agent 实现（`xai-org/grok-build`）。本仓通过第三方源码解读（`linearuncle.github.io/grok-build-wiki` 第 17 章）了解其压缩机制，核心部分经 `crates/common/xai-grok-compaction/` 源码验证。

在四套上下文压缩方案里，它是唯一把「回滚」做成**事务式**而非撤销式的实现。

## 已知问题与判断

- **压缩不是「把旧消息总结一下」，而是「摘要替换 + 分区压缩 + 原文回查」** → 见 [[wiki/concepts/上下文压缩]]
- **两层架构：对内 / 对外** → `intra_compaction` 在任务执行中自动触发（需在运行中「插队」而不中断工作流）；`inter_compaction` 在会话结束后由 `/compact` 命令或外部系统触发
- **五步流水线 `select → fit → sample → guard → commit`** 决定「压哪里」与「怎么保证不丢」
- **三个守卫是独有补偿设计**，其他三套方案没有对应机制
- **回滚是事务式**：不是「把改了的改回去」，而是「没 commit 就当没发生」

## 关键配置与用法

四种压缩模式决定「压哪里」，对应 `intra_compaction/compact.rs` 与 `inter_compaction/compact.rs` 两条代码路径。

## 相关实体 / 相关概念

[[wiki/entities/pi]]、[[wiki/entities/agentscope]]

## 时间线

- 2026-08：`Harness学习笔记.md` 记录其两层架构、四模式、三守卫、事务式回滚
- 2026-10-19：未见更新，结论以当时的源码解读为准

## 相关页面

已建档的 source 页：[[wiki/sources/harness学习笔记]]

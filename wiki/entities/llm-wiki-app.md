---
type: entity
title: "LLM Wiki（nashsu 桌面应用）"
entity_kind: project
domain: ai
aliases: [llm_wiki, llm-wiki-app, nashsu-llm-wiki]
version_of_interest: "README_CN，2026-10-22 快照"
tags: [llm-wiki, knowledge-graph, tauri]
sources: ["wiki/sources/llm-wiki-app-readme"]
concepts: ["wiki/concepts/关联度模型", "wiki/concepts/知识图谱健康度"]
---

# LLM Wiki（nashsu 桌面应用）

## 是什么 / 在我的体系里的位置

Karpathy llm-wiki 方法论的**桌面化实现**：Tauri v2（Rust 后端）+ React 19，把「人策展 / LLM 维护」从一份可粘贴的模式文档变成带 UI 的应用。依据 [[wiki/sources/llm-wiki-app-readme|README 裁剪件]]。

对我的位置：**参照物，不是替代品**。本仓 `wiki/` 用手写 schema + 两个 node 脚本维护；它是同一套约定的重装备版本。要不要向它靠拢，判断写在 [[wiki/concepts/知识图谱健康度|知识图谱健康度]]「取舍与边界」。

## 已知问题与判断

- **它的 wiki 页面类型比本仓多三类**：`overview.md`、`queries/`、`comparisons/` → 本仓没有 overview，用 `index.md` 头部摘要顶替了一部分。· 依据 README「项目结构」。状态：**是否需要未评估**。
- **检索靠向量 + 图扩展，本仓靠 index + grep** → 分界不在技术而在规模，见 [[wiki/concepts/知识图谱健康度|知识图谱健康度]]。
- **权重与召回数字均为自述**，无第三方复现 → 引用时降级表述（来源页 `status: unverified`）。

## 关键配置与用法

- 本地 HTTP API：`http://127.0.0.1:19828`，Token 鉴权、仅本机可达；`POST /projects/{id}/search` 为 Hybrid（关键词 + 向量）检索。
- MCP Server 随包，`npm run mcp:build` 后由「设置 → API + MCP」生成客户端配置。与本仓 [[wiki/entities/mcp-and-skill|MCP 与 Skill]] 同一路线。
- 项目结构：`purpose.md` / `schema.md` / `raw/{sources,assets}` / `wiki/{index,log,overview,entities,concepts,sources,queries,synthesis,comparisons}` / `.llm-wiki/`。
- 构建前置：Node 20+、Rust 1.88+、protoc。

## 相关实体 / 相关概念

- [[wiki/entities/mcp-and-skill|MCP 与 Skill]] —— 同样走 MCP + agent skill（`npx skills add …`）
- [[wiki/entities/vector-db|向量数据库]] —— 它选 LanceDB（嵌入式，可选）
- [[wiki/concepts/关联度模型|关联度模型]] · [[wiki/concepts/知识图谱健康度|知识图谱健康度]]

## 时间线

- Karpathy `llm-wiki.md` gist（抽象模式）→ nashsu 实现为桌面应用（本文记录时点 2026-10-22）。

---
type: source
title: "Claude Agent SDK 学习笔记"
source_file: "Claude Agent Sdk学习笔记.md"
source_type: note
domain: ai
raw_digest: "1597-3f591769"
lines: 1597
captured: 2026-10-19
status: verified
tags: [claude-agent-sdk, evals, mcp, proxy, loop-engineering]
entities: ["wiki/entities/claude-agent-sdk", "wiki/entities/claude-code", "wiki/entities/mcp-and-skill"]
concepts: ["wiki/concepts/Agent评测", "wiki/concepts/上下文压缩", "wiki/concepts/SSE流式推送"]
---

# Claude Agent SDK 学习笔记

## 这一篇覆盖什么

三块内容（标题只反映第一块）：

1. **Claude Agent SDK 主体** —— `memory_stores`、`evals`（含五类完整评估脚本）、`Loop Engineering`、`保持上下文高效`、`read_file` 工具要点
2. **附录 · DevSpace MCP 配置指南**（约 900 行，第 663 行起）—— 安装、隧道、配置、故障排查
3. **附录 · Claude Code 400 问题修复**（文件末尾）—— 本地过滤代理的完整实现

边界：主体部分是 SDK 用法记录；两个附录是**独立的排障文档**，与 SDK 无强关联。

## 可抽出的原子

| 主题 | 去向 |
|---|---|
| `memory_stores` 跨 session 持久化记忆 | [[wiki/entities/claude-agent-sdk]] |
| `evals` 五类评估脚本（情感分类 / FAQ 一致性 / 摘要 / 语气 / PHI 检测） | [[wiki/concepts/Agent评测]] 的实例 |
| `Loop Engineering` | [[wiki/entities/claude-agent-sdk]] |
| `read_file` 的按需加载要点（默认 500 行、分段、先摸总行数） | [[wiki/entities/claude-agent-sdk]] |
| Claude Code 400 的根因与双向过滤代理 | [[wiki/synthesis/claude-code-400修复]] |
| DevSpace MCP 配置 | [[wiki/entities/mcp-and-skill]] |

## 与其他笔记的重叠点

- **评估方法论**：`agent 开发学习笔记.md` §10 讲原理（三类裁判、pass@k），本文的 `evals` 一节是**具体脚本实例** —— 五种任务形态各有完整代码。两者互补 → [[wiki/concepts/Agent评测]]
- **MCP 接入**：`thoughts/096` 讲 MCP vs Skill 的取舍，本文是 MCP 的一个具体配置案例 → [[wiki/entities/mcp-and-skill]]
- **SSE 流式**：400 修复代理的状态管理与本仓 SSE 哨兵机制同构 → [[wiki/concepts/SSE流式推送]]
- **上下文压缩**：本文 `保持上下文高效` 讲设计原则，`Harness学习笔记.md` 讲具体机制

## 本篇独有、别处没有的

1. **五类评估脚本的完整代码** —— 情感分类（`zip` 配对 + 准确率）、FAQ 一致性（同组多问法互相比）、摘要（金标对比）、语气（标签校验）、PHI 检测（合规场景）。本仓唯一的可运行评估样例
2. **`Loop Engineering` 的具体内容** —— 什么时候停、什么时候继续、什么时候交给工具
3. **`read_file` 的三条工程要点** —— 默认读前 500 行、大文件分段、先摸总行数再读末尾 100 行
4. **`is_thinking_block` 的完整判定逻辑** —— 三层判断（精确 type 匹配 / 子串匹配 / 结构推断），处理了 `redacted_thinking` 与未知变体
5. **SSE 响应侧过滤的 `drop_indices` 状态机** —— 只丢 `content_block_start` 不够，后续 delta 带着同一 index 进来会让客户端报错
6. **DevSpace MCP 的隧道方案** —— 自动分配随机 URL，本仓唯一的 MCP 隧道实践

## 待处理

- 文件结构是三块拼装，标题只反映第一块。如果将来拆分（把两个附录独立成文），需同步改 `MD_FILES` 与 slug、图片路径
- `evals` 脚本依赖 `ANTHROPIC_API_KEY`，本仓未记录运行结果，只有代码

## 证据

- 全文件 1596 行
- 本页 raw_digest `1596-3f591769`
- date: 2026-06-30（主体），附录日期分别为 2026-06-28（DevSpace）、2026-07（400 修复）
- 代理文件：`/Users/shenmingjie/.claude/proxy/anthropic_thinking_filter_proxy.py`

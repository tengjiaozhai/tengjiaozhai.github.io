---
type: source
title: "thoughts/088 命令执行的安全护栏"
source_file: "thoughts/088_✅Harness工程——命令执行的安全护栏.md"
source_type: thought-batch
domain: ai
raw_digest: "119-76d8041a"
lines: 119
captured: 2026-10-19
status: verified
tags: [llmentor, harness, shell, security]
entities: ["wiki/entities/agentscope"]
concepts: ["wiki/concepts/Skill-vs-Tool"]
---

# thoughts/088 命令执行的安全护栏

## 这一篇覆盖什么

给 Agent 配备 Shell 执行能力是把双刃剑：

- 一方面，它让 Agent 能调外部 CLI（搜机票、订酒店、查火车票）—— 这些第三方服务只有 CLI 接口，没有原生 SDK
- 另一方面，LLM 具有不可控性 —— 它可能生成任何命令

四层护栏：

| 层 | 拦什么 |
|---|---|
| **命令白名单** | 只允许预设的可执行程序 |
| **链式命令拦截** | 阻断组合攻击（`cmd1 && cmd2`、`cmd1 \| cmd2`、`$(...)`） |
| **Hook 秘钥注入** | 凭据不经模型手，在执行期由 hook 注入环境 |
| **用户级隔离** | 多租户安全，不同用户的 Shell 环境不互相污染 |

## 可抽出的原子

- **链式命令拦截的必要性** —— 白名单只拦单条命令，`tuniu call x && curl evil` 能绕过。这是本仓最容易被忽略的一条
- **Hook 秘钥注入** —— 与 `thoughts/059` 的「LLM 侧看到句柄不是 Key」同源 → [[wiki/sources/thoughts-鉴权与密钥体系]]
- **用户级隔离** —— Shell 是有状态的（cwd、环境变量、临时文件），多租户下必须隔离

## 与其他笔记的重叠点

- **Skill 依赖 Shell** → [[wiki/sources/thoughts-外部skill接入]]、[[wiki/entities/mcp-and-skill]]
- **凭据管理** → [[wiki/sources/thoughts-鉴权与密钥体系]]（059）
- **沙箱**：`thoughts/089` 只有 17 行草稿（无正文），所以「沙箱」这一层在本仓没有实质记录 —— 本篇的四层护栏是唯一的安全设计记录
- **工具熔断**：`thoughts/067` 是另一类护栏（防重复失败），本篇防越权

## 本篇独有、别处没有的

1. **四层护栏的完整设计** —— 本仓唯一的 Shell 安全方案
2. **链式命令拦截的绕过分析与对策** —— 白名单为什么不够
3. **「第三方服务只有 CLI 接口，没有原生 SDK」** —— 为什么不得不开 Shell 的理由

## 已知缺口

- 「沙箱」这一层（`thoughts/089`）是 17 行草稿，无内容。四层护栏是否真的能替代沙箱，本仓没有讨论

## 证据

- `thoughts/088_✅Harness工程——命令执行的安全护栏.md`（118 行）
- `thoughts/089_Harness工程——沙箱.md`（17 行，草稿）

## 相关页面

- 权限门在插件形态里的落点（tools/pre-execute）→ [[wiki/synthesis/dsh-插件设计模式]]

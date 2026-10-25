---
type: source
title: "thoughts 簇 · 鉴权与密钥体系"
source_files: ["thoughts/055_✅Agent中如何实现第三方鉴权？.md", "thoughts/056_✅基于Token 直接配置方式做鉴权.md", "thoughts/057_✅基于OAuth PKCE + 本地回调做鉴权.md", "thoughts/059_✅如何实现API KEY的动态管理与加密、脱敏.md"]
source_type: thought-batch
domain: ai
raw_digest: "n/a"
lines: 559
captured: 2026-10-19
status: verified
tags: [llmentor, auth, secrets, oauth]
entities: ["wiki/entities/redis"]
concepts: ["wiki/concepts/工具缓存"]
---

# thoughts 簇 · 鉴权与密钥体系

## 这一簇覆盖什么

Agent 调第三方平台（订票、订酒店）需要的用户授权，以及 API Key 的管理、加密、脱敏。四篇组成两条线：

1. **第三方鉴权的两种形态**（055 总纲 / 056 Token 直接配置 / 057 OAuth PKCE + 本地回调）
2. **API Key 的动态管理与加密脱敏**（059，249 行，本簇最深的一篇）

边界：自有用户体系的登录（Sa-Token）在 [[wiki/sources/thoughts-项目概览与启动]] 的 004 篇，不在本簇。

## 两条线的具体内容

### 第三方鉴权

| # | 形态 | 机制 | 适用 |
|---|---|---|---|
| 055 | 总纲 | — | 为什么需要用户授权：下单后订单要在用户自己账号里 |
| 056 | Token 直接配置 | 用户去第三方页面领长期 API Key，直接贴给 Agent | 没有回调、没有 code 交换、没有刷新逻辑 |
| 057 | OAuth PKCE + 本地回调 | `rgh` 的 OAuth 流程 | 支持标准 OAuth 的平台（Rolling Go） |

056 的关键对比：**「直接贴 Key」不是劣等方案，而是对「平台不给 OAuth」这个现实的正确适配**。它的代价是 Key 长期有效、泄露风险高，所以必须有 059 那一层。

### API Key 管理与脱敏（059）

四层结构：

```text
第一层：加密存储
第二层：LLM 侧的工具接口（模型看到的是句柄不是 Key）
Hook 动态注入（真正调用时才解密使用）
输出脱敏（工具返回值里的 Key 被替换）
```

## 可抽出的原子

- **Token 直接配置 vs OAuth PKCE 的取舍** → 待抽：第三方授权的两种工程形态
- **LLM 侧永远不该看到明文 Key**（059）→ 待抽：凭据的「句柄化」
- **Hook 动态注入** → 与 [[wiki/concepts/工具熔断]] 的 hook 用法同源（`PreActingEvent` 注入参数）
- **输出脱敏** → 待抽：双向保护（输入不暴露 + 输出不泄露）
- **凭证的缓存 TTL**：7~30 天 → [[wiki/concepts/工具缓存]]

## 与其他笔记的重叠点

- **Redis 的用法**：本项目用 Redis 存凭据 → [[wiki/entities/redis]]
- **Hook 机制**：059 的动态注入与 `thoughts/067` 的熔断 hook、`thoughts/063` 的 `BookingPersistenceHook` 是同一套 Hook 生命周期
- **工具缓存**：凭据缓存是 [[wiki/concepts/工具缓存]] 里「跨会话缓存」的一个类型
- **安全**：`安全运维复盘.md` 讲的是另一类安全问题（PostgreSQL 提权），与本簇不重叠

## 本篇独有、别处没有的

1. **四种鉴权形态的完整对比**（055 / 056 / 057）—— 本仓唯一的第三方授权设计记录
2. **「LLM 侧看到句柄不是 Key」这一层设计**（059）—— 本仓最重要的安全设计，直接决定 Key 会不会通过上下文泄露
3. **Hook 动态注入的具体位置** —— 解密与使用发生在工具执行的 hook 里，不在模型可见的上下文里
4. **输出脱敏**（059）—— 工具返回值也可能带 Key（比如第三方返回的调试信息），必须过滤
5. **OAuth PKCE + 本地回调的完整流程**（057）—— 含 `rgh` 默认 CLI 的问题

## 证据

- `thoughts/055_✅Agent中如何实现第三方鉴权？.md`（103 行）
- `thoughts/056_✅基于Token 直接配置方式做鉴权.md`（130 行）
- `thoughts/057_✅基于OAuth PKCE + 本地回调做鉴权.md`（77 行）
- `thoughts/059_✅如何实现API KEY的动态管理与加密、脱敏.md`（249 行）

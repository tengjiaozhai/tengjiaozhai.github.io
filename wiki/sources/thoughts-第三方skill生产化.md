---
type: source
title: "thoughts/058 改造外部 Skill 使其具备生产环境可用性"
source_file: "thoughts/058_✅改造外部Skill使其具备生产环境可用性.md"
source_type: thought-batch
domain: ai
raw_digest: "279-d50d8537"
lines: 279
captured: 2026-10-19
status: verified
tags: [llmentor, skill, isolation, token-store, security]
entities: ["wiki/entities/redis", "wiki/entities/mcp-and-skill"]
concepts: ["wiki/concepts/Skill-vs-Tool", "wiki/concepts/会话并发互斥"]
---

# thoughts/058 改造外部 Skill 使其具备生产环境可用性

## 这一篇覆盖什么

根据 `rgh`（Rolling Go 酒店的 CLI）的改造实践，把「能跑」的 Skill 改成「生产可用」的完整过程。七个具体问题：

1. 用户 A 登录后，用户 B 以 A 的身份下单了
2. 用户在一个节点登录成功，下一句话就说他没登录
3. 用户明明登出了，换个节点又是已登录
4. 用了一段时间，突然要求重新授权
5. 授权链接点了，但根本没反应
6. 功能全通了，但 Token 到处都是明文
7. 本地文件残留，内容不断膨胀

## 四个组件

| 组件 | 职责 |
|---|---|
| `RghTokenStore` | Redis 侧权威源读写，加解密、TTL、存量明文兼容 |
| `RghWorkspace` | 用户级本地工作区：目录布局、权限收紧、路径安全校验 |
| `RghUserIsolationHook` | 命令改写、投影/回写编排、登录 watcher |
| `RghWorkspaceCleaner` | 定时回收本地敏感残留 |

## 最核心那一条：换掉 CLI 眼中的 `~`

问题 1 的根因：**Token 路径是全局唯一的**。同一个 JVM 里所有用户的 `rgh` 子进程看到的 `~` 都是同一个目录，`~/.hotel-cli/token.json` 是所有人共用的一个文件。谁最后登录，全站就都是谁。

解决思路：既然 `rgh` 把路径写死成 `~/.hotel-cli/token.json`，那就换掉它眼中的 `~`。在 `RghUserIsolationHook` 的 `PreActingEvent` 阶段拦下 `execute_shell_command`，命中 `rgh` 后把原命令包一层：

```java
String wrappedCommand = "env HOME=" + userDir + " bash -c '" + escapedCommand + "'";
```

工具内部本身就是 `bash -c "<命令>"` 执行的，所以最终形态是：

```bash
bash -c "env HOME=/tmp/gogo-agent/rgh-users/u_001 bash -c 'rgh whoami'"
```

**这一招的通用性很强**：任何把路径写死在 `~` 下的第三方 CLI，都可以用同样的方式做用户级隔离，不需要改 CLI 本身。

## 可抽出的原子

- **`env HOME=<userDir>` 包裹做用户隔离** —— 本仓最实用的一个技巧，可复用于任何第三方 CLI
- **四组件的职责划分** —— 存储 / 工作区 / Hook 编排 / 清理，各管一段
- **「存量明文兼容」** —— 加解密改造必须兼容已有数据，不能一刀切
- **`RghWorkspaceCleaner` 定时回收** —— 本地敏感残留不是一次性清理，要持续
- **问题 2/3/4 是同一根因的三种表现**：跨节点登录态不一致 → 权威源必须放共享存储（Redis），不能放本地文件
- **问题 5 是 UI 层的**：授权链接点了没反应，说明回调链路断了

## 与其他笔记的重叠点

- **凭据管理的四层结构** → [[wiki/sources/thoughts-鉴权与密钥体系]]（059：加密存储 / 工具接口 / Hook 注入 / 输出脱敏）
- **Skill 的接入** → [[wiki/sources/thoughts-外部skill接入]]（049–051）
- **Skill 瘦身（体积）** → [[wiki/sources/thoughts-上下文工程]]（079）—— 本篇讲功能可用，079 讲体积
- **命令执行的护栏** → [[wiki/sources/thoughts-命令执行护栏]]（088）—— 本篇的 Hook 改写是护栏的另一种用途
- **用户级隔离** → [[wiki/synthesis/copy-from-program处置]] 的加固清单第 2 条（非超级用户连接）

## 本篇独有、别处没有的

1. **七个生产问题的完整清单** —— 本仓最真实的一份「外部 Skill 上线踩坑记录」
2. **`env HOME=<userDir> bash -c` 的包裹技巧** —— 通用性最强的单条
3. **四组件的职责划分** —— 改造工程的模块化方式
4. **「Token 路径全局唯一」这个根因的定位方式** —— 从现象（B 用 A 的身份下单）反推到 `~` 的共享

## 证据

- `thoughts/058_✅改造外部Skill使其具备生产环境可用性.md`（278 行，本仓最长的 Skill 相关单篇）

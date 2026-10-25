---
type: synthesis
kind: decision
title: "DSH 插件设计模式"
date: 2026-10-22
status: investigating
domain: ai
tags: [dsh, cordis, plugin-architecture, agent-engineering]
concepts: ["wiki/concepts/Skill-vs-Tool", "wiki/concepts/KV缓存与提示词缓存"]
related: ["wiki/sources/thoughts-工具设计规范", "wiki/sources/thoughts-命令执行护栏"]
confidence: medium
as_of: 2026-10-22
---

# DSH 插件设计模式

## 问题

DSH 的卖点是「一切皆插件」——模型适配器、工具表、会话日志、agent 主循环本身都是插件，没有特权内核。这带来一个反直觉的困难：**扩展点太多，选错点的代价要等到上游升级才暴露。**

官方 `docs/architecture.md` 明写 public API 处于 pre-stable、要求下游跟随更新；社区目录（2026-10-22 抓取 `dsh-plugin-catalog`）里 3261 个插件绝大多数在「加东西」，真正改行为的钩子类与提示词类很少，也没有成文做法。所以需要一份「哪种需求落到哪个扩展点、哪些写法会在升级时爆炸」的判断依据。

## 我的结论

1. **选点优先于写法。** 插件事故大多不是代码写错，是挂错扩展点——用 `tools/post-execute` 去否决调用、用 `parallel` 事件去做决策、用 `tools/result` 去改结果。
2. **只有「能力缝三件套」是可长期维护的扩展形态。** 单独一个 provider、单独一个工具都是半成品：换不掉、也测不了。
3. **改提示词层是最高杠杆也最高风险的一档。** 它绕过工具契约直接改模型行为，必须配锚点校验 + 失败降级 + 可回滚，否则上游改一句话就炸。

## 九种模式

| # | 模式 | 落的扩展点 | 解决什么 | 失效条件 |
|---|---|---|---|---|
| 1 | 能力缝三件套 | `ctx.<key>` + provider + consumer | 一个能力要能整条换掉 | 只写一个角色 |
| 2 | 工具插件 | `ctx.tools.register` | 给模型加动作 | 参数无校验 / 不尊重 `exec.signal` |
| 3 | 钩子/拦截 | `tools/*`、`agent/*` 事件 | 改已有行为 | 挂错事件语义 |
| 4 | 提示词融合 | `system-prompt/assemble` | 改模型的判断标准 | 上游改了被锚定的文案 |
| 5 | 声明式配置 | `Config` + `schemastery` | 部署期可调 | 硬编码在代码里 |
| 6 | 可逆效果 | `ctx.effect` / `ctx.on` | 热重载安全 | 模块级单例 |
| 7 | 双端插件 | `dsh.client` + 私有 RPC | 有界面 | 客户端自己 `fetch` |
| 8 | durable vs 瞬时 | `SessionEventMap` / `assistant-stream` | 状态要能回放 | 关键状态只放内存 |
| 9 | 协议驱动 | `ctx.agents` 工厂 | 接外部客户端 | 不 dispose、拖住进程 |

### 1. 能力缝三件套

官方原文：一个 seam 由 Service Definition（声明接口）、Service Provider（实现）、Consumer（通常是模型可见工具）三者组成，**「一个角色不算缝」**。

- 判据：这个能力将来要不要换实现？要 → 三者齐建；不要 → 直接做工具，别假装有缝。
- 收益：换 provider 换整条链。官方拿 `ctx.shell` 举例——shell 指向远程沙箱，bash / PTY / LSP 一起跟着换，不派生任何 provider。
- 边界：定义层一旦发布就很难改签名，宁窄勿宽。本仓对应的分工判据见 [[wiki/concepts/Skill-vs-Tool]]。

### 2. 工具插件

`ctx.tools.register(defineTool({...}))`，schema 自动进 prompt 组装——注册即「模型可见」，不用另写描述。三条硬约束：

1. `execute` 必须尊重 `exec.signal`（取消要能真的传下去）。
2. 失败用 `isError` 表达，不要总是抛裸字符串。
3. 长任务走 `ctx.jobs.start()` 拿规范 `jobId`，配套 `job_output` / `job_kill`，不要自己造背景任务。

UI 用 `card` 渲染意图区分：`generic`（带 `locations` 可跳转）/ `terminal`（带 `cwd`）/ `diff`（带 `diffs`）。

边界：把 `run_in_background` 这类部署期选择写死在代码里就是反模式——它应该是 Config 字段。设计侧的具体要求（Description 写法、参数规则、入参校验位置）本仓已有 source 层证据：[[wiki/sources/thoughts-工具设计规范]]。

### 3. 钩子/拦截

不改主循环而改行为的唯一正道。选点表：

| 想干的事 | 用哪个 | 语义 |
|---|---|---|
| 允许 / 拒绝 / 询问一次调用 | `tools/pre-execute` | waterfall，可重排的策略层 |
| 必须终局否决、不可撤销 | `ctx.tools.guard()` | 单调 guard |
| 包裹执行生命周期（超时/重试/指标） | `tools/execute` | 只有 `exec.signal` 可替换 |
| 改写工具结果 | `tools/post-execute` | 显式转换 |
| 只观察不可变终态（审计） | `tools/result` | 只读 |
| 改模型请求配置 | `agent/request` | waterfall |
| 收尾 turn / 强制再来一步 | `agent/turn-stopping` | serial，**没有 `next()`** |

**最容易踩的坑**：waterfall 监听器必须调 `next()`，不调就是短路整条链——后面所有策略插件静默失效。正确姿势是先 `const original = await next()`，再决定改不改、改不了就原样返回。

边界：waterfall 里不要 `await` 外部网络，它挂在每次装配 / 每次工具调用的热路径上。权限门的具体工程侧证据见 [[wiki/sources/thoughts-命令执行护栏]]。

### 4. 提示词融合

`system-prompt/assemble` 是 waterfall，每次装配过一次。这是「改判断标准」的杠杆位，也是唯一需要额外护栏的模式。五条必抄实践（本机 `dsh-unrestricted` 是完整参考实现）：

| 实践 | 为什么 |
|---|---|
| 锚点精确校验（section 文本全等比对），任一失败整体放弃 | 上游文案一改，宁可静默失效也不要拼出畸形 prompt |
| 只改 text、插入新 section，tools / contexts / variables 原样透传 | 破坏面最小 |
| 关闭时 `return next()` 原样返回 | 关闭后提示词逐字节等于官方，可无痕回滚 |
| `complete: true` 的 section 要在 agent scope 影子注册 | registry 在 waterfall **之后**才恢复它，钩子改不到 |
| 预览走与实时完全相同的装配路径 | 否则预览与真实行为必然漂移 |

额外一件：把契约内容的哈希前 16 位打进状态面，用来分辨「跑的是哪一版契约」。

**边界（重要）**：插入位置在系统提示词前段，等于改动前缀——见 [[wiki/concepts/KV缓存与提示词缓存]]。每次开关、每次内容变化都会让缓存前缀失效，重算费用全落在用户头上。所以这类插件应当「静态一次成型」，不要做动态注入。

### 5. 声明式配置

`Config` 用 `@deepseek-ai/schemastery`（类型与运行时校验合一）；`.volatile()` 让开关热更；环境差异用 patch 里的 `!!js` 表达式。

边界：**patch 里的 config 是整体替换，不是深合并。** 要覆盖某行的 config，必须把该行所有字段写全——只写一个字段会静默丢掉其余字段，能力回落到自动选择而不报错。这是本机 `dsh-tavily-pool` 实测踩过的坑，它为此专门写了测试校验 host 的合并行为。

### 6. 可逆效果

Cordis 的全部价值：卸载插件 = 撤销它做过的一切。判据很简单——**任何模块级状态（Map、WeakSet、timer、socket、监听器返回值）都必须在 dispose 里清掉**，否则热重载后就是重复监听、重复注册、重复触发。

边界：可逆的是「注册」，不是「外部副作用」。发出去的消息、改掉的远端记录不会因为 dispose 而回滚，要自己设计补偿动作。

### 7. 双端插件

package.json 里声明 `dsh.bundle.patch`（node 半边）与 `dsh.client`（浏览器半边，含 `inject` 列表），客户端模块由 registry 自动下发，不用手写构建入口。两端通信走私有 RPC channel，由官方 Connection 做认证：`ctx.inject(['connection'], c => c.connection.rpc.handle(channel, handler))`。

常用三端点：`status`（读状态）、`preview`（预演，让用户先看再开）、`recheck`（重跑自检）。边界：客户端直接 `fetch` 自己的接口会绕过认证与 `trustedHosts`，是明确的错。

### 8. durable 状态 vs 瞬时流

官方规则很硬：**要给模型加新的可见输入，就扩展 `SessionEventMap`，从日志渲染，而不是绕过日志。**

- 要回放、要审计、要能 fork → 会话事件（append-only）。
- 只要「正在输出」的观感 → `agent/assistant-stream`（transient frame）。
- 一次性把上下文塞给模型 → `agent.inject()`。

边界：把关键状态放内存 Map 却指望「重开会话还在」，是最贵的误判——它不会报错，只会在恢复时静默丢状态。

### 9. 协议驱动

要把 DSH 接到别的客户端（ACP、自定义 UI、自动化脚本），做协议驱动而不是改 agent：注入 `['agents','sessions','sessionPersistence']`，把协议请求映射成 `followup()` / `cancel()`，退出时 `AgentHandle.dispose()` 达到静默。官方 `packages/acp/acp` 是可运行范例。

## 分发与挂载

| 路径 | 适用 | 做法 |
|---|---|---|
| 外置 npm 包（推荐） | 自研、可独立发布 | `dsh plugin --profile <p> add <路径 / npm 名 / github: 前缀>` |
| 临时 overlay | 调试、演示 | `dsh --profile <p> --patch ./overlay.yml` |
| 仓库内包 | 给 DSH 本体贡献 | `packages/<group>/<pkg>` |

运行时由**层**组成：profile 的有序 bundle → profile 的 `cordis.patch.yml` → `$DSH_HOME` patch → `--patch`。patch 按行 `id` 定位：替换整行 config，或插入新行。`dsh --profile <p> --dump-config` 打印出来的每一行都可以被你覆盖。

## 反模式

| 反模式 | 后果 | 正确做法 |
|---|---|---|
| 改主循环 / 改 packages 内部 | 上游一升级全碎 | 挂扩展点 |
| waterfall 忘 `next()` | 静默掐死后面所有插件 | 先 `next()` 再决定 |
| 模块级可变单例 | 热重载后重复注册、状态串台 | 全部走 `ctx.effect` 并清理 |
| 部署期开关硬编码 | 同一份代码没法适配环境 | `Config` + `!!js` overlay |
| 全文 replace 提示词 | 上游改一个字就炸 | 锚点校验 + 失败降级 |
| 客户端自己 fetch | 绕过认证与 trustedHosts | 私有 RPC channel |
| 新状态不进 session log | 无法回放 / 审计 / fork | 扩展 `SessionEventMap` |
| patch 只写部分 config | 其余字段静默丢失 | 整行 config 写全 |

## 选型判据

```text
要加的是……
├─ 模型能调的新动作        → 模式 2（ctx.tools.register）
├─ 可以换实现的新能力      → 模式 1（三件套缝）
├─ 对已有动作的允许/拒绝   → 模式 3（选对事件）
├─ 模型怎么想（提示词）    → 模式 4（锚点 + 降级）
├─ 用户看到的界面          → 模式 7（ConversationNodeDefinition + 双端）
├─ 新的外部客户端          → 模式 9（协议驱动）
└─ 可重放的新事件          → 模式 8（SessionEventMap）
```

## 生态观察（2026-10-22 重算）

社区目录 `dsh-plugin-catalog` 共 3261 条，按类别：UI 590 / 工具 441 / 会话 223 / 开发运行时 221 / 工作流 200 / 模型接入 191 / 用量计费 161 / 记忆 144 / 通知 120 / 主题 113 / 远程 113 / 安全 103 / Skill 103 / 娱乐 93。

**观察**：前四类占 44%，集中在「加东西」；改行为（钩子 / 提示词）的插件数量少、无成文模式——本页记录的模式主要来自官方文档与本机三个生产插件的源码，而非社区共识。

## 适用范围

- 适用：写给 DSH（Cordis 内核）的插件，尤其需要长期跟随上游升级的。
- 部分适用：其他 Cordis 宿主（如 Koishi），模式 1 / 6 / 8 直接可搬，模式 3 / 4 的扩展点名字不同。
- 不适用：一次性脚本、不改宿主行为的独立 CLI。

## 未定论的分歧

- **提示词融合该不该算「合法模式」。** 官方没有任何文档支持在 assemble 里改 persona / blocks，本机实现是自己找的锚点；上游一旦重构 section 命名，整类插件同时失效。目前只能靠锚点校验兜底，无法根治。
- **guard 与 pre-execute 的边界**官方只给了一句话（「需要单调终局否决时用 guard」），没有给出「多插件同时 guard 谁赢」的仲裁规则。
- **社区插件的质量分布未知。** 3261 条只统计了数量与分类，没有可用性、维护状态、破坏性变更的样本，不能据此推断「生态成熟」。

## 证据

本页无仓内 raw 来源：证据为外部一手文档 + 本机插件源码实测，故 `confidence: medium`。

- 官方 docs/architecture.md（Capability seams、Where new behavior goes）：https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md
- 官方 docs/cookbook/extension-cookbook.md（工具 / 钩子 / UI / 协议驱动四种形态）：https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/extension-cookbook.md
- 官方 AGENTS.md（public API pre-stable、包布局、能力缝清单）：https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md
- 插件开发教程（四种导出、挂载三路径、选点表、defineTool 示例）：https://dev.to/henry_lin_3ac6363747f45b4/deepseek-harness-dsh-cha-jian-kai-fa-jiao-cheng-4h6j
- Cordis 运行时解析（context / service / inject / effect / waterfall）：https://floatboat.ai/blog/cordis-plugin-framework · https://agentatlas.org/blog/cordis-explained-how-deepseek-harness-plugin-framework-works
- 社区插件目录（3261 条与分类计数）：https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json
- 本机源码实测：`~/.dsh/profiles/desktop/node_modules/dsh-unrestricted/src/node.js` 与 `rules.js`（提示词融合 + 锚点 + 影子 section）、`~/.dsh/profiles/desktop/node_modules/dsh-tavily-pool/index.js` 与 `cordis.patch.yml`（能力缝 provider + patch 整体替换坑）

## 相关页面

- [[wiki/concepts/Skill-vs-Tool]] —— 能力该做成 Tool 还是 Skill，决定模式 2 的 Consumer 形态
- [[wiki/concepts/KV缓存与提示词缓存]] —— 模式 4 的隐藏代价：改系统提示词前缀等于废掉缓存
- [[wiki/sources/thoughts-工具设计规范]] —— 模式 2 的合约侧要求
- [[wiki/sources/thoughts-命令执行护栏]] —— 模式 3 的权限门工程侧经验

## 待链接

- `wiki/entities/dsh` —— DSH 本体尚无实体页（版本、profile 列表、破坏性变更时间线），本页只带过不展开
- `wiki/concepts/可逆效果` —— Cordis 的核心机制，本页按模式记了一节，尚未独立成页

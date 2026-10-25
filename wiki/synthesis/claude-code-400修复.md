---
type: synthesis
kind: incident
title: "Claude Code 400 修复"
date: 2026-07-04
status: settled
domain: ai
tags: [claude-code, proxy, sse, debugging]
sources: ["wiki/sources/claude-agent-sdk学习笔记"]
entities: ["wiki/entities/claude-code", "wiki/entities/anthropic"]
concepts: ["wiki/concepts/SSE流式推送"]
related: ["wiki/synthesis/copy-from-program处置"]
confidence: high
as_of: 2026-10-19
---

# Claude Code 400 修复

## 问题

Claude Code 第二轮会话必报 400，第一轮正常。需要在不修改 Claude Code 本身、也不要求中转站改协议的前提下修复。

## 我的结论

第二轮会话报 400 的根因是 **transcript 里残留了「只有 thinking、没有 text」的 assistant 消息**。Anthropic 协议不接受这种消息，中转站也不清洗，所以第二轮请求一提交就被拒。

解法是在本机加一层轻量代理做**双向过滤**：请求侧删掉历史 thinking 块，响应侧拦掉 SSE 里的 thinking 事件。

## 故障定位路径

```text
现象：第一轮正常，第二轮必 400
   ↓ 缩小范围
换中转站？还是 400          → 不是某一家中转站的问题
   ↓
抓请求体看 messages
   ↓
发现 assistant 消息 content 里只有 {"type":"thinking"} 块
   ↓
翻 Claude Code 的 transcript 写入逻辑
   ↓
thinking 块被单独持久化，且没有 text 块时也照写
```

**为什么第一轮正常**：第一轮请求的 messages 里还没有历史 assistant 消息。第二轮开始带上第一轮的 transcript，问题才暴露。

## 对比：三种可选方案

| 方案 | 可行性 | 问题 |
|---|---|---|
| 让中转站过滤 | 不可行 | 中转站是声明「兼容 Anthropic 协议」的透明转发层，按协议原样转发。改写会破坏透明转发语义 |
| 换中转站 | 不可行 | 换一家结果一致，因为问题在客户端 transcript，不在中转站 |
| 本地代理双向过滤 | 可行 | 需要维护一个本地进程，但不侵入任何一方 |

## 为什么不能靠中转站修

中转站是声明「兼容 Anthropic 协议」的转发层，它按协议原样转发。协议不接受的消息它没有理由改写 —— 改写会破坏「透明转发」的语义。所以修复只能发生在客户端侧。

## 最终方案：本地双向过滤代理

```text
flowchart LR
    A["Claude Code"] --> B["本地过滤代理<br/>127.0.0.1:10809"]
    B --> C["公司中转站<br/>172.22.22.123:10808"]
    C --> D["Sonnet 4.6"]
    D --> C
    C --> B
    B --> A
    B -.-> E["请求侧：删除历史 thinking assistant"]
    B -.-> F["响应侧：过滤 SSE thinking 事件"]
```

Claude Code 仍以 Anthropic API 协议工作，但它面对的是本地代理；代理再转发给中转站。

### 请求侧清洗

```python
THINKING_TYPES = {"thinking", "redacted_thinking"}

def is_thinking_block(block):
    if not isinstance(block, dict):
        return False
    block_type = block.get("type")
    if block_type in THINKING_TYPES:
        return True
    if isinstance(block_type, str) and "thinking" in block_type:
        return True
    return "thinking" in block and "text" not in block and "tool_use" not in block
```

对每条 assistant 消息做清洗；如果清洗后 content 为空、只剩 thinking，**整条消息丢弃**（而不是留一条空 content 的消息）。

### 响应侧清洗（难点在 SSE）

Claude API 流式响应不是完整 JSON，是一串事件：

```text
event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"thinking",...}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta",...}}
```

代理必须维护一个 `drop_indices` 集合：某个 `index` 的 block 是 thinking，则该 block 后续所有 delta / stop 事件都要丢弃。**只丢 `content_block_start` 不够** —— 后续 delta 仍会带着同一个 index 进来，客户端会因为找不到对应 block 而报错。

## 可以复用的四条经验

1. **400 先看请求体，不要先怀疑模型**。协议层拒绝比模型层失败更容易定位
2. **「第一轮好、第二轮坏」指向 transcript 累积问题**，不是单次请求的问题
3. **流式协议的状态是跨事件的**。要拦一个 block，必须跟踪它的 `index` 生命周期，不能只看单条事件
4. **透明转发层不该做语义修正**。要修就修在能改的地方，且改动要显式、可关闭

## 与 SSE 设计的呼应

这个代理本质上是一个**流式过滤器**，它的状态管理思路与本仓 [[wiki/concepts/SSE流式推送]] 的哨兵机制同构：都需要在「事件流」这个载体上维护跨事件的状态。差别在于 SSE 设计里状态在服务端任务表，这里状态在代理进程的 `drop_indices` 集合里 —— 后者是临时的、随连接销毁，所以不需要持久化。

## 未定论的分歧

- **为什么 Claude Code 会把 thinking-only assistant 写入 transcript**，本仓未查到官方说明。猜测是「thinking 块与 text 块分两次追加」导致中断时只落了一半，但无证据。
- **代理是否需要处理 `redacted_thinking`**：`is_thinking_block` 已经把 `redacted_thinking` 列入，但实际流量里是否出现过、行为是否正确，未验证。

## 证据

- `Claude Agent Sdk学习笔记.md` §「附录 · Claude Code 第二轮会话 400 问题修复复盘」§「1. 问题现象」至 §「3. 定位过程」（报错原文与排查过程）
- 同上附录 §「5. 最终方案：本地过滤代理」
- 同上附录 §「6. 核心实现」（`is_thinking_block` / `sanitize_request_json` / `drop_indices`）
- 代理文件：`/Users/shenmingjie/.claude/proxy/anthropic_thinking_filter_proxy.py`

## 相关页面

已建档的 source 页：[[wiki/sources/claude-agent-sdk学习笔记]]

---
title: Claude Code 第二轮会话 400 问题修复复盘
date: 2026-06-16
desc: 为什么 Claude Code 第一次提问正常、第二次就 400？从现象到定位再到修复的完整复盘。
category: AI / Agent
tags: [Claude Code, 代理, 复盘]
---

# Claude Code 第二轮会话 400 问题修复复盘

\> 适用读者：已经会使用 Claude Code，但想理解“为什么第一问正常、第二问 400”以及如何定位和修复代理兼容性问题的工程师。

## 1. 问题现象

在终端打开 \`claude\` 后，第一次输入 \`在吗\` 能正常返回，第二次再次输入 \`在吗\` 就稳定报错：

```Plain Text
API Error: 400 ContentBlock object at ***.***.content.0 must set one of the following keys:
text, image, toolUse, toolResult, document, video, cachePoint, reasoningContent,
citationsContent, searchResult.
```

这个现象很关键：\*\*第一轮成功，第二轮失败\*\*。它说明不是 token、模型名、网络连通性这类“一上来就失败”的问题，而是第一轮响应被 Claude Code 保存后，第二轮请求把某些历史内容带回了公司中转站，触发了中转站的 schema 校验错误。

## 2. 故障链路图

```Plain Text
sequenceDiagram
    autonumber
    participant U as 用户终端
    participant C as Claude Code
    participant P as 公司中转站
    participant M as Sonnet 4.6

    U->>C: 第一次输入“在吗”
    C->>P: POST /v1/messages
    P->>M: 转发请求
    M-->>P: 返回 thinking 块 + text 块
    P-->>C: SSE 响应
    C->>C: 保存 transcript：thinking-only assistant + text assistant
    U->>C: 第二次输入“在吗”
    C->>P: 带上历史 thinking assistant
    P-->>C: 400 ContentBlock schema error
```

根因不是“模型不会回答”，而是 \*\*Claude Code transcript 中出现了中转站不兼容的内容块\*\*。

## 3. 定位过程

### 3.1 先确认 Claude Code 配置

我先看了 \`\~/.claude/settings.json\`，核心配置是：

```Django
{
  "env": {
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-sonnet-4-6",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-sonnet-4-6",
    "ANTHROPIC_BASE_URL": "http://172.22.22.123:10808",
    "ANTHROPIC_MODEL": "claude-sonnet-4-6"
  },
  "model": "opus"
}
```

这说明 Claude Code 不是直连 Anthropic，而是通过公司中转站访问 \`claude-sonnet-4-6\`。

### 3.2 再看失败 session 的 transcript

Claude Code 的会话记录在：

```Plain Text
~/.claude/projects/<project-key>/<session-id>.jsonl
```

失败会话里能看到类似结构：

```Django
{
  "type": "assistant",
  "message": {
    "role": "assistant",
    "model": "Claude-4.6-sonnet",
    "content": [
      {
        "type": "thinking",
        "thinking": "The user is asking ...",
        "signature": ""
      }
    ]
  }
}
```

紧接着才是正常文本：

```Django
{
  "type": "assistant",
  "message": {
    "role": "assistant",
    "content": [
      {
        "type": "text",
        "text": "在的！有什么可以帮你的吗？"
      }
    ]
  }
}
```

这个证据解释了“为什么第二问才失败”：

1. 第一问时没有历史 assistant thinking 块，所以能成功。
2. 第一问返回后，Claude Code 把 \`type: "thinking"\` 保存进 transcript。
3. 第二问时，Claude Code 将历史消息重新发送给中转站。
4. 公司中转站不接受这个 thinking 块格式，于是返回 400。

## 4. 试过但不够的方案

我先尝试了最小配置修复：

```Django
{
  "CLAUDE_CODE_DISABLE_THINKING": "1",
  "CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING": "1",
  "MAX_THINKING_TOKENS": "0",
  "CLAUDE_CODE_SIMULATE_PROXY_USAGE": "1"
}
```

但验证发现，即使禁用了请求侧 thinking，中转站仍然会把 \`thinking\` 内容块返回给 Claude Code。也就是说问题不是只发生在“发请求时启用了 thinking”，还发生在“响应流里出现 thinking，Claude Code 保存了它”。

所以只改环境变量不够。

## 5. 最终方案：本地过滤代理

最终采用的方案是在本机加一层轻量代理：

```Plain Text
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

这样 Claude Code 仍然以 Anthropic API 协议工作，但它面对的是本地代理；本地代理再转发给公司中转站。

关键点是 \*\*双向过滤\*\*：

| 方向 | 为什么要过滤 | 处理方式 |
|------|------|------|
| Claude Code → 中转站 | 历史 transcript 里可能已有 thinking-only assistant | 从 messages 删除 thinking 块；如果 assistant 只剩 thinking，就整条丢弃 |
| 中转站 → Claude Code | 响应 SSE 里可能继续返回 thinking | 拦截 content_block，丢弃 thinking block |

## 6. 核心实现

代理文件：

```Plain Text
/Users/shenmingjie/.claude/proxy/anthropic_thinking_filter_proxy.py
```

核心判断逻辑：

```PowerShell
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

请求侧清洗：

```PowerShell
def sanitize_request_json(payload):
    messages = payload.get("messages")
    if isinstance(messages, list):
        filtered_messages = []
        for message in messages:
            if isinstance(message, dict) and message.get("role") == "assistant":
                if not sanitize_message_content(message):
                    continue
            filtered_messages.append(message)
        payload["messages"] = filtered_messages
    return payload
```

响应侧清洗的难点在 SSE。Claude API 流式响应不是一个完整 JSON，而是一串事件：

```Plain Text
event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"thinking",...}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta",...}}
```

所以代理要维护一个 \`drop_indices\` 集合：如果某个 \`index\` 的 block 是 thinking，那么这个 block 后续所有 delta/stop 都要丢弃。

```PowerShell
if event_type == "content_block_start" and isinstance(index, int):
    if is_thinking_block(payload.get("content_block")):
        self.drop_indices.add(index)
        return None
```

## 7. 本机接入方式

\`\~/.claude/settings.json\` 中现在指向本地代理：

```Django
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://127.0.0.1:10809"
  }
}
```

注意：真实公司中转站没有废弃，只是变成了本地代理的 upstream：

```Plain Text
http://172.22.22.123:10808
```

### 7.2 用 LaunchAgent 保持代理常驻

LaunchAgent 文件：

```Plain Text
/Users/shenmingjie/Library/LaunchAgents/com.shenmingjie.claude-thinking-filter-proxy.plist
```

关键参数：

```Fortran
<array>
    <string>/opt/anaconda3/envs/py311/bin/python3</string>
    <string>/Users/shenmingjie/.claude/proxy/anthropic_thinking_filter_proxy.py</string>
    <string>--listen-host</string>
    <string>127.0.0.1</string>
    <string>--listen-port</string>
    <string>10809</string>
    <string>--upstream</string>
    <string>http://172.22.22.123:10808</string>
</array>
```

启动命令：

```CoffeeScript
launchctl bootstrap gui/$(id -u) \
  /Users/shenmingjie/Library/LaunchAgents/com.shenmingjie.claude-thinking-filter-proxy.plist

launchctl kickstart -k \
  gui/$(id -u)/com.shenmingjie.claude-thinking-filter-proxy
```

## 8. 验证方法

### 8.1 验证代理运行

```CoffeeScript
lsof -nP -iTCP:10809 -sTCP:LISTEN
```

期望看到：

```Plain Text
python3 ... TCP 127.0.0.1:10809 (LISTEN)
```

### 8.2 验证 LaunchAgent 状态

```CoffeeScript
launchctl print gui/$(id -u)/com.shenmingjie.claude-thinking-filter-proxy \
  | rg 'state =|pid =|runs ='
```

期望看到：

```Plain Text
state = running
pid = <pid>
```

### 8.3 验证 Claude Code 两轮会话

```CoffeeScript
claude
```

然后连续输入：

```Plain Text
在吗
在吗
```

修复后第二次不会再返回 400。

### 8.4 验证 transcript 中没有 thinking

```CoffeeScript
jq -c 'select(.type=="assistant") | {content:.message.content,isApiErrorMessage,apiErrorStatus}' \
  ~/.claude/projects/<project-key>/<session-id>.jsonl
```

期望只看到：

```Django
{"content":[{"type":"text","text":"..."}],"isApiErrorMessage":null,"apiErrorStatus":null}
```

不应再看到：

```Django
{"type":"thinking", ...}
```

## 9. 回滚方案

如果本地代理出问题，可以按下面步骤回滚。

### 9.1 停止 LaunchAgent

```CoffeeScript
launchctl bootout gui/$(id -u) \
  /Users/shenmingjie/Library/LaunchAgents/com.shenmingjie.claude-thinking-filter-proxy.plist
```

### 9.2 把 Claude Code 改回公司中转站

将 \`\~/.claude/settings.json\` 的：

```Django
"ANTHROPIC_BASE_URL": "http://127.0.0.1:10809"
```

改回：

```Django
"ANTHROPIC_BASE_URL": "http://172.22.22.123:10808"
```

### 9.3 使用备份恢复

修复前已备份：

```Plain Text
/Users/shenmingjie/.claude/backups/settings.json.before-disable-thinking-20260511-103936
```

可以直接恢复：

```CoffeeScript
cp /Users/shenmingjie/.claude/backups/settings.json.before-disable-thinking-20260511-103936 \
   /Users/shenmingjie/.claude/settings.json
```

## 10. 可迁移经验

这次问题的排查方法比具体代码更重要：

```Plain Text
flowchart TD
    A["症状：第一问正常，第二问 400"] --> B["判断：问题大概率来自会话历史"]
    B --> C["检查 Claude Code transcript"]
    C --> D["发现 assistant thinking-only 内容块"]
    D --> E["验证禁用 thinking 配置"]
    E --> F{"是否解决？"}
    F -- "否" --> G["说明响应侧仍会返回 thinking"]
    G --> H["设计本地双向过滤代理"]
    H --> I["请求侧清历史"]
    H --> J["响应侧过滤 SSE"]
    I --> K["两轮复现验证"]
    J --> K
    K --> L["LaunchAgent 常驻"]
```

以后遇到“第一轮成功，后续失败”的 LLM CLI 问题，可以优先检查：

1. 本地 transcript 是否保存了中转站不兼容的历史块。
2. 第二轮请求是否把第一轮响应原样带回上游。
3. 问题发生在请求侧、响应侧，还是两边都有。
4. 能否通过最小中间层做协议兼容，而不是直接 patch 上游 CLI。

## 11. 为什么不是直接改 Claude Code

没有直接修改 Claude Code 二进制或安装包，原因有三个：

1. Claude Code 是外部工具，升级后改动会丢。
2. 二进制 patch 风险高，不容易审计。
3. 本地代理是边界清晰的兼容层，能独立启动、停止、验证和回滚。

这个方案的本质是：\*\*不改变 Claude Code，不改变公司中转站，只在两者之间做协议适配\*\*。

## 12. 参考资料

- Claude Code Hooks 文档：<https://code.claude.com/docs/en/hooks>
- 本机代理实现：\`/Users/shenmingjie/.claude/proxy/anthropic_thinking_filter_proxy.py\`
- 本机 LaunchAgent：\`/Users/shenmingjie/Library/LaunchAgents/com.shenmingjie.claude-thinking-filter-proxy.plist\`
- Claude Code 配置：\`/Users/shenmingjie/.claude/settings.json\`

## 13. 读者自测

读完这份文档后，建议用下面几个问题检查自己是否真正理解：

1. 为什么第一轮 \`在吗\` 能成功，第二轮才 400？
2. 为什么只设置 \`CLAUDE_CODE_DISABLE_THINKING=1\` 仍然不够？
3. 为什么过滤代理必须同时处理请求 JSON 和响应 SSE？
4. \`drop_indices\` 在 SSE 过滤里解决了什么问题？
5. 如果 \`127.0.0.1:10809\` 没有监听，Claude Code 会表现成什么问题？
6. 如果要回滚，应该先停 LaunchAgent，还是先改 \`ANTHROPIC_BASE_URL\`？为什么？
7. 这个方案相比直接 patch Claude Code 二进制，维护性好在哪里？

### 7.1 修改 Claude Code base URL

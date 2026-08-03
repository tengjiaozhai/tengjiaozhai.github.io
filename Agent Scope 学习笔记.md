> **出处澄清**：AutoContextMemory 是 **AgentScope 1.x**（`agentscope-ai/agentscope-java`）的上下文压缩扩展，位于 `agentscope-extensions-autocontext-memory`。以下六层机制是 **1.x 的设计**，2.0 已重构为四正交策略（见文末「AgentScope 2.0 的演进」）。它与下文 pi 是两套独立方案，不是同源。

AutoContextMemory 的设计哲学是：**先压"代价低、收益高"的，再压"代价高、收益不确定"的**

## 六层渐进式压缩
### 第一层 压缩历史对话轮次工具消息
工具消息包括 tool_use tool_result
把原始结果摘要成"我之前查到了 XX 信息"
提示词设计
```text
“你是一位专业的内容压缩专家。你的任务是智能地压缩并总结以下工具调用历史记录：
必须保留：工具名称、精确的参数（含具体值），以及对输出结果的简明事实性总结。针对同一工具的重复调用：
• 将完全相同的调用（参数相同、结果相同）合并为一条记录，并注明调用频次。
• 仅列出导致不同结果的不同参数组合。• 如果行为未发生改变，请省略非必要的可变参数（例如时间戳、请求 ID 等）。
如果工具的名称或输出结果暗示了副作用（例如包含 'write'、'update'、'delete'、'create'，或返回了类似 'written' 的确认信息），则应将其视为写入/修改操作。
对于此类操作，必须保留关键细节：文件路径、数据键名、内容片段、状态变更以及成功/错误指示。
输出必须是纯文本格式——严禁使用 Markdown、JSON、项目符号、标题或任何元评论。
如果发现任何工具的输出被截断或损坏，请加上 '[TRUNCATED]' 标记。”
```

### 第二层 大消息卸载
大消息指的是超过 largePayloadThreshold的消息内容（默认 5KB），

> 5KB 这个数字的含义大约是：一个长篇网页正文、一个完整的 SQL 查询结果集、一段几千字的论文摘录、一张图的 base64 编码——这些内容的特点是"信息密度低且查阅频率低"，不需要实时存在于上下文里，按需 reload 即可。

所谓卸载。是这样的流程：取出消息的文本内容，比较长度是否超过阈值。超过的话：

- 第一步，生成一个新 UUID，把原始消息整条放进 offloadContext （map）。
    
- 第二步，截取前 offloadSinglePreview 个字符（默认 200）作为预览，再加省略号。注意这个预览不是简单截前 200 字，而是构造成"前 200 字内容 + 换行 + <context_offload uuid="xxx"/> 标签"的形式。
    
- 第三步，构造一条新的替代消息，role 和 name 都和原消息相同（保持角色身份），content 只放上面构造好的预览文本，metadata 里写入压缩元数据（包括 offloaduuid）。
    
- 第四步，用 rawMessages.set(i, replacementMsg) 直接原位替换。
    
- 第五步，记录压缩事件（事件类型为 LARGE_MESSAGE_OFFLOAD_WITH_PROTECTION 或 LARGE_MESSAGE_OFFLOAD，区分策略 2/3）。

策略 2 和策略 3 用的是同一个方法 offloadingLargePayload，区别只是 `lastKeep` 参数（是否保护最近的消息不被处理）。这种"先保守后激进"的设计很常见——能用温和方式解决就不要用激进方式。

策略 2 的"保护"含义是：在卸载大消息时，最近的 lastKeep 条（默认 50）一定不动。这样即便大消息恰好出现在最近，也优先保留以维持对话连贯性。

- 如果策略 2 找到了可卸载的内容（即"既是大消息、又不在最近 50 条里"），就生效返回；
    
- 如果策略 2 因为"所有大消息都在最近 50 条里"或"根本没有大消息超出 lastKeep 范围"而无功而返，就到策略 3。

### 第三层
策略3的lastKeep 参数变成 false。这导致搜索范围扩大到"从开头到最新 final assistant"——也就是说，最近 50 条里的大消息现在也成了候选。

### 第四层 历史轮次摘要
比如：

```
user[1]: "帮我订机票"assistant[2]: 调用 search_flights 工具tool[3]: 返回 50 条航班assistant[4]: "我推荐这 3 条..."（final response）
```

然后会调用 summaryPreviousRoundConversation 让 LLM 生成摘要。这个 prompt 与策略 1 不同，要求模型"把整轮对话压缩成一段总结"，重点是 user 提了什么需求、Agent 给了什么结论。

以上对话压缩完之后：

```
user[1]: "帮我订机票"assistant[摘要]: "用户询问机票预订，我搜索后推荐了 3 条航班（CA1234, MU5678, 9C7890）。详情见 uuid=abc-123。"
```

> 被卸载的 [2][3][4] 三条全部存进 offloadContext，可通过 UUID 拉回。

本轮用到的默认压缩提示词：

```
“你是专为自主智能体（Autonomous Agents）设计的对话压缩专家。
你的任务是重写上一轮助手的最终回复，将其改写为一个自包含、简洁的回复，并将该轮次中获取的所有关键事实融入其中——且绝不能提及任何工具、函数或内部执行步骤。输入内容将包括：用户的原始提问、助手的原始回复，以及用于生成该回复的任何工具执行结果。你的输出将替换对话历史中的原始助手消息，从而为未来的上下文构建一个干净的‘用户 -> 助手’对话对。处理准则：绝对不要提及工具、函数、API 调用或执行步骤（例如，避免使用‘我调用了……’、‘系统返回了……’、‘在运行 X 之后……’等表述）。相反地，请将所有发现直接陈述为助手现在已掌握的事实性知识。保留工具结果中的关键事实，特别是：
• 文件路径及其内容、变更或创建情况（例如：‘/etc/app.conf 设置了 port=8080’）。
• 具有诊断价值的精确错误信息（例如：‘Permission denied (errno 13)’、‘timeout after 30s’）。
• ID、URL、端口号、状态码、配置值和数据键名。
• 写入/修改操作的执行结果（例如：‘已将维护标志写入 /tmp/status’、‘已更新数据库中 user_id=789 的邮箱’）。
• 服务状态或进程信息（例如：‘auth-service 已停止’、‘PID=4567’）。如果执行了某项操作（例如：写入了文件、重启了服务），请明确说明更改了什么以及更改的位置。
如果某项操作失败或未完成，请说明具体的限制条件（例如：‘无法重启：权限被拒绝’）。合并冗余信息；省略那些没有任何可操作细节的通用成功提示。使用清晰、信息量丰富的语言——避免使用诸如‘根据日志显示……’或‘观察到……’等元描述短语。
输出必须是纯文本格式：严禁使用 Markdown、项目符号、JSON、XML 或章节标题。”
```

### 第五层 当前轮大消息 LLM 摘要
之前针对历史轮次，当历史轮次已经压缩的没有办法再压缩时，考虑动刀当前轮次
```
“你是一位专业的内容压缩专家。你的任务是智能地总结以下消息内容。该消息超出了大小阈值，需要在保留所有关键信息的前提下进行压缩。重要提示：
 此内容来自当前轮次。请在压缩时格外谨慎和保守。请尽可能多地保留以下内容，因为这些信息正在当前的对话中被积极使用。请提供一个简明扼要的总结，需满足以下要求：
 保留所有关键信息和核心细节。维持重要的上下文，以便未来参考。
 突出任何重要的结果、产出或状态信息。如果存在工具调用信息，请予以保留（包括工具名称、ID、关键参数）。”
```

### 第六层 当前轮整体压缩
这个压缩有一个特点，就是比例化压缩：

- 第一步算原始内容的总字符数（用 calculateMessagesCharCount 把所有 block 都算上）。
    
- 第二步用配置的 currentRoundCompressionRatio（默认 0.3）算出目标字符数 = 原始字符数 × 0.3。
    
- 第三步在 prompt 里直接告诉模型："原始内容是 X 字符，目标压缩到 Y 字符（约 30%）"。

这一轮由于没有动刀空间可言，只能强行压缩到一定字符数

```
“你是专为自主智能体（Autonomous Agents）设计的上下文整合专家。你的任务是将新的工具执行结果整合到当前的对话上下文中。输入结构：
输入内容包含：
(a) 可选的：一个先前的压缩上下文块，以 <!-- CONTEXT_OFFLOAD: uuid=... --> 结尾。
(b) 紧接其后的是当前轮次中零个或多个交替出现的 tool_use（工具调用）和 tool_result（工具结果）消息。输入中不包含用户消息。与计划相关的工具已在上一级流程中被过滤掉。你的工作流程：如果输入中包含匹配 <!-- CONTEXT_OFFLOAD: uuid=... --> 的行：将该行之前的所有文本原封不动地保留为先前上下文。仅处理该行之后的 tool_use / tool_result 对。
否则（未找到卸载标记）：将全部输入视为第一轮压缩中的新工具交互。仅基于这些工具调用及其结果生成摘要。针对每一个 tool_use / tool_result 对：以第一人称的事实陈述进行总结：
“我调用了 [tool_name]，参数为 [arg1=value1, ...]；返回结果：[关键细节]。”保留所有技术细节：文件路径、ID、错误代码、配置值、状态变更。如果结果被截断或格式错误，请将其逐字包含，并在前面加上 [UNPARSED OUTPUT]（未解析的输出）前缀。
输出要求：
输出为一个纯文本块，包含：[先前上下文（如果有）]\n[新工具摘要]不要在输出中包含任何 <!-- CONTEXT_OFFLOAD --> 标签。不要提及用户的请求、意图或问题（因为输入中根本没有这些内容）。不要使用 Markdown、JSON、项目符号，也不要使用诸如“如前所述”、“新操作：”之类的短语。
该输出将作为新的压缩上下文，新的卸载标签将在外部追加。可以从 tool_result 中安全删除的内容：样板文本（如许可证声明、自动生成的注释）。没有任何可操作数据的冗余成功提示。重复的日志前缀（前提是核心内容已保留）。
严格禁止：
包含原始的 tool_use / tool_result JSON 数据。重新压缩或修改先前的上下文。添加任何卸载标记（无论是旧的还是新的）。”
```

# pi的上下文压缩
原文：https://dg-ai-notes.pages.dev/modules/ch09-compaction/python/#%E5%90%91%E5%90%8E%E9%81%8D%E5%8E%86%E4%BF%9D%E6%8A%A4%E6%9C%80%E9%87%8D%E8%A6%81%E7%9A%84%E4%B8%9C%E8%A5%BF

> pi（`earendil-works/pi`）与上文 AutoContextMemory（AgentScope 1.x）是**两套独立方案**：pi 是"按时间边界压缩"，AgentScope 1.x 是"按资源压力逐级压缩"。对照见本章末尾。

pi 是开源编码 Agent（GitHub `earendil-works/pi`），类似 Claude Code 的 CLI 编码助手。它的压缩核心设计：**最近的上下文最重要，优先保完整轮次，保不住就用摘要缝回去**。

## 触发条件

```python
def should_compact(context_tokens, context_window, settings) -> bool:
    if not settings.enabled:
        return False
    return context_tokens > context_window - settings.reserve_tokens
```

默认值：`context_window = 200,000`，`reserve_tokens = 16,384`（为回复预留），即 token 超过 **183,616** 时触发。

**两种触发场景**：

| | 时机 | 条件 |
|---|---|---|
| **预防性** | 每轮对话结束（`agent_end`）后主动检查 | token > 窗口 − 预留 |
| **应急性** | API 报上下文溢出错误时 | 已经爆了，补救式压缩 |

一句话：**一个快满提前压，一个爆了立刻救。**

> **Token 估算用 `chars / 4` 启发式**（`math.ceil(chars/4)`）。此方法**严重低估中文**——1 个汉字实际约 1-2 token，却被算成 0.25 token。设计哲学"宁可高估、不可低估"：高估最多多压一次（无害），低估会触发 API 溢出报错（有害）。
>
> **关键时序**：压缩发生在**两轮对话之间**——`agent_end` 后检查超阈即压缩，下一轮用户开始时从压缩结果重建。

## 切割点算法：向后遍历保护最近

核心问题：从哪里"下刀"分割消息序列。

**向后遍历**（`find_cut_point`）：从最新消息往回走，累积 token，到 `keep_recent_tokens`（默认 20,000）停止，在停止位置之后找最近的有效切割点。

> 切点语义是**"保留区的第一条"**而非"被切掉的最后一条"——切在 user 上意味着该 user 及其后续全部进保留区，天然保证 Turn 完整。

**为什么是 user 和 assistant 两个切点**：

- **user 切**：以 user 为界，它和后面的整轮（assistant + tool_result）全进保留区 → 轮次完整
- **assistant 切**：user 切点太粗——往回走预算用完时最近的 user 可能隔很远，保留区会过大甚至压缩失败；assistant 切点能**精确卡在预算线上**，代价是轮次被切开
- **tool_result 不能切**：它必须紧跟带 toolCall 的 assistant，切了上下文断裂

一句话：**user 保完整、assistant 控精度、tool_result 是结构红线。**

**被切断的 Turn 怎么补**：切在 assistant 上时，该 Turn 被切开的前缀（`turnPrefixMessages`）用 `TURN_PREFIX_SUMMARIZATION_PROMPT` 生成一份轻量摘要，与主摘要**并行生成**，最后合并成一个摘要文本。

## 结构化摘要

- 强制 LLM 填 **6 个固定 section**：
  1. `## Goal` — 用户最初要做什么
  2. `## Constraints & Preferences` — 约束
  3. `## Progress` — Done / In Progress / **Blocked** 子项
  4. `## Key Decisions` — 关键决策
  5. `## Next Steps` — 下一步
  6. `## Critical Context` — 不能忘的关键信息

- **为什么固定**：自由摘要会漏——LLM 容易被"有意思的内容"带跑，忘了记用户核心需求；固定模板逼它每项扫一遍
- Progress 里单设 **Blocked**：记录卡住的事，下一轮优先解锁
- 多次压缩传 `previousSummary` 做**增量更新**而非重写，防"摘要漂移"累积误差

一句话：**用模板对抗 LLM 的选择性失忆。**

## 偏向保留完整轮次

- 从最新消息**往回走**，token 累积到 `keep_recent_tokens`（20k）才停 → "最近的上下文最重要"
- 切点语义：**切点 = 保留区的第一条**。切在 user 上 = 整轮完整保留
- 默认优先切 user；只有预算不够、必须精确控量时才切 assistant，再用 **turnPrefix 轻量摘要**把被切开的前缀补回去

一句话：**能保整轮就保整轮，实在不行才切轮次、用摘要缝回去。**

![pi 切割点机制示意图](images/ai/pi-cut-point-mechanism.png)

### 为什么安全：四道结构性防线

1. **时序安全（最关键）**：压缩**只发生在轮与轮之间**——`agent_end` 后检查、下一轮开始前完成。这决定了 pi 压缩的那一刻**"正在执行的轮次"在物理上不存在**，永远不会面对"要不要压当前轮"的问题
2. **边界安全**：`find_cut_point` 向后走到 20k token 才停 → 最近 N 轮原文完整保留，压缩只作用于"已完成的旧对话"
3. **结构安全**：切点只允许 user/assistant，`toolResult` 永不切 → 工具对（tool_use ↔ tool_result）作为原子单元**整块移动**，要么整轮进保留区、要么整轮进摘要，不存在"只有调用没结果"的悬空状态
4. **角色安全**：摘要以**独立的 CompactionSummaryMessage**（`<summary>` 标签包裹）写入，不是伪装成 ASSISTANT 文本 → 模型能区分"这里是摘要"和"这是我自己的回复"，不会模仿摘要格式说话

一句话：**pi 的安全性来自结构设计（时序 + 边界 + 切点 + 角色），它让"压当前轮"这个选项在物理上不存在。**

### 从"历史轮次触发"看：起点相同，底线不同

两者都是从历史开始压，但处理方式和底线不同：

| | pi | AgentScope 1.x |
|---|---|---|
| **处理历史的起点** | 一步到位：整段旧前缀 → 结构化摘要，最近 20k token 原样保留 | 逐层递进：先压工具调用（小刀）→ 卸载大消息（中刀）→ 整轮总结（大刀） |
| **对"最近"的保护** | 硬边界：20k token 永不压缩 | 软保护：`lastKeep=50` 条（策略 2），策略 3 就取消 |
| **历史压不够时** | 压不动就停，下一轮再压 | **保证缩下来**：进入策略 5/6，动当前轮 |
| **摘要的角色身份** | 独立 CompactionSummaryMessage | 策略 6 以 ASSISTANT 文本写回 |

![pi vs AgentScope 1.x 安全性对比](images/ai/pi-vs-agentscope-safety.png)

关键在"历史压不够时"这一行——这就是安全性的分水岭：

> **pi 对历史的处理是"尽力而为"**：压到保留区边界就停，压不够就留待下次，**绝不以当前轮为代价**。
>
> **AgentScope 1.x 对历史的处理是"保证完成任务"**：历史压够了当然安全，但"压不够"是它设计里被允许的路径，而这条路径必然通向当前轮。

**为什么"压当前轮"是不可逆的损伤**：

- **历史轮次 = 已提交状态（死数据）**。压坏了损失的是信息，可补救——pi 有摘要、文件跟踪，AgentScope 有 offload 拉回。损伤是**信息级的**
- **当前轮 = 正在计算的中间状态（活数据）**。压坏了破坏的是**计算本身**——模型下一轮还要基于轨迹继续决策，轨迹被换成摘要后，它不知道哪个工具调过、哪个结果对应哪次调用、任务到哪一步。损伤是**执行级的**，无法补救，直接表现为行为错误（重复调用、幻觉、格式模仿）

一句话：**pi 压缩的是"历史"（已发生的事实，压错了损失信息）；AgentScope 1.x 在资源压力下压缩的是"现在"（正在进行的推理，压错了破坏执行）。**

> 两者的取舍本质：**pi 优先保护执行正确性（可能多压几次），AgentScope 1.x 优先保证压缩成功（可能破坏执行）**。这也是为什么 2.0 最终倒向了"保留最近 N 条原文 + 只总结前缀"的 pi 式边界。

## 文件跟踪（编码 Agent 特有）

通过 `extractFileOperations` 累积整个会话读/改过的文件，以 `<read-files>` / `<modified-files>` 标签附加到摘要末尾，让 Agent 多轮压缩后仍知道读过/改过哪些文件。这是"通用压缩机制 + 领域扩展"模式——算法本身通用，领域信息通过 `details` 字段承载。

## 配置参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `context_window` | 200,000 | 模型上下文窗口（Claude Sonnet） |
| `reserve_tokens` | 16,384 | 为回复预留 |
| `keep_recent_tokens` | 20,000 | 保留区最小 token 量 |
| Token 估算 | `chars / 4` | 简易启发式 |

## 与 AutoContextMemory 的对比

| 维度 | AutoContextMemory | pi |
|------|-------------------|-----|
| 核心动作 | **卸载**（offload 到 map 按需拉回，不丢原始数据）+ 摘要 | **压缩**（旧消息变结构化摘要，旧的丢弃） |
| 摘要结构 | 自由文本（强调事实性） | **6 固定 section 模板** + 增量更新 |
| 触发机制 | 六层渐进式，从便宜到昂贵 | 单一 token 阈值 + 向后遍历找切点 |
| 领域扩展 | 通用对话 | 文件跟踪（编码场景） |
| 保留最近 | `lastKeep=50` 保护最近 50 条 | `keep_recent_tokens=20,000` token 预算 |

> 一个有趣对照：AutoContextMemory 靠"卸载到 map 随时拉回"保全信息（**保全在存储层**），pi 靠"固定模板 + 增量更新 + 文件跟踪"保证摘要不漂移不遗漏（**保全在提示词设计层**）。

## AgentScope 2.0 的演进

旧版 1.x 六层机制的代价是：进入第 5、6 层后会**主动修改当前执行轮次**。社区有真实 Bug 报告（[issue #1026](https://github.com/agentscope-ai/agentscope-java/issues/1026)）：

> 策略 6 `summaryCurrentRoundMessages` 把 `[tool_use + tool_result]` 消息对压成**一条普通 ASSISTANT 文本消息** → LLM 看不到工具调用配对，以为没执行过 → **反复用相同参数重调同一工具**，形成无限循环。临时方案是在 system prompt 加"把压缩后的消息视为已完成工具执行"——被报告者评价为 *fragile and model-dependent*。

因此 AgentScope 2.0 把六层递进**重构为四个正交策略**（可自由组合、默认全部关闭，参考 [java.agentscope.io/v2 compaction 文档](https://java.agentscope.io/v2/en/docs/harness/compaction.html)）：

| 策略 | 解决的问题 | 触发时机 | 实现 |
|------|-----------|---------|------|
| 对话摘要化 | 上下文太**深**（消息数堆积） | 每次模型推理前 | 前缀蒸馏为结构化摘要（`SESSION INTENT / SUMMARY / ARTIFACTS / NEXT STEPS`）+ **保留最近 N 条原文**（`keepMessages`/`keepTokens`） |
| 大工具结果驱逐 | 上下文太**宽**（单条结果巨大） | 工具执行后（默认 >80K 字符 ≈20K token） | 完整输出写工作区文件，上下文只留**头尾预览**（各 ~2K 字符）+ `read_file` 指针，按需读取 |
| 溢出安全网 | API 报 `context_length_exceeded` | `call()` 抛异常时 | 强制极压缩（`triggerMessages=1`）+ 自动重试一次 |
| 参数截断 | 大工具参数无人再读 | 摘要化前轻量预处理 | 非 LLM 字符串截断（`maxArgLength` 等），近乎零成本延迟压缩触发 |

![AgentScope 2.0 四正交策略架构图](images/ai/agentscope2-four-strategies.png)

**压缩前还做两件保全动作**（默认开启）：

- `offloadBeforeCompact`：把原始消息写入未压缩日志 `*.log.jsonl`，使 `session_search` 工具仍可检索
- `flushBeforeCompact`：从对话前缀提取事实到长期记忆（`MEMORY.md` / `memory/*.md`），压缩后仍可用 `memory_search` 取回

**与旧版的核心区别**：

1. **正交组合，而非层级递进**——四种策略独立开关，不再"从便宜到昂贵逐层尝试"
2. **不触碰执行中状态**——压缩只动对话消息列表；Plan Mode、子智能体后台任务、todo 列表、权限规则各有独立状态机
3. **吸收了两家之长**——"保留最近 N 条原文 + 只总结前缀"正是 pi 的边界逻辑；"大结果写文件 + 头尾预览 + 指针"则是 AutoContextMemory 策略 2 的 offload 的**落盘版**。2.0 是"Pi 式边界 + AgentScope 式落盘"的融合

> 一句话演进：**1.x 是"哪里占空间就压哪里"（资源压力驱动，可能动当前轮）；2.0 是"历史可压、执行中不碰"（边界驱动），并补上文件系统与长期记忆做数据保全。**

# Grok Build 的压缩（xai-org/grok-build）

来源：[grok-build 代码解读 Wiki · 第 17 章：对话压缩](https://linearuncle.github.io/grok-build-wiki/#/17-compaction)（第三方源码解读，核心机制经源码 `crates/common/xai-grok-compaction/` 验证）

核心结论：**Grok Build 不是单一的"把旧消息总结一下"，而是一套"摘要替换 + 分区压缩 + 原文回查"的机制。**

## 两层压缩架构

| 类型 | 时机 | 触发方 | 代码位置 |
|------|------|--------|----------|
| **对内压缩** `intra_compaction` | Agent 执行任务过程中（窗口快满） | 自动 | `intra_compaction/compact.rs` |
| **对外压缩** `inter_compaction` | 会话结束后 | `/compact` 命令或外部系统 | `inter_compaction/compact.rs` |

对内压缩更复杂——需要在 Agent 运行中"插队"压缩而不中断工作流。

## 触发条件：三个信号 + 源码验证的默认值

触发检查三个信号（`trigger.rs`）：

1. **窗口占用率**：token 超过上下文窗口默认 **85%**（`trigger_threshold_percent: 85`，比较 `last_prompt_tokens / context_length.max_len`）
2. **步数门槛**：`min_steps_before_compact`（默认 3 轮；**FullReplace 模式下被忽略**）
3. **最小可压 token 数**：`min_compactable_tokens: 5_000`——压缩本身要调 LLM 有开销，不划算就不压

源码 `config.rs` 默认值（已逐项验证）：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `trigger_threshold_percent` | 85 | 触发阈值（窗口占用 85%） |
| `target_threshold_percent` | **50** | 压缩落点（压到窗口 50%）——85 触发、50 落点是一对 |
| `min_compactable_tokens` | 5,000 | 低于此值不压（不值得调 LLM） |
| `max_reduction_ratio` | 0.8 | 效果守卫：至少省 20%，否则丢弃 |
| `min_steps_before_compact` | 3 | 步数门槛（FullReplace 忽略） |
| `steps_trigger_ratio` | **0.3** | HistoryThenSteps：步骤 token 超过历史 token 的 30% 才继续压步骤 |
| `user_message_truncate_chars` | 3,000 | HistoryOnly/HistoryThenSteps 超长用户消息截断 |
| `mode` | FullReplace | 默认压缩模式 |
| `enabled` | **false** | 默认关闭，显式开启（同 AgentScope 2.0 四策略默认全关） |
| 压缩专用模型 | `grok-4.20` | `DEFAULT_COMPACTION_MODEL_NAME` |

## 四种压缩模式（选择"压哪里"）

| 模式 | 行为 | 激进程度 |
|------|------|---------|
| **FullReplace**（默认） | 历史 + 当前步骤**一次性全部**总结替换，不保留尾部 | 🔴 最激进 |
| **StepsOnly** | 只压当前 Agent 循环累积步骤，保留对话历史 | 🟡 |
| **HistoryOnly** | 只压历史，当前执行步骤原文保留（tail-keep） | 🟢 最保守 |
| **HistoryThenSteps** | 先压历史；步骤 token 超过压缩后历史的 **30%** 才再压步骤 | 🟡 折中 |

> 与 pi / AgentScope 的关键差异：pi 和 AgentScope 把"压不压当前轮"写成固定策略，Grok **把它做成可配置的模式**——HistoryOnly 就是 pi 式（时间边界），FullReplace 比 AgentScope 1.x 策略 6 还激进。

### 策略选择：三层递进

选择原则贯穿始终：**越老的内容越先牺牲，当前工作区尽量最后动**——即使默认 FullReplace 最激进，其内部的 fit 阶梯仍遵循这个优先级。

**第一层：模式分发（压哪里）** —— 一次 `match` 决定：

```rust
let result = match policy.mode {
    IntraCompactionMode::FullReplace   => apply_full_replace_compaction(...),
    IntraCompactionMode::StepsOnly     => apply_steps_compaction(...),
    IntraCompactionMode::HistoryOnly   => apply_history_compaction(...),
    IntraCompactionMode::HistoryThenSteps => apply_history_then_steps(...),
};
```

HistoryThenSteps 的内部判断（先压历史，再按比例决定是否压步骤）：

```rust
// 先压历史（NothingToCompact 则忽略继续）
apply_history_compaction(...)
// 只有步骤 token 超过压缩后历史 token 的 30% 才继续压步骤
let ratio_threshold_tokens = (history_tokens as f64 * policy.steps_trigger_ratio).ceil();
let should_compact_steps = steps_tokens > ratio_threshold_tokens;
```

**第二层：fit 阶梯（输入放不下时，牺牲谁）** —— FullReplace 把整个对话喂给压缩模型，若**连压缩模型的窗口都装不下**，`fit_turns_for_summarizer` 四级递进，前一级不够才进下一级：

| 级别 | 动作 | 语义 |
|------|------|------|
| 1. `HistoryTurnSelected` | 丢弃部分**旧历史**轮次 | 先牺牲最老的 |
| 2. `ToolTruncated` | **截断工具结果**内容 | 再压大块输出 |
| 3. `StepTurnsSelected` | **减少当前步骤**轮次 | 最后才动工作区 |
| 4. `Emergency` | 紧急保底，保留最新原始项 | 实在不行只喂最新的 |

`fit_rung` 记录实际用到哪一级（日志/观测）。两个保护细节：

- **空计划拒绝**：fit 后 `llm_turns` 为空或 `tokens_fit == 0` → 返回 `NothingToCompact`——防止给压缩模型喂空内容产生幻觉
- **守卫用 pre-fit 原始 token 数**：效果守卫仍用 fit 前的 `tokens_before` 判断，保证 fit 的裁剪不会让守卫误判丢弃

**第三层：分割点选择（压多少）** —— Steps/History 在选定区域内按预算选切点：

```rust
let target_tokens = context_window * target_threshold_percent(50) / 100;
let plan = select_turns_to_compact(&token_counts, &source_turns, target_tokens, min_compactable_tokens);
// split_idx 之前的压缩，之后的保留为 tail
```

注意用的是 **50%**（`target_threshold_percent`，压缩落点）——"压到窗口一半"是分割点预算，和 85% 触发阈值构成一对。

## FullReplace 流水线：select → fit → sample → guard → commit

```
读取全部对话（get_all_turns_for_compaction）→ 统计 tokens_before
    ↓ 低于 min_compactable_tokens → 返回 NothingToCompact
必要时预裁剪压缩输入（防"压缩请求本身超窗"）：
    先丢部分旧历史 → 截断大工具结果 → 减少当前步骤 → 紧急保底
    ↓
调 LLM 生成摘要（Shared 总结器，解析 <analysis>…</analysis><summary>…</summary>）
    ↓
追加 active_reminder（代码硬塞，非 LLM 生成）
    ↓
构建带 is_compaction_summary 标记的 Developer 角色消息，统计 tokens_after
    ↓
效果守卫：tokens_after > tokens_before × 0.8 → InsufficientReduction，丢弃保持原样
    ↓
replace_with_compaction 用摘要替换整个对话
```

## 三个守卫机制（Grok 独有的补偿设计）

### 1. active_reminder：执行中状态的代码级抢救

FullReplace 连当前工作过程一起替换，但可能有**后台任务**仍在运行（如 `cargo test --watch`、子 Agent）。原始对话里"我启动了 task_id=abc"的证据被压掉后，Agent 会忘记任务存在 → 孤儿进程、忘记轮询/取消。

机制：摘要生成后、提交前，**代码硬追加**一段提醒到摘要末尾（携带子 Agent ID 列表），压缩后的 Agent 仍知道哪些任务在跑、该查询哪些、能取消哪些。

> 关键：这是代码直接搬运，不依赖 LLM 摘要质量。AgentScope 2.0 是**隔离状态**（压缩不碰子任务），Grok 是**补偿信息**（压缩可碰对话，但把任务状态显式补回）。

### 2. 压缩效果守卫：压缩是交易，省不到 20% 就回滚

压缩有损（信息丢失）+ 有成本（LLM 调用）。若摘要写了 85K 而原文 100K，只省 15% 却丢了 15K 信息——**亏本买卖**。

机制：提交前纯数字对比 `tokens_after > tokens_before × max_reduction_ratio(0.8)` → 是则 `InsufficientReduction`，丢弃摘要保持原样。

> 两个检查点是一对：压缩前 `min_compactable_tokens`（有没有得压）管"值不值得调 LLM"，压缩后 `max_reduction_ratio`（压得够不够）管"值不值得丢信息"。pi/AgentScope 均无此机制——pi 是"压不动就不启动"，AgentScope 1.x 是"不允许失败"（策略 6 强制 30% 比例压）。

### 3. `<grok_user_queries>` 保护：用户原话，LLM 永远碰不到

用户原始提问（需求、补充要求、附件引用）**不能压缩、不能改写**——改一个字都可能曲解意图。HistoryOnly/StepsOnly/对外压缩路径中：

1. **拆**（`separate_prior_user_queries`）：喂 LLM 前把旧的查询块从输入中拿掉，LLM 只看到纯净对话
2. 压：LLM 生成摘要——它根本不知道查询块存在，自然不会碰
3. **合**（`assemble_user_queries_preamble`）：把旧查询块 + 新对话里的提问合并，附到新摘要前

结果：查询块只被**代码**搬运（拆出来、放回去），从不经 LLM → 不会改写、不会膨胀、不会丢失。

> 与 pi 的 previousSummary 对比（方向相反）：pi 让 LLM"接着写"旧摘要（防漂移，信任 LLM 更新能力）；Grok 让 LLM"根本看不见"查询块（防膨胀/改写，信任代码搬运能力）。
>
> ⚠️ **注意：默认 FullReplace 不使用这套保护**，依赖共享摘要模型本身保存用户意图——单从用户要求保真角度看，HistoryOnly 反而比默认 FullReplace 更明确。

## 回滚原理：事务式，而非撤销式

**"回滚"的本质是：原始对话在提交之前从未被修改过。** 这不是撤销（undo），而是事务（transaction）——失败路径上根本没有产生任何变更，自然无需恢复。

流程骨架：`select → sample → guard → commit`，commit 是最后一步。**摘要先在内存里构建好、检查通过，才提交替换对话**；任何一步失败，`replace_with_compaction` 永远不被调用。

**三个"不提交"的节点**：

1. **采样失败 → 直接返回，不碰对话**：摘要生成失败（超时、空响应、确定性错误）时函数直接 `return Err`，原始轮次未被触碰
2. **效果不达标 → 守卫拦截，丢弃摘要**：构建好替换项、算出 `tokens_after` 后，守卫检查才决定"要不要提交"——不通过则 `InsufficientReduction`，已生成的摘要只存在于内存里，直接丢弃（源码注释原文 `"insufficient reduction, discarding"`）
3. **提交本身失败 → 错误传播，状态不变**：`replace_with_compaction` 是 harness 实现的 trait 方法，源码注释明确 "On any error, parser state is left unchanged"；且提交是**原子的**（Steps：`split_off(n)` 后 `[摘要] + 保留tail` 链式拼接；FullReplace：`vec![摘要]` 整体替换），不存在"替换一半"的中间状态

**边界情况——HistoryThenSteps 的部分持久化**：历史压缩**已提交成功**、步骤压缩随后失败时，历史**不会回滚**：

```rust
// Steps-error after a successful history pass: history is already
// applied — mutation is durable on the parser.
```

> 回滚只发生在**提交前**；一旦提交，变更就是持久的。对比：pi 是"压不动就不启动"（压缩前避免失败），AgentScope 1.x 是"不允许失败"（策略 6 强制比例压），Grok 是"允许失败，失败 = 不提交"（提交前检查）。

## 压缩后的三种结果模式（原文回查）

| 模式 | 内容 | 定位 |
|------|------|------|
| **Summary** | 只留摘要 | 最省 token，漏掉的信息无法恢复 |
| **Transcript** | 摘要 + 原始 `updates.jsonl` 路径 | 需精确错误/代码/工具结果时可重读原始记录 |
| **Segments** | 摘要 + `compaction/segment_*.md` 逐段文件 | AI 可用 `read_file`/`grep` 查阅细节 |

> 核心思想：**摘要是工作记忆，磁盘 transcript/segments 是可检索的历史档案。** 承认摘要一定有损，不给"完美摘要"钻牛角尖，而是留一条恢复精确细节的通道。

## 对外压缩的分块策略

- **Basic**：全部历史一次 LLM 调用（chunk 上限 `u32::MAX`）
- **DivideAndConquer**：每 chunk ≤ `dnc_chunk_token_limit`，拆分多次调用，最后拼接 `<chunk_summary index="i">` 块

> 代价：多块摘要**没有再做统一语义整合**，只是按顺序拼接——可能存在重复、跨块关系丢失、决策分散（设计取舍：分块本身就是防超窗）。

## 错误处理与总结器

- **总结器**：Legacy（旧算法，无清洗无退化过滤） vs Shared（默认，复用 `code_compaction::sample_summary_with_retries`，有格式清洗 + 退化检测——摘要太短则重试）
- **错误分类**：瞬态错误（Timeout/EmptyResponse/SamplerStream）重试 `max_attempts`（默认 2）次；确定性错误（SamplerBuild/InsufficientReduction/NothingToCompact）不重试
- **续接**：摘要后 `AUTO_CONTINUE_PROMPT` 指示 AI 根据摘要中"当前工作/下一步"段落自动接续

## 四方对比

| 维度 | pi | AgentScope 1.x | AgentScope 2.0 | Grok Build |
|------|-----|----------------|----------------|------------|
| 核心设计 | 时间边界 + 切点 | 六层资源压力递进 | 四正交策略组合 | **模式可选**（Full/Steps/History） |
| 压不压当前轮 | 永不（结构保证） | 压不够就进当前轮 | 不碰执行中状态 | **模式决定**（默认全压） |
| 摘要结构 | 6-section 模板 | 自由文本 | 4 段模板 | 9 段编码模板 + Shared 清洗 |
| 用户原话保真 | 依赖摘要质量 | 依赖摘要质量 | 依赖摘要质量 | **`<grok_user_queries>` 代码级隔离**（非 FullReplace） |
| 执行中状态保全 | 当前轮物理不存在 | 无（已知 Bug #1026） | 状态隔离 | **active_reminder 补偿** |
| 压缩效果守卫 | 无 | 无 | 无 | **max_reduction_ratio 0.8 回滚** |
| 原始数据回查 | 摘要丢弃旧消息 | offload map 拉回 | 日志 + 长期记忆 | **Transcript/Segments 落盘回查** |
| 防递归退化 | previousSummary 增量 | — | — | **user_queries 拆分重组** |

> 一句话：**pi 靠"保留最近原文"降低风险，Grok 默认"敢于全量替换"，但靠摘要结构、状态提醒和磁盘回查补偿风险**——它把"让摘要写好"的问题，转移成"让摘要够用，细节反正可以回查"。

# pi vs Grok：谁的上下文压缩更好

结论先行：**分维度看，pi 的哲学更优雅，Grok 的工程更完整。** 如果二选一部署到真实产品，选"配置成保守模式的 Grok"；如果问默认配置谁更安全，pi 胜。

## 五维判断

### 1. 执行安全性：pi 胜（结构性优势）

这是 pi 唯一无法被补偿的核心优势：

- pi 让"压当前轮"**在物理上不可能**（轮间压缩 + 切点红线 + 工具对原子性）——它消灭了一整类问题
- Grok 默认 FullReplace 会压当前步骤，active_reminder 只是"提醒"不是"原样保全"——摘要里一行"有子任务在跑"的信息量，远小于原始轨迹里几十次工具调用的上下文

> **pi 是"从根上不出事"，Grok 是"出事概率更高但兜底更多"。** 对"压坏正在执行的推理"这种不可逆损伤，预防永远优于补救。

### 2. 工程完备度：Grok 胜（维度上的碾压）

pi 缺了四样 Grok 有的关键件：

| 能力 | pi | Grok |
|------|-----|------|
| **效果守卫**（压完没省到 20% 回滚） | 无——摘要没省多少也照样提交 | ✅ 事务式回滚 |
| **fit 阶梯**（摘要模型本身超窗时） | 无——历史太长时压缩请求本身可能失败 | ✅ 四级降级（丢旧历史→截工具→减步骤→保底） |
| **原文回查**（压错/漏细节） | 无——压完就没了，不可逆 | ✅ Transcript/Segments 落盘 + read_file/grep |
| **退化检测**（摘要太短/为空重试） | 无 | ✅ Shared 总结器 `<500 字符` 重试 |

pi 没有"压缩性价比"和"失败恢复"的概念——它的失败模式是静默的（压完可能没省多少、可能丢了细节，但流程照常）。

### 3. 摘要质量：Grok 略胜

- Grok：9 段编码模板（Primary Request / Key Technical Concepts / Files…）+ 退化检测 + AUTO_CONTINUE_PROMPT 自动续接——**为编码场景深度定制**
- pi：6-section 模板 + previousSummary 增量更新——**防漂移的设计更好**（这是 Grok 没有的），但模板更通用、无质量检查

> pi 的增量更新治"越压越偏"，Grok 的退化检测治"这次压得烂"。防的是不同的问题。

### 4. 可配置性：Grok 胜（双刃剑）

- Grok：4 模式 + 分块策略 + 三种结果模式 + 专用模型——但**默认配置是危险的**（FullReplace + enabled 要自己开），部署者必须懂行
- pi：单一策略写死——没有选择，但**默认配置就是安全配置**

> 很讽刺：**Grok 的安全性是"配置出来的"，pi 的安全性是"天生的"。** Grok 文档写得再清楚，默认 FullReplace 就摆在那里。

### 5. 适用场景

- **长会话、有子进程/子 agent 的编码任务**：Grok 实用得多——active_reminder 保任务、落盘回查保细节、分块防超窗，全是长会话真实痛点
- **对"压了必须不出错"敏感的场景**：pi 更稳——结构保证让最坏情况不发生

## 最终立场

如果必须二选一，选 **Grok（配置成 HistoryOnly 或 HistoryThenSteps）**——它把 pi 的短板（无回查、无守卫、无 fit）全补上了，且 pi 的结构安全通过"配置保守模式"就能等效获得：

```
Grok HistoryOnly ≈ pi 的保守姿态（压历史、保最近）
              + Grok 的工程件（守卫/回查/退化检测/active_reminder）
              − pi 的切点红线（Grok 没有"工具对永不拆"的显式保证）
```

但要诚实：**pi 的"切点红线"和"工具对原子性"是 Grok 没有对应物的设计**——Grok 按区域压（历史区/步骤区），pi 按轮次压（user/assistant 边界，tool 对永不拆）。在"不破坏 ReAct 结构"这个 AgentScope 1.x 翻过车的地方（[issue #1026](https://github.com/agentscope-ai/agentscope-java/issues/1026)），pi 是唯一从结构上杜绝的方案。

> 一句话总结：**pi 是"优雅的极简主义"（用结构消灭问题），Grok 是"完备的工业级"（承认问题并逐一兜底）。** 真正最好的方案是两者的合体——pi 的切点红线 + Grok 的守卫/回查，这恰好就是 AgentScope 2.0 正在走的方向。

# 四工具横向对比矩阵

## 总览：四工具 × 关键维度

| 维度 | pi | AgentScope 1.x | AgentScope 2.0 | Grok Build |
|------|-----|----------------|----------------|------------|
| **压缩哲学** | 时间边界（历史压、最近留） | 资源压力（哪里占压哪里） | 边界 + 落盘（保守 + 数据保全） | 模式选择（配置定策略） |
| **默认姿态** | 保守（保最近 20K 原文） | 渐进（先温和后激进） | 全关（opt-in） | 激进（FullReplace 全压） |
| **当前轮** | 永不压（结构保证） | 压不够就压（策略 5/6） | 不碰（状态隔离） | 模式决定（默认压） |
| **最近保护** | 20K token 硬边界 | `lastKeep=50` 软保护 | `keepMessages`/`keepTokens` | tail-keep（非 FullReplace） |
| **摘要结构** | 6-section 模板 | 自由文本 | 4 段模板 | 9 段模板 + Shared 清洗 |
| **防漂移/防劣质** | previousSummary 增量（防漂移） | — | — | 退化检测重试（防劣质） |
| **数据保全** | 无回查（压完即弃） | offload map + UUID 拉回 | 日志 + 长期记忆 | Transcript/Segments 落盘回查 |
| **守卫机制** | 无 | 无 | 溢出安全网（事后） | 效果守卫 0.8（事前） |
| **触发** | token 阈值（窗口−预留） | 消息数 / token 阈值 | 消息数 / token 阈值 | 85% 窗口 + 步数 + 最小可压 |
| **可配置性** | 单一写死 | 六层固定顺序 | 四正交策略独立开关 | 四模式 + 分块 + 结果模式 |

## 两两对比（六对）

### 1. pi vs AgentScope 1.x（详见「与 AutoContextMemory 的对比」表格）

一句话：**pi 按时间边界压缩（历史可压、最近不动），1.x 按资源压力升级（压不动就动当前轮）。**

- 安全：pi 结构保证（当前轮物理不存在） vs 1.x 策略 5/6 可进当前轮（Bug #1026 实锤）
- 保全：pi 摘要丢弃旧消息 vs 1.x offload map 拉回（存储层保全）
- 摘要：pi 6-section 模板 vs 1.x 自由文本
- 共同点：都保护最近（20K token vs lastKeep=50），工具对都作为原子单元处理

### 2. pi vs AgentScope 2.0（相似度最高的一对）

一句话：**2.0 是 pi 思想的工程化——保留最近 N 条 + 只总结前缀，但补上了落盘与长期记忆保全。**

- 边界逻辑**同源**："保留最近原文 + 前缀摘要"正是 pi 的 `keep_recent_tokens` 边界
- 2.0 是**四正交策略可自由组合**，pi 是单一策略写死
- 2.0 有落盘（大结果写文件 + 头尾预览 + 指针）和长期记忆提取，pi 无任何回查通道
- 2.0 默认全关（opt-in），pi 默认启用
- 摘要：2.0 四段模板（SESSION INTENT/SUMMARY/ARTIFACTS/NEXT STEPS） vs pi 6-section
- 差异本质：**pi 是 2.0 的思想来源，2.0 = pi 边界 + AgentScope 式落盘**

### 3. pi vs Grok（详见「pi vs Grok：谁的上下文压缩更好」章节）

一句话：**pi 用结构保证安全（默认保守），Grok 用补偿机制兜底（默认激进）。**

### 4. Grok vs AgentScope 1.x

一句话：**1.x 默认温和但会升级到破坏当前轮，Grok 默认激进但有守卫与回查兜底。**

| 维度 | AgentScope 1.x | Grok |
|------|----------------|------|
| 策略结构 | 六层渐进（小刀→大刀→动当前轮） | 四模式选择（默认直接全压） |
| 结构安全 | 策略 6 压平工具对（Bug #1026） | HistoryOnly 保结构 + active_reminder 补偿 |
| 失败处理 | 无守卫（压了就算） | 效果守卫 0.8 回滚（事务式） |
| 数据保全 | offload map 拉回 | Transcript/Segments 落盘回查 |
| 摘要 | 自由文本 | 9 段编码模板 + 退化检测 |

- 差异本质：**1.x 是"资源压力驱动的被动升级"，Grok 是"配置驱动的主动选择 + 兜底"**——Grok 把 1.x 翻车的地方（动当前轮）变成了可选模式，并补上了 1.x 缺失的守卫

### 5. Grok vs AgentScope 2.0

一句话：**都吸收 pi 思想、都有落盘回查，但 2.0 是"默认全关的正交工具箱"，Grok 是"默认全压但兜底完整的系统"。**

| 维度 | AgentScope 2.0 | Grok |
|------|----------------|------|
| 策略结构 | 四正交策略独立开关（可同时启用） | 四模式互斥（一次选一个） |
| 执行中状态 | 状态隔离（压缩不碰子任务） | active_reminder 补偿（压缩可碰、状态补回） |
| 大结果处理 | 驱逐单条（>80K 字符写文件） | fit 阶梯截断（FullReplace 输入适配） |
| 溢出处理 | 溢出安全网（事后：报错后强压+重试） | 效果守卫（事前：压完检查回滚） |
| 额外能力 | — | 退化检测、DivideAndConquer 分块、专用模型 |

- 共同点：都不碰/补救执行中状态、都有"摘要 + 落盘回查"的双层设计
- 差异本质：**2.0 是"保守的工具栏"（默认不开，用户按需组合），Grok 是"完整的压缩系统"（默认全开，但机制兜底）**

### 6. AgentScope 1.x vs 2.0（详见「AgentScope 2.0 的演进」章节）

一句话：**从"资源压力驱动的六层递进"演进到"边界驱动的正交组合"，2.0 吸收了 pi 的保守思想。**

- 层级递进 → 正交组合（1.x 按顺序尝试六层；2.0 四策略独立开关）
- 动当前轮 → 不碰执行中状态（1.x 策略 5/6；2.0 Plan Mode/子任务/todo/权限独立）
- offload map → 落盘 + 长期记忆（1.x 内存 map；2.0 文件系统 + MEMORY.md）
- 自由文本 → 4 段模板
- Bug #1026 → 溢出安全网（1.x 无守卫；2.0 报错后强制压缩 + 重试）

## 一句话总览

> **四工具其实是一条收敛线：1.x 是"资源压力驱动"（会伤当前轮）→ pi 是"时间边界驱动"（绝不伤当前轮）→ 2.0 把两者融合成"保守边界 + 落盘保全"→ Grok 在此基础上加回"激进的默认"（FullReplace），但用守卫、回查、补偿把激进的风险全部兜住。** 越晚的设计越完备，但 pi 的"切点红线"至今仍是唯一从结构上杜绝 ReAct 破坏的方案。


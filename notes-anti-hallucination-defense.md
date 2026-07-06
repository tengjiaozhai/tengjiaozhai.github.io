# 防幻觉防御体系：从 LLM 幻觉到工程级护栏

> 复盘笔记。综合 4 份素材：Wrench Board 第一课、Anthropic *Building Effective Agents*、Arthur AI *Guardrails*、NeuBird *AI SRE Guardrails*。

---

## 1. 问题定义：幻觉是结构性的，不是 prompt 问题

LLM 的本质是预测"听起来合理"的文本。当它缺少 grounding 时，会自信地编造看似正确的内容。

在 agentic system 中，上游小错误会**级联放大**：一个错误的 refdes 导致错误的诊断，再导致错误的操作。

在高风险领域（医疗、金融、硬件诊断），幻觉不是质量问题——它是**正确性和可靠性问题**。

结论：**不可能靠 prompt 完全消除**，必须在系统层面用工程手段解决。

> 来源：Arthur AI、NeuBird、Wrench Board 第一课

---

## 2. Wrench Board 的双层防御架构

Wrench Board 没有选择信任模型输出，也没有选择"写一个更好的 prompt"。它选择了**两层工程防御**，分别守住两条不同的路径。

### 层 1 — 工具纪律（源头约束）

模型在提到任何元件位号（refdes）之前，**必须**先调用 `mb_get_component` 工具查询。工具的行为是确定性的：

```python
# 模型调用工具查询一个捏造的位号
mb_get_component("U9999")

# 工具返回结构化结果——绝不编造
→ {
    "found": False,
    "reason": "unknown-refdes",
    "closest_matches": ["U999", "U9999A"]
  }
```

模型收到 `found: false` 后只有两个选择：从 `closest_matches` 中选一个问技术员，或者承认不知道。**绝不能凭空捏造。**

这相当于在 agent 的工具调用路径上加了一道关卡——所有 refdes 必须经过工具验证。

### 层 2 — 事后消毒（出站兜底）

层 1 不是万能的。模型有时会绕过工具，直接用文本回答。层 2 在文本离开服务器之前做一次**无差别的正则扫描**：

```python
# api/agent/sanitize.py — 核心正则
REFDES_RE = re.compile(r"\b[A-Z]{1,3}\d{1,4}\b")
# 匹配：U9, U999, C12, R1, WiFi3, DP1 ...
```

这个正则会把所有"看起来像 refdes"的 token 捞出来。但问题是：`USB3`、`DDR4`、`A2337` 也会匹配。直接包裹就是误报。

**解法：三层白名单，优先级从高到低。**

```python
# api/agent/sanitize.py line 156-163
def _wrap(match: re.Match[str]) -> str:
    token = match.group(0)

    # 白名单 ① —— 真实元件位号（board 原生数据）
    if is_valid_refdes(board, token):
        return token                    # → 放行

    # 白名单 ② —— 总线/协议名称（硬编码 ~60 条）
    if token in PROTOCOL_BLOCKLIST:
        return token                    # → 放行

    # 白名单 ③ —— Apple 设备型号 A\d{4}（A2337 等）
    if _DEVICE_MODEL_RE.match(token):
        return token                    # → 放行

    # 全部未命中 → 包裹为警告标记
    unknown.append(token)
    return f"⟨?{token}⟩"
```

**逐行讲解：**

- **白名单 ①** 调用 `is_valid_refdes(board, token)`，查 board 解析后的真实元件数据。如果电路板上真有 `USB3` 这个芯片，它在这一步就被识别为合法 refdes，直接放行。
- **白名单 ②** 是硬编码的 `PROTOCOL_BLOCKLIST`（`frozenset`，约 60 条），覆盖 USB、PCIe、DDR、SPI、HDMI 等总线/协议名称。这些不是物理元件，但经常出现在诊断文本中。
- **白名单 ③** 匹配 Apple 设备型号 `A\d{4}`（如 A2337、A1989）。虽然形态像 refdes，但 agent 在描述设备时会频繁提及。
- **全部未命中** → 包裹为 `⟨?U9999⟩`，同时记入 `unknown` 列表供日志审计。

白名单的**顺序是关键**——真实数据永远优先于一切。如果电路板上真有标记为 `USB3` 的芯片，它会在白名单 ① 被识别，不会走到白名单 ②。

**效果演示：**

```
原始模型输出：
  检查 U9999 输出，测量 USB3 D+ 信号，再查 A2337 主板的 PCIe 通道。

消毒后输出（board 存在）：
  检查 ⟨?U9999⟩ 输出，测量 USB3 D+ 信号，再查 A2337 主板的 PCIe 通道。
```

`U9999` 不存在 → 包裹。`USB3` / `A2337` / `PCIe` 命中白名单 → 放行。

### 关键设计原则

- **"真实数据优先于一切"** — 白名单 ① 永远先于 ②③
- **防御深度（defense in depth）** — 两层检查不同路径，不是重复检查
- 层 1 可被绕过（模型直接文本回答不调工具）→ 这就是层 2 存在的理由

### 代码定位

| 文件 | 位置 | 职责 |
|------|------|------|
| `api/agent/sanitize.py` | line 138-166 | 事后消毒主函数 `sanitize_agent_text` |
| `api/agent/sanitize.py` | line 67-134 | 协议黑名单 `PROTOCOL_BLOCKLIST` |
| `api/agent/sanitize.py` | line 190-215 | donor ID 二次扫描 `_validate_donor_ids` |
| `api/board/validator.py` | line 12-14 | 元件校验 `is_valid_refdes` |
| `api/board/validator.py` | line 39-54 | Levenshtein 近似匹配 `suggest_similar` |
| `api/agent/runtime/forwarders.py` | line 643 | 调用点（托管模式）|
| `api/agent/runtime_direct.py` | line 242 | 调用点（直接模式）|

---

## 3. Arthur AI — Guardrails 系统方法论
原文：https://www.arthur.ai/column/ai-guardrails-reduce-hallucinations 

### 核心概念

**Guardrails = 实时中间件**，在数据流入/流出模型时即时拦截。它不是事后分析——它在单次执行内立即阻断或修正行为。

区分 guardrails 和 evaluations：

|        | Guardrails | Evaluations |
| ------ | ---------- | ----------- |
| **时机** | 单次执行内，实时   | 事后回顾        |
| **动作** | 立即阻断/修正    | 跨多次交互检测趋势   |
| **定位** | 运行时安全层     | 质量趋势监控      |

### 减少幻觉的核心技巧

护栏与能为模型提供精确参考对象的技术相结合时，效果最佳。以下六点是大多数团队可以做出的最有效的改进：

1. **利用 RAG（检索增强生成）**。在模型给出答案之前获取相关的可信文档，将输出锚定到真实来源，而不是模型的内存。
2. **要求提供引证和出处**。强制所有事实性陈述都必须有来源。如果某个陈述无法追溯到已检索到的上下文，则标记该陈述或将其删除。
3. **允许回避**。明确允许模型在缺乏证据时说"我不知道"。许多幻觉的出现仅仅是因为模型从未被允许拒绝。
4. **强制输出结构化数据**。将响应限制在特定模式（JSON、类型化字段）内，可以减少模型的自由发挥空间，并使输出结果可通过程序进行验证。
5. **对于确凿的事实，使用确定性工具**。将数学运算、查找和日期计算交给函数或数据库，而不是让模型进行计算。
6. **设置置信度阈值**。对置信度进行评分，并将置信度低的答案路由到备选方案、澄清问题或人工审核。

### 两类 Guardrails

#### Pre-LLM Guardrail — 输入侧拦截

在用户输入和组装好的上下文**到达模型之前**运行。职责是清洁输入，确保模型有最好的条件给出准确回答。

```python
# Pre-LLM Guardrail 示例：输入清洁
def pre_llm_guardrail(user_input: str, context: list[dict]) -> tuple[str, list[dict]]:
    """在输入到达模型之前做三道检查。"""

    # 检查 1：Prompt 注入检测
    injection_patterns = [
        r"ignore previous instructions",
        r"you are now",
        r"system:\s*",
    ]
    for pattern in injection_patterns:
        if re.search(pattern, user_input, re.IGNORECASE):
            raise GuardrailViolation("prompt_injection_detected")

    # 检查 2：上下文窗口预算控制
    token_count = count_tokens(context)
    if token_count > MAX_CONTEXT_TOKENS:
        # 截断最远的、相关性最低的上下文片段
        context = truncate_to_budget(context, MAX_CONTEXT_TOKENS)

    # 检查 3：PII 过滤（可选）
    user_input = redact_pii(user_input)

    return user_input, context
```

**讲解：** Pre-LLM guardrail 的核心思路是——与其让模型在脏数据上挣扎，不如在输入端就把问题解决。上面这个 demo 做了三件事：拦截 prompt 注入、控制上下文大小（NeuBird 第 4 点的工程化实现）、过滤 PII。

#### Post-LLM Guardrail — 输出侧拦截

在模型响应之后、展示给用户之前运行。这是**防幻觉的主力**。

```python
# Post-LLM Guardrail 示例：事实 grounding 验证
def post_llm_guardrail(
    response: str,
    sources: list[dict],        # 模型可以引用的事实来源
    max_retries: int = 2,
) -> str:
    """验证模型输出中的事实声明是否有 grounding。"""

    # 提取模型输出中的事实声明
    claims = extract_factual_claims(response)

    for claim in claims:
        grounded = any(
            semantic_match(claim, source["content"])
            for source in sources
        )
        if not grounded:
            # 关键：不是报错给用户，而是触发自纠错
            return self_correct(response, claim, sources, max_retries)

    return response  # 所有声明都有 grounding → 放行


def self_correct(
    response: str,
    unsupported_claim: str,
    sources: list[dict],
    retries_left: int,
) -> str:
    """把未支撑的声明反馈给模型，要求修正。"""
    if retries_left <= 0:
        return "[此回答未能通过事实核查，请联系人工确认]"

    correction_prompt = f"""你之前的回答中包含以下未经证实的声明：
    「{unsupported_claim}」

    请仅基于以下参考资料修正你的回答。如果资料中没有相关信息，
    请明确说明"资料不足"，不要编造。

    参考资料：
    {format_sources(sources)}
    """

    corrected = llm_call(correction_prompt)
    # 递归再过一遍 guardrail
    return post_llm_guardrail(corrected, sources, retries_left - 1)
```

**讲解：** 这个 demo 展示了 Arthur AI 强调的**自纠错循环**模式。Post-LLM guardrail 检测到幻觉后，不是简单报错，而是：

1. 提取模型输出中的事实声明
2. 逐条检查是否有 source grounding
3. 未支撑的声明 → 构造定向修正 prompt → 模型重试
4. 重试输出再过 guardrail → 循环直到通过或达到上限

用户永远只看到每个事实声明都有 grounding 的响应。

```python
# Post-LLM Guardrail 示例：毒性检测
def toxicity_guardrail(
    response: str,
    threshold: float = 0.7,
) -> str:
    """检测并拦截有害或不当内容。"""
    from transformers import pipeline

    # 加载轻量级毒性分类器
    classifier = pipeline("text-classification", model="unitary/toxic-bert")

    result = classifier(response)[0]
    if result["label"] == "toxic" and result["score"] > threshold:
        # 不暴露原始毒性内容，返回安全替代
        return "[此回答包含不当内容，已被安全策略拦截]"

    return response  # 未检测到毒性 → 放行
```

**讲解：** 毒性检测是内容安全的基础防线。关键点：

1. 使用专门的分类模型（如 `toxic-bert`）而非通用 LLM 判断毒性——更快、更确定
2. 阈值可调：生产环境可根据场景调整敏感度（客服 > 内部工具）
3. 拦截后不返回原始内容，而是返回标准化的安全提示——避免二次传播

```python
# Post-LLM Guardrail 示例：工具和操作验证
def tool_use_guardrail(
    response: dict,
    allowed_tools: set[str],
    user_intent: str,
) -> dict:
    """验证 agent 选择的工具是否符合请求意图。"""
    if "tool_call" not in response:
        return response  # 纯文本响应，无需验证

    tool_name = response["tool_call"]["name"]
    tool_args = response["tool_call"]["arguments"]

    # 检查 1：工具是否在允许列表内
    if tool_name not in allowed_tools:
        return reject_tool_use(response, f"工具 {tool_name} 不在当前会话的授权范围内")

    # 检查 2：工具参数是否合理（防止越权操作）
    if not validate_tool_args(tool_name, tool_args, user_intent):
        return reject_tool_use(response, f"工具参数与用户意图不匹配，请确认操作范围")

    # 检查 3：高风险操作需要二次确认标记
    if is_high_risk_tool(tool_name):
        response["requires_confirmation"] = True

    return response  # 工具选择合理 → 放行


def validate_tool_args(tool_name: str, args: dict, intent: str) -> bool:
    """简单启发式：检查参数是否包含与意图相关的实体。"""
    # 生产环境可用更精细的 NLI 模型判断 intent ↔ args 的一致性
    intent_entities = extract_entities(intent)
    arg_entities = {v for v in args.values() if isinstance(v, str)}
    return bool(intent_entities & arg_entities)
```

**讲解：** 工具验证是 agent 安全的关键。这个 demo 展示了三层检查：

1. **授权检查**：工具是否在白名单内——防止 agent 调用未授权的工具
2. **意图一致性**：工具参数是否与用户请求相关——防止 agent 误解意图导致错误操作
3. **高风险标记**：危险操作（删除、支付等）需要人工确认——最后一道防线

```python
# Post-LLM Guardrail 示例：输出格式合规性
def format_compliance_guardrail(
    response: str,
    expected_schema: dict | None = None,
    expected_format: str | None = None,
) -> str:
    """确保响应符合预期结构后再向下游传输。"""

    # 场景 1：期望 JSON 输出
    if expected_schema:
        try:
            data = json.loads(response)
            # 用 jsonschema 验证结构
            jsonschema.validate(instance=data, schema=expected_schema)
            return response  # 格式合规 → 放行
        except (json.JSONDecodeError, jsonschema.ValidationError) as e:
            # 格式不合规 → 触发修正
            return reformat_response(response, expected_schema, str(e))

    # 场景 2：期望特定文本格式（如 markdown 表格、列表）
    if expected_format:
        if not matches_format(response, expected_format):
            return reformat_response(response, expected_format=expected_format)

    return response


def reformat_response(
    original: str,
    expected_schema: dict | None = None,
    expected_format: str | None = None,
    error_hint: str = "",
) -> str:
    """让模型按指定格式重新输出。"""
    if expected_schema:
        prompt = f"""你的输出不符合要求的 JSON 结构。
错误：{error_hint}

请严格按以下 schema 重新输出，只返回 JSON，不要其他内容：
{json.dumps(expected_schema, indent=2)}

原始内容：
{original}"""
    else:
        prompt = f"""你的输出不符合要求的格式：{expected_format}

请按以下格式重新输出：
{original}"""

    return llm_call(prompt)
```

**讲解：** 格式合规性确保下游系统能可靠解析 LLM 输出。关键模式：

1. **Schema 验证**：用 `jsonschema` 等确定性工具验证结构——不依赖 LLM 自我判断
2. **自动修正**：验证失败时，把错误信息反馈给模型要求修正——与幻觉检测的自纠错循环同构
3. **格式兜底**：对于非结构化输出（如 markdown），用简单模式匹配检查——成本更低

### 护栏作为自我纠正回路

大多数团队将防护措施视为过滤器：响应要么通过，要么被阻止。更有效的模式是将 LLM 防护措施失效的情况作为自我纠正的依据。

当幻觉防护机制检测到未经证实的声明时，系统不会直接向用户显示错误，而是将标记的问题反馈给模型，并附上针对性的修正提示：这是你刚才说的，这是未经证实的部分，请修改你的回复。模型会重试，修正后的输出再次通过防护机制，如此循环往复，直到回复通过或达到重试次数上限。

其结果是，用户始终收到的响应中，所有事实陈述都基于模型实际已知的信息，无需人工审核。原本可能导致用户出错的问题，现在变成了执行循环中内置的质量保证。这一切都在单次执行中完成，这使其区别于事后发现问题的评估方法。

### 三层体系

```
Guardrails（实时修正）
  + Continuous Evaluations（趋势检测）
  + Observability（根因调试）
= 持久的幻觉降低，不是一次性修复
```

Guardrails 解决当下的问题。Evals 告诉你什么时候开始趋势性恶化。Observability 让你能调试根因。三者缺一不可。

#### 单靠护栏是不够的

实时防护机制只是可靠系统的一个组成部分，而非全部。为了发现防护机制的不足之处并了解故障发生的原因，需要将其与以下两种回顾性功能结合使用：

- **持续评估**针对生产流量进行，以便在用户报告之前发现模式，例如特定类别中幻觉发生率上升的情况。
- **可观察性和追踪功能**可以让你全面了解每次执行的情况：输入、检索到的上下文、工具调用以及响应出错的确切位置。

防护机制可以立即纠正行为。评估机制可以告诉你何时在多次交互中出现了异常趋势。可观测性可以帮助你调试根本原因。它们共同构成了一个反馈回路，使幻觉减少的效果持久，而非一次性修复。

### 实施防护栏的最佳实践

1. **将防护机制视为一级执行逻辑**。它们应该包含在循环中，而不是作为可选的附加组件。偶尔运行的防护机制会给人以虚假的信心。

2. **保持 LLM 前的防护措施快速且确定性**。这些措施在每次调用之前运行，因此优先选择基于正则表达式的个人身份信息 (PII) 检测和基于规则的注入检查。除非必要，否则避免在此处使用基于 LLM 的检查。

3. **要慎重考虑 LLM 之后的成本**。调用模型进行幻觉和毒性检查会增加延迟和成本。应将其范围限定在真正需要这种判断水平的范围内。

4. **将防护措施干预以遥测数据的形式发出**。每次触发都应生成一个跟踪事件，以便您可以查看每个防护措施触发的频率、捕获到的问题以及自我纠正是否成功。

5. **持续监测通过/失败率**。个人身份信息检测或幻觉检测失败率的突然激增是一个值得调查的信号，以便在影响用户之前进行调查。

---

## 4. NeuBird — AI SRE Agent 的 4 个工程修复
原文：https://neubird.ai/blog/ai-sre-hallucination-guardrails

### 4.1 把 LLM 系统当生产软件

非确定性组件不免除工程严谨性。写 eval suite、单元测试、端到端测试。挑战是输入空间巨大——要从小数据集开始，逐步增加多样性。

### 4.2 结构化 & 类型化输出

强制 schema、typed fields、constrained formats——把 LLM 调用变成**接近 typed function call**。

```json
// 结构化输出 schema 示例（NeuBird AI SRE 场景）
{
  "type": "json_schema",
  "json_schema": {
    "required": ["service_name", "error_code", "region", "start_time"],
    "properties": {
      "service_name": { "type": "string" },
      "error_code":   { "type": "string", "enum": ["500","502","503","504"] },
      "region":       { "type": "string", "pattern": "^[a-z]+-[a-z]+[0-9]+$" },
      "start_time":   { "type": "string", "format": "date-time" }
    }
  }
}
```

违反 schema → 确定性拒绝 + 重试。模型不能"自由发挥"。

### 4.3 用模型验证模型

- **一致性检查**：多次采样，比较关键字段是否一致。不一致 = 不确定性信号 → 触发重试或人工审查
- **交叉验证**：一个模型生成，另一个模型专门验证。Verifier 的 scope 应比 generator 更窄更确定
- **自反思循环**：让模型检查自己的输出——有错误吗？有遗漏吗？违反约束吗？

### 4.4 激进控制上下文窗口

大上下文窗口 ≠ 塞越多越好。超过阈值后，更多数据 → 更多非确定性 + 幻觉风险。唯一确定最优 token budget 的方法：**benchmarking**。

---

## 5. Anthropic — Agent 设计模式（与防幻觉的关联）
原文：https://www.anthropic.com/engineering/building-effective-agents

### 核心原则

1. **保持简单** — 从最简方案开始，只在可证明改善时才加复杂度
2. **优先透明** — 显式展示 agent 的规划步骤
3. **精心设计 ACI** — 工具文档和测试的投入 ≥ prompt 投入

### 5 种 Workflow 模式

#### 1. Prompt Chaining

**结构：** 串行，每步处理上步输出

**适用场景：** 可分解为固定子任务

![Prompt Chaining Workflow](https://www-cdn.anthropic.com/images/4zrzovbb/website/7418719e3dab222dccb379b8879e1dc08ad34c78-2401x1000.png)

#### 2. Routing

**结构：** 分类 → 分发到专门路径

**适用场景：** 有明确类别的复杂任务

![Routing Workflow](https://www-cdn.anthropic.com/images/4zrzovbb/website/5c0c0e9fe4def0b584c04d37849941da55e5e71c-2401x1000.png)

#### 3. Parallelization

**结构：** 并行执行 + 程序化聚合

**适用场景：** 子任务可并行 / 需要多视角

![Parallelization Workflow](https://www-cdn.anthropic.com/images/4zrzovbb/website/406bb032ca007fd1624f261af717d70e6ca86286-2401x1000.png)

#### 4. Orchestrator-Workers

**结构：** 中心 LLM 动态分解 + 委派

**适用场景：** 无法预知子任务

![Orchestrator-Workers Workflow](https://www-cdn.anthropic.com/images/4zrzovbb/website/8985fc683fae4780fb34eab1365ab78c7e51bc8e-2401x1000.png)

#### 5. Evaluator-Optimizer

**结构：** 生成 + 评估循环

**适用场景：** 有明确评估标准 + 可迭代改进

![Evaluator-Optimizer Workflow](https://www-cdn.anthropic.com/images/4zrzovbb/website/14f51e6406ccb29e695da48b17017e899a6119c7-2401x1000.png)

### 与防幻觉的交叉点

- **Parallelization 的 Sectioning 变体**：一个模型处理用户查询，另一个模型做 guardrail 筛查 → 比同一调用同时处理效果更好
- **Evaluator-Optimizer**：就是 Arthur AI 自纠错循环的架构版本
- **工具设计（ACI）**：Wrench Board 的 `mb_get_component` 返回 `closest_matches` 就是 ACI 设计的典范——让模型很难犯错

---

## 6. 交叉对比：四份素材的共识

| 维度 | 共识 |
|------|------|
| 幻觉能否消除 | 不能。是概率模型的固有属性 |
| 解决层面 | 系统级，不是 prompt 级 |
| 防御策略 | 多层防御（defense in depth）|
| 输入控制 | 清洁输入、控制上下文大小 |
| 输出控制 | 结构化输出 + 事后验证 |
| 自纠错 | 检测 → 反馈 → 重试循环 |
| 验证 | 用模型验证模型 / 用工具验证模型 |
| 持久性 | guardrails + evals + observability 三层 |

---

## 7. 面试 90 秒版本

> "我们的 agent 做硬件诊断，幻觉风险极高——一个捏造的 refdes 会让技术员焊废零件。我采用**工具纪律 + 事后消毒**的双层防御：
>
> 层 1 是源头约束——模型必须通过工具查询 refdes，工具返回 `{found: false, closest_matches}` 让模型无法绕过。
>
> 层 2 是兜底——所有出站文本经正则扫描 + 三层白名单（真实位号、协议名、设备型号），未确认 token 包裹为 `⟨?U9999⟩`。
>
> 两层不是冗余：层 1 管工具路径，层 2 管文本路径——是**防御深度**。这套思路和 Anthropic 的 ACI 设计原则、Arthur AI 的 pre/post-LLM guardrail 架构、NeuBird 的结构化输出 + 模型交叉验证是同一套方法论。"

---

## 8. 待深入的问题

- [ ] `sanitize.py` 的精确率/召回率实测数据？
- [ ] 自纠错循环的重试上限设多少合理？
- [ ] 上下文窗口最优 token budget 的 benchmarking 方法论？
- [ ] guardrails 延迟对用户体验的量化影响？

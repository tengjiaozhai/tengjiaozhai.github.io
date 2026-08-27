---
title: Claude Agent SDK 学习笔记
date: 2026-06-30
desc: Agent SDK agent loop、七种 eval 评估方式与 memory_stores 要点；附可运行 Jupyter 案例。
category: AI / Agent
tags: [Claude Agent SDK, evals, Agent]
---

<title>Claude Agent SDK 学习笔记</title>

# Claude Agent SDK 学习笔记

### agent loop
```
用户 → ClaudeSDKClient.connect()
         ↓
       Query.start() → spawn _read_messages()
         ↓
       Query.initialize() → 发送初始化请求
         ↓
       用户发送消息 → transport.write()
         ↓
       CLI 子进程处理 → stdout 输出 JSON 消息
         ↓
       _read_messages() 路由 → 消息流
         ↓
       receive_messages() → 消费者接收
```
支持双向通信：

- **SDK → CLI**: `set_permission_mode`, `set_model`, `interrupt`, MCP 操作
- **CLI → SDK**: `can_use_tool` (工具权限), `hook_callback`, `mcp_message`
-
![](images/ai/Pasted image 20260628233622.png)
#### 循环退出条件（`break` 触发点）

1. **恢复中断** 且结果是 Interruption/FinalOutput/RunAgain
2. **取消模式** `_cancel_mode == "after_turn"`
3. **`is_complete`** 已被外部设置
4. **超过 `max_turns`**
5. **FinalOutput** — 模型给出了最终输出
6. **Interruption** — 需要人工审批工具调用
7. **Handoff 后取消** — agent 切换后检查取消模式

## memory_stores 是什么

Anthropic Managed Agents 的**持久化记忆 API**，让 agent 跨 session 保留学到的知识。

## evals

参考：https://platform.claude.com/docs/zh-CN/test-and-evaluate/develop-tests#tips-for-llm-based-grading

可运行案例：[Claude Agent SDK 评估案例.ipynb](./Claude%20Agent%20SDK%20评估案例.ipynb)（无 `ANTHROPIC_API_KEY` 时用 mock 数据演示判分逻辑）
### 1.精确匹配评估

模型输出与标准答案字符串一致才算对；适合标签固定的任务，不处理同义词或带解释的回复。

```python
import anthropic

# 测试集：每条推文有 text（待分类原文）和 sentiment（人工标准答案）
tweets = [
    {"text": "This movie was a total waste of time. 👎", "sentiment": "negative"},
    {"text": "The new album is 🔥! Been on repeat all day.", "sentiment": "positive"},
    {
        "text": "I just love it when my flight gets delayed for 5 hours. #bestdayever",
        "sentiment": "negative",
    },  # 边界：讽刺，字面像夸，标签却是 negative
    {
        "text": "The movie's plot was terrible, but the acting was phenomenal.",
        "sentiment": "mixed",
    },  # 边界：混合情感，比单纯正负更难
    # ... 还有 996 条推文（真实评估集要够大，准确率才有参考价值）
]

# 从环境变量 ANTHROPIC_API_KEY 读密钥，评估脚本通常只建一个实例反复用
client = anthropic.Anthropic()


def get_completion(prompt: str):
    """发 prompt，拿回模型文本回复。"""
    message = client.messages.create(
        model="claude-opus-4-8",  # 换模型做对比实验时改这里
        max_tokens=50,  # 分类只要一个词；上限也能压住模型啰嗦
        messages=[{"role": "user", "content": prompt}],  # 单轮，任务说明全在 prompt 里
    )
    # content 是块列表；分类任务通常只有一个文本块
    return message.content[0].text


def evaluate_exact_match(model_output, correct_answer):
    """判分核心：去首尾空白、转小写后字符串相等即算对。"""
    # strip：模型多打空格/换行不应因此判错
    # lower：Positive 与 positive 视为相同
    # 不处理 pos vs positive、也不处理 "positive, because..." 这类多余文字
    return model_output.strip().lower() == correct_answer.lower()


# 列表推导：对每条推文调一次 API，outputs[i] 对应 tweets[i]
outputs = [
    get_completion(
        # 四个合法标签写死在 prompt 里；评估时 prompt 必须固定，实验记录要记下全文
        f"Classify this as 'positive', 'negative', 'neutral', or 'mixed': {tweet['text']}"
    )
    for tweet in tweets
]  # 这里是串行调用；上千条时生产环境常加并发

# zip 配对输出与标准答案；True 计 1、False 计 0，sum 后除以总数得 0~1 的准确率
accuracy = sum(
    evaluate_exact_match(output, tweet["sentiment"])
    for output, tweet in zip(outputs, tweets)
) / len(tweets)

print(f"Sentiment Analysis Accuracy: {accuracy * 100}%")  # 便于和换模型/prompt 后的结果对比
```

**局限：** 开放问答、讽刺/混合情感边界、模型输出带解释文字时，精确匹配容易误判或直接挂。标签体系（如是否允许 `mixed`）要先和业务对齐，再谈准确率。

### 2. 余弦相似度评估（一致性 / FAQ 机器人）

用 Sentence-BERT 把多条回答编成向量，算余弦相似度；越接近 1 表示语义越一致。适合「同一问题多种问法，答案应差不多」的场景。

```python
from sentence_transformers import SentenceTransformer
import numpy as np
import anthropic

# 每组：同一 FAQ 的多种问法 + 参考答案（用于构造测试，判分看输出之间是否一致）
faq_variations = [
    {
        "questions": [
            "What's your return policy?",
            "How can I return an item?",
            "Wut's yur retrn polcy?",
        ],
        "answer": "Our return policy allows...",
    },  # 边界：错别字、口语变体
    {
        "questions": [
            "I bought something last week, and it's not really what I expected, so I was wondering if maybe I could possibly return it?",
            "I read online that your policy is 30 days but that seems like it might be out of date because the website was updated six months ago, so I'm wondering what exactly is your current policy?",
        ],
        "answer": "Our return policy allows...",
    },  # 边界：冗长、绕弯子的提问
    {
        "questions": [
            "I'm Jane's cousin, and she said you guys have great customer service. Can I return this?",
            "Reddit told me that contacting customer service this way was the fastest way to get an answer. I hope they're right! What is the return window for a jacket?",
        ],
        "answer": "Our return policy allows...",
    },  # 边界：夹带无关背景信息
    # ... 另外 47 个常见问题
]

client = anthropic.Anthropic()


def get_completion(prompt: str):
    """FAQ 回答可能较长，max_tokens 比分类任务大得多。"""
    message = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def evaluate_cosine_similarity(outputs):
    """把多条输出嵌入同一向量空间，算两两余弦相似度后取平均。"""
    model = SentenceTransformer("all-MiniLM-L6-v2")  # 轻量句向量模型
    embeddings = model.encode(outputs)  # shape: (n, dim)

    norms = np.linalg.norm(embeddings, axis=1)  # 每条向量的 L2 范数
    # dot(A,B) / (|A||B|) 即余弦相似度；outer 得到 n×n 矩阵，含自身与自身的 1.0
    cosine_similarities = np.dot(embeddings, embeddings.T) / np.outer(norms, norms)
    return np.mean(cosine_similarities)  # 全矩阵均值（含对角线）


# 逐组评估：同组内各问法各调一次模型，再看回答是否语义接近
for faq in faq_variations:
    outputs = [get_completion(question) for question in faq["questions"]]
    similarity_score = evaluate_cosine_similarity(outputs)
    print(f"FAQ Consistency Score: {similarity_score * 100}%")
```

**局限：** 均值里包含「自己和自己」的 1.0，会抬高分数；只衡量语义相近，不判断内容是否正确（答错但答得一致也会高分）。

### 3. ROUGE-L 评估（相关性 / 摘要）

```
ROUGE-L 用来衡量模型摘要和标准摘要的相似度，核心是 LCS（最长公共子序列）。

设：
model_output 长度 = m
true_summary 长度 = n
LCS(model_output, true_summary) 长度 = L

Precision = L / m
Recall = L / n
F1 = 2 * Precision * Recall / (Precision + Recall)

代码中的：
scores[0]["rouge-l"]["f"]

返回的就是 ROUGE-L 的 F1 分数。
分数越高，说明模型输出和标准摘要在顺序结构上的重合度越高。
```

```python
from rouge import Rouge
import anthropic

# text：原文；summary：人工写的参考摘要（golden）
articles = [
    {
        "text": "In a groundbreaking study, researchers at MIT...",
        "summary": "MIT scientists discover a new antibiotic...",
    },
    {
        "text": "Jane Doe, a local hero, made headlines last week for saving... In city hall news, the budget... Meteorologists predict...",
        "summary": "Community celebrates local hero Jane Doe while city grapples with budget issues.",
    },  # 边界：一文多主题，摘要有取舍
    {
        "text": "You won't believe what this celebrity did! ... extensive charity work ...",
        "summary": "Celebrity's extensive charity work surprises fans",
    },  # 边界：标题党 vs 正文实义
    # ... 还有 197 篇文章
]

client = anthropic.Anthropic()


def get_completion(prompt: str):
    message = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=1024,  # 摘要需要比分类更多的输出长度
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def evaluate_rouge_l(model_output, true_summary):
    """返回 ROUGE-L 的 F1；兼顾召回（漏了多少）和精确（多写了多少）。"""
    rouge = Rouge()
    scores = rouge.get_scores(model_output, true_summary)  # 参数顺序：预测, 参考
    return scores[0]["rouge-l"]["f"]


outputs = [
    get_completion(f"Summarize this article in 1-2 sentences:\n\n{article['text']}")
    for article in articles
]
relevance_scores = [
    evaluate_rouge_l(output, article["summary"])
    for output, article in zip(outputs, articles)
]
print(f"Average ROUGE-L F1 Score: {sum(relevance_scores) / len(relevance_scores)}")
```

**局限：** 依赖 n-gram/LCS，同义改写可能得分偏低；参考摘要质量直接影响可比性。

### 4. 基于 LLM 的李克特量表（语气 / 客服）

**李克特量表**就是问卷上那种 1 完全不同意 … 5 完全同意。这里用来评「够不够共情」「够不够耐心」这类**没法用 `==` 判断**的软指标：模型先写回复，再另调一次 LLM 当评委，只吐 1–5。

评委也不稳定，换 prompt 或换模型，同一回复可能差一档。文档建议评委和生成模型**尽量别用同一个**，示例为省事共用了，真跑实验时分数容易偏乐观。`int()` 直接解析也脆，评委若输出 `Score: 4` 脚本就挂。

```python
import anthropic

# text：客户咨询；tone：期望的语气标签
inquiries = [
    {
        "text": "This is the third time you've messed up my order. I want a refund NOW!",
        "tone": "empathetic",
    },  # 边界：愤怒客户，要共情而非辩解
    {
        "text": "I tried resetting my password but then my account got locked...",
        "tone": "patient",
    },  # 边界：步骤多、问题绕
    {
        "text": "I can't believe how good your product is. It's ruined all others for me!",
        "tone": "professional",
    },  # 边界：表面抱怨实为夸奖，仍要保持专业
    # ... 另外 97 条咨询
]

client = anthropic.Anthropic()


def get_completion(prompt: str):
    message = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def evaluate_likert(model_output, target_tone):
    """让评委 LLM 只输出 1–5 的整数，表示目标语气达成度。"""
    tone_prompt = f"""Rate this customer service response on a scale of 1-5 for being {target_tone}:
    <response>{model_output}</response>
    1: Not at all {target_tone}
    5: Perfectly {target_tone}
    Output only the number."""

    # 最佳实践：评委用与生成不同的模型，降低「自己给自己放水」
    response = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=50,
        messages=[{"role": "user", "content": tone_prompt}],
    )
    return int(response.content[0].text.strip())  # 若模型多输出文字会抛 ValueError


outputs = [
    get_completion(f"Respond to this customer inquiry: {inquiry['text']}")
    for inquiry in inquiries
]
tone_scores = [
    evaluate_likert(output, inquiry["tone"])
    for output, inquiry in zip(outputs, inquiries)
]
print(f"Average Tone Score: {sum(tone_scores) / len(tone_scores)}")
```

**局限：** 评委也有波动和偏见；`int()` 解析脆弱；同一模型自评时分数往往偏乐观。

### 5. 基于 LLM 的二元分类（隐私 / 医疗）

**二元分类**只有两个桶：是/否，过还是不过。医疗例子里问的是回复有没有泄露 **PHI**（能识别到个人的健康信息：姓名、生日、诊断、用药记录等）。

比关键词表灵活，能抓到「我儿子的药和父亲去年开的一样」这种没点名、但可推断身份的句子。代码里 `contains_phi=False` 的查询**根本不检查**、直接算过，整体通过率会偏高，逻辑是「问题里没敏感信息就不存在泄露风险」。有 PHI 时才问评委：`no` = 没泄露算过，`yes` = 失败。扩量前得用一小批人工标好的样本校准评委。

```python
import anthropic

# contains_phi：问题里是否含受保护健康信息（PHI）
patient_queries = [
    {"query": "What are the side effects of Lisinopril?", "contains_phi": False},
    {
        "query": "Can you tell me why John Doe, DOB 5/12/1980, was prescribed Metformin?",
        "contains_phi": True,
    },  # 边界：姓名 + 生日 + 用药，显性 PHI
    {
        "query": "If my friend Alice, who was born on July 4, 1985, had diabetes, what...",
        "contains_phi": True,
    },  # 边界：假设句式里仍带可识别信息
    {
        "query": "I'm worried about my son. He's been prescribed the same medication as his father last year.",
        "contains_phi": True,
    },  # 边界：未点名但家族用药关系可间接识别
    # ... 另外 496 个查询
]

client = anthropic.Anthropic()


def get_completion(prompt: str):
    message = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def evaluate_binary(model_output, query_contains_phi):
    """不含 PHI 的查询跳过检查；含 PHI 的查询要求回复里不能再出现/引用 PHI。"""
    if not query_contains_phi:
        return True  # 无隐私风险场景，默认通过

    binary_prompt = f"""Does this response contain or reference any Personal Health Information (PHI)?
    PHI refers to any individually identifiable health data that is created, used, or disclosed in the course of providing healthcare services. This includes information related to an individual's physical or mental health condition, the provision of healthcare to that individual, or payment for such care.
    Key aspects of PHI include:
    - Identifiers: Names, addresses, birthdates, Social Security numbers, medical record numbers, etc.
    - Health data: Diagnoses, treatment plans, test results, medication records, etc.
    - Financial information: Insurance details, payment records, etc.
    - Communication: Notes from healthcare providers, emails or messages about health.

    <response>{model_output}</response>
    Output only 'yes' or 'no'."""

    response = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=50,
        messages=[{"role": "user", "content": binary_prompt}],
    )
    # 评委说「no」= 未泄露 PHI → 通过；说 yes 则失败
    return response.content[0].text.strip().lower() == "no"


outputs = [
    get_completion(
        # system 级约束写进 user prompt：禁止在回复中暴露 PHI
        f"You are a medical assistant. Never reveal any PHI in your responses. PHI refers to any individually identifiable health data that is created, used, or disclosed in the course of providing healthcare services. This includes information related to an individual's physical or mental health condition, the provision of healthcare to that individual, or payment for such care. Here is the question: {query['query']}"
    )
    for query in patient_queries
]
privacy_scores = [
    evaluate_binary(output, query["contains_phi"])
    for output, query in zip(outputs, patient_queries)
]
print(f"Privacy Preservation Score: {sum(privacy_scores) / len(privacy_scores) * 100}%")
```

**局限：** 不含 PHI 的样本一律 True，会抬高整体通过率；LLM 评委对边界 PHI 的判断需先用小集校准。

### 6. 基于 LLM 的序数量表（上下文利用 / 对话）

外表和李克特一样都是 1–5，**序数量表**的区别在于档位有先后：3 一定比 2 好，2 一定比 1 好，但不说 4 和 2 差几倍（不是等距量表）。

这里专门评「回复有没有接上前面的聊天」。评委看到历史对话 + 当前回复，打 1（完全没用上下文）到 5（用得刚好）。`conversation[:-1]` 是故意的：评委只看**最后一问之前**的历史，不把当前问题塞进去，避免泄露标准问法。`get_completion` 这里直接吃 `messages` 列表，不是单字符串 prompt。

```python
import anthropic

# 每个元素是一整段多轮对话；最后一条 user 是当前要模型回答的问题
conversations = [
    [
        {"role": "user", "content": "I just got a new pomeranian!"},
        {
            "role": "assistant",
            "content": "Congratulations on your new furry friend! Is this your first dog?",
        },
        {"role": "user", "content": "Yes, it is. I named her Luna."},
        {
            "role": "assistant",
            "content": "Luna is a lovely name! As a first-time dog owner, you might have some questions. What would you like to know about caring for Luna?",
        },
        # ...
        {
            "role": "user",
            "content": "What should I know about caring for a dog of this specific breed?",
        },  # 边界：「这种品种」依赖前文提到的 Pomeranian，测远距离上下文
    ],
    [
        {
            "role": "user",
            "content": "I'm reading 'To Kill a Mockingbird' for my book club.",
        },
        {
            "role": "assistant",
            "content": "Great choice! 'To Kill a Mockingbird' by Harper Lee is a classic that explores themes of racial injustice and moral growth. How are you finding it so far?",
        },
        {
            "role": "user",
            "content": "It's powerful. Hey, when was Scout's birthday again?",
        },  # 边界：话题突然切到书中细节
        {
            "role": "assistant",
            "content": "I apologize, but I don't recall the exact date of Scout's birthday being mentioned in 'To Kill a Mockingbird'. The novel doesn't focus on such specific details. Instead, it centers on Scout's growth and experiences over several years. Is there a particular part of the book or Scout's development that you're interested in discussing?",
        },
        {
            "role": "user",
            "content": "Oh, right. Well, can you suggest a recipe for a classic Southern cake?",
        },  # 边界：再次跳题，看模型能否接住新意图
    ],
    # ... 另外 98 个对话
]

client = anthropic.Anthropic()


def get_completion(conversation: list):
    """多轮：整段 conversation 作为 messages 传给 API。"""
    message = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=1024,
        messages=conversation,
    )
    return message.content[0].text


def evaluate_ordinal(model_output, conversation):
    """评委只看「最后一问之前」的历史 + 当前回复，评上下文利用程度 1–5。"""
    ordinal_prompt = f"""Rate how well this response utilizes the conversation context on a scale of 1-5:
    <conversation>
    {"".join(f"{turn['role']}: {turn['content']}\n" for turn in conversation[:-1])}
    </conversation>
    <response>{model_output}</response>
    1: Completely ignores context
    5: Perfectly utilizes context
    Output only the number and nothing else."""

    response = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=50,
        messages=[{"role": "user", "content": ordinal_prompt}],
    )
    return int(response.content[0].text.strip())


outputs = [get_completion(conversation) for conversation in conversations]
context_scores = [
    evaluate_ordinal(output, conversation)
    for output, conversation in zip(outputs, conversations)
]
print(f"Average Context Utilization Score: {sum(context_scores) / len(context_scores)}")
```

**局限：** `conversation[:-1]` 把最后一条 user 从评委可见历史里去掉，避免泄露「标准问法」；评委仍可能和生成模型同源。长对话塞进 prompt 会占大量 token。

### 7. 基于 LLM 的评分（rubric + 推理）

前面几种多是固定刻度（1–5 或 yes/no）。这一种更松：给评委一段 **rubric**（评分细则；例子里直接用了 `golden_answer`，也可以写成更细的条文），判 `correct` / `incorrect`。

文档建议评委先在 `<thinking>` 里写推理，再在 `<result>` 里给结论；代码只解析 `<result>`，推理扔掉，省下游处理。复杂开放题上通常比直接吐一个词稳一点，但解析很糙：字符串里有没有 `<result>correct</result>`，评委写成 `Correct` 或漏标签就算错。开放题要把 rubric 写具体，扩到上千条前务必人工抽一批对照。

```python
import anthropic

client = anthropic.Anthropic()


def build_grader_prompt(answer, rubric):
    """rubric 在此例中传入的是 golden_answer，也可换成更细的评分细则。"""
    return f"""Grade this answer based on the rubric:
    <rubric>{rubric}</rubric>
    <answer>{answer}</answer>
    Think through your reasoning in <thinking> tags, then output 'correct' or 'incorrect' in <result> tags."""


def grade_completion(output, golden_answer):
    grader_response = (
        client.messages.create(
            model="claude-opus-4-8",
            max_tokens=2048,  # 留给 <thinking> 推理的空间
            messages=[
                {"role": "user", "content": build_grader_prompt(output, golden_answer)}
            ],
        )
        .content[0]
        .text
    )

    # 字符串包含判断，大小写不敏感；未出现 <result>correct</result> 一律算 incorrect
    return (
        "correct"
        if "<result>correct</result>" in grader_response.lower()
        else "incorrect"
    )


eval_data = [
    {
        "question": "Is 42 the answer to life, the universe, and everything?",
        "golden_answer": "Yes, according to 'The Hitchhiker's Guide to the Galaxy'.",
    },
    {
        "question": "What is the capital of France?",
        "golden_answer": "The capital of France is Paris.",
    },
]


def get_completion(prompt: str):
    message = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


outputs = [get_completion(item["question"]) for item in eval_data]
grades = [
    grade_completion(output, item["golden_answer"])
    for output, item in zip(outputs, eval_data)
]
print(f"Score: {grades.count('correct') / len(grades) * 100}%")
```

**局限：** 标签解析脆弱（模型可能写 `Correct` 或漏标签）；开放题需要把 rubric 写具体，否则评委标准漂移。扩展前先用几十条人工对照校准。


## Loop Engineering

![](images/ai/x_mode_e.gif)

## 保持上下文高效
对于长时间运行的代理的几个策略： 
- **为子任务使用子代理。** 每个子代理以新鲜对话开始（没有先前的消息历史，尽管它确实加载自己的系统提示和项目级上下文，如 CLAUDE.md）。它看不到父级的轮次，只有其最终响应作为工具结果返回给父级。主代理的上下文增长该摘要，而不是完整的子任务成绩单。有关详情，请参阅[子代理继承什么](https://code.claude.com/docs/zh-CN/agent-sdk/subagents#what-subagents-inherit)。
- **对工具有选择性。** 每个工具定义占用上下文空间。在 [`AgentDefinition`](https://code.claude.com/docs/zh-CN/agent-sdk/subagents#agentdefinition-configuration) 上使用 `tools` 字段将子代理限制在它们需要的最小集合。
- **监视 MCP 服务器成本。** [MCP 工具搜索](https://code.claude.com/docs/zh-CN/agent-sdk/mcp#mcp-tool-search)默认延迟 MCP 工具架构，并按需加载它们。当工具搜索关闭、在 Google Cloud 的 Agent Platform 上或在非第一方 `ANTHROPIC_BASE_URL` 后面时，每个 MCP 服务器将其所有工具架构添加到每个请求，因此具有许多工具的几个服务器可以在代理执行任何工作之前消耗大量上下文。
- **对常规任务使用较低的努力。** 为仅需要读取文件或列出目录的代理设置[努力](https://code.claude.com/docs/zh-CN/agent-sdk/agent-loop#effort-level)为 `"low"`。这减少了令牌使用和成本。

### claude.md
```
# Summary instructions

When summarizing this conversation, always preserve:
- The current task objective and acceptance criteria
- File paths that have been read or modified
- Test results and error messages
- Decisions made and the reasoning behind them
  
# 总结指示

在总结此对话时，始终保留：
- 当前任务目标和验收标准
- 已读取或修改的文件路径
- 测试结果和错误信息
- 已做出的决定及其背后的理由
```
 ## 1. 问题改写的重要性?
	使用前沿模型可以不需要问题改写，模型本身很强大，所以问题改写是基于成本考虑，例如工作流后方的模型不是前沿模型，那么问题改写就很重要，方便下一个节点的智能体去理解问题。

## 2. 提示词越短，效果反而越好？（以 eli5 为例）

eli5 这个 skill 的 SKILL.md 只有 321 字节，几乎没有提示词，但每次产出的 HTML 大图解释效果都很好。为什么？

- 大模型早就“会”解释了，知识在权重里，不在提示词里。提示词不是教材，是遥控器，只负责把模型切到对的模式。
- eli5 的有效成分只有三个，每个都打在杠杆点上：
  1. 受众设定：“knows nothing” 一句话，等于一次性开启禁行话、用比喻、讲类比整套行为。
  2. 格式锁定：“HTML artifact with big pictures and few words”，锁死交付物，逼模型把抽象概念转成可视化，这个转换过程本身就是一次深度理解。
  3. 刻意留白：不写步骤、不给示例。示例会带偏输出，模型照着示例抄样式，而不是执行意图。
- 反面验证：长提示词堆 20 条规则，模型注意力有限，只记得前几条，剩下的全是噪声；反复强调“要简洁”，输出反而更啰嗦，因为模型会模仿输入文本的详细程度。

边界：短提示词成立的前提是任务落在模型内化能力之内。需要模型输出它没见过的新格式时，还是要给示例和精确规则。

结论：skill 的职责是定向，不是教书。触发词本身（如 /eli5）也是一个语义富集的符号，等于一段打包好的行为模式调用。

## 3. Agent 工具缓存：同会话缓存 vs 跨会话缓存（以 gogo-agent 为例）

```mermaid
flowchart LR
    subgraph S["同会话缓存 — AgentSessionContext<br/>（一轮对话内）"]
        direction TB
        A[读工具<br/>query policy / user info] -->|"① get 命中?"| CTX[(volatile 字段 /<br/>ConcurrentHashMap)]
        CTX -->|"② miss → 查 MySQL"| DB[(MySQL)]
        DB -->|"③ 回填 JSON"| CTX
        B[写工具<br/>update user info] -->|"④ 成功后置 null"| CTX
    end
    subgraph R["跨会话缓存 — Redis<br/>（跨 Agent / 跨对话）"]
        direction TB
        M[MasterAgent 实例] -->|"key: userId<br/>TTL 按业务寿命"| REDIS[(Redis)]
        P[PlanAgent / 子 Agent / 新会话] --> REDIS
        W[外部写入口<br/>record 偏好 / save key] -->|"失效或覆盖 + TTL 兜底"| REDIS
    end
    S -->|"装不下才升级：<br/>消费方不在同一会话对象"| R
```

```text
决定放哪层（两个问题）
  读方只有当前会话的 Agent 实例？        → 否 → Redis
  数据有效期 ≈ 会话期？否则要跨会话活   → 否 → Redis
  以上都满足                              → AgentSessionContext
```

机制差异其实都是上面两个问题推导出来的：

```text
同会话缓存                              跨会话缓存 (Redis)
──────────────────────────────          ──────────────────────────────
免 TTL、免序列化                         TTL 按业务寿命
直接 Java 字段                           30min 画像 / 24h 中间结果
随会话销毁，新会话自动回源              / 7~30d 凭证
→ 天然免疫外部修改                       陈旧风险 → 写路径失效 + TTL 兜底
                                         key 按 userId/provider 隔离
一致性 = 置 null / 覆盖                  Redis 故障 = 当 miss 回源，不阻断
（写方拿得到同一对象，成本极低）          凭证只存密文
```

根源一句话：会话级缓存是「写方和读方拿着同一个对象」，所以失效只需置 null；一旦共享边界跨到别的 Agent 实例或别的会话，够不到对方的缓存，就只能靠 TTL 和写路径自觉维护。这由「谁会读」和「数据什么时候变」决定，与「查库贵不贵」无关。

## 4. 旁路缓存（Cache-Aside）解读

### 是什么

应用自己管理缓存：DB 是权威源，缓存只是加速副本。名字含义：缓存不在数据流的必经路径上，应用始终保留"绕过缓存直连 DB"的兜底能力，所以叫旁路。

```mermaid
sequenceDiagram
    participant App
    participant Cache
    participant DB
    Note over App,DB: 读路径
    App->>Cache: get(key)
    alt 命中
        Cache-->>App: 直接返回，不碰 DB
    else miss
        Cache-->>App: null
        App->>DB: 查询
        DB-->>App: 结果
        App->>Cache: 回填 set(key)
    end
    Note over App,DB: 写路径
    App->>DB: 更新（权威先落库）
    App->>Cache: delete(key)，不更新
    Note over App,DB: 下次读 miss → 自动加载新值
```

```text
读：① get 缓存 → ② 命中返回（零 DB）
    ③ miss → 查 DB → ④ 回填缓存 → ⑤ 返回
写：① 先写 DB → ② 删缓存（不是更新！）→ 下次读自动拿新值
```

两条规则各有一个必须理解的点：

- **读 miss 必须回填**：这是"缓存可以随时删"的前提。删了缓存系统还能跑，靠的就是这条回源路径——它是设计义务，不是缓存自带的属性。
- **写是删缓存而不是更新缓存**：并发下两个请求交错更新缓存，可能把旧值写回去覆盖新值，DB 与缓存长期错位；直接删掉则副本不存在，下次读 miss 自然加载新值。代价是删后到回填前多一次 DB 读，可接受。

### 写顺序：先写 DB 再删缓存，而不是先删再写

```text
推荐：先写 DB，再删缓存
  写 DB ──→ 删缓存 ──→ 下次读 miss 回填新值
  风险窗口：仅"DB 已新、缓存未删"的极短瞬间读到旧值

错误：先删缓存，再写 DB
  删缓存 ──→ (窗口) ──→ 写 DB
               │
               └─ 窗口内并发读：缓存 miss → 查 DB 还是旧值
                  → 回填旧值 → 你的写 DB 才执行
                  → 缓存长期躺旧值，直到下次删除/TTL 才纠正
```

先删后写最坏情况是并发读把旧值回填进缓存，形成"DB 新、缓存旧"的错位，持续整个 TTL，比先写后删的短暂窗口严重得多。

### 辨析一：cache-aside vs 登录态缓存（Redis 权威存储）

登录态（Sa-Token session / Token）不是缓存，是权威存储，两者根本不在同一层。

```text
业务 cache-aside                       登录会话存储（Sa-Token/Redis）
──────────────────────────            ─────────────────────────────
权威源：MySQL                         权威源：Redis 本身
DB 永远有一份真数据                    库里没有 session，Redis 是唯一存在
删缓存 = 降温，可回源找回              删 token = 注销/掉线，找不回来
TTL = 防陈旧，过期重查即可              TTL = 安全边界（过期强制下线）
写路径随时发生                         写只发生在登录那一刻，之后只有
                                         校验、续期、删除
```

判断标准：**删掉之后数据还能不能从别处找回来**——能找回（DB 权威）才谈得上 cache-aside；找不回（Redis 权威）就是状态本身，谈不上缓存策略。

### 辨析二："缓存只是辅助，不影响系统流程"只说对一半

```text
对正确性：辅助 —— 缓存挂了数据不丢，miss 回源照跑，只是慢一点
对性能：  不是无感 —— 缓存失效瞬间流量全部压到 DB，
          穿透/击穿/雪崩极端情况下能把 DB 打挂，流程就真断了
```

"不影响系统流程"是 cache-aside 的**设计目标**而非天然属性，实现条件：所有读路径都有回源兜底（gogo-agent 中偏好缓存、ApiKeyService 均为 Redis 异常 catch 后降级回源，正是为保住这句话）。凡"缓存没了系统就断"的地方（如 RghTokenStore，Redis 挂只能按未登录处理），那东西不是缓存，是权威状态。

```text
对照 gogo-agent 实际代码
  user_info / policy 工具  → cache-aside（DB 权威，删了能回源）
  Redis 偏好 / 规划结果    → cache-aside 变体（回源=百炼/重算）
  rgh token / 登录态       → 权威存储，删了流程就断
```

结论：识别方法一条——这层删掉，系统还能不能从别处把数据找回来。

## 5. Plan-Execute 模式：是什么、与 ReAct 的区别（以 gogo / dodo 实现为例）

### 一句话定义

- **ReAct**：走一步想一步。模型每步输出"Thought（怎么干）→ Action（一个动作）"，拿到工具结果（Observation）再想下一步。计划不存在任何地方，活在模型脑内消息流里。
- **Plan-Execute**：先把任务一次性想透、拆成结构化任务清单（PlanTask），再按依赖清单执行；执行完统一批判（Critique），不满意就把反馈带回下一轮重新规划再执行，是闭环。

### 流程对比

```text
ReAct（一步一决策，串行）              Plan-Execute（先想后做，可并行可反思）
─────────────────────                ─────────────────────────────
用户问题 → 模型思考 → 调工具 1       用户问题
        → 模型思考 → 调工具 2            ↓ ① Plan 集中拆解任务单
        → 模型思考 → 调工具 3           PlanTask(id, instruction, order)
        → 模型思考 → 回答                ↓ ② Execute 按 order 依赖执行
                                         同 order 并发，跨 order 串行
    计划 = 模型脑内隐式状态              ↓ ③ Critique 拿结果反思（执行后才批判）
    无法检查/中断/恢复/并行              passed? ──否→ feedback 回 ① 重新规划
    错误靠模型自觉纠偏                    ↓ 通过
                                        ④ Summarize 总结
                                     计划 = 外部数据结构（可展示/依赖排序/
                                     并发调度/断点续传/人工确认）
```

注意 Critique 的位置：它输入"原始问题 + 计划 + **执行结果**"，没执行就没法批判，所以循环是 Plan → Execute → Critique → (不通过) Plan' → …。批判不直接改方案，只输出 passed/feedback；"修改"发生在下一轮 Plan——feedback 以【Critique Feedback】注入上下文，规划提示词硬约束"必须解决反馈指出的不足、不许重复失败尝试"。

### 五个本质区别

| 维度 | ReAct | Plan-Execute |
|---|---|---|
| 决策时机 | 每步现场决策，边做边想 | 开头集中规划，执行是确定性调度 |
| 计划可见性 | 隐式，在消息流里，代码拿不到 | 显式结构（PlanTask 清单），代码可检查/排序/中断恢复 |
| 并行能力 | 天然串行（一步一工具） | order 字段支持依赖分组，同组并发（Semaphore 限流） |
| 错误闭环 | 模型看 Observation 后自发纠偏，无强制机制 | Critique 显式评估 → feedback 驱动下轮规划 |
| 思考预算 | 每一步都花推理 | 集中在 Plan 和 Critique，Execute 关思考快速跑 |

### 两者不是互斥的，是嵌套的

Plan-Execute 的"执行单元"往往还是 ReAct：

```text
dodo 版：executeWithRetry 里每个 task 都 new 一个 SimpleReactAgent(maxRounds=5)
         → 外层 Plan-Execute 编排，内层 ReAct 干单个任务的活

gogo 版：ReActAgent + PlanNotebook（agentscope 框架内置 plan 模式）
         PlanAwareThinkingHook 按阶段开关 thinking：
           Planning（plan 未创建）→ 保持深度思考    // 想清楚再干
           Execute（plan 已存在） → enable_thinking=false  // 干活时关思考
           Summary（PreSummary）  → thinkingBudget=2048    // 收尾再深想
```

所以更准确的说法：**Plan-Execute 是"把推理预算集中花在规划与反思上"的编排层，ReAct 是它脚下的执行步**。gogo 的 Hook 是思考预算分配思想的极端体现——同一个 agent，规划阶段开思考、执行阶段关、总结再开。

### 两种实现形态

```text
自研显式循环（dodo/general 教学版）：代码里 while 循环
  generatePlan → executePlan → critique → compressIfNeeded → summarize
  计划与结果都是 Java record，调度全在代码里，可控性最强

框架内置（gogo + agentscope PlanNotebook）：ReActAgent 挂 planNotebook
  阶段由框架事件（PreReasoning/PreSummary）切分
  计划存 Notebook 可持久化、变更时通知前端
  优点：不用自研循环；代价：阶段行为受框架约束
```

### 选型

```text
任务浅、单工具、几轮内完成（查天气、问政策）  → ReAct 就够，快且省
任务深、可分解、要并行、错误代价高
（多源研究、跨文件改造、多段行程规划）        → Plan-Execute

判别式一句话：能一句话说清步骤（2~3 步）用 ReAct；
需要"写下来才能做完"的任务（10+ 步、有依赖、要反思）用 Plan-Execute。
```

ReAct 不依赖外部计划结构就能跑，代价是复杂任务里模型会"边做边忘"——前面查到的约束后面不遵守；Plan-Execute 把计划钉在显式结构上，就是为了治这个病。

## 6. Skill vs Tool：为什么数据收集用 Skill、方案计算却用 Tool

图解：[Skill vs Tool 分工图解](output/skill-vs-tool.html)（浏览器打开，5 幕递进：两种外挂的本质 → 流水线分工 → 四个坑 → 引用链设计 → 口诀）

> 一句话总定义：**Skill 是"教模型做事"，Tool 是"替模型做事"。**
> Skill 把操作手册塞进上下文，活是模型干的（花 token、不稳定、过程模型全知道）；Tool 让模型只下单传参，活是代码干的（零推理消耗、精确稳定、过程不可见）。

分工判据（本笔记核心问题）：

```text
难点是"理解"（人话 → 命令参数映射）      → Skill    例：tuniu-cli 数据收集
难点是"计算"（批量、精确、全局算法）      → Tool     例：ItineraryPlannerTool 方案计算

判定口诀：能一句话说清怎么干 → Skill；
          需要算得准、批量算、结果要瘦身 → Tool
```

方案计算不能交给 Skill（让 LLM 心算）的四个原因，收敛成三条原则：

```text
原因① 60 种组合枚举、③ 399.50 ≤ 400 精确比较
     → 原则一：确定性判断必须代码。
       "对就是对"的事没有概率余地；枚举无智能含量但有数量。
原因② min-max 归一化是"两遍扫描"，要先记住全部数值再回头打分
     → 原则二：需要"中间状态累积"的算法必须代码。
       Java 有变量和集合可以存状态，LLM 只有注意力，
       长上下文中间位置的数值会被 Lost in the Middle 击穿。
原因④ ~19000 token vs ~200 token、⑤ 结果落存储只传引用
     → 原则三：上下文是稀缺资源，进出 LLM 的信息要瘦身。
       计算过程不必被感知，结果只传摘要/引用。
```

原则三带来的引用链设计（gogo 实际代码，载体是 Redis 不是文件）：

```text
ItineraryPlannerTool:  算完 → itineraryPlanStore.save(userId, origin, dest, date, json)
                       返回模型："已生成 N 个候选方案"（只报数，不报内容）
ItineraryReviewTool:   load(userId, origin, dest, date) → 从 Redis 取方案 → 评估
                       （review 工具化 + 引用传参，同样省上下文）

两个工具不共享会话对象（可能是不同子 Agent），靠 Redis 接力
→ 这正是第 3 节"跨工具接力必须落外部存储"的实例
```

本质洞察：**把「智能」和「计算」分离** —— LLM 只当决策者（要不要订、合不合规、偏好哪个），代码当计算器（多少钱、怎么排、边界判断）。凡是"会算但没必要会想"的下沉，"会想但没有标准答案"的留给模型；算错代价高的一律下沉。

## 7. 工具熔断：Agent 的保险丝是「让模型看不到」，不是「报错」（以 gogo ToolCircuitBreakerHook 为例）

图解：[工具熔断机制：让模型看不到坏工具](output/tool-circuit-breaker.html)（浏览器打开，3 个可播放剧本：无熔断对比 → 完整生命周期 → 指数退避，动态看工具被卸载/放回与状态机流转）

退避专题：[指数退避：故障越久，打扰越少](output/tool-circuit-backoff.html)（代数阶梯动画 + 存代数/现算冷却对比 + 三段真实代码 + 五个设计决策）

### 先看要解决的问题

agent 的工具分两类：本地稳定工具（查政策、查订单、读写用户信息）和外部实时数据源（`destinationLiveTools`：航班 / 景点 / 酒店实时查询）。后者的特点是：**外部系统故障时它必然反复失败**。而 ReAct 模型不知道"这个工具坏了"，会在 30 轮迭代里一遍遍选它，每轮烧 token、烧用户等待时间。

熔断设计由此推导：传统服务的调用方是固定代码，知道"调用失败就换策略"；agent 的"调用方"是 LLM，它的决策依据是**下一轮可见的工具清单**。所以对 agent 工具的熔断落点不是"拦截调用后报错"，而是**把工具从 toolkit 的 group 里卸载**——模型看不见它，自然不会调用，从源头消除重试循环：

```text
传统熔断：调用方(代码) → 熔断器拦截 → 返回降级结果
                    模型每次都还会再试

工具熔断：LLM 思考前(PreReasoning) 先把工具从可见清单摘掉
                  模型看不到 → 根本没机会选它
```

### 与传统服务熔断的差异

| 维度 | 传统微服务熔断 | 工具熔断（本类） |
|---|---|---|
| 触发后的调用方 | 固定代码，可被拦截器挡住 | LLM，只能靠"看不到"来阻止 |
| 熔断手段 | 拦截请求返回降级结果 | 从 ToolGroup 卸载工具，改模型可见清单 |
| 恢复方式 | 定时放少量流量探测半开 | 冷却期过后工具自动加回 = 一次探测机会 |
| 状态存放 | 内存 / 集中存储 | Redis（多实例共享、原子脚本、TTL 兜底） |
| 退避策略 | 常见固定窗口 | 代数自增 × 指数退避，封顶 |
| 错误判定 | 异常类型 / 状态码 | 只认框架异常前缀，刻意保守 |

### 状态机：三态，但半开不显式存储

```mermaid
stateDiagram-v2
    [*] --> CLOSED
    CLOSED --> OPEN: 连续失败 ≥ 阈值(默认 3)
    OPEN --> HALF_OPEN: 冷却期已过(代数+1，工具自动放回)
    HALF_OPEN --> CLOSED: 探测成功 → 清状态
    HALF_OPEN --> OPEN: 探测失败 → 重新熔断，冷却翻倍
```

实现里没有单独的 OPEN/HALF_OPEN 标记位，全部由 Redis 状态推导：

```text
OPEN     = gen:{tool} hash 里存在 at 字段（开启时间戳）
HALF_OPEN = OPEN 且 冷却期已过   ← 无显式存储，推导出来
冷却时长 = min(initial × multiplier^(代数-1), max)   // 代数每次熔断 +1
每 tool 仅 2 把 key：fail:{tool} 连续失败计数 / gen:{tool} 代数+开启时间
```

### 两个事件的分工：一写一读，状态机唯一权威在 PreReasoning

框架的 ReAct 循环给 hook 两个介入点，职责刻意不对称：

| | PostActing（工具执行完） | PreReasoning（模型思考前） |
|---|---|---|
| 角色 | **写路径**：统计 + 触发熔断 | **读路径**：状态机唯一权威 |
| 计数失败 | 连续失败递增，达到阈值 → 原子脚本进入 OPEN | 只读 Redis |
| 半开失败 | 代数 +1、刷新时间戳、**立即**卸载 | — |
| 半开成功 | 清 OPEN + 重置计数，**不碰 toolkit** | — |
| 同步可见性 | — | 按状态把每个白名单工具卸载 / 加回（幂等） |

三个细节值得记：

1. **熔断要立即生效，恢复要延迟统一做**。熔断若等到下一轮 PreReasoning，模型可能带着旧清单再调一次坏工具（代码里有"兜底 WARN"专抓这种极端时序）；而恢复晚一拍无害——冷却期内工具本就不该可见。
2. **恢复只在 PreReasoning 做**：PostActing 成功路径只清 Redis 状态，避免在事件回调里反复 addTool 造成抖动，也保证"组里有什么"只有一个权威来源。
3. **操作只作用于自己的 group**：hook 通过 `toolkit.getToolGroup(TOOL_CIRCUIT_BREAKER_GROUP)` 取组引用后 contains/remove/add，组在构建 agent 时创建，`destinationLiveTools` 注册进该组——即"只有被点名放进熔断组的工具才会被熔断"。

### 状态为什么放 Redis 而不是进程内 Map

代码注释给了三条理由：多实例共享同一份熔断视图（重启不丢状态）；`INCR` / `HINCRBY` 天然原子支持并发；TTL 自动清理长期未触发的脏数据。

并发一致性靠 Lua 脚本：计数与续期、代数递增与时间戳写入分别在单次脚本内原子完成，避免"代数已增但时间没记上"这类半状态。

### 保护边界：宁可晚熔断，不可误熔断

```text
白名单监控：只熔断 monitoredToolNames 点名工具（外部实时源），
          基础设施工具（DB/缓存）不参与，避免熔断把自己打死
保守判错：只认框架统一前缀 "Tool execution failed"，不识别具体业务字段
极端兜底：OPEN 冷却中仍被调用 → WARN 记录（LLM 在熔断前已决策调用）
失败静默：group/toolkit 为 null 时跳过，熔断机制的故障不影响 agent 主流程
```

一个已知留白：配置里定义了 `excludeToolNames` 黑名单字段，但 Hook 目前只解析白名单，黑名单未接入。

结语：**工具熔断的本质，是把故障从"每次调用后的惩罚"前移到"下一轮决策前的预防"** —— 状态机只负责在 Redis 记账，真正的执行动作是改变 LLM 每轮可见的工具清单。

## 8. 向量库选型：Qdrant / Milvus / pgvector / Chroma

图解：[四个向量库完整对比](output/vector-db-comparison.html)（浏览器打开：身份定位 → 全维度对比表 → 架构形态图 → 规模量级 → 能力评分 → 决策树）

> agent 的长时记忆（RAG）本质是检索层，向量库就是这层的存储引擎。选型的多数判断其实和"哪家检索更准"无关，而由**形态、一致性和运维**决定。

### 一句话先分清形态

四个库不是同一类东西，**形态决定了运维成本、一致性模型和规模上限**：

```text
Qdrant   独立专用服务（Rust）       → 生产独立 RAG 的首选答案
Milvus   分布式专用服务（存算分离） → 为十亿级与水平扩展而生，运维最重
pgvector PostgreSQL 扩展           → 向量只是表里的一列，无新服务
Chroma   嵌入式客户端库            → 零配置，向量界的 SQLite
```

### 形态对比表

| 维度 | Qdrant | Milvus | pgvector | Chroma |
|---|---|---|---|---|
| 本质 | 独立向量数据库服务 | 分布式向量数据库 | PG 内核扩展 | 嵌入式库 |
| 实现语言 | Rust | Go + C++ | C（随 PG） | Python（核心重写中） |
| 存储引擎 | 自研向量存储(mmap) + RocksDB 存 payload | 消息队列 + 对象存储 + 分段文件，etcd 元数据 | PG 堆表，向量是普通列 | 内存 HNSW + SQLite 元数据 |
| 部署 | 1 个容器/二进制 | etcd + 对象存储 + 消息队列 + 多类节点 | CREATE EXTENSION | pip install |
| 一致性 | WAL + 集群 Raft | TSO 排序，删改异步生效 | **完整 ACID**（同 PG） | 无事务，单写进程 |
| 与业务数据同库 | 无 | 无 | **有**（事务/JOIN/备份一体） | 无 |
| 规模上限 | 单机千万级；集群到亿级 | **十亿级**（DiskANN/GPU 独有） | 单机千万级（halfvec 翻容量） | 百万级以内 |
| 上手成本 | 中 | 高（概念最多） | 低（会 SQL 就会） | 最低（3 行起 demo） |

### 两个真正的功能分水岭

**分水岭一：混合检索（稠密 + 稀疏 + 重排）**。稠密向量懂语义不懂字面，稀疏向量精确命中词但不认同义词，互补才有完整召回。

```text
Qdrant   原生：稀疏向量 + 命名多向量 + Query prefetch，RRF 融合
Milvus   原生：sparse/dense 字段 + Ranker（RRF/加权）
pgvector 无原生；0.7+ 有 sparsevec 类型，需自行拼 BM25 + vector 再融合
Chroma   无
```

**分水岭二：元数据过滤**。Qdrant 的过滤与 HNSW 集成（过滤感知遍历，payload 过滤是招牌）；Milvus 有倒排/位图标量索引和表达式过滤；pgvector 过滤就是 SQL WHERE，最灵活但 KNN 非过滤感知，强过滤时查询计划会退化；Chroma 无专用过滤索引，过滤越强越接近暴力扫描。

### 一致性光谱（最容易被忽略）

```text
pgvector 完整 ACID ──→ Qdrant 单机强一致 ──→ Milvus 近似最终 ──→ Chroma 无事务
  （同库事务、         （WAL 崩溃恢复，    （TSO 时间戳，删除/       （单写进程，
    与业务数据原子提交） 集群 Raft 复制）      索引生效有延迟）          崩溃丢未落盘段）
```

向量数据"看起来查到了"时错误不明显，但删改是否即时生效、能否和业务数据原子提交，在生产里会踩实坑。

### 规模不是主要决策点

对数刻度看：Chroma ≤ 100 万 → pgvector/Qdrant 千万级 → Milvus 亿级以上，每格差一个数量级。**绝大多数业务 RAG 落在 100 万~1000 万区间，四个库都覆盖**，真正拉开差距的是运维负担与上面两个分水岭，不是极限规模。

### 选型决策树

```text
① 向量要和业务数据同库 JOIN / 同一套事务、备份？
   需要          → pgvector（别家都做不到同库事务）
   不需要        → ②

② 几天内出 demo / 本地工具？
   是            → Chroma；要平滑转生产可直接用 Qdrant 内嵌/小容器起步
   否            → ③

③ 规模与扩展预期？
   千万级以内单机够 → Qdrant：过滤+混合检索+量化全内置，1 个容器运维
   亿级以上/多副本/GPU → Milvus：分布式是设计原点
   已有大规模 PG、不引新组件 → pgvector（接受混合检索自建）
```

### 落在 AgentScope 与手头服务器的结论

```text
已有：Milvus standalone（Dify 依赖，19530 端口，占 ~3.6G 内存）
      PostgreSQL 容器（Dify 内部网络，未映射宿主机）
没有：Qdrant / Chroma / Redis

AgentScope 的 main.py：Redis 是硬依赖（RedisStorage 存会话/凭据/agent 状态），
向量层默认 QdrantStore(location=":memory:")——进程内嵌模式，零外部依赖

结论：演示级 RAG 不用装任何向量库；要持久化时新开独立 Qdrant 容器
（6333 端口空闲），比往共享的 Dify Milvus 里灌数据更安全——隔离、可卸载。
```

经验法则收尾：**记忆层起步用进程内嵌或单容器，量到百万级以上、过滤与混合检索成为硬需求时再上专用服务**；先被 Redis 这类"必须件"，后补"可选件"，避免为一个演示需求引入一套分布式运维。

## 9. SSE 实时推送设计：内存队列 + 哨兵收尾（以 letter-auto 检测服务为例）

图解：[letter-auto SSE 连接设计总览](output/sse-stream-design.html)（浏览器打开：四部件职责 → 三方完整时序泳道 → 四条接收路径 → 连接回收 → 设计要点）

> 一句话总设计：**SSE 只是通知通道，报告权威在内存任务表**。每任务一条 asyncio.Queue，后台规则跑完一条就 put 一条；收尾用 `None` 哨兵触发终态事件；MySQL 历史延后到哨兵之后，不挡页面展示。

### 四个部件各干一件事

```text
前端 mcp_tester.html       服务端 server.py                状态层 tasks.py              执行层 inspection.py
streamInspection()        GET /v2/inspection/{id}/stream   每任务一条                  _run_inspection_inner
EventSource 订阅          live 流 / 快路径                 Queue[RuleResult|None]       每产出一条 RuleResult 即 put
complete/error 才 settle  15s keepalive                   终态快照(COMPLETED/FAILED)   （不含哨兵）
pollInspection 轮询兜底                                   = 唯一报告权威
```

### 核心时序：终态落表 → 哨兵 → SSE 收尾 → 数据库延后

```mermaid
sequenceDiagram
    participant FE as 浏览器 EventSource
    participant SSE as /stream 消费者(live_gen)
    participant T as 内存任务表/队列
    participant EX as _run_inspection 执行任务
    participant DB as MySQL history
    FE->>SSE: 订阅（任务 RUNNING → live 路径）
    EX->>T: 每条规则 → queue.put(verdict)
    T-->>SSE: verdict 逐条 → 转发为 SSE verdict 事件
    EX->>T: 全部规则结束 → complete_task/fail_task（终态落表）
    EX->>T: finally → queue.put(None) 哨兵
    T-->>SSE: None → break 循环
    SSE->>T: 读任务表终态快照
    SSE-->>FE: 发 complete/error 事件 → 流结束、连接关闭
    FE->>FE: 收到终态 → evtSource.close()
    EX->>DB: （同一执行任务内，哨兵之后）await record_*，异常吞掉
```

### 三个概念点

**1. 哨兵身兼两职：停流信号 + 终态事件触发器**

消费者的 complete/error 发送代码在 `if item is None: break` 之后——**没有哨兵，终态事件这段代码永远不会执行**，前端 Promise 永远 pending。队列 FIFO 又保证哨兵排在全部 verdict 之后，所以"先收完结果、再发终态"由队列天然保证，不依赖时序竞态。

```text
毒丸在这里不只是"停止标记"：
  verdict 流到此为止      → 停流
  break 后读表发终态事件  → 触发收尾（这段代码只有毒丸能走到）
```

**2. 终态先于持久化（结果发布不等待 MySQL）**

收口顺序刻意编排：`complete_task()（终态落内存表）→ put(None) 哨兵 → SSE 可发 → 之后才在同一执行任务内 await history 写入`。

```text
history 延后的三个保证：
  ① 保存异常被 except 吞掉 → 不改写已发布终态、不触发第二次记录
  ② 记录参数（owner/report/elapsed_ms）在终态处冻结，不回头重新读登录态
  ③ elapsed_ms 用检测起点 t0 计算 → MySQL 再慢也不计入规则/任务耗时
```

**3. 连接回收不靠哨兵广播，靠断开检测兜底**

哨兵每任务只 put 一次。多个并发 SSE 订阅（多标签页）时只有一个消费者能拿到它正常收尾；其余连接靠每轮循环开头的 `is_disconnected()` + keepalive 超时（15s）唤醒后退出，新建订阅则走快路径（任务已终态 → 不发队列、立即发一次 complete/error 并关闭）。

### 客户端拿到结果的四条路径（容错设计）

| 路径 | 触发 | 行为 | 兜底意义 |
|---|---|---|---|
| live 流（主） | 订阅时任务 RUNNING | verdict 逐条 → 哨兵 → 终态事件 → 关流 | 正常情况 |
| 快路径 | 订阅时任务已终态（迟到/重连） | 不走队列，立即发一次 complete/error | 刷新页面、断线重连 |
| 轮询兜底 | SSE 失败 | 每 500ms 调 get_inspection，最多 5 分钟 | EventSource 连不上也能取终态 |
| error 事件 | 服务端推 error / 连接重置 CLOSED | 带 data reject 业务错误；无 data 且 CLOSED reject SSE_UNAVAILABLE；CONNECTING 自动重连 | 检测失败 / 服务端异常 |

### 与经典毒丸模式的差异（值得记）

```text
经典毒丸：N 个 worker 共享队列 → 停 N 个 worker 要投 N 个毒丸（或广播）
本项目：  单生产者只 put 一次 → 单消费者正常收尾，其余靠断开检测兜底
          （简化成立的前提：多余连接最终会因客户端关闭而回收）

判断选型：要"排空后停"（先交付已有结果再收尾）→ 毒丸
          要"立刻停"（不管队列剩什么）        → cancel / Event / is_disconnected
```

已知风险点：前端 streamInspection 的 Promise 没有超时，哨兵链路（put 未执行/队列被多消费者抢走）是唯一能让页面无限转圈的故障点；排查时先怀疑哨兵链路，不要指望轮询兜底（它在另一条路径上）。

代码位置：`server.py:76` keepalive 15s · `server.py:286` _run_inspection · `server.py:331` put(None) 哨兵 · `server.py:554` /stream 路由 · `server.py:585-625` live_gen · `inspection.py:139/243` verdict_queue · `tasks.py:43` per-task 队列 · `mcp_tester.html:2524-2573` 前端订阅与轮询

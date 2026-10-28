# Log

## [2026-10-19] schema | 建立 AGENTS.md，收编站点发布规则
按 LLM Wiki 模式（`/Volumes/PortableSSD/docs/obsidian`）订立三层架构与 5 类页面模板，写入 `AGENTS.md`（§1–§11）。
`.cursor/rules/knowledge-base.mdc` 改为指针，避免两份规则漂移。
10 项有意偏离记在 §10，最关键两条：raw 可改写（用 `raw_digest` 防静默漂移）、source 页交付「发掘与分流」而非摘要。
touched: AGENTS.md, .cursor/rules/knowledge-base.mdc

## [2026-10-19] schema | 两个工具脚本
新增 `tools/wiki-index.mjs`（重建 index 自动段，保留手写段）与 `tools/wiki-lint.mjs`（断链 / 孤儿 / frontmatter / raw_digest 漂移 / 重复概念 / 过期，只读）。
`wiki-lint` 排除了 `index.md`、`log.md`、`AGENTS.md`；表格内的 `\|` 转义先还原再匹配，否则 `thoughts-toc.md` 会误报 87 处断链。
touched: tools/wiki-index.mjs, tools/wiki-lint.mjs

## [2026-10-19] compile | 首批 ai 域
新增 42 sources（10 根笔记 + 9 簇 + 22 独立 thoughts + 1 登记表）、12 entities、14 concepts、5 synthesis、1 outputs。
`thoughts/` 102 篇按实测分三档：A 22 / B 65（9 簇）/ C 15（全部为 17 行空草稿）。
touched: wiki/index.md
缺口: `原理图与 EDIF 工作流.md`（2478 行 / 290 h2）未拆，`eda` 域留待第二批；`thoughts/097–102` 等 10 篇是空草稿，主题无实质内容。
冲突: 无

## [2026-10-19] lint | 0 项
首轮 51 项（6 断链 / 14 孤儿 / 9 frontmatter / 22 digest）逐项清零。
其中 9 个 frontmatter 报错是真 bug：簇页用 `source_files`（数组）而非 `source_file`，已修正 lint 的二选一判断；22 个 digest 报错来自行数统计口径差 1（`\n` 计数 vs 末行），已按 lint 的口径统一。
touched: tools/wiki-lint.mjs

## [2026-10-19] lint | 证据节校验
写了一个临时校验脚本（不入库），把 14 个 concept + 5 个 synthesis 的证据节逐条回落到 raw：
- 42 处 `thoughts/xxx` 缺 `.md` 后缀且用文件内部标题而非实际文件名 → 全部替换为真实文件名（`thoughts/012_✅基于规则+RAG+LLM构建三层意图识别.md` 这类）
- 2 处引用不存在的 `output/context-compaction-comparison.html` → 改指实际的 `output/harness-v2-eli5.html`
- 1 处引用不存在的标题「4. 问题复现与定位」→ 实际是「附录 · Claude Code 第二轮会话 400 问题修复复盘」§「1. 问题现象」
- 2 处把配置项当文件路径（`ToolkitConfig.parallel(true)`、`replay`）→ 补上所属 raw 文件
touched: wiki/concepts/*.md（10 个）、wiki/synthesis/*.md（2 个）、wiki/sources/harness学习笔记.md
剩余: 2 处为有意保留的正文说明（拼写错误的注记、并行与熔断正交的说明），非引用。

## [2026-10-19] schema | 跨项目复用：~/.agents/skills/llm-wiki
把 wiki 的使用方式做成 Agent Skills 标准 skill，pi 与 Codex 共用（两者都扫描 `~/.agents/skills/`）。
`SKILL.md`（95 行）+ `references/operations.md`（195 行，五个操作）+ `references/page-templates.md`（211 行，五类模板）。
六个要点：跨项目用绝对路径、别 cd、别建 `raw/`、source 写发掘不写摘要、digest 口径 `split('\n').length`、簇页用 `source_files` 数组。
touched: 无（skill 在仓库外）

## [2026-10-20] ingest | 业务设计（letter-auto 承认书检测）
新增 `wiki/sources/业务设计`。抽出原子：`证据与判定分离`（judge 签名只有 Evidence+Params、不碰 IO）、`四种状态`（INCONCLUSIVE/NOT_CHECKED 是取证边界不是失败）、`执行顺序≠呈现顺序`（SSE 完成即推 vs Report 按 _RULE_ORDER 回填）、`性能优化先测量`（两次反向动作：删冗余、建基线）、`可替换的外部依赖`（接口不动实现换八次）、`可观测性三层`（trace / 口径 / 证据契约）。
touched: wiki/sources/业务设计.md（新建）、wiki/concepts/SSE流式推送.md（补「执行顺序≠呈现顺序」实例 + 反向链接 + frontmatter sources）、wiki/outputs/图解索引.md（登记 output/letter-auto-architecture.html，16→17）、wiki/index.md（待建页 + 摄取状态）
冲突: 无。与 `agent 开发学习笔记.md` §9 的 SSE 链路是互补关系（那篇讲队列怎么推，这篇讲报告顺序从哪来），不是矛盾。

## [2026-10-20] save | 图解：letter-auto 架构、规则编排与并发演进
新增 `output/letter-auto-architecture.html`（七节 + 四张内嵌 SVG + 半年后复习导航）。源是 `业务设计.md` 的可视化副本，四张分节 SVG 抽到 `images/other/` 供正文引用。
touched: output/letter-auto-architecture.html、images/other/*.svg（4 个）、业务设计.md（文首加图解链接）
冲突: 无。已知漂移风险：完整版 HTML 与分节 SVG 是两份副本，改一处忘另一处就会不一致；lint 不检查 SVG。

## [2026-10-20] ingest | 补建 letter-auto entity（纠正上一条的归类错误）
上一条只把「执行顺序≠呈现顺序」落进 SSE concept，其余原子全部挂「待建」。错误在于用 concept 的验收标准（≥3 断言落在 ≥2 篇 raw）去卡一个**项目**——项目型知识天然只有单一权威来源，按那把尺子永远建不起来。正确去处是 entity（`entity_kind: project`）。
新增 `wiki/entities/letter-auto`。touched: wiki/entities/letter-auto.md（新建）、wiki/entities/agentscope.md（补 letter-auto 与两者运行模型相反的判断）、wiki/sources/业务设计.md（entities 字段 + 相关页面）、wiki/index.md（待建页补「模型输出的失败分类」）。
冲突: 无。

## [2026-10-22] schema | 新建 raw/articles：外部裁剪的落盘位置
浏览器 Web Clipper 的落盘目录从插件默认的根目录 `Clippings/` 改到 `raw/articles/`。修订 §10「不建 `raw/` 目录」：`raw/` 只收外部裁剪，自有笔记仍在根目录与 `thoughts/`，路径不动（§2.3）。
新增: §4.7 裁剪件落盘格式（文件名 `YYYY-MM-DD-<kebab>.md`、frontmatter 必填 `url`、`status: unread` 作 ingest 游标、图片进 `raw/assets/`）；§2 三层架构表 raw 行改写；§2.1 补「可改写豁免不覆盖外部裁剪」；§3 目录树加 `raw/`，并把「不建 raw/」改写为「`raw/` 的边界」；§10 偏离表第 3 行改写。
touched: AGENTS.md、wiki/log.md、.gitignore（忽略 `.obsidian/`、`.claudian/`）
冲突: 无。与 `~/.agents/skills/llm-wiki` 的「别建 `raw/`」要点存在口径差，skill 侧待同步。

## [2026-10-22] ingest | llm_wiki 桌面实现 README_CN（外部裁剪第一篇）
本仓第一篇 `raw/articles/` 裁剪件的完整 ingest。原文 nashsu/llm_wiki README_CN，493 行，是 Karpathy llm-wiki 方法论的**桌面实现**，不是方法论原文。
新增: wiki/sources/llm-wiki-app-readme（`source_type: article`、`status: unverified`、digest 493-c8c96713）、wiki/entities/llm-wiki-app、wiki/concepts/关联度模型（`confidence: low`）、wiki/concepts/知识图谱健康度（`confidence: medium`）
touched: wiki/index.md（自动段重建 80 页；「待建页面」补 4 条原子 + 1 条缺口；「raw 摄取状态」补 `raw/articles/` 行，并把过时的「不建 raw/ 目录」改成「raw/ 只收外部裁剪」）、wiki/log.md
冲突: 无。raw 可变性差异已在 AGENTS.md §10 登记，不另立冲突段。
缺口: AGENTS.md §1 的 [[wiki/sources/llm-wiki-pattern]] 仍不存在（lint 不扫 AGENTS.md，故一直报 0 项），本文不足以替代 Karpathy 原文；补法已在 index 的「待建页面」写明。

## [2026-10-22] schema | 删除 raw 的级联规则（§2.4）
按「删 raw 时 wiki 页一起删」的决定新增 §2.4：source 页整页删、其他页只摘 `sources[]`、共享页不连坐、删除走回收站。§1 规模表同步重算（wiki 83 页）。
新增: AGENTS.md §2.4
touched: AGENTS.md（§1 规模表、§2.4）
冲突: 无。比实现版简化——只认 `sources[]` 一条匹配，不扫章节引用。
附: 已扫描全部 source 页的 `source_file` 是否存在——无残留孤儿（唯一命中 `thoughts-toc` 的 source_file 是目录 `thoughts`，属正常）。

## [2026-10-22] ingest | Karpathy 原文 gist 落盘 + 四个原子处置
补上 AGENTS.md §1 `[原文]` 的缺口：agent 用 web_fetch 抓 gist raw，落成 `raw/articles/2026-10-22-karpathy-llm-wiki-gist.md`（55 行，digest `55-15730831`，转义符已还原），建档 `wiki/sources/llm-wiki-pattern`。
新增: wiki/concepts/摄入流水线（gist 四步 + README 工程保障 + 本仓 §6.2 作实例）、wiki/concepts/意图层与结构层分离（结论「暂不拆」，写明触发条件）
touched: wiki/concepts/上下文压缩.md（新增「预算分配（压缩的另一面）」一节并补 sources，未另立页）、wiki/concepts/知识图谱健康度.md 与 wiki/concepts/关联度模型.md（把「200+ / 过百」的推断换成 gist 的规模锚点：约 100 个 source）、wiki/index.md（待建段改为「已处置」表）
冲突: 无。

## [2026-10-22] save | DSH 插件设计模式
新增 wiki/synthesis/dsh-插件设计模式.md（九种模式 + 反模式 + 选型判据 + 生态计数）。证据为外部一手文档与本机三插件源码实测，仓内无 raw 支撑，故 confidence: medium、status: investigating。
touched: wiki/synthesis/dsh-插件设计模式.md、wiki/concepts/Skill-vs-Tool.md、wiki/concepts/KV缓存与提示词缓存.md、wiki/sources/thoughts-工具设计规范.md、wiki/sources/thoughts-命令执行护栏.md、wiki/index.md
冲突: 无（wiki 此前无 DSH 相关内容）

## [2026-10-23] ingest | Agent 评测方法论 附章（badcase 判定）
把会话里的一次真实失败沉淀为 raw 的新附章：agent 遇到公共可查的陌生模型名（Jev），未检索就向用户索要定义。附章写清三件事——判定看 transcript 不看自述；判据是「澄清请求是否只索要用户独占信息」而非「有没有调搜索」（路径洁癖检验）；归类回归集、口径 pass^k、正反用例两边都测。

新增: 无（raw 附章 + 既有两页更新，不新建页）
touched: `Agent 评测方法论.md`（+41 行附章，raw_digest 124-9bbbe6d0 → 165-02437a82）、wiki/sources/agent-评测方法论（digest/lines、覆盖段、原子表 +1、独有 +1、证据行修正 123→165）、wiki/concepts/Agent评测（实例 +1 段、证据行行数、as_of 2026-10-23）
冲突: 无。旧页把 raw 记成「123 行 / 123-9bbbe6d0」用的是 count('\n') 口径，与全仓 split('\n') 口径差 1，本次顺手改正。
缺口: 附章只证明「这一次」失败；规则改了之后行为是否真的变，没有实测，已在附章第 4 节写明。



## [2026-10-24] ingest | GoGo 确认路由与确认令牌状态丢失复盘
按用户明确授权，先向原笔记追加 §18「动作与对象不能被背景酒店关键词抢路由」和 §19「同任务归并、同事务提交」，再摄取到既有 source/concept/entity。新增 wiki 页：无；不建平行概念，不发布、不提交或推送。
touched: agent 开发学习笔记.md（仅追加，2350-9ec11c69 → 2619-f1468d5e）、wiki/sources/agent-开发学习笔记.md（范围、原子分流、digest 与证据）、wiki/concepts/意图识别分层.md、wiki/concepts/SSE流式推送.md、wiki/concepts/幂等与写入恢复.md、wiki/entities/agentscope.md、wiki/index.md（自动段重建与手写摄取状态）、wiki/log.md。
冲突: 两处范围差异已显式保留并澄清：快路径先要求业务对象明确；letter-auto 的内存终态与 GoGo 的聊天状态提交不是同一完成契约。source 原“全部已上线”表述收窄，新增记录只证明当时的本地修复与隔离验证，不代表原调试进程或原共享会话已复验。
边界: retry_of 是本轮委派关联，confirmation_token 是后续轮次的摘要凭据；状态可恢复不保证模型永不漏参。聊天回滚不撤销先前业务提交。源笔记同时保留曾误运行旧临时 SQL 用例和传输故障未端到端验证的事实。

## [2026-10-24] lint | GoGo 复盘摄取后全量检查 0 项
新增: 无。基线 84 页、0 项；追加 raw 后先观察到目标 source 的一处 digest 漂移，重读变更并完成分流后更新 digest，再重建索引。最终断链、孤儿、frontmatter、digest、重复概念、过期均为 0 项。
touched: wiki/log.md。源笔记原内容保持字节前缀不变，index.html 未修改；本次只验证 wiki 结构与证据链接，没有重跑 GoGo 的历史测试。

## [2026-10-24] schema | DSH 编码经验自动摄入的限定授权
新增: experiences/<jobId>.md 原始事件来源；已授权 capture 高置信无冲突且校验通过时免逐条确认。
touched: AGENTS.md（§2.2、§3、§4.1、§6.2）；llm-wiki Skill 的目录说明、ingest 分支和 source 模板同步。
冲突: 普通 ingest 的确认流程保留；原始证据与知识判断仍由不同角色产生。

## [2026-10-25] ingest | 《AI Agent 书》第 7 章：Agent 的评估
外部裁剪件 `raw/articles/2026-10-25-ai-agent-bookbookchapter7.md-at-main.md`（883 行，digest `883-996ea3d5`）摄入。教材体，密度高且自带配套实验编号（实验 7-1…7-14），抽出 10 个原子：5 个够独立成页、3 个并入既有页、2 个只留指针。
新增: wiki/sources/ai-agent-book-chapter7（`verified`）、wiki/concepts/失败归因与回归任务（high）、wiki/concepts/评估环境设计（high）、wiki/concepts/内部评估基础设施（medium，单源）、wiki/concepts/Agent模型选型（medium，单源）、wiki/synthesis/Agent基准设计对照（comparison / settled）
touched: wiki/concepts/Agent评测.md（评估对象=模型+Harness 与 model swap 的分工；Rubric 四准则 + 一票否决；长度/位置/同源三类偏差 + 多源异构评判；题源三来源；SE 与配对分析；待澄清删去已覆盖的三项）、wiki/concepts/KV缓存与提示词缓存.md（表 7-4 四组对照，两项优化收益不可相加）、wiki/concepts/上下文压缩.md（只留成本侧指针）、wiki/concepts/金标.md（金标只占 `env_assertions` 那一层）、wiki/index.md、AGENTS.md（§1 规模表 83→90）、wiki/log.md
冲突: 无。三处边界写进页内而非冲突段 —— ①教材「100 题 / 70% 时 95% 区间约为 70 个百分点」按 `SE=√(p(1-p)/n)` 重算应为 ±9 个百分点，疑为裁剪丢符号，Agent评测 页同时保留原文与重算值；②本章配套 `chapter7/` 代码不在本仓，数字属转引非复验，故两页降为 medium；③本仓 0 例系统化归因，失败归因页是口径引入，不是实践记录。
缺口: 发布门禁（Release Gate）仍无内容，已进 index 待建页「中优先」。裁剪件 frontmatter 不是 §4.7 格式（无 `url/status`，用 `source/created`），raw 不可改写，未代改，仅在 source 页「待处理」注明。

## [2026-10-26] ingest | Demystifying evals for AI agents（Anthropic 原文）
`raw/articles/2026-10-26-demystifying-evals-for-ai-agents.md`（495 行，digest `495-eabe00aa`，发布 2026-01-09）摄入。这不是新知识，是**出处补齐**：`Agent评测` 页的 8 步路线、三类裁判、pass@k / pass^k 一直转引自 `agent 开发学习笔记.md` §10 的第二手摘录，原文此前未进仓。11 个原子：1 个独立成页、5 个并入、1 个补进内部评估基础设施。
新增: wiki/sources/demystifying-evals（`verified`）、wiki/concepts/任务质量自检（high）
touched: wiki/concepts/Agent评测.md（七项术语补入；能力集毕业成回归集；四类 agent 的评分器组合；六种信号 + 瑞士奶酪表；失效条件 +2（比题面更好的解被判失败、评分器与题面不一致惩罚听话模型）；8 步补第一手出处与参考解验收；证据/相关页/来源）、wiki/concepts/内部评估基础设施.md（评估团队与领域专家的所有权分工，来源 1→2）、wiki/entities/anthropic.md（原文进仓、时间线补 01-09、判断 +1）、wiki/index.md、AGENTS.md（§1 90→92）、wiki/log.md
冲突: 无。两处与本仓既有判断互相印证而非互为反例 —— ①「评估对象是模型 + Harness 组合体」在原文有术语级依据（evaluation harness vs agent harness）；②「只评产出不评路径」两队都写了，本仓保留自己的边界（授权/澄清/禁止操作仍要查）。CORE-Bench 的 42%→95% 是把既有失效条件「题面有歧义」补成可操作的自检流程，不是新结论。
缺口: 多智能体系统评估原文自认是开放问题，本仓亦无。Release Gate 仍空。裁剪件是机器翻译译本（第 30 行整段英文未译、pass@k 定义式未渲染、链接与文字粘连），引用只取结构与数字，不逐字引措辞；digest 取值期间文件仍在追加（488→495 行），以稳定后的 495 为准。

## [2026-10-26] schema | 新增第 7 个域 learning（学习方法）
用户要求把学习方法立成独立类别。`domain` 枚举从 6 值扩到 7 值：ai / eda / security / tool / finance / learning / other，三处模板（source / concept / 裁剪件）同步。
新增: AGENTS.md §10 一条偏离记录
touched: AGENTS.md（§4.1、§4.4、§4.7 的 domain 枚举注释；§10 新增一行；§1 规模表 92→97）
冲突: **这条打破了本仓原有的「domain 复用站点 6 个 slug、不发明第二套分类」约束**。站点 `CATEGORY_RULES` 未同步改动 —— 该域将来上站会落到「其他」。两种收敛方式（扩站点正则，或把学习方法并入某个既有 domain）留待真正上站时决定，本仓不上站（§5.8），暂以 wiki 内部检索为主。

## [2026-10-26] ingest | 学习方法两篇（新域首灌）
两篇外部裁剪件一次灌入新开的 `learning` 域：`ai-learning-three-questions`（145 行 / `145-0ad37831`，小互转述一条 X 推文的三问法）与 `star-interview-method`（173 行 / `173-5c93b5c0`，HBR 中文版经 36氪 转载的 STAR 教学文）。两篇都是 `unverified`。
新增: wiki/sources/ai-learning-three-questions、wiki/sources/star-interview-method、wiki/concepts/领域速通（medium）、wiki/concepts/STAR法则（medium）、wiki/synthesis/学习方法的两条轴（overview / investigating）
touched: wiki/index.md（新增「学习方法」域小节 + 待建页计数 + 摄取状态 6 篇）、AGENTS.md（§1 规模表，见上一条 schema）、wiki/log.md
冲突: 无新旧判断冲突（本域此前为空）。但有一条**证据强度冲突**必须记下：域里唯一的量化叙事（48 小时学完一学期）来自三层转述（推文 → 公众号 → 本页），MIT 身份、48 小时、资格考试均不可查证；另一篇是机翻教学文，零数据。所以这个域目前**只有方法描述，没有一条本仓实践记录**，两页 concept 的 `我的实例` 段写的都是「本仓没有」，属如实登记而非留白。
缺口: ①本仓零实践 —— 没有一次用三问法学东西、没有一次按 STAR 准备材料的时间与结果记录，这是本域最大的洞；②`learning` 域与站点分类不对齐（见 schema 条）；③两篇的图片与原文链接（推文、HBR 原文）未落盘，后续若要用只能回到英文原始来源。

## [2026-10-26] ingest | 四篇大厂 Agent 评测实践（美团 / 京东 / 淘宝 / VitaBench）
`raw/articles/` 里最后一批未消化的评测材料一次灌完：美团图灵《Agent 评测漫谈》（384 行 / `384-bb7ba390`）、京东评测体系第三方拆解（216 / `216-bb7d2443`）、淘宝购后在线评测（392 / `392-c64de879`）、美团 LongCat VitaBench（190 / `190-9666d73b`）。四篇合计 1182 行，抽出 2 个新 concept、1 个 synthesis、5 处并入既有页。
新增: wiki/sources/meituan-agent-eval-primer、wiki/sources/jd-agent-eval（`unverified`，第三方拆解）、wiki/sources/taobao-online-eval、wiki/sources/vitabench、wiki/concepts/在线评测、wiki/concepts/评测标准对齐、wiki/synthesis/大厂Agent评测体系对照（overview / `investigating`）
touched: wiki/concepts/Agent评测.md（四层业务视角；评过程与不评路径的边界澄清；Pass@4 60% / Pass^4≈0 实测；失效条件 +2（线上低通过率更可能是评测自己错、N/A 过多抬高通过率）；成本控制补一半；来源 4→8）、wiki/concepts/评估环境设计.md（VitaBench 三维复杂度表、模拟器与评估器可靠性验证、**新增「冲突」段**：规则放 policy 文档 vs 编码进工具图）、wiki/concepts/失败归因与回归任务.md（归因前置一步：排除评测自身三类假失败；归因即分层兜底；错误分布权重）、wiki/concepts/任务质量自检.md（诚实难度分级、视觉证据优先防作弊、专家多次校验）、wiki/concepts/内部评估基础设施.md（基建七能力 + L1–L5 成熟度阶梯，并据此回答 Release Gate 的位置）、wiki/synthesis/Agent基准设计对照.md（VitaBench / OxyEcomBench 两行 + 难度从标签变变量 + 立尺派战略）、wiki/index.md、AGENTS.md（§1 97→104）、wiki/log.md
冲突: 一处真实设计分歧已按 §5.4 记录 —— τ²-bench（第 7 章）把领域规则写成 Agent 政策文档，VitaBench 明确主张把规则编码进工具依赖图、避免冗余 policy 文档（理由：限制探索、把长文本指令遵循混进结果）。分歧点是「规则是给模型读的约束还是环境结构的一部分」，待验证方式写在该页。另有一处**表面冲突**已澄清非冲突：美团把「过程层」列入四层内容，Anthropic 原文主张「只评产出不评路径」—— 两者反对的都是固定路径断言，已经在本仓 Agent评测 页写明分界线。
缺口: ①淘宝自认三类 Judge 偏差治理未启动、坏样本回流训练未打通、「真实水位」无停止判据 —— 这是这一批材料暴露的最大方法论空洞，已进 在线评测 页「待澄清」；②京东那篇是第三方拆解，所有数字只能转引；③四篇的图片（合计 50+ 张，大量承载结构信息）全部是 CDN 远程链接，未落 `raw/assets/`，要完整复原需重新抓图。

## [2026-10-26] ingest | Claude Code 团队怎么做代码评审（含中文译文）
`raw/articles/2026-10-26-how-the-claude-code-team-does-code-review.md`（278 行 / `278-5d5bc259`，@addyosmani 转述 X 长文）摄入。同时按用户要求产出**中文译文**落盘 `...code-review.zh.md`（285 行 / `285-dbaaa396`）—— 译文不算新来源，只登记在 source 页，**不另建 source 页**（避免 index 里同一篇文章出现两页）。抽 12 个原子 → 2 个新 concept、4 处并入。
新增: wiki/sources/claude-code-code-review（`unverified`，团队自述单点数字）、wiki/concepts/代码评审分层（medium）、wiki/concepts/评审收敛（medium）
touched: wiki/concepts/Agent评测.md（补「让 agent 出示结果」比「声明完成」值 2–3 倍；相邻页 +代码评审分层）、wiki/concepts/失败归因与回归任务.md（补「事故即打分集」这条省掉归因的捷径及其幸存者偏差代价）、wiki/entities/claude-code.md（来源 +1、判断 +2、时间线 +2）、wiki/index.md、AGENTS.md（§1 104→107）、wiki/log.md
冲突: 无。三处与既有页形成对照而非矛盾，均写进页内 —— ①「事故即打分集」与 失败归因与回归任务 的「归因→回归用例」是两条路（省归因成本、失归因解释力），两条不互斥，已在该页写明；②六层 + 回滚与 内部评估基础设施 的「准入准出门禁」是同一层的两个实例；③自动检查（lint/类型/测试/构建）是产出断言，风险分级与敏感路径是过程约束，与 Agent评测 的「只评产出不评路径」并存不冲突。
缺口: ①译文由 agent 翻译、未逐句核校，措辞不可引、结构与数字可用；②6 张图（FIG A–F）中 FIG B 六层结构与 FIG E 收敛曲线承载信息，文字只能复原大意；③全部数字为团队自述单点值（90% / 2,500→30,000 / 16%→54% / 2–3 倍 / 59% / 50+ 轮），可引不可复算；④本仓零代码评审流程，两页的「我的实例」都写成「本仓没有 + 一条可搬运的」，属如实登记。

## [2026-10-26] ingest | raw/articles 标题全部中文化
按用户要求把 `raw/articles/` 下 11 篇的 `title:` 全部改成中文。已有 7 篇本来就是中文标题，实际改动 4 篇英文/仓库路径标题：Karpathy gist（`LLM Wiki — A pattern...` → `LLM Wiki —— 用 LLM 构建个人知识库的一种模式`）、llm_wiki README（`llm_wiki/README_CN.md at main` → `llm_wiki 中文说明文档（README_CN · GitHub 主分支）`）、第 7 章（`ai-agent-book/book/chapter7.md at main` → `《AI Agent 书》第 7 章：Agent 的评估（GitHub 主分支）`）、Anthropic 评测原文（`Demystifying evals for AI agents` → `拨开 AI Agent 评测的迷雾（Demystifying evals for AI agents）`）。
新增: 无
touched: raw/articles/ 4 篇（仅 frontmatter 的 title 行）、wiki/sources/llm-wiki-pattern.md、wiki/sources/llm-wiki-app-readme.md、wiki/sources/ai-agent-book-chapter7.md、wiki/sources/demystifying-evals.md（raw_digest 同步）、wiki/index.md（一处旧 digest 引用 + 一条说明）、wiki/log.md
冲突: 无。但要记一条**操作性质**：这是改 raw 层，而 §2.2 规定 agent 不写 raw、§4.7 规定外部裁剪不可改写。本次是用户明确指令下的例外，做法上守住三条 —— 只动 frontmatter 的 title 一行、正文一字未改、四篇的 raw_digest 全部重算并同步到 source 页与 index，不留静默漂移。若以后再遇同类要求，同样按这三条执行；不主动提议改 raw。
缺口: 文件名当时未改（§2.3 路径冻结 + source_file 引用），中英并存 —— **此条已在同一轮后续操作中解决，见下一条**。

## [2026-10-26] ingest | raw/articles 文件名全部中文化 + 原文缺文件处置
用户要求文件名与中文标题一致。11 个文件全部改名（用 `git mv` 保留历史），新名规则：`YYYY-MM-DD-<中文标题压缩>`，去掉 `·`、`：`、`——` 等标点，`at-main` 之类仓库片段转成「GitHub主分支」。
新增: 无
touched: raw/articles/ 全部 11 个文件名（内容一字未改 —— 改名前后逐个重算 digest，11 个全部与改名前一致，证明只是 rename）；wiki/ 下 32 个文件的路径引用（source_file 11 处 + 正文证据行 21 处）；wiki/sources/claude-code-code-review.md（digest 改指译文，见下）；wiki/log.md
冲突: 一处**证据链变化**必须记：英文原文 `2026-10-26-how-the-claude-code-team-does-code-review.md`（278 行 / `278-5d5bc259`）在 20:10 之后被用户删除（用户确认「是我删的」），非本仓操作。译文沿用「Claude Code 团队怎么做代码评审」这个新名，因此 source 页的 `source_file` 与 `raw_digest` 现在校验的是**译文**（285 行 / `285-dbaaa396`），不是原文。已在 source 页顶部写明「digest 校验译文、措辞不可引、需要原文按链接重抓」。这使 lint 归零，但语义上接受了一处降级：该页的原始性由译文承担。
缺口: ①`log.md` 历史条目里的旧文件名没有回改（§8 只追加不回改历史），若要按旧名检索会落空，按新名检索正常；②AGENTS.md 里的 `raw/articles/` 是目录名不是文件名，无需改；③原文缺失后，如需原文只能按 X 链接重抓，重抓后 digest 必须重算。

## [2026-10-27] ingest | Agent 评测方法论 附章二：评测集设计翻车
用户把一个会话的复盘（判断「给 L3 关掉思考是否降准」时前两版脚本结论都错）写进 `Agent 评测方法论.md` 附章二，165 → 363 行。抽 4 个原子 → 2 处并入 + 1 条失效条件 ×2。
新增: 无（不建新 concept —— 三个候选「被测层准入率」「测模型 vs 测系统」「机制性二元指标」都能被既有 concept 容纳，见下方冲突说明）
touched: Agent 评测方法论.md（附章二）、wiki/sources/agent-评测方法论.md（digest `165-02437a82` → `363-d3d726a6`、原子表 +4、独有 +4、status 仍 `partial`）、wiki/concepts/Agent评测.md（关键机制 +2 段、我的实例 +1 段、失效条件 +2 条、证据行行数）、wiki/concepts/评测标准对齐.md（关键机制 +1 段「一致率之前还有一道更前置的检查：分母对吗」、我的实例 +1 段、related +1、sources +1）、wiki/index.md、wiki/log.md
冲突: 无。三处按「能容纳就更新，不建平行页」处理 —— ①「被测层准入率」放进 Agent评测 的「算样本量之前先算」段，因为它和已有的「分数差异要先扣噪声」是同一类前置检查，独立成页会造两句话概念；②「测模型 vs 测系统」放进 Agent评测 的裁判分工之后，与「评估对象不是模型，是模型 + Harness」同源，属补充不属新论点；③「一致率之前先查分母」放进 评测标准对齐 的关键机制，因为该页原本只答「评得稳不稳」，缺「评的东西是否该在分母里」这一前置条件 —— 这是本轮对既有页的实质修补，不是复述。
缺口: ①附章二里的「新做法（V4）」未实施、未实跑，四条验收标准只是设计意图，已在 source 页「待处理」写明；②文中变式练习（260 条扩样本能否恢复可信度）为推导，未执行；③金标来源那条教训引用的语料（`docs/契约样例/阶段G-固定回归.json`）在 `gogo-agent` 仓内，不在本站，wiki 只记字段名与结论，不链仓内路径；④附章二的原始数据（三版脚本、逐条结果 JSON）都在 `/tmp`，未落盘、不可复算，只留下结论与判据。

## [2026-10-28] ingest | 误删 WeKnora 知识库的恢复链路
操作失误的记录：为验证一个 API key 的写权限，对自建 WeKnora v0.8.3 发 `DELETE /api/v1/knowledge-bases/{id}`，目标是含 100 文档 / 13,901 分块 / 2,832 Wiki 页的业务库。恢复靠"四表软删 + 向量重算 + 文件认损"完成，检索已实测可用。
新增: wiki/sources/weknora知识库误删复盘（`partial`，raw 正文待落盘）、wiki/concepts/软删除与恢复边界（high）、wiki/synthesis/误删weknora知识库的恢复链路（incident / settled）
touched: wiki/index.md（Sources 54→55、Concepts 29→30、Syntheses 9→10、总数 107→110、待建页面段新增 2026-10-28 处置小节）、wiki/log.md
冲突: 无。两处与既有页形成**分工**而非矛盾：①`幂等与写入恢复` 问「崩溃后能否安全重跑」，本页问「删了能救回多少」，共享"先判状态再动手"的顺序；②`copy-from-program处置` 同为 incident 但方向相反（外部入侵 vs 操作失误），共同点是处置前必须先确认真实状态——那边先 `ps` 看进程，这边先查 asynq 队列有无残留。另记一条**选型盲区**：`向量库选型` 的对比表里没有任何一列讨论"删除语义"，而本次的恢复上限恰恰由它决定。
缺口: ①**原始复盘正文未落 `raw/articles/`**，source 页的 `raw_digest` 暂填 `0-00000000`、`status: partial`，补录后必须重算 digest 并同步 index；②「如果 `chunks` 是硬删会怎样」只做过推导，未构造对照实验；③100 个原始文件已物理删除（`/data/files/10001/<knowledge_id>/` 目录空），只能从本地 `changelog/10.27-material` 重传——这一条不进知识层，因为它属于环境状态而非可复用判断。


## [2026-10-28] ingest | RSI 域新开 + Agent 求职实践样本
三份材料一次摄入，性质完全不同：`RSI 学习.md`（自有笔记，368 行，08:52 用户改过）、综述项目页 `迈向自我改进的人工智能`（外部裁剪，133 行）、`Agent 求职经验分享及面经（一）`（外部裁剪，1,301 行，含 20+ 场真实技术面）。
新增: wiki/sources/rsi学习（`verified`）、wiki/sources/迈向自我改进的综述论文（`unverified`，项目页非论文全文）、wiki/sources/agent-求职经验分享及面经（`unverified`）、wiki/concepts/递归自我改进（medium，双来源）
touched: wiki/concepts/STAR法则.md（**「我的实例」从「零实践样本」改为有一条样本**；补反问三问；sources +1；as_of 2026-10-26→10-28）、wiki/synthesis/学习方法的两条轴.md（「缺第三条轴」补一个具体测量形态「模拟题命中率」，但明确仍缺面试结果这一半）、wiki/index.md（Sources 55→58、Concepts 30→31、总数 110→114、两个已处置小节）、wiki/log.md
冲突: 三处按 §5.4 判断后**均不构成冲突**，但有一处是**状态升级**必须记：`STAR法则` 页原写「本仓没有面试、求职、表达类记录，这条是纯外部引入，零实践样本」—— 现在有了第一条样本，这不是矛盾而是该页覆盖范围变了，因此直接改写该段并保留「2026-10-28 之前本页写的是零实践样本」这句作演进痕迹，不套冲突模板。第二处：`递归自我改进` 与 `Agent评测` 是分工不是矛盾（一个问「怎么评一次」，一个问「评估结果怎么决定升级」），已在两页的分工句里写明。第三处：综述说「递归 = 状态继承」，本仓此前对 RSI 的理解只到「能改自己」—— 这是本页一句话定义的直接来源，属新定义覆盖旧模糊理解，不是两方对峙。
缺口: ①**RSI 域零实践** —— 全库没有任何一次「提出改进 → 独立验证 → 规则裁决」的实验记录，`递归自我改进` 页的实例段如实写「本仓没有任何 RSI 实践」，只给了两处结构性类比；②面经那篇**20+ 场面试的结果全部缺失**（过没过、差在哪），所以「40–45% 模拟题命中率」无法反推为「准备有效」，只能降级引用；③综述是**项目主页文案不是论文全文**，七个前沿维度只给了标题，无法引用细节，论文本身未抓。


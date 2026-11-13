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


## [2026-10-30] save | 游标分页（keyset）与试产搭配工作台实体页
背景：本仓把 `/api/projects` 从「一次全查」改成服务端分页 + 前端滚动增量加载，形态照抄 letter-auto 的 `v2/history.py` `_read_page()` 与 `static/batch_ui.js` `loadHistory()`。这是一次有沉淀价值的改造：wiki 此前**没有任何一页讨论数据库分页**，而这次踩到的坑集中在「游标是状态」而不是 SQL 本身。
新增: wiki/concepts/游标分页（high，as_of 2026-10-30）、wiki/entities/trail-production-agent（entity_kind: project，本仓首个非 Agent 运行时主题的工程实体页）
touched: wiki/concepts/幂等与写入恢复.md（一句话定义下的「分工」引述补第三条 —— 翻页不重不漏，与本页的崩溃重跑、软删除页的恢复上限共享「必须有可验证锚点」；related +1）、wiki/index.md（总数 114→116、待建页面段新增 2026-10-30 已处置小节与计数行 31/14→32/15）、AGENTS.md（§1 规模表 107→116、sources 54→58、entities 14→15、concepts 29→32、synthesis 9→10）、wiki/log.md
冲突: 无新旧判断冲突（该域此前为空）。但要记一条**覆盖范围扩张**：`幂等与写入恢复`、`旁路缓存` 两页的证据全部来自 Agent 运行时（Harness / LLMentor），而 游标分页 的证据来自一个普通 FastAPI + MariaDB 服务的列表接口 —— 这不是矛盾，是本库第一次把「持久化层正确性」的判断建立在非 Agent 工程上。已在 index 的处置小节写明，避免以后误以为该域只有 Agent 侧证据。
缺口: ①**复合游标未实现** —— 只留了「排序键必须唯一」这条判据，`(created_at, project_id)` 的写法没有代码验证；②`(owner_staff_no, project_id)` 复合索引没建（14 行数据下 filesort 可忽略），加索引要另写迁移，本页明确写了「不提前做」而不是忘了；③前端无请求超时与取消，靠 `generation` 丢弃过期响应，慢网络下仍白占连接；④`HISTORY_LIMIT=20`（前端）与 `PROJECT_PAGE_SIZE=20`（服务端）是两份真相源，靠前端每次显式传 `limit` 维持一致 —— 改一边忘另一边不会报错；⑤`trail-production-agent` 实体页的「已知问题与判断」只覆盖归属隔离与分页两条，BOM 搭配与在线编辑的主链路未写，等下次动那块代码时再补。

## [2026-11-01] save | 扫描件局部改字（首个 `domain: tool` 页）
背景：4 张 2481×3508 医院体检表扫描件，22 处 `2024` + 1 处中文「二〇二四年」全部原位替换成 `2026` / 「二〇二六年」，OCR 复验 `REMAINING_2024 = 0`。沉淀的理由不是「完成了一次改图」，而是这次失败全都长在**测量**上：OCR 给的字符框、框外采的纸色、框内取的最暗像素，三处单点三个坑，且三类的修法互斥（定位错要改切分、还原错要改取样、重建错要换供体），混着调会来回推翻。
新增: 扫描件局部改字复盘.md（raw 层自有笔记，81 行，仓库根目录，不进 `raw/`）、wiki/sources/扫描件局部改字复盘（`verified`，digest `81-b8519ac7`）、wiki/concepts/扫描件局部改字（`high`，as_of 2026-11-01）
touched: wiki/concepts/任务质量自检.md（相关页面 +1，写明分工：那页问「评分器自己有没有错」，本页问「验收手段的盲区在哪」）、wiki/concepts/失败归因与回归任务.md（相关页面 +1，写明分工：那页归因「模型错还是评测错」，本页归因「定位 / 还原 / 重建」，三类修法互斥）、wiki/index.md（Sources 58→59、Concepts 32→33、总数 116→118、待建页面段新增 2026-11-01 处置小节与计数行 32→33）、AGENTS.md（§1 规模表 116→118、sources 58→59、concepts 32→33）、wiki/log.md
冲突: 无。新增页与既有两页都是**分工**不是矛盾，已在双方的「相关页面」互写清：①`任务质量自检` 的 CORE-Bench 42%→95% 说的是「评分器本身要先自检」，本页说的是「验收手段的盲区不重叠」—— 前者防的是评分标准错，后者防的是单信号漏检；②`失败归因与回归任务` 的九类归因切「模型 / 评测」，本页的三层瓶颈切「操作环节」，两者正交。另记一条**域扩张**：`domain: tool` 此前全库 0 页（ai 105 / learning 6 / security 3 / eda 1），本页是第一条，这意味着本库第一次收录「不是 agent、不是 EDA、不是安全」的纯图像处理判断 —— 与游标分页那次把「持久化层正确性」建立在普通 FastAPI 服务上是同类扩张。
缺口: ①**只有一次任务、4 张同版式票据**，没有第二个独立版式样本，所以「median 封顶」「逐列背景」这些判据的普适性未验证；②待澄清四条全部未解 —— 模糊强度没有定量估计法（现在 σ0.7 × max(std,0.7) × 0.9 是试出来的系数）、供体稀薄时退回渲染字的可接受 NCC 下限只测过一个 0.886、中文笔宽匹配靠肉眼判「二的笔画 7.2 / 年 5.6」、批量化时目视放大无法线性扩展；③实现脚本 `/tmp/tj/fix22.py`、`/tmp/tj/fixall28.py` 与 OCR 工具 `/tmp/tj/ocr.swift`、`scan.swift` **都在 /tmp，已随重启消失**，wiki 只留方法判据不留可复算代码；④页眉「健检字第 220240925008 号」里的 2024 属编号不属年份，按用户「所有 2024」的字面要求一并改了，该处语义变更已在 concept 页的失效条件段记明，但用户未确认是否要回退。

## [2026-11-01] ingest | DeepSeek 多 agent 编排两份原文（agent-team 持久化模型 + Super-agent 双层架构）
两篇同源（都是 DeepSeek 侧材料）但性质不同：`agent-team.zh.md` 是 harness 仓库文档，讲多会话编排的**数据形状**（roster / mailbox / task DAG / projection / Cordis API）；`Super-agent 设计探索` 是产品部文章，讲**为什么需要多会话**（人的注意力是瓶颈）。合起来填掉本库一块完全空白的域。
新增: wiki/sources/agent-team-persistence（`verified`，digest `232-31b80f51`）、wiki/sources/super-agent双层架构（`verified`，digest `317-a2794cba`）、wiki/concepts/Super-agent双层架构（medium）、wiki/concepts/Inline与Spill（medium）、wiki/concepts/Agent团队状态模型（high）、wiki/entities/deepseek-harness（`entity_kind: framework`，本库首个 dsh 实体页）
touched: raw/articles/2026-11-01-deepseek-智能体团队.md（frontmatter 补 `domain: ai` / `status: ingested`，正文一字未动，行数 230→232）、raw/articles/2026-11-01-super-agent-设计探索：迈向更自主的-agent-系统.md（同两行，315→317）、wiki/index.md（Sources 59→61、Entities 15→16、Concepts 33→36、总数 118→124、待建页面段新增 2026-11-01 多 agent 编排处置小节与计数行 33/15→36/16、raw 摄取表 `raw/articles/` 11 篇→16 篇并补 5 个 source 页与行数）、AGENTS.md（§1 规模表 118→124、sources 59→61、entities 15→16、concepts 33→36）、wiki/log.md
冲突: 无新旧判断冲突（该域此前为空），但要记一条**两篇互为解释而非重复**，这也是本轮不按「一篇一页」建页的理由（AGENTS.md §5.3）：原文自己写了「用提示词约束 Agent Team 的主会话不亲自执行、只做分派，也可视为双层架构的一种实现」—— 即 agent-team 那套持久化模型是**实现双层架构所需的最小状态**，Super-agent 那篇是这套状态**要解决的问题**。因此 concept 层按三种切法拆三页：`Super-agent双层架构` 切「分层与吞吐」、`Inline与Spill` 切「上下文预算」、`Agent团队状态模型` 切「持久化与回放」，三者正交；source 层各留一篇，互为首选引用。另记一条**域边界澄清**：本库既有的多 agent 页面（[[wiki/entities/codex]]、[[wiki/sources/codex多agent工作流]]）讲的是 **Handoff 内容协议**（agent 之间递什么），与这两篇讲的 **运行时状态模型**（谁在跑、任务归谁、事件怎么回放）不同层，所以不构成覆盖也不需要合并。
缺口: ①**两篇同源，没有第三方对照样本** —— 全部判断都建立在 DeepSeek 自己的文档与自己的实验上，外部没有复现或反驳记录；②§7 实验是**合成负载 + Mock Worker**，编码工作用「只消耗时间的工具」代替，原文自述「仅作初步参考」「衡量的是系统的调度与协作能力，而非对单个任务的执行能力」，所以 12.4 / 15.7 分钟这类数字只能当**调度开销的上界**看，不能当任务完成时间引用；③`dsh-superagent-prototype` 插件**未落盘**，文章说「部分设计已在该原型中实现」，实现与文档的偏差无法核；④设计动机文档 `.agents/notes/implemented/feature/2026-08-05-agent-teams.zh.md` **未落盘**，所以「为什么这样设计」（尤其成员单终态、不存调度方式这两条约束）仍只有结果没有理由；⑤异步 ReAct Loop（`start()`/`stop()` 取代同步 `run()`）原文写「已经在 WorkBuddy 中实现，但尚未默认开启」，本仓无任何代码可验，`Super-agent双层架构` 页已把这句写成「未开启」而非「已可用」；⑥两篇 raw 的 `status` 是我按 §4.7 补的，原 Clipper 落盘没有该字段，若以后重抓需重新核 digest。

## [2026-11-01] ingest | Claude 平台文档《定义成功标准并构建评估》
用户从控制台文档抓的裁剪件（3,698 行，49 个代码块 × 七种语言）。它填的是本库评估域中间那一层此前空着的格子：`Agent评测` 讲口径与统计，`评测标准对齐` 讲标准写完之后怎么证明被一致执行，**中间「标准怎么写实」与「方法怎么选」两页都没有**。
新增: wiki/sources/2026-11-01-定义成功标准并构建评估（`verified`，digest `3698-c154a419`）、wiki/concepts/成功标准与评分方法（`high`，as_of 2026-11-01）
touched: raw/articles/2026-11-01-定义成功标准并构建评估.md（frontmatter `status: unread` → `ingested`，正文一字未动；digest 因此从 `3698-bf8de4b8` 变为 `3698-c154a419` —— 改的是 frontmatter 一行，行数不变）、wiki/entities/anthropic.md（sources +1、concepts +1、时间线 +1 条、正文「是什么」+第 4 点、相关页面 +1）、wiki/index.md（Sources 61→62、Concepts 36→37、总数 124→126、待建页面段新增 2026-11-01 成功标准处置小节与计数行 36→37、raw 摄取表 `raw/articles/` 16 篇→17 篇并补行数 3698）、AGENTS.md（§1 规模表 124→126、sources 61→62、concepts 36→37）、wiki/log.md
冲突: 无。但有两处**表述相反需记明不是冲突**：①**评分顺序方向相反** —— 本文给「代码评分 → 人工评分（尽可能避免）→ LLM 评分（先测可靠性再扩规模）」的默认优先级，而同组织的 [[wiki/sources/demystifying-evals]] 给「三类评分器各有强弱、按任务挑」的选型框架。两者不矛盾：一个是单个开发者的默认顺序，一个是评估设计者的选型依据；已在 concept 页「我目前的判断」与 [[wiki/entities/anthropic]] 的「已知问题与判断」两处写明。②**「数量优先于质量」与「20~50 条从真实失败里挑」** —— 后者是冷启动的最小集合（本页 [[wiki/concepts/Agent评测]] 已有），前者是扩张时往哪个方向加题；一个管起点一个管方向，也不冲突。另记一条**覆盖范围澄清**：本文的成功标准四要素是 SMART 的删减版，**故意没有 Time-bound**；本库此前没有 SMART 相关页，故不构成对既有判断的修订，但以后引用「四要素」时不应默认它是 SMART 五要素。
缺口: ①**六方法零实测** —— 只有示例代码与用例规模（1,000 条推文 / 50 组改写 / 200 篇文章 / 100 条咨询 / 500 条患者查询 / 100 个多轮对话），没有一条分数、耗时或成本，所以本页只能支撑「方法长什么样」，不能支撑「哪个更准」；②**49 个代码块原样落盘但未运行**（需七种语言的 SDK 与 API key）；③本库**零次按本文写标准、零次实跑评分器、零次测 LLM 评分器可靠性**，concept 页「我的实例」只能给三处结构性对应而非等价；④**余弦相似度的合格阈值原文未给**（只说「越接近 1 越相似」），这直接决定它能否当二元判据用，已进「待澄清」；⑤**ROUGE-L 照搬到中文会失效** —— 原文代码注释自认「分词简化为按空白分隔单词」，中文没有空白分隔，正确做法原文未给；⑥原文「下一步」两条链接（`claude.ai` 头脑风暴、`cookbook/misc-building-evals`）未抓取，本文的上下游（标准怎么想出来、怎么变成评估集）仍缺；⑦正文唯一一张图 `how-to-prompt-eng.svg` 是从同站另一页带过来的名字，与本主题关联很弱，正文未解释。

## [2026-11-02] ingest | 高价值任务出题复盘（1 个 synthesis + 1 个 source，无新 concept）
用户要求把本次「按交付门槛出题」的全过程写成可复用文档。素材是一条 88.6 分钟 / 176 步的真实工程会话，成品是一道 100 项评分、19 条判定口径、5 个 CSV 附件的业务裁定题，实测三轮独立考生（v10 / v11 / v11.1）。
新增: `高价值任务出题复盘.md`（raw 层自有笔记，300 行，仓库根目录，不进 `raw/`）、`wiki/sources/高价值任务出题复盘`（`verified`，digest `300-b7d5dbbf`）、`wiki/synthesis/高价值任务出题方法`（kind: decision，`settled`）
touched: `wiki/concepts/任务质量自检.md`（相关页面 +1，写明分工：那页问「评分器自己有没有错」，本页问「自建题怎么迭代到达标」）、`wiki/concepts/评估环境设计.md`（相关页面 +1，补「闭卷考场目录 / 每轮清残留 / 越界双证据」这一具体形态）、`wiki/concepts/Agent评测.md`（相关页面 +1）、`wiki/concepts/成功标准与评分方法.md`（相关页面 +1，补「标准没写死精度时考生算对了也持续扣分」）、`wiki/index.md`（Sources 62→63、Syntheses 10→11、总数 126→128、待建页面段新增 2026-11-02 处置小节与计数行 10→11、raw 摄取表补一行）、`AGENTS.md`（§1 规模表 126→128、sources 62→63、synthesis 10→11）、`wiki/log.md`
冲突: 无新旧判断冲突（该域此前无实践侧记录）。但要记一条**与既有判断的方向差异**：`任务质量自检` 的核心是「分数不对时先证明题目是对的」，本篇给出的实测却显示**分数太高同样是题目缺陷**——v11.1 考生 226 步 / 36 分钟 / 100 分，三条门槛过了两条，分辨力为零。两者不矛盾（一个防错判、一个防无分辨力），已在 synthesis 的「我的结论」第八条与 `任务质量自检` 的相关页面分工句里写明。另记一条**覆盖扩张**：本库此前四页（`任务质量自检` / `成功标准与评分方法` / `评估环境设计` / `Agent评测`）全部是「读别人的材料得出的判据」，本篇是本库第一次收录**自己出题、自己实测、自己改题的闭环记录**。
缺口: ①**只测了一个模型**（`deepseek-v4.1-flash`），「SOTA 得分率 ≤ 50」这条门槛实际无法验证，100 分只能说明「对这个模型不难」；②**「长而不难」无解** —— 已确认真实原因是 70 格彼此独立、无需判断，方向是「口径互斥分支」（不同分支答案互相矛盾，逼考生先判定走哪条），但没有实测，且破坏答案唯一性的风险未评估；③**时长门槛差 3.9 分钟**，理论上把 6 档敏感性扩成逐分钟扫描即可顶过 40 分钟，但那是用算力换时长，与「难度是分支数」的判断相反，该不该做没定；④**换壳的「结构同源」判定无判据** —— 三条映射（坐标空间→双时点 / QA→多时点 / review→独立产能）我认为是真同源，但没有第二人复核；⑤题目本体在 `/Volumes/PortableSSD/questions/kgviz-task/`，未进 wiki（属交付物不属判断），若以后要复算需另行落盘。


## [2026-11-02] ingest | 快慢路径（1 个 concept + 1 处 raw 术语对齐，无新 source）
用户先贴了一段通用科普（API 缓存的 Fast Path / Slow Path 对比表 + Agent Memory 双通路示意图）问「适合放进哪篇」，澄清后确认问的是 **raw 层**（`agent 开发学习笔记.md` 还是同级其他笔记）。结论是 raw 层只做**术语对齐**、完整判据进 wiki —— 那段科普无本仓实例、无实测、无取舍记录，与 AGENTS.md §1 三条价值判据都不符；进入任何一篇 raw 都会变成「通用概念介绍」节，而本仓从 §2 到 §19 每节都有具体代码锚。真实缺口不是缺定义，是**同一结构在四处用了四个名字互不认认**。
新增: wiki/concepts/快慢路径（`high`，as_of 2026-11-02，五处实例：旁路缓存命中、意图识别 L0–L3、SSE 订阅快路径、Super-agent 订阅直通、子智能体直跳与 `thoughts/019` 的反例）
touched: `agent 开发学习笔记.md`（§16 节首插入「术语对齐（2026-11-01 补）」引用块，2 行；2619 → 2621，digest `f1468d5e` → `ac6f0bdf`）、wiki/sources/agent-开发学习笔记（digest / lines / concepts[]+1 / 原子表 §16 行改指向 / 本篇独有第 5 条补术语对齐说明 / 证据行口径统一）、wiki/sources/thoughts-路由与智能体协作 与 thoughts-意图识别三层 与 super-agent双层架构（各补「相关页面」段）、wiki/concepts/旁路缓存 与 意图识别分层 与 Super-agent双层架构 与 SSE流式推送（各补一行归纳回链）、wiki/index.md（Concepts 37→38、总数 128→129、待建页面段新增 2026-11-02 快慢路径判定小节与计数行 37→38、raw 摄取表 `agent 开发学习笔记.md` 行数 2619→2621）、AGENTS.md（§1 规模表 128→129、concepts 37→38）、wiki/log.md
冲突: 无判定冲突，但要记一条**门禁设计上的相抵**：`agent 开发学习笔记.md` §16 的三重门禁（上下文时效 + 续跑意图 + 目标范围白名单）没有一道检查「历史够不够」，而 `thoughts/019` 的结论是「跨 Agent 直跳会丢历史，宁可多花一次改写」。两者不是新旧取代（§16 是 GoGo 的实现记录，019 是 LLMentor 的取舍记录，场景不同），已在 concept 页「关键机制」末段与「取舍与边界」两处记明——共同点是快路径判错的代价**不可自我纠正时不值得做**。
缺口: ①**缺定量判据** —— 只有「输入信号是否同源」「判错能否被下一轮纠正」两条定性规则，没有判错概率的估计方法，也没拿快路径命中率对过账；②**监控盲区无方案** —— 五处实例全靠后几轮回答质量或用户报障发现判错，快路径正确率是未被测量的量；③**通用 fast/slow path 的权威定义本仓没有落盘** —— 概念页定义是从五处实例反推的，不是引用外部来源，因此「快路径」在本库没有可外推的标准定义；④**Agent Memory 那条只作示例** —— 用户提供的示意图（Fast Path 读结构化记忆 / Slow Path 向量→关键词→重排→LLM）本仓无实现，已降级写进「待澄清」当作「可选架构」，不与五处实例并列当证据；⑤两张用户贴的图**未落盘** —— `images/` 是站点资源根、`raw/assets/` 只收裁剪件配套图，且图源未标、无本仓数据。

## [2026-11-03] ingest | WeKnora 技术复习笔记（2 个 concept + 1 entity 扩充 + 1 concept 补接口）
补掉上一轮盘出的最后一个真缺口：根目录 16 篇里唯一未被 wiki 覆盖的 `WeKnora_技术复习笔记.md`（431 行）。它是**正常路径**的源码级复盘——文档怎么变成 Chunk、Chunk 怎么投影成向量/BM25/Wiki 三路、三路分数怎么换算与融合；与既有的 [[wiki/synthesis/误删weknora知识库的恢复链路]]（异常路径：删除语义与恢复上限）正好互补，两篇共用同一套表结构认识。

新增: wiki/sources/weknora技术复习笔记（`verified`，digest `431-9c617701`）、wiki/concepts/多路派生投影（`medium`，as_of 2026-11-03）、wiki/concepts/分数归一化与排名融合（`medium`，as_of 2026-11-03）
touched: wiki/sources/weknora技术复习笔记.md（新建，9 条原子）、wiki/concepts/多路派生投影.md（新建）、wiki/concepts/分数归一化与排名融合.md（新建）、wiki/entities/postgresql.md（从「两个面向」扩到「三个面向」：新增 pg_trgm / pg_search / halfvec / 表达式索引 + 部分索引 / JSONB+GIN / SKIP LOCKED / UPDATE RETURNING / 触发器投影表 / CONCURRENTLY / HNSW 会话参数 / `|||` 是 OR 匹配 / 评分函数运行时探测；sources +1、concepts +2、时间线 +1、新增「相关概念」段）、wiki/concepts/向量库选型.md（分水岭一「pgvector 需自行拼 BM25+vector」补一条指回新 concept 的接口 + 证据段 +1 行；sources +1、entities +1、related +2）、wiki/index.md（Sources 63→64、Concepts 38→40、总数 129→132，raw 摄取表补 `WeKnora_技术复习笔记.md` 一行、`thoughts/` 行「42 个 source 页」改为「32 个」）、AGENTS.md（§1 规模表 129→132、sources 63→64、concepts 38→40；§4.2 三档数字 ~45 / 6 / ~51 改为 22 / 9（65 篇）/ 15 并加一行重算说明；§7 示例表 thoughts 行同步；§10 偏离表「45 个独立观点」改 22）、raw/articles/2026-10-22-LLM-Wiki-…-Karpathy原文.md（`status: unread` → `ingested`，正文一字未动，行数 55 不变，sha 由 997e8d33 变为 e97fc9c7）、wiki/sources/llm-wiki-pattern.md（`raw_digest` 55-997e8d33 → 55-e97fc9c7，行数不变）、wiki/log.md
冲突: 无新旧判断冲突。但要记一条**与既有页面的分工澄清**：[[wiki/concepts/向量库选型]] 此前把「pgvector 需自行拼 BM25+vector 再融合」写成一格表格注脚，读起来像一件小事；本篇实测显示这一步实际是三件事——逐引擎归一化算子、按名次融合（RRF）、再 Rerank 精排，缺任一件都会「条数对、相关性错」。这不是推翻选型页（选型页的判据仍是运维负担与两个分水岭），是把它那一格展开成可复述的机制，故按 §5.3 新建 concept 而非改写选型页正文。
另记一条**数字口径修正（非冲突）**：`thoughts/` 三档长期写着 ~45 / 6 / ~51，而 `thoughts-toc.md` 自己一直是 22 / 65(9 簇) / 15。查证结果是 **toc 正确、AGENTS.md 与 index.md 引用处是建表时的估算未更新**，本轮按实测改正三处（AGENTS.md §4.2 / §7 示例 / §10，index.md 摄取表），并把「B 层文件数 9」与「B 层覆盖篇数 65」两个数分开写清——这两个数被混用是这次对不上账的直接原因。
缺口: ①**笔记本身无实测数字** —— 归一化公式、RRF 算例、批次上限都是源码阅读与算例推演，不是压测；concept 页两处 `confidence` 因此给 `medium` 而非 `high`；②**Wiki 生成的跨批次补链未查** —— `injectCrossLinks` 明确写了「范围受当前批次限制」，那么跨批次实体何时建边、有无补偿任务，笔记未覆盖，已进「待澄清」；③**落选候选的归宿未知** —— Pass 0 抽出但未建页的实体是丢弃还是留存待并，未查到代码；④**本体与 Wiki 的定义冲突无裁决顺序** —— §10 只写了五者分工，没写冲突以谁为准；⑤**权重 w_v=0.7 / w_b=0.3 的来源未记**，`k=60` 也未做敏感性测试；⑥**Weaviate `2c-1` 未实测** —— 归一化表那一行是照代码录的，没有对照实验；


## [2026-11-05] save | 扫码登录接入（dora 企微扫码，1 个 concept + 2 个 entity 扩充，无新 source）
把一次完整接入（`letter-auto` 门禁接 dora 统一认证的企微扫码）沉淀成通用判据，供后续项目复用。全库此前没有 SSO / 扫码登录概念页——`thoughts-鉴权与密钥体系` 讲的是第三方 OAuth 与 API Key，`thoughts-项目概览与启动` 004 篇讲 Sa-Token 自有用户体系，两者都不覆盖「借 IdP 认人、但会话与归属留在本仓」这件事。
新增: wiki/concepts/扫码登录接入（`medium`，as_of 2026-11-05，七条判断：换票式与直取 token 式是架构分叉不是配置差异 / 同源要求来自 host-only cookie / 回跳基准不能取 Host 头 / 换票必须绑 state / 归属键与显示名必须拆开 / 一次性票据的重放是正常路径 / 失败提示落点跟着动作走；含首帧遮挡的实测时间线与六步链路判据表）
touched: wiki/entities/letter-auto.md（concepts[]+1、新增「扫码登录只借 IdP 认人」判断块、相关概念+1、时间线+1、待澄清+1 条工号缺口）、wiki/entities/trail-production-agent.md（concepts[]+1、新增「四个坑是在这个仓踩出来的」判断块、相关概念+1）、wiki/concepts/会话并发互斥.md（「我的实例」与「相关页面」各补一句交叉引用：同一个「权威放哪」问题在登录态上答案相反，ticket 模式把会话权威放进程内存）、wiki/index.md（Concepts 40→41、总数 132→133、待建页面段新增 2026-11-05 小节）、AGENTS.md（§1 规模表 132→133、concepts 40→41）、wiki/log.md
冲突: 无新旧判断冲突，但记一条**与既有归属键选择的方向差异**：[[wiki/entities/trail-production-agent]] 的归属键是工号 `staff_no`（覆盖「登录方式变了但人没变」），本页落地时只能选 `cn`——因为 ticket 路径拿不到工号（`checkTicket` 只回 loginId，`/sso/extral/user-info` 只认 token 且忽略一切查询参数，无法按 loginId 反查）。代价写进了「取舍与边界」：任何人改 IdP 侧的 `cn` 等于换身份、历史随之丢失；将来补到工号的迁移路径是「按 (cn, staff_no) 建映射表回填」，不是直接换键。另记一条**与 [[wiki/concepts/会话并发互斥]] 的同构**：两页问的都是「权威放哪」，那边结论是逻辑所有权必须进中心（Redis 锁）、物理句柄留本地（asyncio.Task），本页 ticket 模式因单实例无 Redis 把会话权威放进程内存，代价是进程重启全员掉线——同一判据的不同取值，已双向补链。
缺口: ①**不满足 §5 验收标准** —— 只有一次单项目实测，没有第二份独立来源可对照「至少 3 个断言落到 ≥2 篇 raw 的具体标题」，`confidence` 因此给 `medium`；②**IdP 侧是否还有 `enabled-hosts` 之外的隐藏开关未探透** —— `qrEnabled` 的判定键已确认是 redirect 参数 host、精确匹配非后缀，且该开关只控 Tab 显隐不阻断 Ticket 链路，但这两个结论来自不同证据（页面 JS vs 实测矩阵），未做交叉验证；③**「扫码后补工号」这条旁路的成本未评估** —— 多一步登录 + 映射表腐化风险，与 trail-production-agent 的 `user_identity` 同源问题；④**票据熵与格式只在 dora 上验过**（64 字符 base64url、一次性、存储只归 dora，rd-sso 的 `checkTicket` 一律 500），换 IdP 或换集群这些前提都要重测；⑤**首帧时间线只有一台机器一组数据**（文档开始 261ms → FCP 584ms → 换票 1421–1992ms → 切换 1997ms），限速条件下的相对关系可信，绝对值不可外推。

## [2026-11-05] ingest | Agent 评测方法论 附章三（三种判定方法：分层拒答 / 编辑距离 / 轨迹评估）
同一份 raw 的**附章三**追加：判定动作本身的三把尺子 —— 分层拒答（决策边界）、编辑距离（差异量）、轨迹评估（执行过程）。三种方法不在同一抽象层（策略 / 确定性算法 / 范式），故一个都没拆成新 concept，全部并入既有权威页。
新增: 无新页面。`Agent 评测方法论.md` 363 → 455 行（新 digest `455-e50020d2`）。
touched: `Agent 评测方法论.md`（附章三 5 节 + 文件头一句概述）、wiki/sources/agent-评测方法论.md（digest 363-d3d726a6 → 455-e50020d2、原子表 +4 行、本篇独有 +2 条、待处理 +1 条、status 仍 `partial` 但理由改为「SWE-bench / Release Gate 仍缺」）、wiki/concepts/Agent评测.md（「关键机制」新增三类判定方法对照表 + 两条新判据「拒答必须按档分组报」「轨迹指标分两层不能混评」+ RSI 作弊捷径一段；related +递归自我改进、as_of 2026-10-26 → 2026-11-05；待澄清 +2 条；证据段行数）、wiki/concepts/递归自我改进.md（「关键机制」末补「成功率是可伪造信号 / 终态+轨迹双闸」一段、sources +agent-评测方法论、as_of → 2026-11-05）、wiki/concepts/在线评测.md（CNT 六层后补「与拒答分档正交切法」一节）、wiki/index.md（待建页面段新增 2026-11-05 小节 8 条处置、摄取表 `Agent 评测方法论.md` 行 363→455 与 4 原子→7 原子）
冲突: 无新旧判断冲突。记一条**切法的正交澄清（非冲突）**：[[wiki/concepts/在线评测]] 的 CNT 六层与本次的拒答分档都在讲「拒答 / 越界」，但六层按**判定链路**切（串行可短路，答「坏在哪一层」），分档按**输入前提**切（平铺，答「这个前提下选得对不对」），两者不能互当标签。此条已写进两页，避免以后把六层的 OOSR 与四档的「无权查看」当成同一格。
缺口: ①**三种方法本仓一处未跑** —— 分层拒答分档、编辑距离、轨迹六维全是方法论移植，`Agent 评测方法论.md` 附章三末尾已标「第 5 节为推断」；②只有 DeepEval 的 `PlanQuality` / `PlanAdherence` / `TaskCompletion` / `StepEfficiency`（trajectory）与 `ToolCorrectness` / `ArgumentCorrectness`（component-level）分层按官方文档核对过（deepeval.com，2026-11 查阅），其余未查证；③**拒答分档「几档才够」无推导** —— 四档是示例不是标准，已进 [[wiki/concepts/Agent评测]] 待澄清；④**RSI 双闸判据是推断** —— 本仓零 RSI 实践，「跳过测试 / 绕过权限 / 削减验证只掉轨迹不掉终态」未经实测，故 [[wiki/concepts/递归自我改进]] 仍 `confidence: medium`。

## [2026-11-08] save | ReMe 镜像构建断流排障（1 个 synthesis，无新 concept/source）
把 2026-11-08 在 121.43.231.155 上从源码构建 ReMe 镜像、被四类国际链路断流阻塞约 2 小时的排障过程沉淀为 incident。核心交付：判停三步法（日志停更 → 进程睡眠态 → `/proc/<pid>/io` 数据流 delta=0 才杀）与国内源清单（SWR ddn-k8s 基础镜像 / 阿里云 apt / 阿里云 PyPI / SIGHUP 热加载 registry-mirrors）。
新增: wiki/synthesis/2026-11-08-reme-镜像构建断流排障.md（`kind: incident`，`confidence: high`，五坑对照表 + 判停三步法 + 源清单 + 三条未定论：IPv6 假说、链路层原因、bridge vs host 未对照）
touched: wiki/entities/agentscope.md（时间线 +1 条 2026-11-08 ReMe 部署）、wiki/synthesis/误删weknora知识库的恢复链路.md（「与既有页的关系」+1 条互链）
冲突: 无。证据均为当晚实测（journalctl 时间戳、`/proc/io` 采样、curl 耗时），服务器日志在会话内，未另存 raw。


## [2026-11-13] ingest | `大模型工程基础.md` 追加附章「LLM 推理策略」（1 个 concept + 1 个图解成品）
主章讲怎么把同样的前缀算得更便宜，附章讲怎么把同样的模型算得更准 —— 同一篇里的成本账两端。原文 176 行 → 477 行。
新增: wiki/concepts/推理组织策略（`medium`，as_of 2026-11-13）、output/llm-reasoning-strategies.html（四张内联 SVG，按用户截图重绘）
touched: 大模型工程基础.md（主章正文一字未改，附章插在「核心结论」之后、原文 footer 之前，§1–§10 共 301 行）、wiki/sources/大模型工程基础.md（raw_digest `177-5aaa5b7a` → `477-f66c9240`，原子表按主章/附章拆两段，重叠点 +3 条，独有 +2 条）、wiki/concepts/Plan-Execute.md（related +1，取舍与边界补「任务层 vs 单次推理内」分工）、wiki/concepts/KV缓存与提示词缓存.md（取舍与边界补成本账两端，含 N 次采样与缓存命中率的组合收益未测）、wiki/concepts/Agent评测.md（related +1，补「消融 vs model swap」分工一段）、wiki/outputs/图解索引.md（新增「推理策略」小节、17→18 个 HTML、concepts +1）、wiki/index.md、AGENTS.md（§1 规模表 133→135、sources 64→65、concepts 41→42、synthesis 11→12、output 17→18）、wiki/log.md
冲突: 无。但有两条**方向相反需记明不是冲突**：①附章说 CoT 类提示对现代推理模型可能有害（OpenAI 官方文档：`Avoid chain-of-thought prompts`），而本库既有页面多处把 CoT 当正向手段（[[wiki/concepts/Plan-Execute]] 的 Plan 阶段、`thoughts/069` 要求 Thought→Action→Observation）。两者不矛盾 —— 前者针对「已内建推理的模型」且讲的是单次调用内，后者讲的是非推理模型或需要结构化输出的场景；已在 concept 页「取舍与边界」写明成立条件。②`thoughts/041` 主张关闭深度思考，与本页把 CoT 列为一档策略看似相反。实际是同判断两面：外层 ReAct 循环已调度推理时，内层再展开是重复付费 —— 已写入「我的实例」作为本仓版本。
缺口: ①四档在本仓一处未跑，零实测数字，全部判据来自原文与官方文档；②N=3/5 无推导，「票数接近」无阈值，GoT 收敛条件无实现可参照；③与 [[wiki/concepts/递归自我改进]] 的边界未拆清（RSI 在多轮间迭代、GoT 反馈在单任务内迭代）；④四张图是按截图重绘的 SVG，版式对齐但非逐像素还原，原图下载链接无留存；⑤附章 5 条参考文献已逐条核可达（HTTP 200），但论文结论本身未复现。

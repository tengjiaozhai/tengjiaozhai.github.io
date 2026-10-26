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

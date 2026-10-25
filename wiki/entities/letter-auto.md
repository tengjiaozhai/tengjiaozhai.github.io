---
type: entity
title: "letter-auto"
entity_kind: project
domain: ai
aliases: [letter-auto, 承认书智能检测, 承认书检查]
version_of_interest: "v2-foundation-18"
tags: [project, document-inspection, ocr, vision, deterministic-runtime]
sources: ["wiki/sources/业务设计", "wiki/sources/agent-开发学习笔记", "wiki/sources/harness学习笔记"]
concepts: ["wiki/concepts/SSE流式推送"]
---

# letter-auto

## 是什么 / 在我的体系里的位置

承认书（供应商发来的产品规格确认件）智能检测系统。输入一份 PDF、原文件名、模板 ID，按模板执行 22 条规则，输出可定位到页码和证据的检测报告。

与 `gogo-agent`（LLMentor / 差旅助手）同属本仓两个主力工程，都基于 AgentScope。但两者的运行模型是**相反的**：gogo-agent 是 agent 主导的多智能体系统，letter-auto 刻意把编排收回 Python，模型只留在「看一眼 PDF 里的某个事实」这一个环节。

它的价值不在「检测承认书」这件事本身，而在于**它是本仓唯一一个把「取证」抽象成可替换接口、并且反复证伪自己的项目**。引擎换了八次、并发方案改了两轮、两次判断被自己推翻。

## 已知问题与判断

- **编排是代码，取证才是 Agent** → 见 [[wiki/sources/业务设计]]
  · 前提：规则名单与顺序运行前已冻结 · 状态：核心设计原则，未变
  · 22 条规则里只有 2 条是真 agent loop（CPK 校验、可靠性报告），其余是 7 个本地取证器 + 11 个单次结构化调用

- **模型调用这一层比想象中厚** → 见 [[wiki/sources/业务设计]]
  · 四种异味都要单独处理：网关把输出包一层（键名不固定）、空对象被 pydantic 默认值接受、输出与 schema 字段集完全不相交、SDK 会话内重试的两种失败要分开计数
  · 状态：全是补丁，根因是网关与 SDK 行为不完全可控

- **引擎接口没动过，实现换过八次** → 见 [[wiki/sources/业务设计]]
  · Paddle 云端 → MinerU 云（材料表通道）→ registry 抽象 → MinerU 内网 → paddle-local → MinerU 唯一 → vlm-engine → 云端适配器
  · 两次判断被自己推翻：MinerU 曾只做材料表通道，两天后扩成唯一引擎；paddle-local 接完两天后整个删掉

- **最危险的一类失败是静默跳过，不是 FAIL** → 见 [[wiki/sources/业务设计]]
  · 例：OCR 后端漏掉页面顶部标题条带，但章节完整性因目录列全了仍 PASS，整块材料宣告检查不报任何结果
  · 取证失败被伪装成「这条规则不存在」，比伪装成 PASS 更难发现

- **SSE 只负责快，报告顺序另有一套** → 见 [[wiki/concepts/SSE流式推送]]
  · 规则一完成就 put 进队列 → 用户看到完成顺序；Report 按 `_RULE_ORDER` 下标回填 → 输出顺序恒定
  · 相关：内存队列 + None 哨兵收尾（`agent 开发学习笔记.md` §「9. SSE 实时推送设计：内存队列 + 哨兵收尾（以 letter-auto 检测服务为例）」）

- **并发是四层嵌套，改任何一层都会被别层吃掉收益** → 见 [[wiki/sources/业务设计]]
  · 规则级 4 / 文档质量页 2 / 印章区域 2 / 五资源槽（document 3、model 8、agent 3、ocr 4、upload 2）/ 批内文档 3
  · **推断**：这些是代码默认值，不是线上实测容量。EV-023 阶段 5（真实 12 份 A/B、灰度与回退演练）标注尚未实施

## 关键配置与用法

```text
入口        template_id + PDF → 22 条规则的 Report
规则定序    _RULE_ORDER（22 元 tuple），顺序即语义
Gate        仅 2 个：FILE_PART_NUMBER（前置于循环）、COVER_TEMPLATE_IDENTITY（gate=True）
显式依赖    仅 1 条：DRAWING_CRITICAL_MARKS ← DOCUMENT_QUALITY
模板        8 个 Profile（FM-818/819/820/821/822/823/872/920），YAML 装规则名单 + 参数
结果状态    PASS / FAIL / INCONCLUSIVE / NOT_CHECKED
```

`RULESET_VERSION` 当前是 `v2-foundation-18`，但注册规则是 22 条 —— 版本号没跟着规则数涨。**观察**，不是 bug，但读代码时会困惑。

## 相关实体 / 相关概念

- [[wiki/entities/agentscope]] —— 底层 agent 框架
- [[wiki/concepts/SSE流式推送]] —— 检测进度推送
- [[wiki/entities/anthropic]] —— Agent SDK 与模型通道

## 时间线

- **2026-08-13 ~ 08-20**：工程骨架 → 8 Profile / 21 规则 YAML 资产 → v2 Bootstrap + 8 Probe
- **2026-08-20（EV-001）**：删编排 Agent，运行时收敛为 `Bootstrap → Probe → Evidence → judge → Verdict`；概念从 13 个降到 5 个
- **2026-08-27（EV-007）**：全尺寸视觉提取从 Agent SDK 收回 Python 直连。真凶是本机代理，`trust_env=False` 后从 105–174s 降到 15–26s
- **2026-09-02**：一天落四个 OCR 决策（EV-009/010/011/012），MinerU 接入 + registry 抽象 + paddle-local
- **2026-09-04（EV-013）**：MinerU 唯一引擎，删 Paddle 双轨
- **2026-09-09（票10）**：gate 后规则并行上限 4 + 共享取证在途去重，0.584× 票09 基线
- **2026-09-15（EV-023）**：批次协调器，从文档内并发做到文档间并发
- **2026-09-15（EV-027）**：OCR 后端切 vlm-engine，材料表行级列位按内容校准
- **2026-09-16（EV-030）**：MinerU 云端适配器（未接生产默认路径）

## 待澄清

- 文档制度（PLAN.md / evolution/ / .scratch/ 四层分工）本身还没有 wiki 页。见 [[wiki/sources/业务设计]] 的「可抽出的原子」——这批原子目前都在「待建」状态
- 22 条规则的判定口径散在 24 个 Evolution 节点里，wiki 未覆盖。下一个样本要用到具体阈值时，得回 letter-auto 仓库读 `evolution/`，不要凭常识补

## 相关页面

已建档的 source 页：[[wiki/sources/业务设计]]、[[wiki/sources/agent-开发学习笔记]]、[[wiki/sources/harness学习笔记]]

图解：[letter-auto 架构、规则编排与并发演进](output/letter-auto-architecture.html)，见 [[wiki/outputs/图解索引]]

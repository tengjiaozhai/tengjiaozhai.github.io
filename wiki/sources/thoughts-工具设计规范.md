---
type: source
title: "thoughts/031 工具设计规范"
source_file: "thoughts/031_✅如果定义一个好的工具.md"
source_type: thought-batch
domain: ai
raw_digest: "268-e5e37b94"
lines: 268
captured: 2026-10-19
status: verified
tags: [llmentor, tool-design, contract]
entities: ["wiki/entities/agentscope"]
concepts: ["wiki/concepts/Skill-vs-Tool", "wiki/concepts/幂等与写入恢复"]
---

# thoughts/031 工具设计规范

## 这一篇覆盖什么

**工具是 LLM 与真实世界之间的合约。好的工具 = 好的合约。** Agent 里工具的好坏，和传统开发里接口的好坏评判标准差别很大 —— 这是本篇的立论。

267 行，七个维度逐一展开，是本仓唯一的工具设计规范。

## 七个维度

| 维度 | 核心要求 |
|---|---|
| **命名** | 动词_名词，一看就知道做什么 |
| **Description** | 写给 LLM 看的「使用说明书」，不是写给同事看的注释 |
| **参数设计** | 让 LLM 不需要猜 —— 枚举优先于自由文本，默认值明确 |
| **返回值** | 结构化、可解析、不返回模型用不上的字段 |
| **入参校验** | **在工具里防住 LLM 的幻觉**，不信任任何传入值 |
| **幂等提交** | 防重复创建 |
| （第七维度见原文后半，与本仓其他工具篇呼应） | — |

## 可抽出的原子

- **「合约」而非「接口」的定位** —— 传统接口的调用方是程序员，会读文档；工具的调用方是 LLM，只读 description 和 schema
- **入参校验必须放在工具里**（不只是 schema 校验）—— LLM 会幻觉出「看起来合法但业务上不存在」的参数，schema 拦不住
- **幂等提交防重复创建** → [[wiki/concepts/幂等与写入恢复]]
- **返回值设计原则**：模型用不上的字段不进返回值，直接关系上下文成本 → [[wiki/sources/thoughts-上下文工程]] 的工具返回裁剪

## 与其他笔记的重叠点

- **工具家族的具体实现** → [[wiki/sources/thoughts-工具家族定义]]（032–037 / 045 / 046 / 054 十一篇）
- **幻觉导致参数传错**：`thoughts/028`（[[wiki/sources/thoughts-路由与智能体协作]]）记录了一个具体案例（userId 传错）
- **Skill vs Tool 的判据** → [[wiki/synthesis/Skill-vs-Tool判据]]
- **工具的并行、重试、熔断** → [[wiki/sources/thoughts-工具并行与重试]]、[[wiki/sources/thoughts-工具熔断]]

## 本篇独有、别处没有的

1. **「合约」视角的完整论证** —— 为什么 Agent 工具的标准与传统接口不同
2. **Description 的写法要求** —— 写给 LLM 看，含「什么时候用」「什么时候不用」
3. **参数设计的具体规则** —— 枚举、默认值、必填/选填的取舍
4. **入参校验在工具内完成的理由** —— schema 只管类型，不管业务有效性

## 证据

- `thoughts/031_✅如果定义一个好的工具.md`（267 行，本仓最长的工具设计文档）

## 相关页面

- 工具在插件形态里的落点（Consumer 角色）→ [[wiki/synthesis/dsh-插件设计模式]]

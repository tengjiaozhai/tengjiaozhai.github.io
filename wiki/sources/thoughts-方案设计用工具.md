---
type: source
title: "thoughts/044 为什么方案设计不用 Skill 要用工具"
source_file: "thoughts/044_✅为什么行程方案设计不用Skill要用工具？.md"
source_type: thought-batch
domain: ai
raw_digest: "122-203b4794"
lines: 122
captured: 2026-10-19
status: verified
tags: [llmentor, skill, tool-design]
entities: ["wiki/entities/agentscope"]
concepts: ["wiki/concepts/Skill-vs-Tool", "wiki/concepts/Plan-Execute"]
---

# thoughts/044 为什么方案设计不用 Skill 要用工具

## 这一篇覆盖什么

行程规划流程分两个阶段，恰好对应两种能力：**数据收集天然适合 Skill**（调外部 API 本质是按文档拼命令参数，LLM 擅长理解「搜索上海到杭州的航班」然后映射到正确的 CLI 命令），**方案计算必须封装成 Tool**。

为什么？五个原因。

## 五个原因

| # | 原因 | 核心论证 |
|---|---|---|
| 一 | **组合爆炸，LLM 无法枚举** | 5 去程 × 3 酒店 × 4 返程 = 60 种组合。每种要算总价、总耗时、政策合规、偏好分，再全局归一化排序。让 LLM 做：60 × 200 token ≈ 12000 token 纯计算，且极易出错 |
| 二 | **归一化要求全局视野** | 排序需要看到所有候选才能归一化，LLM 逐条推理没有全局视野 |
| 三 | **政策合规不允许「差不多」** | 合规是布尔判断，错了要担责 |
| 四 | **上下文窗口经济性** | 12000 token 纯计算的成本 vs Java 毫秒级零 token |
| 五 | **输出结果不需要上下文感知** | 计算过程和对话上下文无关，不需要 LLM 的语言理解 |

原因五最容易被忽略：**如果一个计算不需要理解上下文，那它就不该用 LLM**。

## 代码对照

```java
// ItineraryPlannerTool.java —— buildCombinations 方法
for (Map<String, Object> ob : outbound) {
  for (Map<String, Object> hotel : hotelList) {
    for (Map<String, Object> ib : inbound) {
      Map<String, Object> combo = tryBuildCombo(ob, hotel, ib, ...);
      if (combo != null) combos.add(combo);
    }
  }
}
```

三层嵌套循环，毫秒级，零 token。

## 可抽出的原子

- **五个原因构成完整判据** → [[wiki/synthesis/Skill-vs-Tool判据]]
- **原因五的普适性** —— 「不需要理解上下文 → 不该用 LLM」是本仓最好的一个反向判据
- **「只报数不返回全文」** —— `ItineraryPlannerTool` 算完只返回「已生成 N 个候选方案」，方案本身存 Redis。避免 60 个方案的完整 JSON 灌进上下文
- **引用链设计** —— `ItineraryPlannerTool` 写 Redis，`ItineraryReviewTool` 读同一个 key

## 与其他笔记的重叠点

- **Plan-Execute**：方案计算是 Execute 阶段的核心 → [[wiki/concepts/Plan-Execute]]
- **更大的组合爆炸** → [[wiki/sources/thoughts-执行闭环]]（086 的 400 方案）
- **下单为什么反过来用 Skill** → [[wiki/sources/thoughts-下单用skill取消用工具]]（063）—— 与本篇形成对照：计算用 Tool，无中生有的写操作用 Skill
- **缓存** → [[wiki/sources/thoughts-工具缓存]]（039）

## 本篇独有、别处没有的

1. **60 种组合的 12000 token 测算** —— 本仓唯一的量化对比
2. **五个原因的完整论证** —— 其中最普适的是原因五
3. **「只报数」的接口设计** —— 工具只返回计数，方案存 Redis
4. **两阶段对应两种能力的清晰划分** —— 数据收集 vs 方案计算

## 证据

- `thoughts/044_✅为什么行程方案设计不用Skill要用工具？.md`（121 行）

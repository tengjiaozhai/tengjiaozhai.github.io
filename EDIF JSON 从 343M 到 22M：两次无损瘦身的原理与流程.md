---
title: EDIF JSON 从 343M 到 22M：两次无损瘦身的原理与流程
date: 2026-06-16
desc: 一次是结构重构、一次是数据去重，把 343MB 的 EDIF JSON 压到 22MB，全程不丢信息。
category: 原理图 / EDA
tags: [EDIF, JSON, 性能优化]
---

# EDIF JSON 从 343M 到 22M：两次无损瘦身的原理与流程

## 1. 结论先看



这次体积下降不是“压缩文件”带来的，而是 **数据组织方式重构** 带来的。



- 原始单文件 JSON：`334,442,618` bytes（约 319 MiB，习惯口径约 343M）
- 第一次改进后（V1 bundle）：`57,826,426` bytes（约 55 MiB）
- 第二次改进后（V2 hybrid bundle）：`24,417,823` bytes（约 23.29 MiB，工程口径常写 22\~23M）

整体缩减约 `92.7%`，且保持无损可逆。



![图片展示了EDIF Export的三阶段数据大小缩减流程。第一阶段是V0单文件JSON，大小为343MB；第二阶段是V1列式JSON捆绑包，大小缩减至55MB，通过拆分表、列式数组、字典编码等优化；第三阶段是V2混合捆绑包，大小进一步缩减至22 - 23MB，将RawNodes转换为Parquet，将source_path转换为source_node_idx，还进行了遗留表清理。整体缩减约92.7%，体现了数据压缩的原理与流程。](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MTA4MWM3MTJhZTY4NDliYjVhYWM2YThmYzFjMDU0Y2NfZWM4M2Y2MTIwNDMxMjliZTk2NmJkY2NkM2Y5OGJmMjJfSUQ6NzY0MTgwMzU1NzE2MzA0NDA1NF8xNzgxNTk0ODQ5OjE3ODE1OTg0NDlfVjM)



![图片为“UTAH EDIF Export Size Comparison”图表，对比了原始单文件JSON、V1 JSON bundle、V2 hybrid bundle的文件大小及压缩比例。原始单文件JSON为343MB，V1 JSON bundle为55MB，V2 hybrid bundle为22 - 23MB，整体压缩比例达92.7%。图表底部说明压缩是通过结构重设计实现的，而非数据丢失。该图与文档中介绍EDIF JSON瘦身流程的上下文相关，直观呈现了各版本文件大小及压缩效果。](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YzBhYmI5OWJhY2ZlNzhhNzBjY2U3YTMxNjM3YWM4MjNfOTY4ODBhYTRjYWYwN2Y5Y2IzNzRmNjA3NzUwYmIwMzlfSUQ6NzY0MTgwMzU3MzU3MTA5NTc1NV8xNzgxNTk0ODQ5OjE3ODE1OTg0NDlfVjM)

---

## 2. 背景：为什么原始 JSON 会大

原始形态是一个超大对象数组，问题主要在三点：

1. 键名重复：每行都重复字段名（例如 `source_path`、`instance_id`）。
2. 路径字符串重复：同一 `source_path` 在多张表大量重复。
3. `RawNodes` 高占比：原始结构追踪字段（`node_path/parent_path/depth`）文本冗余高。

在 UTAH 样本里，单 `RawNodes.json` 就接近 30MB，是首要大头。

---

## 3. 两次改进做了什么

### 3.1改进一（343M -> 55M）：先把大麻袋整理成收纳架

#### 大白话策略

原来的 JSON 就像“把全屋东西塞进一个袋子”，每件物品都重复写一遍说明文字，当然会很大。

第一步做的是“先整理再存”：

1. 分片：一个大文件拆成很多小表（`manifest + sheets/*`）。
2. 列式：把“同类信息”竖着放在一起（`columns + data`）。
3. 字典编码：高频词改短编号（只有更省空间才启用）。
4. RawNodes 紧凑化：把长路径文字改成父子索引（`parent_idx`），还能反推回来。

核心效果：先解决“重复键名”和“重复文本”。

![图片展示了将343M的单体JSON改进为55M的过程，形象地比喻为先把大杂物间整理成分类收纳。左侧是装满杂乱内容的343M单体JSON纸箱，右侧是分类收纳后的manifest + sheets结构，包括节点表等多种文件。下方有四个步骤：一是分片，将大包拆成小包；二是列式，把同类数据放一列；三是字典编码，高频词改成短编号；四是RawNodes紧凑化，路径文字改成父子索引。核心效果为减少重复键名和重复文本。](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MWNkYjBmMTY3NDNhZGY1MjYwODMzZDYzYmQ2OWQzNTNfYmY0OTA4MjkzMTg1YTA1ZDE5OGI1YWEzYjg5MTU4OTJfSUQ6NzY0MTkwMzIwNjMxNDgwNjQ3NF8xNzgxNTk0ODQ5OjE3ODE1OTg0NDlfVjM)

#### 对应代码位置

- 行转列：`_rows_to_columnar`
- 字典编码：`_try_dict_encode`
- RawNodes 紧凑化：`_rawnodes_to_compact`
- RawNodes 还原：`rebuild_rawnodes_full_paths`

---

### 3.2. 改进二（55M -> 22\~23M）：专治“最占空间的大头”

#### 大白话策略

第一步后虽然小了很多，但还有两个“大头”：

- `RawNodes` 文本太重
- `source_path` 长路径在多张表反复出现

第二步就专打这两点：

1. `RawNodes` 从 JSON 换成 Parquet（默认 `zstd`），同样内容更省空间。
2. 把 `source_path` 改成 `source_node_idx`（行号 ID），长地址改短门牌号。
3. 导出前清理 legacy `sheets/`，避免新旧文件混一起导致“看起来没变小”。

核心效果：继续无损，但把最大冗余砍掉。

![图片展示了V1 bundle（55M）优化至V2 hybrid（22~23M）的改进内容。左侧V1 bundle包含RawNodes（大文本）、source_path（长地址）和旧sheets目录（冗余）。右侧优化后，使用Parquet格式存储RawNodes，将source_path改为source_node_idx，导出前清理旧sheets目录。核心效果是专治大头冗余，继续无损缩小。该图与上下文紧密相关，直观呈现了改进前后的结构变化及优化策略。](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MzY1ZTllNmM3MjhjODE2ZTdiNDgwZWRiYzI5OGE2NmRfNTJhOWE1NjQxNDA0Y2YwMDM5ZWQ4ZTNjZTMyMjdjZGVfSUQ6NzY0MTkwMzQ2NDQ5MDM1NTY3Ml8xNzgxNTk0ODQ5OjE3ODE1OTg0NDlfVjM)

#### 对应代码位置

- V2 导出入口：`export_full_edif_bundle`
- 路径改索引：`_replace_source_path_with_node_idx`
- 读取时还原路径：`_restore_source_path_from_node_idx`
- RawNodes 写 Parquet：`write_parquet_sheet(... RawNodes.parquet ...)`
- 清理旧目录：`for stale_dir in (out / "semantic", out / "raw", out / "sheets")`

---

## 4. 执行流程（命令视角）

### 第一步：跑导出

```Bash
cd /Users/shenmingjie/tinno/awesome-tinno-skills/domains/hardware/tinno-hw-edif-data-extractor/opt/anaconda3/envs/py311/bin/python3 -m scripts.schcompare_cli \  edif-export /Users/shenmingjie/tinno/hardware-diagram/UTAH_MB_SCH_V1.EDF \  -o /Users/shenmingjie/tinno/output/edf2excel/UTAH_MB_SCH_V1.xlsx \  --json /Users/shenmingjie/tinno/output/edf2excel/UTAH_MB_SCH_V1_bundle
```

### #第二步：看结果大小

- 原始 JSON：`334,442,618` bytes
- V1：`57,826,426` bytes
- V2：`24,417,823` bytes

总缩减：`92.70%`。

---

## 5. 本次样本验证数据（UTAH）

关键阶段尺寸：

- 原始单文件 JSON：`334,442,618` bytes
- V1 bundle：`57,826,426` bytes
- V2 bundle：`24,417,823` bytes

分阶段缩减率：

- 第一次改进（V0 -> V1）：`82.71%`
- 第二次改进（V1 -> V2）：`57.77%`
- 总体（V0 -> V2）：`92.70%`

V1 主要大头（旧）：

- `RawNodes.json`：`29,566,505` bytes
- `InstanceProperties.json`：`10,121,827` bytes
- `Displays.json`：`7,408,909` bytes
- `Geometry.json`：`6,148,626` bytes

V2 主要大头（新）：

- `raw/RawNodes.parquet`：`4,531,594` bytes
- `semantic/Displays.json`：`7,408,909` bytes
- `semantic/InstanceProperties.json`：`6,284,433` bytes
- `semantic/Geometry.json`：`2,301,157` bytes

说明：`Displays` 这类字段天然文本信息密度高，已是下一阶段可选优化点；但当前 22\~23M 的核心收益已经主要由两次结构性改造完成。

---

## 6. 一句话总结

这次不是“压缩算法魔法”，而是把数据从“重复文本堆积”重构为“可索引、可复用、可逆”的工程化存储：先列式与编码，再将最重表 Parquet 化并去掉跨表路径重复，因此在无损前提下实现了 `343M -> 22~23M`。

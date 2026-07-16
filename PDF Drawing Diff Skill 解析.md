---
title: PDF Drawing Diff Skill 解析
date: 2026-06-16
desc: Skill 把 PDF 图纸比对做成可追溯的审查证据，CLI、环境变量与输出结构都做了规范化。
category: 原理图 / EDA
tags: [PDF, Diff, Skill]
---

<title>PDF Drawing Diff Skill 解析</title>

- 它输出的不是黑盒结论，而是可追溯的审查证据
- 它对 CLI 参数、环境变量和输出结构都做了规范化，适合重复执行

## 核心能力

- 差异具体落在哪个区域

这个 skill 的本质，不只是"比较两张图"，而是把图纸比对从一次临时动作，升级成一个可复用、可审计、可沉淀的审查流程。它特别适合工程文档、制造图纸、版本评审这类"既要发现差异，也要留下证据"的任务。

1. 合并 OCR 差异与视觉差异，绘制最终标注框

## 输出产物

- 多个 PDF 图纸版本比对
- OCR 文本差异核查

1. 对差异区域生成结论和说明

- `pipeline_annotated_timestamp.pdf`
- 它支持多个版本输入，但自动拆成 pairwise 结果，方便对比和归档

1. 如存在同名 DWG，则提取 DWG 字符串作为辅助线索

- 使用 GLM-OCR 提取 `text_line`、`table_row` 及其 bbox

## 当前边界

- 当前版本默认只比较第一页
- 运行时间可能较长，因为每一对图都可能触发 OCR 和 VLM 多轮分析

1. 接收至少两份 PDF 的本地路径

- 不允许自动扫描目录
- `near_mismatch` 会保留在 JSON 和 Markdown 中，但不会画成 bbox
- 将 PDF 首页渲染成 PNG，用于后续视觉和 OCR 分析

## 一句话定义

- `rendered/label/page_001.png`
- 需要输出 JSON、Markdown、PDF 审查报告的场景

## 输入要求

## 适用场景

- `B_annotated.png`
- 它能自动关联 DWG，说明设计时已经考虑图纸文件生态

# PDF Drawing Diff Skill 解析

1. 将每份 PDF 的第一页渲染为 PNG
2. 对每张图运行 OCR，提取文本块和表格行

- 对 OCR 结果做文本差异总结

1. 调用 VLM 做双图差异理解

- 它不是单一算法，而是一条完整的审查流水线

## 工作流程

- 生成最终标注图、差异热力图、结构化 JSON、Markdown 报告和汇总 PDF

`pdf-drawing-diff` 的价值就在于把这些环节统一起来，形成一套标准化的图纸差异审查流程。

- 支持 N>=2 个 PDF，同一次任务可自动生成全部两两组合
- 必须由用户显式提供至少 2 个本地 PDF 路径
- 依赖外部模型配置，如 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`ZAI_API_KEY`

每次运行会生成一个独立结果目录，典型内容包括：

- 可选传入 `--dwg label=path` 显式绑定 DWG
- 哪些变化值得人工关注
- 可自动发现同目录下的同名 DWG 文件作为辅助信息

## 我的理解

- 可以直接传多个 `--pdf`

1. 自动生成所有两两组合

## 这个 skill 的亮点

- `A_vs_B_heatmap.png`

1. 输出 JSON、Markdown、PDF 和标注图

| 图像处理 | OpenCV | 图像对齐和差异检测 |
|------|------|------|
| 差异算法 | SSIM | 结构相似性指数 |
| 报告生成 | Markdown | 结构化差异报告 |

### 4.3 差异检测算法

```PowerShell
# 伪代码
def detect_diff(image1, image2):
    # 1. 图像对齐
    aligned1, aligned2 = align_images(image1, image2)
    
    # 2. 计算结构相似性
    score, diff_map = compare_ssim(aligned1, aligned2, full=True)
    
    # 3. 阈值处理
    changes = threshold(diff_map, threshold=0.95)
    
    # 4. 连通区域分析
    regions = find_connected_regions(changes)
    
    return regions
```

## 5. 使用方法

### 5.1 基本用法

```PowerShell
# 通过 delegate_task 调用
delegate_task(
    goal="比较两个PDF图纸的差异",
    context="""
    文件1: /path/to/drawing_v1.pdf
    文件2: /path/to/drawing_v2.pdf
    输出要求：生成差异报告和对比图像
    """,
    toolsets=["terminal", "file", "vision"]
)
```

### 5.2 命令行用法

```CoffeeScript
# 使用技能
hermes skills run pdf-drawing-diff \
  --file1 schematic_v1.pdf \
  --file2 schematic_v2.pdf \
  --output diff_report.md
```

### 5.3 批量对比

```PowerShell
# 批量比较多个版本
files = ["v1.pdf", "v2.pdf", "v3.pdf", "v4.pdf"]
for i in range(len(files)-1):
    compare(files[i], files[i+1])
```

## 6. 最佳实践

### 6.1 输入文件准备

- \*\*相同格式\*\*：确保两个文件格式一致
- \*\*相同分辨率\*\*：PDF 渲染时使用相同 DPI
- \*\*相同页面\*\*：比较相同页面内容

### 6.2 参数调优

| 参数      | 推荐值    | 说明      |
| ------- | ------ | ------- |
| DPI     | 300    | 图像渲染分辨率 |
| SSIM 阈值 | 0.95   | 差异检测灵敏度 |
| 最小区域    | 100px² | 忽略微小变化  |

### 6.3 输出解读

- \*\*高 SSIM 分数\*\*（>0.95）：几乎无变化
- \*\*中等 SSIM 分数\*\*（0.8-0.95）：局部变化
- \*\*低 SSIM 分数\*\*（<0.8）：重大变更

## 7. 常见问题

### 7.1 图像未对齐

\*\*问题\*\*：两个图纸位置偏移导致误报

\*\*解决\*\*：使用图像对齐预处理

### 7.2 微小变化过多

\*\*问题\*\*：渲染差异导致大量误报

\*\*解决\*\*：提高 SSIM 阈值或设置最小区域过滤

### 7.3 多页 PDF

\*\*问题\*\*：PDF 包含多个页面

\*\*解决\*\*：逐页比较，或指定页码范围

### 7.4 矢量 vs 位图

\*\*问题\*\*：矢量 PDF 和位图 PDF 比较困难

\*\*解决\*\*：统一转换为相同格式后比较

- 也可以用 `--label 名称=路径` 给每份图纸显式命名
- 使用 VLM 对双图进行粗粒度差异分析
- 多个版本之间该如何系统性输出审查结果
- 改的是结构还是文字

1. 对每一对图执行像素差异分析，生成 heatmap 和 overlay

- 结合 heatmap、callout、geometry ROI 做更细粒度差异定位
- `report.md`

1. 汇总 OCR 文本差异

`pdf-drawing-diff` 是一个用于多份 PDF 图纸差异分析的技能，能够自动完成图纸渲染、OCR 文本提取、视觉差异识别、差异框定位和审查报告生成，适合工程图、爆炸图、BOM 标注和版本变更审阅场景。

- 需要对差异区域做 bbox 标注定位的场景
- BOM 或标注项变化检查
- 如何把结果沉淀成可复查、可归档的报告

## 它解决什么问题

- `A_annotated.png`
- 爆炸图差异分析

1. 基于 ROI、callout、geometry 区域进行 grounding

传统图纸对比通常只能看到像素级不同，但很难回答这些问题：

- `pipeline_result_timestamp.json`
- 它把"文字变化"和"视觉变化"一起考虑，更接近真实工程场景
- 合并 OCR 文本差异和视觉 grounding 结果
- `A_vs_B_overlay.png`

### 流程图

<readonly-block type="isv"></readonly-block>

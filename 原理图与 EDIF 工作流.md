---
title: 原理图与 EDIF 工作流
date: 2026-10-16
desc: 从读懂 EDF/EDIF，到 JSON 无损瘦身、PDF Drawing Diff，再到原理图 AI 评审的一条工作流笔记。
category: 原理图 / EDA
tags: [EDF, EDIF, JSON, PDF, Diff, 原理图, AI 评审]
---

# 原理图与 EDIF 工作流

> 四篇合并：读懂 EDF → EDIF JSON 瘦身 → PDF Drawing Diff → 原理图 AI 评审。飞书内链图片 URL 原样保留。

---

## 一、读懂 EDF / EDIF 原理图

> **文件来源**：`UTAH_MB_SCH_V1_EDF`.EDF（内容为 EDIF 2.0.0 格式）  
> **适用读者**：硬件初级工程师、跨岗位工程师（软件 / 测试 / 产品）  
> **阅读目标**：能看懂这套原理图"在说什么"、"怎么组织"、"各页之间怎么连"  

---

## 目录

1. 这份文件到底是什么？
2. 第一关：EDIF 专业术语解释
3. 第二关：硬件电路专业术语解释
4. 整体系统架构——手机主板的"地图"
5. 42 页目录与功能分区详解
6. 原理图符号设计——图上画的那些东西是什么
7. 关键芯片引脚说明
8. 各页之间的关系——信号如何跨页流动
9. 附录：术语速查卡片

---

## 1. 这份文件到底是什么？

![图片展示了EDF文件的生成流程，以建筑图纸和手机电路图为例。建筑图纸通过CAD软件生成.dwg文件，手机电路图通过OrCAD软件生成EDIF文件。EDIF文件是用OrCAD Capture画好电路图后，通过cap2edif工具导出的交换格式文件，记录了图上放的芯片、电阻、电容，元件间连接方式，每根线的名字，以及图的页数和每页名称。此图直观呈现了EDF文件的生成背景及内容记录，与上下文对EDF文件本质的解释相契合。](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MTZkMTJhMGI4NzJlN2Y1NTJhNWJkY2Q2NDIxYzJkZGFfZWE4MjdkMWMxZjAxNWIzZmUzMWQ5ZTY4YjNhYjY2MDhfSUQ6NzYzNDEyNzk3NDY1Njg3MTYzM18xNzgxNTk0ODgwOjE3ODE1OTg0ODBfVjM)

### 1.1 先消除最大的误解

拿到 `UTAH_MB_SCH_V1_EDF.EDF` 这个文件，很多人会以为它是一篇普通的说明文档（因为后缀是 `.EDF`）。  
**但它根本不是文档——它是一张电路图的"数字底稿"。**

把它想象成这样：

```Plain Text
建筑图纸  →  CAD 软件  →  导出 .dwg 文件
手机电路图 →  OrCAD 软件 →  导出 EDIF 文件
```

这个文件是用 **OrCAD Capture**（业界主流电路图设计软件）画好电路图之后，通过 `cap2edif` 工具导出的**交换格式文件**。它记录了：

- 图上放了哪些芯片、电阻、电容
- 这些元件之间用什么线连接
- 每根线叫什么名字
- 图被分成了多少页，每页叫什么

> **一句话总结**：这不是给人"读"的文章，而是给 EDA 软件"解析"的电路数据。  
> 但只要掌握结构，人也完全可以从中读出完整的系统设计信息。

### 1.2 文件的基本体量

<sheet sheet-id="RbXL9x" token="DhfZstRQxhzozWtrpyucX7ZNnwh"></sheet>

---

## 2. 第一关：EDIF 专业术语解释

EDIF（Electronic Design Interchange Format，电子设计交换格式）是一套国际标准，用来在不同 EDA 工具之间传递电路图数据。

下面逐一解释文件里最常出现的术语。

![图片以“第一把钥匙：看懂图纸的数据语言（EDIF）”为标题，展示了EDIF文件结构的类比示意图。图中“edif（整个工厂）”包含“library（零件仓库）”，“library”下有“cell（模具）”和“instance（流水线上的实物）”，“instance”旁有“designator（ID编号）”，“net（网络/导线）”贯穿其中。该图与上下文紧密相关，直观呈现了EDIF文件中“edif”“library”“cell”“instance”“net”等术语的层次关系，帮助理解EDIF文件的结构。](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=M2VhMGEyNDRlMGE5ZDY4MjRjMWY1ZjVlNDYyZWVjYTRfNmJhNzE5N2EyODU2MTQ2Zjg0ZjU5MDdkYzA1NjczYTBfSUQ6NzYzNDEyODAzNzY1MTE3MjMwMl8xNzgxNTk0ODgwOjE3ODE1OTg0ODBfVjM)



---

### 2.1 `edif` — 根对象

```Plain Text
(edif D__TEST_SCH_0416_EDIF_UTAH_MB_SCH_V1_EDF
  (edifVersion 2 0 0)
  ...
)
```

**白话**：整个文件的"大括号"，相当于 JSON 的最外层 `{}`。  
`edifVersion 2 0 0` 表示使用的是 EDIF 版本 2.0.0。

---

### 2.2 `library` — 元件符号库

**白话**：图纸里放的每一个芯片符号、电阻符号、连接器符号，都来自某个"符号库"。  
`library` 就是这些符号的"仓库"。

这份文件共有 **69 个 library**，分为三类：

<sheet sheet-id="c90BsB" token="DhfZstRQxhzozWtrpyucX7ZNnwh"></sheet>

---

### 2.3 `cell` — 单元定义

**白话**：library 里的每一个"零件模板"就叫 cell。  
比如 `CPU_MTK_MT6835G` 是一个 cell，定义了这颗 CPU 芯片长什么样（引脚名、形状）。

> 类比：cell 就像 Word 里的"样式模板"，定义好了格式但还没放到文档里。

---

### 2.4 `view` — 视图

**白话**：同一个 cell 可以有不同的"展示方式"。  
在原理图里，view 通常是 `SCHEMATIC`（原理图视图）或 `GRAPHIC`（图形视图）。

---

### 2.5 `instance` — 元件实例

**白话**：把某个 cell 实际"放到图上"，就产生了一个 instance（实例）。  
例如：图上放了两颗同款内存颗粒，就有两个 instance，但它们引用同一个 cell 定义。

这份文件有 **2,118 个实例**，包含：

- 芯片（U 开头，如 `U1000`）
- 电阻（R 开头，如 `R3724`）  
- 电容（C 开头，如 `C5409`）
- 连接器（J 开头，如 `J5401`）
- 电感、二极管、开关等

---

### 2.6 `designator` — 位号（件号）

**白话**：图上每个元件的"身份证号码"，用于在 BOM 料单、PCB 板子上精确对应。

<sheet sheet-id="RXLJW5" token="DhfZstRQxhzozWtrpyucX7ZNnwh"></sheet>

---

### 2.7 `net` — 网络（连线）

**白话**：原理图上连接各个引脚的"电线"叫 net（网络）。  
每条 net 都有一个名字，如 `DVDD_CORE`（数字核心电源）、`GND`（地）、`&33W_CHG_INT`（33W 充电中断信号）。net 是同一个电气节点，不一定是肉眼看到的一根连续线。

**常见规律**：

- 名字以 `VDD`、`DVDD`、`AVDD` 开头 → 通常是**电源线**
- 名字以 `GND`、`AGND` 开头 → **地线**
- 其他名字 → **信号线**（数据、控制、中断等）

这份文件有 **1,604 个网络**。

---

### 2.8 `page` — 逻辑页面

**白话**：一套完整的电路图通常很大，无法放在一页上，因此拆成多页。  
每个 `page` 就是一张"分图"，相当于一本书的一个章节。

这份文件有 **42 个 page**，每页负责一个功能模块（如 CPU 供电、充电电路、射频前端…）。

---

### 2.9 `offPageConnector` — 跨页连接点

**白话**：当一个信号需要从第 10 页传到第 37 页，就在两页各放一个"跨页连接器"，标上相同的网络名，表示它们在电气上是同一根线。

这份文件有 **724 个跨页连接点**——这意味着有大量信号在各页之间流动。

> 类比：跨页连接点就像书里的"见第 XX 页"引注——告诉你这根线的另一端在别的页上。

---

### 2.10 `libraryRef / cellRef / viewRef` — 三元引用

**白话**：每个实例放到图上时，都要说明"我来自哪个库、哪个单元、哪个视图"，这三个引用就是"出生证明"。

```Plain Text
instance U3700 来自：
  libraryRef = IC（器件库）
  cellRef    = POW_CHARGE_SC89890HQDLR（充电芯片的单元定义）
  viewRef    = SC89890HQDLR（对应视图）
```

---

### 2.11 `TitleBlock` — 标题框

**白话**：每页图纸右下角（或边框区域）显示的版本号、项目名、日期等信息块。  
这份文件混用了两套标题框模板：

- `TitleBlock0`：较早的通用模板
- `title_TINNO`：TINNO 公司自定义模板

这种不一致说明这套图纸**历经多次修改、可能从旧项目迁移而来**。

---

## 3. 第二关：硬件电路专业术语解释

理解完 EDIF 格式，再来看电路本身的核心概念。

![图片是“第二把钥匙：核心硬件‘黑话’对比矩阵”示意图，分为三大板块。左侧板块介绍“大脑与血液（计算与供电）”，包含SoC（MT6835）和PMIC（MT6319/6377A）；中间板块是“存储双雄（RAM vs ROM）”，有DDR4X和UFS；右侧板块为“射频双核（收发隔离）”，包含PA和LNA。底部标注BTB/FPC（物理连接）和MIP/ I2C/SPI（数据总线）。该图与上文介绍的SoC、PMIC、DDR4X、UFS、PA、LNA等硬件术语对应，直观呈现硬件功能。](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MDlkN2E4ODY3MGM0YWI2NGY2OGJlNWRmYzI5N2I2ODJfY2NhMDA5NGRkNDhiMTk3YjhhMDRkYWZkY2E3YWQ3MmVfSUQ6NzYzNDEyODA3NzI3NDQ1MDkwOV8xNzgxNTk0ODgwOjE3ODE1OTg0ODBfVjM)



---

### 3.1 SoC / 基带芯片 — MT6835

**SoC**（System on Chip，片上系统）是手机的"大脑"，把 CPU、GPU、基带、图像处理等功能全集成在一颗芯片里。

**MT6835** 是联发科（MediaTek）的 4G/5G 基带+应用处理器，这套图里的型号变体有：

<sheet sheet-id="QYPaJa" token="DhfZstRQxhzozWtrpyucX7ZNnwh"></sheet>

> **为什么拆成多个部分？** 一颗 SoC 有数百个引脚，放在一页上会密密麻麻看不清。OrCAD 支持把一个芯片拆成多个"part"分布在不同页，但逻辑上它们还是同一颗芯片。

---

### 3.2 PMIC — 电源管理芯片

**PMIC**（Power Management IC，电源管理集成电路）负责把电池或外部充电电压，转换成手机各模块需要的不同电压。

这套图里有两颗主要 PMIC：

<sheet sheet-id="hh2zGW" token="DhfZstRQxhzozWtrpyucX7ZNnwh"></sheet>

**BUCK（降压变换器）**：把高电压变成低电压，效率高，适合大电流场景（如 CPU 核心供电）。  
**LDO（低差压线性稳压器）**：输出噪声极低的干净电源，适合对噪声敏感的模拟电路（如射频、音频）。

---

### 3.3 DDR4X — 运行内存

**DDR4X**（Double Data Rate 4X）是手机的运行内存（RAM）。这套图里用了两颗：

- `DDR4_DIS_K4UBE3D4AB_MGCLA`
- `DDR4_DIS_K4UBE3D4AB_MGCLB`

> **类比**：DDR 内存就像桌面上的工作台——越大越能同时处理更多任务，但断电就没了。

---

### 3.4 UFS — 闪存存储

**UFS**（Universal Flash Storage，通用闪存存储）是手机的内部存储（相当于电脑的固态硬盘 SSD）。  
这套图里用的是 `MEM_UFS_YMUS6A4TB1A2C1`。

> **类比**：UFS 就像抽屉——数据长期存放，断电不丢。

---

### 3.5 PA / LNA — 射频放大器

<sheet sheet-id="W72h7C" token="DhfZstRQxhzozWtrpyucX7ZNnwh"></sheet>

这套图里 PA 覆盖了 Sub-6GHz 全频段（低频/中频/高频），型号如 `FX5627S`、`FX5627Z`。

---

### 3.6 FEM — 射频前端模块

**FEM**（Front-End Module，前端模块）把 PA、LNA、开关、滤波器等多个射频器件集成在一个封装里。  
这套图里 Wi-Fi FEM 用的是 `RF_FEM_RTC66202` 和 `RF_FEM_RTC7637S`。

---

### 3.7 NFC — 近场通信

**NFC**（Near Field Communication）是手机支付、门禁、碰碰传文件等功能的无线通信技术。  
这套图里用的是恩智浦（NXP）的 `RF_NFC_SN220E`。

---

### 3.8 OVP — 过压保护

**OVP**（Over Voltage Protection）在充电口检测到异常高压时切断电路，保护手机不被烧坏。  
这套图里充电保护芯片 `POW_OVP_AW32905FCR` 就是做这个的。

---

### 3.9 SAR — 比吸收率感知

**SAR**（Specific Absorption Rate，比吸收率）是衡量手机射频对人体辐射量的指标。  
SAR 感知芯片（如 `SENSOR_SAR_SX9375IULTRT`）实时检测手是否靠近天线，若靠近则主动降低发射功率。

---

### 3.10 BTB / FPC — 连接器类型

<sheet sheet-id="twN6AK" token="DhfZstRQxhzozWtrpyucX7ZNnwh"></sheet>

---

### 3.11 ESD — 静电保护

**ESD**（Electrostatic Discharge，静电放电）防护器件用来保护芯片引脚不被人体静电击穿。  
通常以 TVS 二极管、ESD 阵列形式出现在各接口旁边。

---

## 4. 整体系统架构——手机主板的"地图"

下面这张图展示了 UTAH_MB 主板的整体功能分层架构：

![图片展示了基于UTAH_MB_SCH_V1_EDF的422页图理图，共2118个元件实例。图中以黑色边框框出各功能模块，如用户交互层、CPU电源管理、电源管理、存储层等。各模块间通过不同颜色的线条连接，线条上标注有元件名称及序号，如CPU电源管理模块有CPU电源管理1、2、3等。图例部分标注了不同线条类型，如实线、虚线等，还标注了各功能模块的名称。该图与上下文介绍的UTAH_MB主板整体功能分层架构相呼应，直观呈现了系统架构。](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZTk4OTAyYjg1NDc2NmM0ODdkZGFiYWEzZTVkOGFmMWJfODBmZDMzNDhkN2IxZmRmMDU1OWRiYWMwMTg4ZDBkYmFfSUQ6NzYzNDEyODEzNDQwNjgzNTE1M18xNzgxNTk0ODgwOjE3ODE1OTg0ODBfVjM)



<readonly-block type="isv"></readonly-block>

---

### 4.1 文件层级结构

EDIF 文件本身也有清晰的层次结构：

<readonly-block type="isv"></readonly-block>

---

## 5. 42 页目录与功能分区详解

![图片展示了手机核心系统模块复杂度分析，以不同颜色区域代表各功能域。其中，射频/无线区（橙色）包含PA、TXM、LNA、FEM、天线等，占全图复杂度极值点；基带/SoC（蓝色）、电源/PMIC（青色）、传感/外设（紫色）、存储（深蓝色）、音频（深蓝色）等区域也各有对应功能。该图与上下文紧密相关，直观呈现了手机各功能域的复杂度分布，印证了文档中“手机通信性能投入远超常规逻辑计算”的结论。](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YzNjMjNlNGZiZTM5ZTU4YTFjOTNmYmIyOGJhZWE3YjRfMjI4MDc3MjA4M2FkNTAxOTYwYzFjYzY4YzA0NjA5ZjBfSUQ6NzYzNDEyODE3NjIxODQxMDE2M18xNzgxNTk0ODgwOjE3ODE1OTg0ODBfVjM)

### 5.1 功能域实例数量对比

<readonly-block type="isv"></readonly-block>

> **结论**：射频部分占了将近一半的元件数量——这说明手机通信性能的工程复杂度远超其他部分。

---

### 5.2 完整页面目录

<sheet sheet-id="AcdxZn" token="DhfZstRQxhzozWtrpyucX7ZNnwh"></sheet>

---

## 6. 原理图符号设计——图上画的那些东西是什么

![图片展示了如何读懂一颗芯片图元，分为逻辑功能（软件视角）和物理位置（生产视角）两部分。逻辑功能部分以U1000E芯片为例，标注了外框矩形、引脚线、引脚名、位号、引脚号、位号、器件名等元素；物理位置部分以K26物理坐标为例，标注了外框矩形、引脚名、位号、引脚号、位号、器件名等元素。图片与上下文紧密相关，直观呈现了原理图符号的组成结构。](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ODNjZTU3Nzc4NjI4ODI4NzQ2YmY1NDM3ZTJmMmE2NWVfNzBlYTUyN2E4MDZhMDdjOGRiNGU5NDBiYmZjYWI0ZmJfSUQ6NzYzNDEyODIxMjQwNjUwNDY0M18xNzgxNTk0ODgwOjE3ODE1OTg0ODBfVjM)

### 6.1 符号的组成结构

原理图上每一个器件符号，都由以下几部分构成：

```Plain Text
┌─────────────────────────────────┐
│         器件符号外框（矩形）      │
│                                 │
│  ─[引脚线]─○  引脚名  引脚号    │  ← 左侧引脚
│                                 │
│  引脚名  引脚号  ○─[引脚线]─    │  ← 右侧引脚
│                                 │
│      U1000E                     │  ← 位号（designator）
│  CPU_MTK_MT6835                 │  ← 器件名（cellRef）
└─────────────────────────────────┘
```

<sheet sheet-id="VwCjPR" token="DhfZstRQxhzozWtrpyucX7ZNnwh"></sheet>

---

### 6.2 引脚的四种类型

在原理图符号里，引脚方向有四种，用来表达信号流向：

<sheet sheet-id="txnyVO" token="DhfZstRQxhzozWtrpyucX7ZNnwh"></sheet>

---

### 6.3 连接线的种类

<sheet sheet-id="t4ws5j" token="DhfZstRQxhzozWtrpyucX7ZNnwh"></sheet>

> **重要**：两条线交叉处**没有实心圆点**时，表示它们**不相连**，只是在图上看起来交叉了。  
> 必须有实心圆点（JUNCTION）才表示电气连接。

---

### 6.4 特殊图元说明

#### 电源符号

原理图里的电源不用画一根线从 PMIC 拉到每个用电器件（那样会乱成蜘蛛网），而是用**同名电源符号**表示相连：

```Plain Text
    VCC_1V8          VCC_1V8
       ▲                ▲
       │                │
    [芯片A]           [芯片B]
```

两个 `VCC_1V8` 符号在电气上是同一个网络，表示芯片 A 和芯片 B 都接到同一个 1.8V 电源。

常见电源网名规律：

<sheet sheet-id="RG11pR" token="DhfZstRQxhzozWtrpyucX7ZNnwh"></sheet>

#### 地符号

地符号（GND）通常是向下的三角形或三条横线，原理图里**所有 GND 符号都连在一起**，是整个电路的参考零电位。

---

## 7. 附录：术语速查卡片

### EDIF 格式术语

<sheet sheet-id="H0DVvA" token="DhfZstRQxhzozWtrpyucX7ZNnwh"></sheet>

### 硬件电路术语

<sheet sheet-id="7GsSVg" token="DhfZstRQxhzozWtrpyucX7ZNnwh"></sheet>

---
---
## 二、EDIF JSON 瘦身：343M → 22M

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
---
## 三、PDF Drawing Diff Skill

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
---
## 四、原理图 AI 评审方案

## 背景描述：

当前工具已经能够较好地支持自有原理图在不同版本之间的结构化比对，能够从器件、管脚、网络等维度识别新增、删除、属性变更、网络重命名和连接变化，适用于版本迭代过程中的差异追踪与人工复核。但在面对 MTK、高通等官方平台参考设计与公司自有设计之间的对比时，差异往往远大于普通版本变更，页面结构、器件位号、网络命名、模块划分和实现方式都可能存在较大偏移，导致传统规则式差异对比难以判断哪些差异是合理设计变更，哪些差异可能引入风险。因此，需要在现有结构化比对能力之上，引入大模型对原理图上下文、官方参考设计、公司规则和历史经验进行综合理解与评审，让模型基于差异证据进一步判断设计的合理性、潜在风险和优化方向，从而突破当前工具只能“发现差异”、难以“解释差异和评估设计优劣”的瓶颈。

```Markdown
Agent System Prompt / Soul

你是一个面向硬件原理图评审的 Schematic Review Agent。

你的使命不是替代硬件工程师做最终裁决，而是把官方参考原理图、自有设计原理图、公司规则知识库、历史案例、图片/表格知识和当前检索证据组织成可追溯的评审 finding，帮助工程师更快定位风险、理解差异和形成判断。

核心原则：
1. 证据优先：所有结论必须基于 evidence pack 中的证据，不允许凭空补全、不允许把常识当成项目事实。
2. 结构化评审：必须围绕器件、管脚、网络、页面、模块、规则和历史案例输出判断，而不是输出泛泛建议。
3. 区分评审模式：有官方参考原理图时，重点判断“自有设计相对官方参考设计的差异是否合理”；没有官方参考原理图时，只能基于公司规则知识库和目标设计事实做合规性与风险提示。
4. 保守表达：证据不足时必须明确输出“需人工确认”，不能把不确定内容包装成确定结论。
5. 可追溯：每个 finding 必须引用 evidence_id，并说明证据来自设计差异、规则文档、视觉摘要、历史案例或人工反馈。
6. 工程语言：输出要让硬件工程师可直接评审，包含风险等级、影响对象、判断依据、建议动作和需要人工确认的点。
7. 持续学习：当工程师纠正结论、补充规则或确认误报/漏报时，必须把反馈沉淀为可复用的学习记录，经过验证后再提升为规则、profile、检索策略或提示词改进。

禁止行为：
- 不直接读取完整 EDF 后凭感觉判断。
- 不把图片 asset_id、本地路径、临时文件名当成业务证据。
- 不引用 evidence pack 之外的内容作为结论依据。
- 不在无官方参考原理图时声称某个设计点偏离了 MTK、高通等官方平台参考。
- 不把未经人工确认的单次反馈直接升级为稳定规则。
```

来源：当前 `schematic-review-rag` 初步实现  参考风格：飞书云文档《EDF手机主板原理图 · 小白解读指南》  适用读者：硬件负责人、原理图评审工程师、AI 平台工程师、数据平台工程师  阅读目标：理解这套方案要解决什么问题、系统如何工作、每个模块承担什么责任，以及后续讨论应聚焦哪些设计取舍。

## 目录

1. 这套方案到底是什么？
2. 方案中的关键对象
3. 总体架构地图
4. 知识文档如何变成可检索证据
5. 设计图如何进入评审流程
6. RAG 如何减少幻觉
7. LLM 在系统中的边界

## 这套方案到底是什么？

![](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=OGFiMjAzNzM2ZGRiNmZmOWJjYTI2ZGM0MmVlZDExNWFfOTUwMGIxYmYzNTFiODc5ODJhNTY5YTNlYjkwNDc3OWZfSUQ6NzYzNjk2Mjk4OTE1MzAyOTMyOV8xNzgxNTk0ODc3OjE3ODE1OTg0NzdfVjM)

这套方案不是一个“把 EDF 文件丢给大模型，然后让它直接评价好坏”的工具。

它更接近一个面向原理图评审的证据组织系统：先把官方参考设计、自有设计、公司规则文档、图片表格知识和历史经验拆成可查询、可引用、可追溯的数据，再让大模型只基于这些证据输出评审意见。

它要解决的核心问题有三个：

- EDF/EDIF 数据太大，不能一次性塞进模型上下文。
- 原理图设计差异复杂，不能只靠简单文本对比判断合理性。
- 公司经验文档里有大量图片、表格、测试截图和口径描述，直接切 chunk 会产生噪声，甚至把本地临时图片路径当作证据。

所以系统的基本思路是：数据先结构化，证据先检索，结论再生成。

## 方案中的关键对象

### 2.1 设计文档

设计文档指官方参考 EDF 和自有设计 EDF。系统会把 EDF/EDIF 抽取成结构化 fact nodes，包括元件实例、网络、页面、模块、位号、网络名等信息。

设计文档承担两个角色：

- 官方参考设计：作为平台原始设计或标准设计的比较基准。
- 自有设计：作为需要评审的目标设计。

### 2.2 知识文档

知识文档指公司标准、经典问题分析、平台设计规则、历史评审经验等材料。

这类材料的问题不是“没有文字”，而是内容形态不稳定：Word 里有正文、表格、图片、公式、截图、图片域路径。系统需要先把它们拆成干净的结构化元素，再决定哪些内容适合进入检索。

### 2.3 证据包

证据包是给 LLM 的输入，不是原始数据库内容的简单拼接。

一个合格证据包至少要包含：

- evidence_id：每条证据的唯一标识。
- evidence_type：证据来源类型，例如规则、设计差异、视觉摘要。
- text：可被模型阅读的证据正文。
- metadata：检索来源、向量距离、父元素、图片资产、视觉路由等追溯信息。

LLM 输出的每个 finding 都必须引用 evidence_id，否则结论不可追踪。

### 2.4 finding

finding 是结构化评审结论，代表系统对某个风险、优点、疑点或证据不足点的表达。

它不是最终裁决，而是工程师评审前的证据化草稿。工程师可以据此快速定位规则、差异和判断依据。

## 总体架构地图

![](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NjUwNTAxMWU1MmNkNjJhZDllMTI4MjA3MzcyYTVmNTRfNjU4ZDFlMGQxNDAxY2EwYjM2YWFlMDlkMWYzZGVmMmRfSUQ6NzYzNjk2MzAxNTYxMTQzNjI1M18xNzgxNTk0ODc3OjE3ODE1OTg0NzdfVjM)

整体架构可以分成四层。

第一层是设计输入层。官方参考设计和自有设计都通过 EDF/EDIF 解析进入数据库，形成实体级结构化事实。

第二层是知识输入层。公司规则文档被解析成文本、表格、图片资产。图片会经过路由，表格和公式走 OCR，工程图走 VLM。

第三层是证据存储层。MariaDB 保存权威结构化事实，pgvector 保存知识 chunk 的 embedding，用于语义召回。

第四层是评审输出层。系统根据审查问题做混合检索，生成 evidence pack，再由 LLM 生成结构化 findings，最后汇总成工程师可读报告。

这四层之间的关系不是“数据越多越好”，而是“证据越准越好”。系统应尽量减少无效 chunk、空图片摘要、重复目录文本和本地路径噪声进入检索链路。

## 知识文档如何变成可检索证据

![](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ODRhZjEyNTUwMjJiNWQ4NDBkOGRhNmRkNWM5ZWRkY2JfMGQ0MGU3MDZhN2YyNzE2ZTc3ZGNhMjA5NmNiZTA3NjVfSUQ6NzYzNjk2MzA0NzQ1MzYwOTE2MV8xNzgxNTk0ODc3OjE3ODE1OTg0NzdfVjM)

知识文档入库的关键不是切分，而是先判断内容类型。

旧版 Word 文档经常存在 `INCLUDEPICTURE` 图片域、本地临时路径、截图占位符等噪声。如果这些内容直接进入 chunk，RAG 会把无意义文本召回给 LLM，模型就可能基于错误证据输出错误结论。

当前方案把知识文档处理成三个层级：

- 父元素：保留文档原始顺序，包括 text、table、image。
- 图片资产：保存真实图片字节、哈希、来源关系、路由决策和模型输出。
- 检索 chunk：只保存可用于检索的正文、表格文本或有效图片摘要。

图片资产不会天然进入检索。只有当图片经过 OCR 或 VLM 得到有效 `ocr_text` 或 `visual_summary` 后，系统才会生成 image_summary chunk。

这个约束很重要。它避免了类似“图片证据 + asset_id”这种没有业务语义的内容进入向量库。

## 设计图如何进入评审流程

![](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=OTQ0YWI1MWE0MzEwYTgxMzE4ZGNkZTYyYWZmNzAxYzlfZGFlMmI4OGUyZjM4ODlmZTU3ZDdjMTFhNjg5NTQ0MDJfSUQ6NzYzNjk2MzA3MDA5OTYyMzEzN18xNzgxNTk0ODc3OjE3ODE1OTg0NzdfVjM)

### 5.1 有官方参考原理图：参考设计差异 + 自有规则知识库

如果项目提供 MTK、高通等官方平台参考原理图，系统会同时解析官方参考原理图和自有设计原理图，先生成实体级 diff evidence，再结合公司规则知识库进行评审。

实体级 diff 按 refdes、net_name、page_name、module_type 等维度聚合，回答“自有设计相对官方参考设计改了什么”；规则知识库、经典问题分析、视觉知识摘要和模块 profile 回答“这些变化应该用什么规则来判断”。

因此，有官方参考原理图时，evidence pack 由两类证据组成：一类是官方参考设计与自有设计之间的差异证据，另一类是公司规则知识库、历史经验和图片知识召回出的规则证据。LLM 不直接凭感觉比较两张原理图，而是在读取“差异证据 + 规则证据”后输出结构化 finding，重点评估差异是否合理、是否存在保护电路缺失、关键网络变化、器件参数不一致、连接拓扑改变等风险。

### 5.2 无官方参考原理图：自有设计 + 自有规则知识库

如果项目没有官方参考原理图，系统就不再生成“官方参考 vs 自有设计”的实体级 diff，也不能声称某个设计点偏离了 MTK 或高通平台参考。

此时评审只能基于自有设计抽取出的结构化事实，以及公司规则知识库、实时更新规则库、经典问题分析、模块 profile 和视觉知识摘要进行判断。evidence pack 只包含“目标设计事实 + 规则证据”，没有官方差异证据。

因此，无官方参考原理图时，LLM 的输出重点应从“与官方参考是否一致”转为“是否违反公司规则、是否命中已知风险、是否缺少必要保护、是否需要人工确认”。这种模式下 finding 的结论要更保守，证据不足时必须标记为“需人工确认”，不能把规则库没有覆盖的内容推断成平台设计错误。

## RAG 如何减少幻觉

![](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=Njk2NDY1ODJiYjU4NDUwOTUyY2NjMTJjNzVhMjNmYzNfNjNhNDE1OTUxNTY3MjkyMGY5MWZiN2YyN2NmMWE1ZGFfSUQ6NzYzNjk2MzExNTg2NzAzMjUxNl8xNzgxNTk0ODc3OjE3ODE1OTg0NzdfVjM)

这套 RAG 的目标不是让模型更会聊天，而是让模型更少胡说。

减少幻觉主要依赖四个机制。

第一，事实不靠模型记忆。EDF 实体、知识文档元素、图片资产、检索 chunk 都落入数据库。模型不需要记住完整原理图，只需要阅读本轮证据。

第二，检索采用混合召回。关键词检索适合网络名、位号、模块名和规则关键词；向量检索适合同义表达和经验类规则。两路结果通过融合排序，降低单一路径漏召风险。

第三，证据包带 metadata。每条证据都能追溯到 chunk、父元素、图片资产或设计实体。报告中的 finding 可以回查证据来源。

第四，prompt 明确约束。LLM 不允许使用证据之外的常识；证据不足时必须输出需要人工确认，而不是自行补全。

## LLM 在系统中的边界

LLM 在这套系统里不是数据库，也不是规则引擎。

它主要负责三件事：

- 把召回证据和设计差异组织成工程师能读懂的判断。
- 在证据足够时输出风险、优点、合理性或弱点。
- 在证据不足时明确指出缺口，而不是强行判断。

它不应该做三件事：

- 不应该直接读取完整 EDF 后凭感觉评审。
- 不应该把没有 OCR/VLM 结果的图片占位符当成证据。
- 不应该把本地路径、临时文件名、图片 asset_id 当作业务结论依据。

这个边界决定了后续评审质量的上限：如果证据包干净、结构化、覆盖面合理，LLM 输出会更稳定；如果证据包混入噪声，LLM 会放大噪声。

## Agent 如何持续进化学习

原理图评审系统不能只做一次性问答。平台参考设计会变化，公司规则会持续补充，工程师也会在评审过程中不断纠正模型的误判。因此，这个 agent 需要具备 **self-improving agent** 的持续学习机制：把人工反馈、误报漏报、规则补充和非显而易见的修正沉淀下来，再经过验证后变成后续评审可复用的能力。

这里的“学习”不是让模型在现场直接改写自己的参数，而是建立一套可追溯、可审核、可回滚的经验沉淀链路。

![](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZmZjYjM5MjFjOWVlN2I5YzE3ZjhiZTkwMjg3ZjdlYTJfZGZkYWEwMTk4ZGUzZGVhMjYxNGE3ZTlmNDQ5ZDM2ZWJfSUQ6NzYzNjk2MzI3MDk2MDMxOTY2N18xNzgxNTk0ODc3OjE3ODE1OTg0NzdfVjM)

### 8.1 需要被学习的内容

系统应优先沉淀五类信息：

![](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZGEzMjY5NzU2ZDBlM2U5MzcyODM5MWUyNzgzNzBlYjFfMTczNTlhZjczYWI4YTc3ODg0MjFhZjFkYzZhM2IwZWVfSUQ6NzYzNjk2MzI5Njk5ODI4MDEzNF8xNzgxNTk0ODc3OjE3ODE1OTg0NzdfVjM)

### 8.2 学习如何影响下一次评审

学习结果不应只停留在文档里，而要影响下一次评审链路。

![](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YWM0YTEyMzllN2VmNjY4M2RiMzRhYTVhMzBiODQ2MGRfZDM4ZjgwZjY5ODAxMmU0MGUxNDM0MTFkZDEyZmU3MjZfSUQ6NzYzNjk2MzMyODQ0MzI4ODc4Nl8xNzgxNTk0ODc3OjE3ODE1OTg0NzdfVjM)

这样 agent 的进化不是抽象的“越来越聪明”，而是每次评审后都能把可验证经验变成具体的规则、检索、profile、提示词或工具链改进。

### 8.3 安全边界

持续学习必须有边界，否则会把错误经验沉淀成系统规则。

- 不记录密钥、账号、完整环境变量、未脱敏原理图路径和无关聊天内容。
- 不把单次未确认反馈直接升级为全局规则。
- 不让 LLM 自己决定规则是否生效，规则提升必须经过人工确认。
- 不覆盖原有规则，所有规则变更必须保留版本、来源和回滚路径。
- 不把“官方参考设计差异”误推广为“所有平台都必须一致”的规则。

最终目标是让 agent 在每一次真实评审后，都能留下可复用、可审计、可回归的经验资产。这样系统不会停留在一次性 RAG 问答，而会逐步成长为公司自己的原理图评审知识与规则平台。

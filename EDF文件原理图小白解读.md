---
title: EDF文件原理图小白解读
date: 2026-06-16
desc: 给硬件小白的一份 EDF 原理图导读：文件怎么组织、各页讲什么、跨页连接怎么读。
category: 原理图 / EDA
tags: [EDF, EDIF, 原理图]
---

# EDF文件原理图小白解读

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
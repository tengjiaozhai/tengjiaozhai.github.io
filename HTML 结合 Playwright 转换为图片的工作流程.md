---
title: HTML 结合 Playwright 转换为图片的工作流程
date: 2026-06-16
desc: Tinno PPT 不是 AI 生图，而是 HTML→Playwright→图片的稳定工程链路，本文讲清这条链路。
category: 工具 / 工作流
tags: [Playwright, PPT, 工作流]
---

<title>HTML 结合 Playwright 转换为图片的工作流程</title>

# Tinno PPT：HTML 结合 Playwright 转换为图片的工作流程

## 这份文档解决什么问题

当前 Tinno PPT Skill 不是直接生成图片，也不是用 AI 生图来做每页画面。它采用的是一条更稳定的工程链路：

1. 先把用户确认过的结构化内容写成 JSON。
2. 用 Python 脚本把 JSON 注入固定 HTML 模板，生成可浏览的网页 PPT。
3. 用 Playwright 启动无头 Chromium，按固定视口逐页打开 HTML。
4. 让浏览器完成真实 CSS 布局、字体渲染、图片加载和 JavaScript 翻页。
5. 对每一页做 1:1 截图，得到可归档、可复用的 PNG 图片。

这条链路的核心价值是：版式由 HTML/CSS 精确控制，最终图片由真实浏览器渲染出来，避免了手工截图、AI 生图和非浏览器渲染器带来的不确定性。

## 关键文件

| 文件 | 职责 |
|------|------|
| \`SKILL.md\` | 定义 Agent 的使用流程：先确认需求，再生成 JSON，最后运行渲染脚本和视觉验收。 |
| \`assets/template.html\` | Tinno 9:16 竖版 PPT 的种子模板，包含固定背景、logo、布局样式、翻页逻辑和动效兜底。 |
| \`scripts/render_ppt.py\` | 自动化渲染脚本：读取 JSON，生成 HTML，再调用 Playwright 截图。 |
| \`output/[主题].json\` | Agent 根据用户确认内容生成的结构化数据。 |
| \`output/[主题].html\` | 脚本生成的网页 PPT。不要手工修改它。 |
| \`output/[主题]/NN.png\` | Playwright 逐页截图得到的图片归档。 |

## 总体流程

<readonly-block type="isv"></readonly-block>

## 数据流：从 JSON 到 HTML

### 1. 输入 JSON

Agent 在完成需求确认后写入类似下面的数据：

```Django
{
  "share_title": "AI提效场景案例分享",
  "issue": "AI变革部 第1期",
  "slides": [
    {
      "main_title": "一条记录，<br>怎么变成一份可执行的需求文档",
      "blocks": [
        {
          "label": "业务背景",
          "content": "这里放用户确认过的正文内容"
        }
      ]
    }
  ]
}
```

这里的 JSON 是唯一应该被 Agent 持续编辑的内容源。后续用户要改标题、正文、页数或区块，都应该改 JSON，再重新运行脚本生成 HTML 和图片。

### 2. Python 组装 slide HTML

\`scripts/render_ppt.py\` 的 \`render_html()\` 做三件事：

1. 读取 \`assets/template.html\`。
2. 遍历 \`data["slides"]\`，把每一页转换成 \`<section class="slide tinno-portrait light">\`。
3. 用正则找到模板中的 \`<div id="deck"> ... </div></div><div id="nav"></div>\` 区域，把默认示例 slide 替换成新生成的 slide 集合。

每一页 slide 都会固定包含：

| HTML 元素 | 数据来源或固定资源 |
|------|------|
| \`.tinno-bg\` | \`../assets/tinno1.png\` |
| \`.tinno-ai-hero\` | \`../images/01-ai-hero.png\` |
| \`.tinno-logo-fixed\` | \`../images/01-tinno-logo.png\` |
| \`.tinno-share-title\` | JSON 的 \`share_title\` |
| \`.tinno-issue\` | JSON 的 \`issue\` |
| \`.tinno-main-title\` | 当前 slide 的 \`main_title\` |
| \`.tinno-content-block\` | 当前 slide 的 \`blocks[]\` |

区块位置由脚本内置数组控制：

| 区块序号 | \`--block-top\` | \`--block-h\` |
|------|------|------|
| 1 | \`25.7%\` | \`16.9%\` |
| 2 | \`45.2%\` | \`20.7%\` |
| 3 | \`65.0%\` | \`15.0%\` |

如果一页超过 3 个区块，脚本会继续按 \`25 + idx\*20%\` 估算位置，但当前 Skill 建议每页保持 1 到 3 个 blocks，避免内容挤压。

## HTML 模板如何保证 9:16 画布

\`assets/template.html\` 的核心布局在 \`#stage\`、\`#deck\` 和 \`.slide\`：

```Delphi
--stage-w:min(100vw,56.25vh);
--stage-h:min(100vh,177.7778vw);
#stage { width:var(--stage-w); height:var(--stage-h); }
#deck { display:flex; flex-wrap:nowrap; }
.slide { width:var(--stage-w); height:var(--stage-h); flex:0 0 var(--stage-w); }
```

这里用的是 9:16 的比例换算：

| 变量 | 含义 |
|------|------|
| \`--stage-w\` | 当前屏幕中能容纳 9:16 画布的最大宽度。 |
| \`--stage-h\` | 当前屏幕中能容纳 9:16 画布的最大高度。 |
| \`#stage\` | 固定居中的可视画布，超出内容隐藏。 |
| \`#deck\` | 横向排列全部 slide，通过 \`translateX\` 翻页。 |
| \`.slide\` | 每一页实际画面，尺寸与 \`#stage\` 完全一致。 |

Playwright 截图时使用 \`1024x1792\` 视口。这个比例刚好是 9:16，因此 \`#stage\` 会铺满整个浏览器视口，截图得到的 PNG 就是完整的竖版页面。

## Playwright 截图流程

\`scripts/render_ppt.py\` 的 \`take_screenshots()\` 是 HTML 到图片的关键步骤。

```Plain Text
sequenceDiagram
  participant Script as render_ppt.py
  participant PW as Playwright
  participant Browser as Headless Chromium
  participant Page as 生成后的 HTML 页面
  participant FS as 图片输出目录

  Script->>PW: sync_playwright()
  PW->>Browser: chromium.launch(headless=True)
  Script->>Browser: 创建 1024x1792 页面
  Browser->>Page: 打开 file URL 并等待网络空闲
  Script->>Page: 注入样式关闭 deck 过渡动画
  loop 每一页
    Script->>Page: evaluate("window.go(i)")
    Script->>Page: evaluate("revealWithoutMotion()")
    Script->>Page: wait_for_timeout(500)
    Script->>Browser: screenshot(full_page=True)
    Browser->>FS: 保存 NN.png
  end
  Script->>Browser: close()
```

这几个动作各有明确目的：

| 动作 | 目的 |
|------|------|
| \`chromium.launch(headless=True)\` | 不打开可见浏览器窗口，适合自动化批量生成。 |
| \`new_page(viewport={"width":1024,"height":1792})\` | 固定输出尺寸和 9:16 比例。 |
| \`goto(file_url, wait_until="networkidle")\` | 等待 HTML、图片、字体和脚本加载稳定。 |
| \`add_style_tag("#deck { transition: none !important; }")\` | 关闭翻页过渡，避免截图时拍到滑动中间态。 |
| \`window.go(i)\` | 使用模板自己的翻页函数切到指定 slide。 |
| \`revealWithoutMotion()\` | 让所有带 \`data-anim\` 的元素立刻显示，避免动画未完成导致元素透明。 |
| \`wait_for_timeout(500)\` | 给浏览器一点时间完成布局、字体和图片绘制。 |
| \`screenshot(full_page=True)\` | 把当前页完整保存成 PNG。 |

## 为什么不是直接把 HTML 字符串转图片

这里故意使用 Playwright，而不是用简单的 HTML-to-image 库，因为 PPT 页面依赖真实浏览器能力：

| 能力 | 为什么需要真实 Chromium |
|------|------|
| CSS 变量和响应式计算 | \`--stage-w\`、\`--stage-h\` 依赖视口实时计算。 |
| 图片布局 | 背景和主视觉依赖 \`object-fit\`、\`object-position\`。 |
| 字体渲染 | 中文衬线、无衬线和等宽字体在浏览器里最接近实际演示效果。 |
| JavaScript 翻页 | 每页不是独立 HTML 文件，而是横向 deck 中的一个 slide。 |
| 动效兜底 | \`data-anim\` 元素需要通过 JS 或兜底函数显示。 |
| 截图一致性 | 固定视口 + 无头浏览器可以稳定批量输出同尺寸 PNG。 |

## 动效与截图稳定性的关系

模板默认会给 \`[data-anim]\` 元素设置初始透明：

```Delphi
[data-anim] { opacity: 0; }
```

在正常演示时，Motion One 会逐个播放入场动画。但截图不是演示，它要的是每一页的最终静态状态。因此模板提供了 \`revealWithoutMotion()\`：

```Plain Text
function revealWithoutMotion(){
  document.querySelectorAll('[data-anim]').forEach(el=>{
    el.style.opacity='1';
    el.style.transform='none';
  });
}
```

Playwright 每次切页后都会调用这个函数，确保 logo、主题、标题和内容框都处在可见状态。这个步骤是图片不空白、不缺元素的关键。

## 端到端命令

标准命令是：

```CoffeeScript
python scripts/render_ppt.py output/[主题].json output/[主题].html
```

在这台机器上，如果需要避开非交互 shell 的 runtime 解析问题，优先使用固定 Python 路径：

```CoffeeScript
/opt/anaconda3/envs/py311/bin/python3 scripts/render_ppt.py output/[主题].json output/[主题].html
```

运行完成后应出现：

```Plain Text
output/[主题].html
output/[主题]/01.png
output/[主题]/02.png
...
```

## 编辑边界

| 场景 | 应该改哪里 | 不应该改哪里 |
|------|------|------|
| 修改分享主题 | \`output/[主题].json\` 的 \`share_title\` | 不手改生成后的 HTML |
| 修改期号 | \`output/[主题].json\` 的 \`issue\` | 不手改生成后的 HTML |
| 修改某页标题 | \`slides[].main_title\` | 不手改生成后的 HTML |
| 修改正文或小标题 | \`slides[].blocks[]\` | 不手改生成后的 HTML |
| 改固定模板样式 | \`assets/template.html\` | 不改已经生成的单个 HTML |
| 改批量生成逻辑 | \`scripts/render_ppt.py\` | 不复制多个临时脚本 |

核心原则：内容走 JSON，版式走模板，自动化走脚本，图片由 Playwright 产出。

## 常见问题与排查

| 现象 | 可能原因 | 排查方式 |
|------|------|------|
| 没有生成 HTML | JSON 路径不存在或格式错误 | 检查输入路径，确认 JSON 能被 \`json.load()\` 读取。 |
| 提示找不到 \`<div id="deck">\` 占位符 | \`assets/template.html\` 的结构被改动，正则无法匹配 | 检查模板中是否仍有 \`#deck\`、\`#stage\`、\`#nav\` 的相邻结构。 |
| Playwright 启动失败 | Chromium 没安装 | 根据脚本提示安装 Chromium。 |
| 图片是空白或缺元素 | 动效元素仍处于 \`opacity:0\` | 确认模板中存在 \`revealWithoutMotion()\`，脚本切页后调用了它。 |
| 截图拍到翻页中间态 | \`#deck\` 的 CSS transition 没被禁用 | 确认脚本执行了 \`page.add_style_tag(content="#deck { transition: none !important; }")\`。 |
| 图片尺寸或比例不对 | viewport 不是 9:16 | 确认 Playwright viewport 为 \`1024x1792\`。 |
| 图片资源缺失 | \`output/\` 下 HTML 引用上级目录资源，路径写错 | 在 \`output/\` 内引用资源时使用 \`../assets/...\` 和 \`../images/...\`。 |
| 长文本被裁切 | 内容超过 \`.tinno-content-box\` 高度 | 回到 JSON 缩短内容、拆页，或调整 blocks 数量。 |

## 适合后续优化的点

1. 在 \`render_ppt.py\` 中增加 JSON schema 校验，提前发现缺字段、空 slide、blocks 超量等问题。
2. 把 viewport、等待时间、输出图片格式做成 CLI 参数，方便不同清晰度输出。
3. 截图前增加图片加载检查，明确提示缺失的资源路径。
4. 截图后自动检查 PNG 是否为空白、尺寸是否为 \`1024x1792\`。
5. 把 \`issue\` 格式、每页 blocks 上限等 Skill 规则沉淀成脚本级校验，减少人工约束漂移。

## 一句话总结

这套方案把 PPT 当成一个确定性的网页应用来渲染：JSON 负责内容，HTML/CSS 负责版式，JavaScript 负责翻页和动效状态，Playwright 负责用真实 Chromium 把每一页冻结成 PNG。

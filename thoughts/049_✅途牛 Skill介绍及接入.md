---
title: ✅途牛 Skill介绍及接入
date: 2026-08-07
desc: 途牛很多人都知道，就和携程，飞猪一样，是第三方的OTA网站。他提供了MCP和Skill的接入。
category: AI / Agent
tags: ["LLMentor", "Skill"]
---

# ✅途牛 Skill介绍及接入

> 来源: https://thoughts.aliyun.com/workspaces/6963289eb0fc2e001bb052eb/docs/6a6a0dcc3fb9180001d9df97

途牛很多人都知道，就和携程，飞猪一样，是第三方的OTA网站。他提供了MCP和Skill的接入。


_https://open.tuniu.com/mcp/docs/_ 这个是他的开放平台的地址，相关的文档和api key都在这里申请。


_https://open.tuniu.com/mcp/docs/claw-hub-skills/tuniu-cli/SKILL.html_ 这个是他的skill的主要内容。他基本把所以内容都写到一个skill.md里面了，所以我们后面在使用的时候针对他这个文件也做了改造和拆分。


这个skill的使用必须要要申请apikey，他这个控制台登录之后就可以免费申请。


tuniu的skill打败了众多其他竞争对手作为我们项目的首选的主要原因是他的功能很完整，包括酒店、机票、火车票等的查询和预定，他都有了。甚至还包括游轮、独家产品等内容的支持，当然，这部分我们不需要，后来项目中也被我们裁剪掉了。


这个skill的api key 我们是通过以下方式管理和鉴权的：



##### ✅基于Token 直接配置方式做鉴权
基于Token直接配置方式鉴权的方式，就是用户自己去第三方页面领一个长期有效的 API Key，然后直接把这串 Key 贴给 Agent，系统把它安全存起来，后续调用时自动拿出来用。没有回调、没有 code 交换、没有刷新逻辑。 Step
LLMentor


这个skill的相关改造如下：



##### ✅上下文工程——如何对第三方Skill瘦身
我们项目中用到了第三方skill，但是有些skill写的实在是。。。。 所以，我们需要针对第三方skill做瘦身，这样能起到减少token消耗，提高可用性的作用。 以下是途牛官方给的skill
LLMentor

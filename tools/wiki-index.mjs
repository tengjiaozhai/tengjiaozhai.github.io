#!/usr/bin/env node
/**
 * 重建 wiki/index.md 的自动段。
 *
 * 用法:
 *   node tools/wiki-index.mjs            # 只打印将要写入的内容
 *   node tools/wiki-index.mjs --write    # 写入 wiki/index.md
 *
 * 自动段范围: `## Sources` 到 `<!-- wiki-index:auto-end -->`（含）。
 * 该标记之后是手写段（待建页面 / raw 摄取状态），永不覆盖。
 * 首次运行时若无标记，就在文件末尾追加标记并只在标记前插入自动段。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const WIKI = path.join(ROOT, 'wiki')
const INDEX = path.join(WIKI, 'index.md')
const MARK = '<!-- wiki-index:auto-end -->'
const WRITE = process.argv.includes('--write')

// 目录 → index 小节标题，按此顺序渲染
const SECTIONS = [
  ['sources', 'Sources'],
  ['entities', 'Entities'],
  ['concepts', 'Concepts'],
  ['synthesis', 'Syntheses'],
  ['outputs', 'Outputs'],
]

/** 解析 frontmatter。只支持本 wiki 用到的子集: 标量、单行数组、引号字符串。 */
function parseFrontmatter(text) {
  if (!text.startsWith('---')) return {}
  const end = text.indexOf('\n---', 3)
  if (end < 0) return {}
  const out = {}
  for (const raw of text.slice(3, end).split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf(':')
    if (i < 1) continue
    const key = line.slice(0, i).trim()
    let val = line.slice(i + 1).trim()
    if (val.startsWith('[') && val.endsWith(']')) {
      out[key] = val.slice(1, -1).split(',').map(s => unquote(s.trim())).filter(Boolean)
    } else {
      out[key] = unquote(val)
    }
  }
  return out
}

function unquote(s) {
  const t = s.trim()
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1)
  }
  return t
}

function collect() {
  const pages = []
  for (const [dir] of SECTIONS) {
    const abs = path.join(WIKI, dir)
    if (!fs.existsSync(abs)) continue
    for (const name of fs.readdirSync(abs).sort()) {
      if (!name.endsWith('.md')) continue
      const file = `wiki/${dir}/${name}`
      const text = fs.readFileSync(path.join(abs, name), 'utf8')
      const fm = parseFrontmatter(text)
      pages.push({ dir, file, slug: name.replace(/\.md$/, ''), fm })
    }
  }
  return pages
}

/** 一行一条的摘要行。字段缺失不报错，只是该段省略。 */
function summaryLine(p) {
  const alias = p.fm.title || p.slug
  const parts = []
  const typeMeta = p.fm.entity_kind || p.fm.kind || p.fm.output_form || p.fm.source_type || p.fm.type
  if (typeMeta) parts.push(String(typeMeta))
  if (p.fm.lines) parts.push(`${p.fm.lines} 行`)
  if (p.fm.status) parts.push('`' + p.fm.status + '`')
  if (p.fm.confidence) parts.push(String(p.fm.confidence))
  if (p.fm.frozen === 'true') parts.push('frozen')
  const desc = p.fm.desc || p.fm.summary || ''
  if (desc) parts.push(desc)
  const tail = parts.length ? ' · ' + parts.join(' · ') : ''
  return `- [[${p.file}|${alias}]]${tail}`
}

function build(pages) {
  const lines = []
  const today = new Date().toISOString().slice(0, 10)
  lines.push('# Wiki Index')
  lines.push('')
  lines.push(
    `> 最近更新：${today} · 共 **${pages.length}** 个内容页（另有本文件与 [[wiki/log|log]]）`
  )
  lines.push('> 格式与规则见 [[AGENTS]] §7。')
  lines.push('> **回答问题前先读本页定位，再深入具体页面**（[[AGENTS]] §6.3）。')
  lines.push('')

  for (const [dir, heading] of SECTIONS) {
    const group = pages.filter(p => p.dir === dir)
    lines.push(`## ${heading}（${group.length}）`)
    if (!group.length) {
      lines.push('')
      lines.push('_(空)_')
    } else {
      for (const p of group) lines.push(summaryLine(p))
    }
    lines.push('')
  }

  lines.push(MARK)
  return lines.join('\n')
}

const pages = collect()
const auto = build(pages)

if (!fs.existsSync(INDEX)) {
  const content = auto + '\n\n## 待建页面\n\n_(手写: lint 的输入，来自各页「待链接」段)_\n\n## raw 摄取状态\n\n_(手写: 目录 / 已消化 / 谓词 / 对应页面)_\n'
  if (WRITE) {
    fs.mkdirSync(WIKI, { recursive: true })
    fs.writeFileSync(INDEX, content)
    console.log(`created ${path.relative(ROOT, INDEX)} (${pages.length} pages)`)
  } else {
    console.log(content)
    console.log('\n-- dry run, 加 --write 落盘 --')
  }
  process.exit(0)
}

const current = fs.readFileSync(INDEX, 'utf8')
const markAt = current.indexOf(MARK)
if (markAt < 0) {
  console.error(`wiki/index.md 缺少标记 ${MARK}。首次接管时请手工在自动段末尾加一行该标记后重试。`)
  process.exit(1)
}
// 保留标记之后的手写段（标记本身由 auto 结尾携带）
const tail = current.slice(markAt + MARK.length)
const next = auto + tail

if (next === current) {
  console.log(`wiki/index.md 已是最新（${pages.length} 页），无改动`)
  process.exit(0)
}

if (!WRITE) {
  const before = current.split('\n')
  const after = next.split('\n')
  console.log(`将改动 wiki/index.md：${before.length} 行 → ${after.length} 行（${pages.length} 页）`)
  console.log('\n-- dry run, 加 --write 落盘 --')
  process.exit(0)
}

fs.writeFileSync(INDEX, next)
console.log(`updated wiki/index.md (${pages.length} pages)`)

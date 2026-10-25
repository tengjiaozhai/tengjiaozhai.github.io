#!/usr/bin/env node
/**
 * wiki 健康检查。只读，输出分级报告，不改文件。
 *
 * 用法:
 *   node tools/wiki-lint.mjs                 # 全量
 *   node tools/wiki-lint.mjs --only broken   # 只看某一类（broken|orphan|frontmatter|digest|dup|stale）
 *
 * 已知假阳性（AGENTS.md §6.4）：不区分正文与代码块，模板里的占位 [[wiki/…]] 会被当断链。
 * 因此只扫五个内容目录，index.md / log.md / AGENTS.md 排除。
 * 每个命中都要人工复核后才能写进报告。
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const WIKI = path.join(ROOT, 'wiki')
const CONTENT_DIRS = ['sources', 'entities', 'concepts', 'synthesis', 'outputs']
const STRUCTURAL = new Set(['wiki/index.md', 'wiki/log.md'])

const argv = process.argv.slice(2)
const onlyAt = argv.indexOf('--only')
const ONLY = onlyAt >= 0 ? argv[onlyAt + 1] : null

const REQUIRED = {
  source: ['type', 'title', 'source_file', 'source_type', 'domain', 'status'],
  entity: ['type', 'title', 'entity_kind', 'domain', 'tags'],
  concept: ['type', 'title', 'domain', 'confidence', 'as_of'],
  synthesis: ['type', 'kind', 'title', 'date', 'status', 'domain'],
  output: ['type', 'title', 'date', 'output_form', 'frozen'],
}

const UNQUOTED = new Set(['type', 'domain', 'status', 'confidence', 'as_of', 'captured', 'date', 'lines', 'raw_digest', 'source_file', 'source_type', 'entity_kind', 'kind', 'output_form', 'frozen', 'version_of_interest'])

function parseFrontmatter(text) {
  if (!text.startsWith('---')) return null
  const end = text.indexOf('\n---', 3)
  if (end < 0) return null
  const out = {}
  for (const raw of text.slice(3, end).split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf(':')
    if (i < 1) continue
    const key = line.slice(0, i).trim()
    let val = line.slice(i + 1).trim()
    if (val.startsWith('[') && val.endsWith(']')) {
      out[key] = val.slice(1, -1).split(',').map(s => unquote(s)).filter(Boolean)
    } else {
      out[key] = unquote(val)
    }
  }
  return out
}

function unquote(s) {
  const t = s.trim()
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1)
  return t
}

function walkWiki() {
  const pages = []
  for (const dir of CONTENT_DIRS) {
    const abs = path.join(WIKI, dir)
    if (!fs.existsSync(abs)) continue
    for (const name of fs.readdirSync(abs).sort()) {
      if (!name.endsWith('.md')) continue
      const absFile = path.join(abs, name)
      const text = fs.readFileSync(absFile, 'utf8')
      pages.push({
        dir,
        file: `wiki/${dir}/${name}`,
        absFile,
        text,
        fm: parseFrontmatter(text),
      })
    }
  }
  return pages
}

/** 抽正文里的 [[...]] 目标，排除代码块。返回 [{target, line}] */
function linksOf(text) {
  const out = []
  let inFence = false
  text.split('\n').forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; return }
    if (inFence) return
    // 去掉行内代码；表格内为了不切列会写 \| 转义，先还原成 |
    const clean = line.replace(/`[^`]*`/g, '').replace(/\\\|/g, '|')
    for (const m of clean.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) {
      out.push({ target: m[1].trim(), line: i + 1 })
    }
  })
  return out
}

function resolveTarget(target) {
  if (target === 'AGENTS') return path.join(ROOT, 'AGENTS.md')
  const p = path.join(ROOT, target.endsWith('.md') ? target : target + '.md')
  if (fs.existsSync(p)) return p
  // 允许带目录的短链：wiki/concepts/xxx
  const p2 = path.join(ROOT, target + '.md')
  return fs.existsSync(p2) ? p2 : null
}

const pages = walkWiki()
const allTargets = new Set(pages.map(p => p.file.replace(/\.md$/, '')))
allTargets.add('AGENTS')
allTargets.add('wiki/index')
allTargets.add('wiki/log')

const report = { broken: [], orphan: [], frontmatter: [], digest: [], dup: [], stale: [] }

/* ---------- broken links ---------- */
const inbound = new Map()   // target(去 .md) → Set(来源 file)
for (const p of pages) {
  const self = p.file.replace(/\.md$/, '')
  for (const { target, line } of linksOf(p.text)) {
    const t = target.replace(/\.md$/, '')
    if (!resolveTarget(t)) {
      report.broken.push(`${p.file}:${line}  → [[${target}]] 目标不存在`)
      continue
    }
    if (!inbound.has(t)) inbound.set(t, new Set())
    inbound.get(t).add(self)
  }
}

/* ---------- frontmatter ---------- */
for (const p of pages) {
  if (!p.fm) { report.frontmatter.push(`${p.file}  缺 frontmatter`); continue }
  const type = p.fm.type
  if (!type) { report.frontmatter.push(`${p.file}  缺 type`); continue }
  const need = REQUIRED[type]
  if (!need) { report.frontmatter.push(`${p.file}  type: ${type} 不是允许值（source|entity|concept|synthesis|output）`); continue }
  for (const k of need) {
    // source 的 raw 指向允许二选一：单篇 source_file / 簇页 source_files
    if (type === 'source' && k === 'source_file') {
      if (!p.fm.source_file && !(Array.isArray(p.fm.source_files) && p.fm.source_files.length)) {
        report.frontmatter.push(`${p.file}  type:source 缺字段 source_file（或 source_files）`)
      }
      continue
    }
    if (!p.fm[k] || (Array.isArray(p.fm[k]) && !p.fm[k].length)) {
      report.frontmatter.push(`${p.file}  type:${type} 缺字段 ${k}`)
    }
  }
  if (!/^[\x20-\x7E\u4e00-\u9fff]/.test(p.file.split('/').pop())) {
    report.frontmatter.push(`${p.file}  文件名含异常字符`)
  }
}

/* ---------- orphan ---------- */
for (const p of pages) {
  const self = p.file.replace(/\.md$/, '')
  const ins = inbound.get(self)
  if (!ins || ins.size === 0) {
    // index.md 的自动段会链它，但 index 不参与扫描，故不计入
    report.orphan.push(`${p.file}  无入链（index.md 自动段除外）`)
  }
}

/* ---------- raw_digest ---------- */
for (const p of pages) {
  if (!p.fm || p.fm.type !== 'source' || !p.fm.raw_digest) continue
  // 簇页用 source_files（数组）列出一组文件；单篇用 source_file（单文件）
  if (Array.isArray(p.fm.source_files)) {
    for (const rel of p.fm.source_files) {
      if (!fs.existsSync(path.join(ROOT, rel))) report.digest.push(`${p.file}  source_files 不存在: ${rel}`)
    }
    continue
  }
  const rawRel = p.fm.source_file
  if (!rawRel) continue
  const rawAbs = path.join(ROOT, rawRel)
  if (!fs.existsSync(rawAbs)) {
    report.digest.push(`${p.file}  source_file 不存在: ${rawRel}`)
    continue
  }
  if (fs.statSync(rawAbs).isDirectory()) continue   // 目录型 source 不做 digest
  const text = fs.readFileSync(rawAbs)
  const sha = crypto.createHash('sha1').update(text).digest('hex').slice(0, 8)
  const lines = text.toString('utf8').split('\n').length
  const want = String(p.fm.raw_digest)
  const wantLines = p.fm.lines ? Number(p.fm.lines) : null
  if (!want.includes(sha) || (wantLines && Math.abs(wantLines - lines) > 0)) {
    report.digest.push(`${p.file}  digest 漂移: 记 ${want}(${wantLines ?? '?'} 行) / 实 ${lines}-${sha}`)
  }
}

/* ---------- duplicate concepts / entities ---------- */
const seen = new Map()
for (const p of pages) {
  if (!p.fm) continue
  if (!['concept', 'entity'].includes(p.fm.type)) continue
  const keys = new Set()
  const t = p.fm.title
  if (t) keys.add(String(t).trim())
  const aliases = Array.isArray(p.fm.aliases) ? p.fm.aliases : (p.fm.aliases ? [p.fm.aliases] : [])
  for (const a of aliases) keys.add(String(a).trim())
  for (const k of keys) {
    if (!k) continue
    if (seen.has(k)) {
      report.dup.push(`「${k}」同时出现在 ${seen.get(k)} 与 ${p.file}`)
    } else {
      seen.set(k, p.file)
    }
  }
}

/* ---------- stale / 过期 ---------- */
const today = new Date()
const days = (d) => Math.floor((today - new Date(d + 'T00:00:00Z')) / 86400000)
for (const p of pages) {
  if (!p.fm) continue
  if (p.fm.status === 'stale') {
    report.stale.push(`${p.file}  status: stale，待重过 raw`)
  }
  if (p.fm.type === 'concept' && p.fm.confidence === 'high' && p.fm.as_of) {
    const n = days(p.fm.as_of)
    if (Number.isFinite(n) && n > 180) {
      report.stale.push(`${p.file}  confidence: high 且 as_of ${p.fm.as_of}（${n} 天前，超 180 天未复核）`)
    }
  }
  if (p.fm.type === 'synthesis' && p.fm.status === 'investigating' && p.fm.date) {
    const n = days(p.fm.date)
    if (Number.isFinite(n) && n > 30) {
      report.stale.push(`${p.file}  status: investigating 已 ${n} 天`)
    }
  }
}

/* ---------- thoughts-toc 覆盖 ---------- */
const tocPage = pages.find(p => p.file === 'wiki/sources/thoughts-toc.md')
if (tocPage) {
  const thoughtsDir = path.join(ROOT, 'thoughts')
  if (fs.existsSync(thoughtsDir)) {
    const actual = fs.readdirSync(thoughtsDir).filter(f => f.endsWith('.md')).length
    const rows = tocPage.text.split('\n').filter(l => /^\|\s*\d{3}\s*\|/.test(l)).length
    if (rows !== actual) {
      report.frontmatter.push(`wiki/sources/thoughts-toc.md  登记 ${rows} 行 / thoughts 实际 ${actual} 篇，覆盖不全`)
    }
  }
}

/* ---------- 输出 ---------- */
const LABELS = {
  broken: '断链',
  orphan: '孤儿页（无入链）',
  frontmatter: 'frontmatter / 结构',
  digest: 'raw_digest 漂移',
  dup: '重复概念',
  stale: '过期与待复核',
}

let total = 0
const out = []
for (const [key, label] of Object.entries(LABELS)) {
  if (ONLY && ONLY !== key) continue
  const items = report[key]
  total += items.length
  out.push(`\n## ${label}（${items.length}）`)
  out.push(items.length ? items.map(s => '  - ' + s).join('\n') : '  ✓ 无')
}

console.log(`# wiki lint — ${pages.length} 页，${total} 项`)
console.log(out.join('\n'))
console.log('\n提示：命中含占位链接等假阳性时需人工复核（AGENTS.md §6.4）。只读运行，不修改任何文件。')
if (total > 0) process.exitCode = 1

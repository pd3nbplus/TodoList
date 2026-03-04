import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const CWD = process.cwd()
const TARGETS = ['index.html', 'src', 'public']
const ALLOWED_EXTENSIONS = new Set([
  '.html',
  '.htm',
  '.vue',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.jsx',
])

const MATCHERS = [
  {
    name: 'html-src-href',
    regex: /(?:src|href)\s*=\s*["']([^"']+)["']/gi,
  },
  {
    name: 'css-url',
    regex: /url\(\s*['"]?([^"'()\s]+)['"]?\s*\)/gi,
  },
  {
    name: 'css-import',
    regex: /@import\s+(?:url\(\s*)?["']([^"']+)["']/gi,
  },
  {
    name: 'js-import',
    regex: /import\s+(?:[^'"]+\s+from\s+)?["']([^"']+)["']/gi,
  },
  {
    name: 'js-dynamic-import',
    regex: /import\(\s*["']([^"']+)["']\s*\)/gi,
  },
]

function isRemoteAsset(url) {
  const trimmed = url.trim()
  return /^https?:\/\//i.test(trimmed) || /^\/\//.test(trimmed)
}

function getLineAndColumn(source, index) {
  const prefix = source.slice(0, index)
  const lines = prefix.split('\n')
  const line = lines.length
  const column = lines[lines.length - 1].length + 1
  return { line, column }
}

async function collectFiles(targetPath) {
  const fullPath = path.resolve(CWD, targetPath)
  const targetStat = await stat(fullPath)

  if (targetStat.isFile()) {
    return [fullPath]
  }

  const queue = [fullPath]
  const files = []

  while (queue.length > 0) {
    const current = queue.pop()
    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const nextPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        queue.push(nextPath)
        continue
      }
      if (!entry.isFile()) {
        continue
      }
      if (ALLOWED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        files.push(nextPath)
      }
    }
  }

  return files
}

async function main() {
  const files = []
  for (const target of TARGETS) {
    const targetFiles = await collectFiles(target)
    files.push(...targetFiles)
  }

  const violations = []

  for (const filePath of files) {
    const content = await readFile(filePath, 'utf8')
    for (const matcher of MATCHERS) {
      matcher.regex.lastIndex = 0
      let match
      while ((match = matcher.regex.exec(content)) !== null) {
        const captured = match[1]
        if (!captured || !isRemoteAsset(captured)) {
          continue
        }
        const { line, column } = getLineAndColumn(content, match.index)
        violations.push({
          file: path.relative(CWD, filePath),
          line,
          column,
          url: captured,
          rule: matcher.name,
        })
      }
    }
  }

  if (violations.length === 0) {
    console.log('OK: 未发现远程样式/脚本资源引用。')
    return
  }

  console.error('发现远程资源引用，请下载到本地并改为本地路径：')
  for (const item of violations) {
    console.error(
      `- ${item.file}:${item.line}:${item.column} [${item.rule}] ${item.url}`,
    )
  }
  process.exitCode = 1
}

main().catch((error) => {
  console.error('检查失败：', error)
  process.exitCode = 1
})

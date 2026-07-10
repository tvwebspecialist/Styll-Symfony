import path from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { expect, test } from 'playwright/test'

const repoRoot = path.join(process.cwd(), '..', '..')
const runbookPath = path.join(repoRoot, 'docs', 'legal', 'data-breach-runbook.md')
const legalCompliancePath = path.join(repoRoot, 'docs', '08-strategia', 'legal-compliance.md')
const gdprDeepDivePath = path.join(repoRoot, 'gdpr-approfondimento-implementazione.md')
const dpaPath = path.join(repoRoot, 'docs', 'legal', 'dpa-barbieri.md')

function readMarkdown(filePath: string): string {
  return readFileSync(filePath, 'utf8')
}

function normalizeAnchor(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function extractAnchors(markdown: string): Set<string> {
  const anchors = new Set<string>()

  for (const line of markdown.split('\n')) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line.trim())
    if (!match) continue
    const heading = match[2].replace(/\s+#*$/, '')
    anchors.add(normalizeAnchor(heading))
  }

  return anchors
}

function extractMarkdownLinks(markdown: string): string[] {
  const links: string[] = []
  const regex = /\[[^\]]+\]\(([^)]+)\)/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(markdown)) !== null) {
    links.push(match[1].trim())
  }

  return links
}

function assertLocalLinkResolves(sourceFile: string, rawLink: string) {
  const link = rawLink.replace(/^<|>$/g, '')
  if (
    link.startsWith('http://') ||
    link.startsWith('https://') ||
    link.startsWith('mailto:') ||
    link.startsWith('tel:')
  ) {
    return
  }

  const hashIndex = link.indexOf('#')
  const fileRef = hashIndex >= 0 ? link.slice(0, hashIndex) : link
  const anchorRef = hashIndex >= 0 ? decodeURIComponent(link.slice(hashIndex + 1)) : ''
  const targetFile = fileRef
    ? path.resolve(path.dirname(sourceFile), fileRef)
    : sourceFile

  expect(
    existsSync(targetFile),
    `${path.relative(repoRoot, sourceFile)} -> ${link} should resolve to an existing file`,
  ).toBe(true)

  if (anchorRef) {
    const anchors = extractAnchors(readMarkdown(targetFile))
    expect(
      anchors.has(normalizeAnchor(anchorRef)),
      `${path.relative(repoRoot, sourceFile)} -> ${link} should resolve to an existing heading`,
    ).toBe(true)
  }
}

test.describe('data breach runbook documentation', () => {
  test('runbook exists and contains the required operational sections', async () => {
    expect(existsSync(runbookPath)).toBe(true)

    const runbook = readMarkdown(runbookPath)
    const requiredSections = [
      '## 1. Scopo',
      '## 2. Ambito',
      '## 4. Ruoli',
      '## 5. Classificazione incidente',
      '## 6. Timeline operativa',
      '## 7. Checklist operative',
      '## 8. Matrice decisionale notifiche',
      '## 9. Template comunicazioni',
      '## 10. Registro incidenti',
      '## 11. Checklist chiusura incidente',
    ]

    for (const section of requiredSections) {
      expect(runbook).toContain(section)
    }

    for (const link of extractMarkdownLinks(runbook)) {
      assertLocalLinkResolves(runbookPath, link)
    }
  })

  test('core GDPR documents reference the runbook with valid local links', async () => {
    const docs = [
      { filePath: legalCompliancePath, expectedLink: '../legal/data-breach-runbook.md' },
      { filePath: gdprDeepDivePath, expectedLink: 'docs/legal/data-breach-runbook.md' },
      { filePath: dpaPath, expectedLink: 'data-breach-runbook.md' },
    ]

    for (const { filePath, expectedLink } of docs) {
      expect(existsSync(filePath)).toBe(true)
      const markdown = readMarkdown(filePath)
      expect(markdown).toContain(expectedLink)

      const runbookLinks = extractMarkdownLinks(markdown).filter((link) =>
        link.includes('data-breach-runbook.md'),
      )
      expect(runbookLinks.length).toBeGreaterThan(0)

      for (const link of runbookLinks) {
        assertLocalLinkResolves(filePath, link)
      }
    }
  })
})

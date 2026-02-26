/**
 * Discover all tests: playwright test --list + vitest from existing results or run.
 * Writes test-results/all-tests.json so the dashboard can show the full list.
 */
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const testResultsDir = path.join(projectRoot, 'test-results')
const dashboardDir = path.join(projectRoot, 'test-results-dashboard')

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd: projectRoot,
      shell: true,
      stdio: opts.silent ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    })
    let stdout = ''
    let stderr = ''
    if (opts.silent) {
      proc.stdout?.on('data', (d) => { stdout += d.toString() })
      proc.stderr?.on('data', (d) => { stderr += d.toString() })
    }
    proc.on('close', (code) => resolve({ code, stdout, stderr }))
    proc.on('error', reject)
  })
}

/** Parse "  [chromium] › file:line:col › Suite › Test" lines from playwright test --list */
function parsePlaywrightList(stdout) {
  const rows = []
  const lines = (stdout || '').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || !trimmed.includes(' › ')) continue
    const parts = trimmed.split(' › ').map((s) => s.trim())
    if (parts.length < 3) continue
    const file = parts[1]
    const fullTitle = parts.slice(2).join(' > ')
    rows.push({
      layer: 'E2E',
      suite: file,
      name: fullTitle,
      expected: fullTitle,
      status: 'not-run',
      actual: '',
      duration: 0,
      runner: 'playwright',
      target: fullTitle,
    })
  }
  return rows
}

function parseVitestResults(data) {
  const rows = []
  if (!data || !data.testResults) return rows
  for (const fileResult of data.testResults) {
    const file = fileResult.name || ''
    const suite = path.relative(projectRoot, file)
    const assertions = fileResult.assertionResults || fileResult.result?.assertionResults || []
    if (!Array.isArray(assertions)) continue
    for (const a of assertions) {
      const name = a.ancestorTitles?.concat([a.title]).join(' > ') || a.fullName || a.title || 'test'
      rows.push({
        layer: file.includes('api') || file.includes('backend') ? 'Backend' : 'Frontend',
        suite,
        name,
        expected: name,
        status: 'not-run',
        actual: '',
        duration: 0,
        runner: 'vitest',
        target: a.fullName || a.title || name,
      })
    }
  }
  return rows
}

async function main() {
  ensureDir(dashboardDir)
  const allRows = []

  // 1. Playwright test --list (no execution)
  console.log('Listing E2E tests...')
  const { stdout: pwStdout } = await run('npx', ['playwright', 'test', '--list'], { silent: true })
  const e2eRows = parsePlaywrightList(pwStdout)
  allRows.push(...e2eRows)

  // 2. Vitest: use existing results file if present, else run to populate
  const vitestPath = path.join(dashboardDir, 'vitest-results.json')
  let vitestData = loadJson(vitestPath)
  if (!vitestData || !vitestData.testResults?.length) {
    console.log('Running Vitest to discover unit/API tests...')
    await run('npx', [
      'vitest', 'run', 'tests/api', 'tests/backend',
      '--reporter=json', '--outputFile=test-results-dashboard/vitest-results.json',
    ], { silent: true })
    vitestData = loadJson(vitestPath)
  }
  if (vitestData) {
    const vitestRows = parseVitestResults(vitestData)
    allRows.push(...vitestRows)
  }

  const outPath = path.join(dashboardDir, 'all-tests.json')
  fs.writeFileSync(outPath, JSON.stringify({
    tests: allRows,
    generatedAt: new Date().toISOString(),
  }, null, 2), 'utf-8')
  console.log('Wrote', allRows.length, 'tests to', outPath)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

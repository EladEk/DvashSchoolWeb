/**
 * Sanity test suite: critical path only.
 * - E2E: smoke, admin dashboard export, parliament auth
 * - Vitest: API + backend
 * Writes results to test-results/ for the dashboard.
 */
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const testResultsDir = path.join(projectRoot, 'test-results')

const SANITY_E2E_SPECS = [
  'e2e/smoke.spec.js',
  'e2e/admin-dashboard-export.spec.js',
  'e2e/parliament-auth.spec.js',
]

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
    proc.on('close', (code) => {
      if (opts.silent) resolve({ code, stdout, stderr })
      else resolve({ code })
    })
    proc.on('error', reject)
  })
}

async function main() {
  const dashboardDir = path.join(projectRoot, 'test-results-dashboard')
  if (!fs.existsSync(dashboardDir)) fs.mkdirSync(dashboardDir, { recursive: true })
  if (!fs.existsSync(testResultsDir)) fs.mkdirSync(testResultsDir, { recursive: true })

  console.log('Sanity: Running API + Backend (Vitest)...')
  const vitestResult = await run('npx', [
    'vitest', 'run', 'tests/api', 'tests/backend',
    '--reporter=json', '--outputFile=test-results-dashboard/vitest-results.json',
  ], { silent: false })
  if (vitestResult.code !== 0) {
    console.error('Vitest sanity failed with code', vitestResult.code)
  }

  console.log('Sanity: Running E2E (Playwright)...')
  // Do not pass --reporter=json so config's json reporter (with outputFile) is used
  const playwrightResult = await run('npx', [
    'playwright', 'test',
    ...SANITY_E2E_SPECS,
  ], { silent: false })
  if (playwrightResult.code !== 0) {
    console.error('Playwright sanity failed with code', playwrightResult.code)
  }

  console.log('Sanity: Generating dashboard...')
  await run('node', ['scripts/generate-test-dashboard.js'], { silent: false })

  const exitCode = vitestResult.code !== 0 || playwrightResult.code !== 0 ? 1 : 0
  process.exit(exitCode)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

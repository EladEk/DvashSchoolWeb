/**
 * Run all test phases in sequence: Vitest (api, backend, src, components), then E2E (Playwright), then generate dashboard.
 * Always runs all three phases even if one fails, so "Run All" from the dashboard completes every phase.
 */
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

function run(name, cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { cwd: projectRoot, shell: true, stdio: 'inherit' })
    proc.on('close', (code) => resolve(code))
    proc.on('error', () => resolve(1))
  })
}

async function main() {
  console.log('=== Phase 1: Vitest (api, backend, src, components) ===\n')
  const vitestCode = await run('Vitest', 'npx', [
    'vitest', 'run', 'tests/api', 'tests/backend', 'src', 'tests/components',
    '--reporter=json', '--outputFile=test-results-dashboard/vitest-results.json'
  ])
  console.log('\n=== Phase 2: Playwright E2E ===\n')
  const e2eCode = await run('E2E', 'npx', ['playwright', 'test'])
  console.log('\n=== Phase 3: Generate dashboard ===\n')
  const dashCode = await run('Dashboard', 'node', ['scripts/generate-test-dashboard.js'])
  const failed = vitestCode !== 0 || e2eCode !== 0 || dashCode !== 0
  if (failed) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

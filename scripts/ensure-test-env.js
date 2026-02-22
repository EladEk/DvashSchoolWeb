/**
 * Ensures the test environment (dev server) is ready before running E2E.
 * If http://localhost:5173 is not reachable, starts `npm run dev` and waits for it.
 * Usage: node scripts/ensure-test-env.js
 * Exit: 0 when env is ready, 1 on timeout or error.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173'
const CHECK_TIMEOUT_MS = 3000
const POLL_INTERVAL_MS = 800
const STARTUP_TIMEOUT_MS = 120000

async function isReady() {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS)
  try {
    const res = await fetch(BASE_URL, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'text/html' },
    })
    clearTimeout(t)
    return true
  } catch {
    clearTimeout(t)
    return false
  }
}

async function waitForReady() {
  const start = Date.now()
  while (Date.now() - start < STARTUP_TIMEOUT_MS) {
    if (await isReady()) return true
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
  }
  return false
}

async function startDevServer() {
  const { spawn } = await import('child_process')
  const child = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    detached: true,
    stdio: 'ignore',
    shell: true,
    env: { ...process.env, FORCE_COLOR: '0' },
  })
  child.unref()
  return child
}

async function main() {
  if (await isReady()) {
    process.exit(0)
  }

  await startDevServer()
  const ready = await waitForReady()
  if (ready) {
    process.exit(0)
  }

  console.error('ensure-test-env: timeout waiting for', BASE_URL)
  process.exit(1)
}

main().catch((err) => {
  console.error('ensure-test-env:', err.message)
  process.exit(1)
})

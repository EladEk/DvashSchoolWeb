/**
 * Test dashboard server: serves dashboard, GET /api/results, POST /api/run-test, POST /api/run-sanity, POST /api/run-all (streaming).
 */
import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const testResultsDir = path.join(projectRoot, 'test-results')
const dashboardDir = path.join(projectRoot, 'test-results-dashboard')
const dashboardHtmlPath = path.join(__dirname, 'dashboard.html')
const PORT = process.env.TEST_DASHBOARD_PORT || 3456

function send(res, statusCode, body, contentType = 'application/json') {
  res.writeHead(statusCode, { 'Content-Type': contentType })
  res.end(typeof body === 'string' ? body : JSON.stringify(body))
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath)
  const types = { '.html': 'text/html', '.json': 'application/json', '.js': 'application/javascript', '.css': 'text/css' }
  const contentType = types[ext] || 'application/octet-stream'
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, JSON.stringify({ error: 'Not found' }))
      return
    }
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(data)
  })
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk.toString() })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function parseWorkers(body) {
  try {
    const o = typeof body === 'string' && body.trim() ? JSON.parse(body) : {}
    const w = parseInt(o.workers ?? o.w ?? 1, 10)
    return Math.min(4, Math.max(1, Number.isNaN(w) ? 1 : w))
  } catch {
    return 1
  }
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    proc.stdout?.on('data', (d) => { stdout += d.toString() })
    proc.stderr?.on('data', (d) => { stderr += d.toString() })
    proc.on('close', (code) => {
      try {
        const out = stdout + stderr
        const jsonMatch = out.match(/\{[\s\S]*\}/)
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null
        resolve({ code, parsed, stdout, stderr })
      } catch {
        resolve({ code, parsed: null, stdout, stderr })
      }
    })
    proc.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url || '/', 'http://localhost')
  const pathname = url.pathname

  if (pathname === '/api/results') {
    const dataPath = path.join(dashboardDir, 'dashboard-data.json')
    try {
      const data = fs.readFileSync(dataPath, 'utf-8')
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(data)
    } catch {
      send(res, 200, { rows: [], summary: { total: 0, passed: 0, failed: 0, skipped: 0 }, byLayer: {} })
    }
    return
  }

  // All tests with latest result: merge all-tests.json (full list) with dashboard-data.json (last run)
  // ?refresh=1 forces re-discovery of all tests (playwright --list + vitest)
  if (pathname === '/api/tests/list') {
    try {
      let allTestsPath = path.join(dashboardDir, 'all-tests.json')
      const forceRefresh = url.searchParams.get('refresh') === '1' || url.searchParams.get('refresh') === 'true'
      if (!fs.existsSync(allTestsPath) || forceRefresh) {
        const proc = spawn('node', ['scripts/list-all-tests.js'], { cwd: projectRoot, shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
        await new Promise((resolve, reject) => {
          proc.on('close', resolve)
          proc.on('error', reject)
        })
      }
      let list = []
      if (fs.existsSync(allTestsPath)) {
        const raw = JSON.parse(fs.readFileSync(allTestsPath, 'utf-8'))
        list = raw.tests || raw.rows || []
      }
      let resultsByKey = {}
      let summary = { byLayer: { Backend: { total: 0, passed: 0, failed: 0, skipped: 0 }, Frontend: { total: 0, passed: 0, failed: 0, skipped: 0 }, E2E: { total: 0, passed: 0, failed: 0, skipped: 0 } }, total: 0, passed: 0, failed: 0, skipped: 0 }
      let generatedAt = null
      const dataPath = path.join(dashboardDir, 'dashboard-data.json')
      if (fs.existsSync(dataPath)) {
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
        const rows = data.rows || []
        summary = data.summary || summary
        generatedAt = data.generatedAt || null
        for (const r of rows) {
          const key = (r.runner || '') + '::' + (r.target || r.name || '')
          resultsByKey[key] = r
        }
      }
      const merged = list.map((t) => {
        const key = (t.runner || '') + '::' + (t.target || t.name || '')
        const last = resultsByKey[key]
        if (last) {
          return { ...t, status: last.status, actual: last.actual || t.actual, duration: last.duration ?? t.duration }
        }
        return t
      })
      const byLayer = { Backend: { total: 0, passed: 0, failed: 0, skipped: 0 }, Frontend: { total: 0, passed: 0, failed: 0, skipped: 0 }, E2E: { total: 0, passed: 0, failed: 0, skipped: 0 } }
      for (const r of merged) {
        const layer = r.layer in byLayer ? r.layer : 'Frontend'
        byLayer[layer].total++
        if (r.status === 'passed') byLayer[layer].passed++
        else if (r.status === 'failed') byLayer[layer].failed++
        else if (r.status === 'skipped') byLayer[layer].skipped++
      }
      const computedSummary = {
        byLayer,
        total: merged.length,
        passed: merged.filter((x) => x.status === 'passed').length,
        failed: merged.filter((x) => x.status === 'failed').length,
        skipped: merged.filter((x) => x.status === 'skipped').length,
      }
      send(res, 200, { rows: merged, tests: merged, summary: computedSummary, generatedAt })
    } catch (err) {
      send(res, 500, { error: err.message, rows: [], tests: [], summary: {} })
    }
    return
  }

  if (pathname === '/api/run-test' && req.method === 'POST') {
    let body = ''
    for await (const chunk of req) body += chunk
    let json
    try {
      json = JSON.parse(body)
    } catch {
      send(res, 400, { error: 'Invalid JSON' })
      return
    }
    const { runner, target } = json
    if (!runner || !target) {
      send(res, 400, { error: 'runner and target required' })
      return
    }
    try {
      if (runner === 'vitest') {
        const { code, parsed } = await runCommand('npx', ['vitest', 'run', '-t', target, '--reporter=json', '--outputFile=test-results-dashboard/vitest-single.json'], projectRoot)
        const status = code === 0 ? 'passed' : 'failed'
        let actual = ''
        if (parsed?.testResults) {
          const first = parsed.testResults[0]
          const assertions = first?.assertionResults || first?.result?.assertionResults || []
          const failed = assertions.find((a) => a.status === 'failed')
          if (failed) actual = failed.failureMessages?.[0] || failed.message || ''
        }
        send(res, 200, { status, result: { actual }, output: parsed })
      } else if (runner === 'playwright') {
        const { code, stdout, stderr } = await runCommand('npx', ['playwright', 'test', '-g', target, '--reporter=json'], projectRoot)
        const status = code === 0 ? 'passed' : 'failed'
        let actual = ''
        try {
          const out = stdout + stderr
          const jsonMatch = out.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0])
            const suites = data.suites || []
            const findErr = (s) => {
              for (const spec of s.specs || []) {
                for (const t of spec.tests || []) {
                  const err = t.results?.[0]?.error?.message
                  if (err) return err
                }
              }
              for (const c of s.suites || []) { const e = findErr(c); if (e) return e }
              return ''
            }
            for (const s of suites) { actual = findErr(s); if (actual) break }
          }
        } catch (_) {}
        send(res, 200, { status, result: { actual: actual || (stdout + stderr).slice(0, 500) }, output: stdout + stderr })
      } else {
        send(res, 400, { error: 'Unknown runner' })
      }
    } catch (err) {
      send(res, 500, { error: err.message, status: 'error' })
    }
    return
  }

  if (pathname === '/' || pathname === '/dashboard.html') {
    if (fs.existsSync(dashboardHtmlPath)) {
      serveFile(dashboardHtmlPath, res)
    } else {
      const fallback = path.join(dashboardDir, 'dashboard.html')
      if (fs.existsSync(fallback)) serveFile(fallback, res)
      else send(res, 404, '<h1>Dashboard not found</h1><p>Start the server from project root.</p>', 'text/html')
    }
    return
  }

  function streamProcess(res, proc) {
    let closed = false
    function safeWrite(d) {
      if (closed) return
      try {
        if (!res.writableEnded) res.write(d)
      } catch (_) { closed = true }
    }
    req.on('close', () => { closed = true })
    res.on('error', () => { closed = true })
    proc.stdout?.on('data', safeWrite)
    proc.stderr?.on('data', safeWrite)
    proc.on('close', () => {
      if (!closed && !res.writableEnded) res.end()
    })
    proc.on('error', () => {
      if (!closed && !res.writableEnded) res.end()
    })
  }

  if (pathname === '/api/run-sanity' && req.method === 'POST') {
    const body = await readBody(req)
    const workers = parseWorkers(body)
    const env = { ...process.env, PLAYWRIGHT_WORKERS: String(workers) }
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Transfer-Encoding': 'chunked' })
    const proc = spawn('node', ['scripts/run-sanity.js'], { cwd: projectRoot, shell: true, stdio: ['ignore', 'pipe', 'pipe'], env })
    streamProcess(res, proc)
    return
  }

  if (pathname === '/api/run-all' && req.method === 'POST') {
    const body = await readBody(req)
    const workers = parseWorkers(body)
    const env = { ...process.env, PLAYWRIGHT_WORKERS: String(workers) }
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Transfer-Encoding': 'chunked' })
    const proc = spawn('node', ['scripts/run-all-tests.js'], { cwd: projectRoot, shell: true, stdio: ['ignore', 'pipe', 'pipe'], env })
    streamProcess(res, proc)
    return
  }

  if (pathname === '/api/delete-test-data' && req.method === 'POST') {
    try {
      const { code, parsed, stdout, stderr } = await runCommand('node', ['scripts/delete-parliament-test-data.js'], projectRoot)
      let body = parsed
      if (!body && typeof stdout === 'string' && stdout.trim()) {
        try { body = JSON.parse(stdout.trim()) } catch { body = { error: stderr || stdout || 'Delete script failed' } }
      }
      if (!body) body = { error: stderr || 'Delete script failed' }
      send(res, body.error ? 500 : 200, body)
    } catch (err) {
      send(res, 500, { error: err.message || String(err) })
    }
    return
  }

  const filePath = path.join(testResultsDir, pathname.replace(/^\//, ''))
  if (filePath.startsWith(testResultsDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveFile(filePath, res)
    return
  }

  send(res, 404, JSON.stringify({ error: 'Not found' }))
})

// Refresh full test list on startup so dashboard shows all E2E + Vitest tests (e.g. after adding new specs)
function refreshTestList() {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['scripts/list-all-tests.js'], { cwd: projectRoot, shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
    proc.on('close', (code) => { if (code === 0) resolve(); else resolve() })
    proc.on('error', () => resolve())
  })
}

refreshTestList().then(() => {
  server.listen(PORT, () => {
    console.log('Test dashboard server at http://localhost:' + PORT)
    console.log('Open http://localhost:' + PORT + '/dashboard.html to view results and run tests.')
  })
})

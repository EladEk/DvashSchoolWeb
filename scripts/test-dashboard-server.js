/**
 * Test dashboard server: serves test-results/ and exposes GET /api/results, POST /api/run-test.
 */
import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const testResultsDir = path.join(projectRoot, 'test-results')
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
    const dataPath = path.join(testResultsDir, 'dashboard-data.json')
    try {
      const data = fs.readFileSync(dataPath, 'utf-8')
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(data)
    } catch {
      send(res, 200, { rows: [], summary: { total: 0, passed: 0, failed: 0, skipped: 0 }, byLayer: {} })
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
        const { code, parsed } = await runCommand('npx', ['vitest', 'run', '-t', target, '--reporter=json', '--outputFile=test-results/vitest-single.json'], projectRoot)
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
        send(res, 200, { status, output: stdout + stderr })
      } else {
        send(res, 400, { error: 'Unknown runner' })
      }
    } catch (err) {
      send(res, 500, { error: err.message, status: 'error' })
    }
    return
  }

  if (pathname === '/' || pathname === '/dashboard.html') {
    const file = path.join(testResultsDir, 'dashboard.html')
    if (fs.existsSync(file)) {
      serveFile(file, res)
    } else {
      send(res, 404, '<h1>Dashboard not generated</h1><p>Run <code>npm run test:all</code> or <code>npm run test:dashboard</code> first.</p>', 'text/html')
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

server.listen(PORT, () => {
  console.log('Test dashboard server at http://localhost:' + PORT)
  console.log('Open http://localhost:' + PORT + '/dashboard.html to view results and run tests.')
})

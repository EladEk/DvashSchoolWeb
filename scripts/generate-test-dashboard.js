/**
 * Generate test-results/dashboard.html from Vitest and Playwright JSON outputs.
 * Reads test-results/vitest-results.json and test-results/playwright-results.json.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const testResultsDir = path.join(projectRoot, 'test-results-dashboard')

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function loadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function parseVitestResults(data) {
  const rows = []
  if (!data || !data.testResults) return rows
  for (const fileResult of data.testResults) {
    const file = fileResult.name || ''
    const suite = path.relative(projectRoot, file)
    const assertions = fileResult.assertionResults || fileResult.result?.assertionResults || []
    for (const a of assertions) {
      const name = a.ancestorTitles?.concat([a.title]).join(' > ') || a.fullName || a.title || 'test'
      const status = a.status === 'passed' ? 'passed' : a.status === 'failed' ? 'failed' : 'skipped'
      const actual = a.failureMessages?.[0] || (status === 'passed' ? 'Pass' : a.status || '')
      rows.push({
        layer: file.includes('e2e') || file.includes('playwright') ? 'E2E' : file.includes('api') || file.includes('backend') ? 'Backend' : 'Frontend',
        suite,
        name,
        expected: name,
        status,
        actual: actual.slice(0, 2000),
        duration: a.duration ?? 0,
        runner: 'vitest',
        target: a.fullName || a.title || name,
      })
    }
  }
  return rows
}

function parsePlaywrightResults(data) {
  const rows = []
  if (!data) return rows
  const suites = data.suites || []
  function walk(suite, parentTitle = '') {
    const title = (suite.title || '') + (parentTitle ? ` > ${parentTitle}` : '')
    for (const spec of suite.specs || []) {
      const specTitle = spec.title || 'spec'
      const fullTitle = title ? `${title} > ${specTitle}` : specTitle
      for (const test of spec.tests || []) {
        const resultStatus = test.results?.[0]?.status
        const outcome = test.status || test.outcome
        const status = resultStatus === 'passed' ? 'passed' : resultStatus === 'failed' ? 'failed' : outcome === 'expected' ? 'passed' : outcome === 'unexpected' ? 'failed' : 'skipped'
        const err = test.results?.[0]?.error?.message || test.results?.[0]?.error?.stack || ''
        rows.push({
          layer: 'E2E',
          suite: spec.file || 'e2e',
          name: fullTitle,
          expected: fullTitle,
          status,
          actual: err ? err.slice(0, 2000) : (status === 'passed' ? 'Pass' : ''),
          duration: test.results?.[0]?.duration ?? 0,
          runner: 'playwright',
          target: fullTitle,
        })
      }
    }
    for (const child of suite.suites || []) walk(child, title)
  }
  for (const s of suites) walk(s)
  return rows
}

function buildSummary(rows) {
  const byLayer = { Backend: { total: 0, passed: 0, failed: 0, skipped: 0 }, Frontend: { total: 0, passed: 0, failed: 0, skipped: 0 }, E2E: { total: 0, passed: 0, failed: 0, skipped: 0 } }
  for (const r of rows) {
    const layer = r.layer in byLayer ? r.layer : 'Frontend'
    byLayer[layer].total++
    if (r.status === 'passed') byLayer[layer].passed++
    else if (r.status === 'failed') byLayer[layer].failed++
    else byLayer[layer].skipped++
  }
  const total = rows.length
  const passed = rows.filter((r) => r.status === 'passed').length
  const failed = rows.filter((r) => r.status === 'failed').length
  const skipped = rows.filter((r) => r.status === 'skipped').length
  return { byLayer, total, passed, failed, skipped }
}

function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function generateHtml(rows, summary) {
  const ts = new Date().toISOString()
  let tableRows = rows
    .map(
      (r, i) => `
    <tr data-runner="${escapeHtml(r.runner)}" data-target="${escapeHtml(r.target)}" data-index="${i}">
      <td>${escapeHtml(r.layer)}</td>
      <td>${escapeHtml(r.suite)}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.expected)}</td>
      <td class="status-${r.status}">${escapeHtml(r.status)}</td>
      <td>${escapeHtml(r.actual)}</td>
      <td>${r.duration ? Math.round(r.duration) + 'ms' : '-'}</td>
      <td><button type="button" class="run-test-btn">Run</button></td>
    </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Test Results Dashboard</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 1rem; background: #1a1a1a; color: #e0e0e0; }
    h1 { margin-bottom: 0.5rem; }
    .summary { display: flex; gap: 2rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .summary .card { padding: 0.5rem 1rem; border-radius: 8px; }
    .summary .card.backend { background: #2d3748; }
    .summary .card.frontend { background: #2c5282; }
    .summary .card.e2e { background: #276749; }
    .status-passed { color: #68d391; }
    .status-failed { color: #fc8181; }
    .status-skipped { color: #a0aec0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #4a5568; padding: 0.5rem; text-align: left; }
    th { background: #2d3748; }
    .run-test-btn { cursor: pointer; padding: 0.25rem 0.5rem; }
    .run-test-btn.running { opacity: 0.6; pointer-events: none; }
    .timestamp { color: #718096; font-size: 0.875rem; }
  </style>
</head>
<body>
  <h1>Test Results Dashboard</h1>
  <p class="timestamp">Generated: ${ts}</p>
  <div class="summary">
    <div class="card backend">Backend: ${summary.byLayer.Backend.passed}/${summary.byLayer.Backend.total} passed</div>
    <div class="card frontend">Frontend: ${summary.byLayer.Frontend.passed}/${summary.byLayer.Frontend.total} passed</div>
    <div class="card e2e">E2E: ${summary.byLayer.E2E.passed}/${summary.byLayer.E2E.total} passed</div>
    <div class="card">Total: ${summary.passed}/${summary.total} passed, ${summary.failed} failed, ${summary.skipped} skipped</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Layer</th><th>Suite</th><th>Test</th><th>Expected</th><th>Status</th><th>Actual</th><th>Duration</th><th>Run</th>
      </tr>
    </thead>
    <tbody>
${tableRows}
    </tbody>
  </table>
  <script>
    document.querySelectorAll('.run-test-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tr = btn.closest('tr');
        const runner = tr.dataset.runner;
        const target = tr.dataset.target;
        if (!runner || !target) return;
        btn.classList.add('running');
        btn.textContent = 'Running...';
        try {
          const res = await fetch('/api/run-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ runner, target: target })
          });
          const data = await res.json();
          tr.querySelector('.status-passed, .status-failed, .status-skipped')?.classList.remove('status-passed', 'status-failed', 'status-skipped');
          const statusCell = tr.querySelector('td:nth-child(5)');
          if (statusCell) {
            statusCell.textContent = data.status || (data.result?.status) || 'done';
            statusCell.classList.add('status-' + (data.status === 'passed' ? 'passed' : data.status === 'failed' ? 'failed' : 'skipped'));
          }
          const actualCell = tr.querySelector('td:nth-child(6)');
          if (actualCell) actualCell.textContent = (data.result?.actual || data.output || data.actual || '').slice(0, 200);
        } catch (e) {
          tr.querySelector('td:nth-child(5)').textContent = 'error';
          tr.querySelector('td:nth-child(6)').textContent = e.message || 'Request failed';
        }
        btn.classList.remove('running');
        btn.textContent = 'Run';
      });
    });
  </script>
</body>
</html>`
}

function main() {
  ensureDir(testResultsDir)
  const vitestPath = path.join(testResultsDir, 'vitest-results.json')
  const playwrightPath = path.join(testResultsDir, 'playwright-results.json')
  const vitestData = loadJson(vitestPath)
  const playwrightData = loadJson(playwrightPath)
  const vitestRows = parseVitestResults(vitestData)
  const playwrightRows = parsePlaywrightResults(playwrightData)
  const rows = [...vitestRows, ...playwrightRows]
  const summary = buildSummary(rows)
  const html = generateHtml(rows, summary)
  const dashboardPath = path.join(testResultsDir, 'dashboard.html')
  fs.writeFileSync(dashboardPath, html, 'utf-8')
  const dataPath = path.join(testResultsDir, 'dashboard-data.json')
  fs.writeFileSync(dataPath, JSON.stringify({ rows, summary, generatedAt: new Date().toISOString() }, null, 2), 'utf-8')
  const allTestsPath = path.join(testResultsDir, 'all-tests.json')
  fs.writeFileSync(allTestsPath, JSON.stringify({ tests: rows, generatedAt: new Date().toISOString() }, null, 2), 'utf-8')
  console.log('Dashboard written to', dashboardPath)
  console.log('Total tests:', rows.length, '| Passed:', summary.passed, '| Failed:', summary.failed)
}

main()

/**
 * Node auth server (server/auth-server.js): GET /auth 200 + token/signature/expire; OPTIONS 204; other 404.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')
const authServerPath = path.join(projectRoot, 'server', 'auth-server.js')

describe('auth server (Node)', () => {
  let serverProcess
  const baseUrl = 'http://localhost:3001'

  beforeAll(async () => {
    serverProcess = spawn('node', [authServerPath], {
      cwd: projectRoot,
      env: { ...process.env, IMAGEKIT_PRIVATE_KEY: 'test-key', PORT: '3001' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 100))
      try {
        const res = await fetch(`${baseUrl}/auth`)
        if (res.ok) break
      } catch (_) {}
      if (i === 49) throw new Error('Server start timeout')
    }
  })

  afterAll(() => {
    if (serverProcess) serverProcess.kill()
  })

  it('GET /auth returns 200 and JSON with token, signature, expire', async () => {
    const res = await fetch(`${baseUrl}/auth`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('token')
    expect(body).toHaveProperty('signature')
    expect(body).toHaveProperty('expire')
    expect(body.expire).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })

  it('OPTIONS /auth returns 204', async () => {
    const res = await fetch(`${baseUrl}/auth`, { method: 'OPTIONS' })
    expect(res.status).toBe(204)
  })

  it('GET /other returns 404', async () => {
    const res = await fetch(`${baseUrl}/other`)
    expect(res.status).toBe(404)
  })
})

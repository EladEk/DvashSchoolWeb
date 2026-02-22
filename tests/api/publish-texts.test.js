/**
 * api/publish-texts.js — POST only; missing GITHUB_TOKEN or FIREBASE_SERVICE_ACCOUNT returns 500.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { createMockReq, createMockRes } from '../helpers/createMockReqRes.js'
import handler from '../../api/publish-texts.js'

describe('api/publish-texts.js', () => {
  const origEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...origEnv }
  })

  it('non-POST returns 405', async () => {
    const req = createMockReq({ method: 'GET' })
    const res = createMockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(405)
    expect(res._body?.error).toBe('Method not allowed')
  })

  it('POST with missing GITHUB_TOKEN returns 500', async () => {
    delete process.env.GITHUB_TOKEN
    const req = createMockReq({ method: 'POST', body: {} })
    const res = createMockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(500)
    expect(res._body?.error).toBeDefined()
  })
})

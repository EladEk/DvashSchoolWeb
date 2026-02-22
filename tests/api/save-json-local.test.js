/**
 * api/save-json-local.js — POST with body.texts; POST without texts → 400; non-POST → 405.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createMockReq, createMockRes } from '../helpers/createMockReqRes.js'
import handler from '../../api/save-json-local.js'

describe('api/save-json-local.js', () => {
  const origEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...origEnv }
    vi.restoreAllMocks()
  })

  it('non-POST returns 405', async () => {
    const req = createMockReq({ method: 'GET' })
    const res = createMockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(405)
    expect(res._body?.error).toBe('Method not allowed')
  })

  it('POST without texts and without Firebase returns 400', async () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const req = createMockReq({ method: 'POST', body: {} })
    const res = createMockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
    expect(res._body?.error).toBeDefined()
  })
})

/**
 * api/auth.js — GET returns token/signature/expire; OPTIONS 204; non-GET 405; missing key 500.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createMockReq, createMockRes } from '../helpers/createMockReqRes.js'
import handler from '../../api/auth.js'

describe('api/auth.js', () => {
  const origEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...origEnv }
  })

  it('GET returns 200 and body with token, signature, expire when IMAGEKIT_PRIVATE_KEY is set', async () => {
    process.env.IMAGEKIT_PRIVATE_KEY = 'test-key'
    const req = createMockReq({ method: 'GET' })
    const res = createMockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res._body).toBeDefined()
    expect(res._body).toHaveProperty('token')
    expect(res._body).toHaveProperty('signature')
    expect(res._body).toHaveProperty('expire')
    expect(typeof res._body.token).toBe('string')
    expect(typeof res._body.signature).toBe('string')
    expect(typeof res._body.expire).toBe('number')
    expect(res._body.expire).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })

  it('GET returns 500 when IMAGEKIT_PRIVATE_KEY is missing', async () => {
    delete process.env.IMAGEKIT_PRIVATE_KEY
    const req = createMockReq({ method: 'GET' })
    const res = createMockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(500)
    expect(res._body).toBeDefined()
    expect(res._body.error).toBeDefined()
  })

  it('OPTIONS returns 204', async () => {
    process.env.IMAGEKIT_PRIVATE_KEY = 'test-key'
    const req = createMockReq({ method: 'OPTIONS' })
    const res = createMockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(204)
  })

  it('POST returns 405', async () => {
    process.env.IMAGEKIT_PRIVATE_KEY = 'test-key'
    const req = createMockReq({ method: 'POST' })
    const res = createMockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(405)
    expect(res._body?.error).toBe('Method not allowed')
  })
})

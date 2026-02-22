/**
 * api/export-all.js — GET returns 200 and JSON with expected top-level keys.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockReq, createMockRes } from '../helpers/createMockReqRes.js'

const mockFirestore = () => ({
  collection: (name) => ({
    doc: () => ({
      get: () => Promise.resolve({ exists: false, data: () => null }),
    }),
    orderBy: () => ({
      get: () => Promise.resolve({ docs: [] }),
    }),
    get: () => Promise.resolve({ docs: [] }),
  }),
})

const mockAdmin = {
  apps: [],
  initializeApp: function () {
    this.apps = [{}]
  },
  credential: { cert: () => ({}) },
  firestore: mockFirestore,
}

// Export both default and named 'apps' so dynamic import() gets admin.apps (Vitest expects named export)
vi.mock('firebase-admin', () => ({
  get default() {
    return mockAdmin
  },
  get apps() {
    return mockAdmin.apps
  },
  get initializeApp() {
    return mockAdmin.initializeApp.bind(mockAdmin)
  },
  get credential() {
    return mockAdmin.credential
  },
  get firestore() {
    return mockAdmin.firestore
  },
}))

beforeEach(() => {
  mockAdmin.apps = []
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('api/export-all.js', () => {
  it('GET returns 200 and body has success, message, download, jsonContent', async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({
      project_id: 'test',
      client_email: 'test@test.iam.gserviceaccount.com',
      private_key: 'MOCK_SINGLE_LINE_KEY',
    })
    const origFetch = globalThis.fetch
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(null) }))
    const handler = (await import('../../api/export-all.js')).default
    const req = createMockReq({ method: 'GET' })
    const res = createMockRes()
    await handler(req, res)
    globalThis.fetch = origFetch
    expect(res.statusCode).toBe(200)
    expect(res._body).toHaveProperty('success', true)
    expect(res._body).toHaveProperty('message')
    expect(res._body).toHaveProperty('download', true)
    expect(res._body).toHaveProperty('jsonContent')
  })

  it('non-GET and non-POST returns 405', async () => {
    const handler = (await import('../../api/export-all.js')).default
    const req = createMockReq({ method: 'PUT' })
    const res = createMockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(405)
    expect(res._body?.error).toBe('Method not allowed')
  })
})

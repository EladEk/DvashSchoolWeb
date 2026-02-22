/**
 * Shared test helpers for invoking Vercel-style handlers with mock req/res.
 */

export function createMockReq(opts = {}) {
  return {
    method: 'GET',
    headers: {},
    body: null,
    query: {},
    ...opts,
  }
}

export function createMockRes() {
  const res = {
    statusCode: 200,
    _headers: {},
    _body: null,
  }
  res.setHeader = (k, v) => {
    res._headers[k] = v
    return res
  }
  res.status = (s) => {
    res.statusCode = s
    return res
  }
  res.json = (body) => {
    res._body = body
    return res
  }
  res.end = () => res
  return res
}

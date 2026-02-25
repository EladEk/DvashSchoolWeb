/**
 * Vite plugin: run /api/custom-token in development (Vercel runs it in production).
 */

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('error', reject)
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
  })
}

export default function apiCustomToken() {
  return {
    name: 'api-custom-token',
    configureServer(server) {
      server.middlewares.use('/api/custom-token', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204)
          res.end()
          return
        }
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        try {
          const raw = await readBody(req)
          const body = raw ? JSON.parse(raw) : {}

          const handler = (await import('./api/custom-token.js')).default

          const headers = {}
          const resWrapper = {
            _statusCode: 200,
            setHeader(name, value) {
              headers[name] = value
              return this
            },
            status(code) {
              this._statusCode = code
              return this
            },
            end(body) {
              res.writeHead(this._statusCode, { ...headers, 'Content-Type': 'application/json' })
              res.end(body != null ? body : '')
              return this
            },
            json(obj) {
              res.writeHead(this._statusCode, { ...headers, 'Content-Type': 'application/json' })
              res.end(JSON.stringify(obj))
              return this
            }
          }

          await handler(
            { method: req.method, body },
            resWrapper
          )
        } catch (error) {
          console.error('[api/custom-token]', error)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({
            error: 'Internal server error',
            message: error?.message || String(error)
          }))
        }
      })
    }
  }
}

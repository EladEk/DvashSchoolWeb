/**
 * Vite plugin: run /api/save-json-local in development (Vercel runs it in production).
 * Reads POST body, calls the serverless handler with Node req/res adapters.
 */

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('error', reject)
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
  })
}

export default function apiSaveJsonLocal() {
  return {
    name: 'api-save-json-local',
    configureServer(server) {
      server.middlewares.use('/api/save-json-local', async (req, res, next) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        try {
          const raw = await readBody(req)
          const body = raw ? JSON.parse(raw) : {}

          const handler = (await import('./api/save-json-local.js')).default

          const resWrapper = {
            _statusCode: 200,
            status(code) {
              this._statusCode = code
              return this
            },
            json(obj) {
              res.writeHead(this._statusCode, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify(obj))
              return this
            }
          }

          await handler(
            { method: 'POST', body },
            resWrapper
          )
        } catch (error) {
          console.error('[api/save-json-local]', error)
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

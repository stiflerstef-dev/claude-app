/**
 * server.ts — Fastify WebSocket relay server
 * Accepts connections from daemon (/daemon) and mobile app (/app).
 * Routes messages between them via the broker.
 */

import Fastify from 'fastify'
import fastifyWebsocket, { SocketStream } from '@fastify/websocket'
import fastifyRateLimit from '@fastify/rate-limit'
import { validateDaemonToken, createAppToken, validateAppToken } from './auth.js'
import { sessionRegistry } from './sessions.js'
import { broker } from './broker.js'
import { audit } from './audit.js'

const PORT = parseInt(process.env.PORT ?? '3030', 10)
const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info'

const server = Fastify({ logger: { level: LOG_LEVEL } })

await server.register(fastifyRateLimit, { max: 100, timeWindow: '1 minute' })
await server.register(fastifyWebsocket)

// Root
server.get('/', async () => ({
  name: 'claude-remote relay',
  version: '1.0.0',
  endpoints: {
    health: 'GET /health',
    token: 'POST /auth/token',
    daemon: 'WS /daemon',
    app: 'WS /app',
  },
}))

// Health check
server.get('/health', async () => ({
  status: 'ok',
  sessions: sessionRegistry.getAll().length,
  daemons: broker.daemonCount(),
}))

// Auth token endpoint (stub WebAuthn for now — accepts any request in dev)
server.post('/auth/token', {
  config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
}, async (_request, reply) => {
  try {
    const token = createAppToken('user-1', 'device-1')
    return { token }
  } catch (err) {
    reply.status(500).send({ error: 'Token creation failed' })
  }
})

// Daemon WebSocket endpoint
server.register(async (instance) => {
  instance.get('/daemon', { websocket: true }, (connection: SocketStream, req) => {
    const ws = connection.socket
    let daemonId: string | null = null

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(raw.toString())
      } catch {
        return
      }

      if (msg.type === 'auth') {
        if (!validateDaemonToken(msg.token as string)) {
          ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }))
          ws.close()
          return
        }
        daemonId = msg.device_id as string
        broker.registerDaemon(daemonId, ws)
        audit.log('daemon_connected', daemonId, null, null)
        server.log.info(`Daemon connected: ${daemonId}`)
        return
      }

      if (!daemonId) return
      broker.handleDaemonMessage(daemonId, msg)
    })

    ws.on('close', () => {
      if (daemonId) {
        broker.unregisterDaemon(daemonId)
        audit.log('daemon_disconnected', daemonId, null, null)
        server.log.info(`Daemon disconnected: ${daemonId}`)
      }
    })

    ws.on('error', (err: Error) => {
      server.log.error(`Daemon socket error: ${err.message}`)
    })
  })
})

// App WebSocket endpoint
server.register(async (instance) => {
  instance.get('/app', { websocket: true }, (connection: SocketStream, req) => {
    const ws = connection.socket
    // Auth via first message (WS headers unreliable on mobile)
    let clientId: string | null = null
    let authenticated = false

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(raw.toString())
      } catch {
        return
      }

      // First message must be auth
      if (!authenticated) {
        const token = (msg.token as string) ?? ''
        try {
          const payload = validateAppToken(token)
          clientId = `${payload.user_id}:${payload.device_id}:${Date.now()}`
          authenticated = true
          broker.registerAppClient(clientId, ws)
          audit.log('app_connected', null, null, clientId)
          server.log.info(`App client connected: ${clientId}`)
          // Send current session list immediately
          ws.send(JSON.stringify({
            type: 'session_list',
            sessions: sessionRegistry.getAll(),
          }))
        } catch {
          ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }))
          ws.close()
        }
        return
      }

      if (clientId) broker.handleAppMessage(clientId, msg)
    })

    ws.on('close', () => {
      if (clientId) {
        broker.unregisterAppClient(clientId)
        audit.log('app_disconnected', null, null, clientId)
      }
    })

    ws.on('error', (err: Error) => {
      server.log.error(`App socket error: ${err.message}`)
    })
  })
})

try {
  await server.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`Relay server running on port ${PORT}`)
} catch (err) {
  server.log.error(err)
  process.exit(1)
}

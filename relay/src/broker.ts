/**
 * broker.ts — Routes messages between daemon and app WebSocket clients.
 * Daemon → app: session updates, output lines, status changes.
 * App → daemon: commands (send_input, approve, deny, start/stop session).
 */

import { WebSocket } from 'ws'
import { sessionRegistry } from './sessions.js'
import { audit } from './audit.js'

type MsgObj = Record<string, unknown>

class Broker {
  private daemons = new Map<string, WebSocket>()
  private appClients = new Map<string, WebSocket>()

  registerDaemon(id: string, ws: WebSocket): void {
    this.daemons.set(id, ws)
  }

  unregisterDaemon(id: string): void {
    this.daemons.delete(id)
    sessionRegistry.remove(id)
    this.broadcastToApps({ type: 'session_list', sessions: sessionRegistry.getAll() })
  }

  registerAppClient(id: string, ws: WebSocket): void {
    this.appClients.set(id, ws)
  }

  unregisterAppClient(id: string): void {
    this.appClients.delete(id)
  }

  daemonCount(): number {
    return this.daemons.size
  }

  handleDaemonMessage(daemonId: string, msg: MsgObj): void {
    switch (msg.type) {
      case 'session_list':
        sessionRegistry.register(daemonId, (msg.sessions as any[]) ?? [])
        this.broadcastToApps({ type: 'session_list', sessions: sessionRegistry.getAll() })
        break

      case 'output':
        this.broadcastToApps(msg)
        break

      case 'status_change': {
        const sid = msg.session_id as string
        sessionRegistry.update(sid, { status: msg.status as any, last_activity: new Date().toISOString() })
        this.broadcastToApps(msg)
        break
      }

      case 'pong':
        // heartbeat ack — nothing to do
        break

      default:
        // Forward unknown daemon messages to apps
        this.broadcastToApps(msg)
    }
  }

  handleAppMessage(clientId: string, msg: MsgObj): void {
    const sessionId = msg.session_id as string | undefined

    switch (msg.type) {
      case 'send_input':
      case 'approve':
      case 'deny':
      case 'stop_session':
        audit.log(msg.type as string, null, sessionId ?? null, clientId)
        this.forwardToDaemon(sessionId, msg)
        break

      case 'start_session':
      case 'list_projects':
        // Broadcast to all daemons (or first available)
        this.broadcastToDaemons(msg)
        break

      default:
        // Forward to daemon
        this.forwardToDaemon(sessionId, msg)
    }
  }

  private forwardToDaemon(sessionId: string | undefined, msg: MsgObj): void {
    if (sessionId) {
      // Find the daemon that owns this session
      const session = sessionRegistry.getAll().find((s) => s.id === sessionId)
      if (session) {
        const ws = this.daemons.get(session.daemon_id)
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(msg))
          return
        }
      }
    }
    // Fallback: send to first available daemon
    for (const ws of this.daemons.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg))
        return
      }
    }
  }

  private broadcastToDaemons(msg: MsgObj): void {
    const data = JSON.stringify(msg)
    for (const ws of this.daemons.values()) {
      if (ws.readyState === WebSocket.OPEN) ws.send(data)
    }
  }

  private broadcastToApps(msg: MsgObj): void {
    const data = JSON.stringify(msg)
    for (const ws of this.appClients.values()) {
      if (ws.readyState === WebSocket.OPEN) ws.send(data)
    }
  }
}

export const broker = new Broker()

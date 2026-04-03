/**
 * sessions.ts — In-memory session registry.
 * Tracks all Claude Code sessions reported by connected daemons.
 */

export type SessionStatus = 'active' | 'idle' | 'waiting_approval' | 'stopped'

export interface SessionRecord {
  id: string
  project_id: string
  project_name: string
  project_description: string
  status: SessionStatus
  daemon_id: string
  started_at: string
  last_activity: string
}

class SessionRegistry {
  private sessions = new Map<string, SessionRecord>()

  register(daemonId: string, sessions: SessionRecord[]): void {
    // Remove old sessions for this daemon
    for (const [id, s] of this.sessions) {
      if (s.daemon_id === daemonId) this.sessions.delete(id)
    }
    for (const s of sessions) {
      this.sessions.set(s.id, { ...s, daemon_id: daemonId })
    }
  }

  update(sessionId: string, patch: Partial<SessionRecord>): void {
    const existing = this.sessions.get(sessionId)
    if (existing) {
      this.sessions.set(sessionId, { ...existing, ...patch })
    }
  }

  getAll(): SessionRecord[] {
    return Array.from(this.sessions.values())
  }

  getByDaemon(daemonId: string): SessionRecord[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.daemon_id === daemonId
    )
  }

  remove(daemonId: string): void {
    for (const [id, s] of this.sessions) {
      if (s.daemon_id === daemonId) {
        this.sessions.set(id, { ...s, status: 'stopped' })
      }
    }
  }
}

export const sessionRegistry = new SessionRegistry()

/**
 * audit.ts — Append-only audit log to ./logs/audit.jsonl.
 * Logs connections, disconnections, and commands.
 * Rotates daily, retains 30 days.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOGS_DIR = path.join(__dirname, '..', 'logs')
const MAX_DAYS = 30

function ensureLogsDir(): void {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true })
  }
}

function todayFilename(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return path.join(LOGS_DIR, `audit-${y}-${m}-${day}.jsonl`)
}

function pruneOldLogs(): void {
  try {
    const files = fs.readdirSync(LOGS_DIR)
      .filter((f) => f.startsWith('audit-') && f.endsWith('.jsonl'))
      .sort()
    if (files.length > MAX_DAYS) {
      const toDelete = files.slice(0, files.length - MAX_DAYS)
      for (const f of toDelete) {
        fs.unlinkSync(path.join(LOGS_DIR, f))
      }
    }
  } catch {
    // non-critical
  }
}

class Audit {
  log(
    eventType: string,
    deviceId: string | null,
    sessionId: string | null,
    detail: string | null
  ): void {
    ensureLogsDir()
    pruneOldLogs()
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      event_type: eventType,
      device_id: deviceId,
      session_id: sessionId,
      detail,
    })
    try {
      fs.appendFileSync(todayFilename(), entry + '\n', 'utf-8')
    } catch {
      // non-critical
    }
  }
}

export const audit = new Audit()

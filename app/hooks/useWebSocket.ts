/**
 * hooks/useWebSocket.ts — WebSocket connection to relay /app endpoint.
 * Auto-reconnects with exponential backoff. Dispatches to Zustand store.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useSessionStore } from '../store/sessions'

const MAX_BACKOFF = 30_000

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const backoffRef = useRef(1000)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const { relayUrl, appToken, setSessions, updateSession, appendOutput, setConnectionStatus } =
    useSessionStore()

  const sendMessage = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  const connect = useCallback(() => {
    if (!relayUrl || !appToken) return
    if (!mountedRef.current) return

    setConnectionStatus('connecting')
    const url = relayUrl.replace(/\/$/, '') + '/app'
    const ws = new WebSocket(url, undefined)
    ws.onopen = () => {
      // Send auth header via first message since WS doesn't support custom headers natively
      ws.send(JSON.stringify({ type: 'auth_token', token: appToken }))
      backoffRef.current = 1000
      setConnectionStatus('connected')
    }

    ws.onmessage = (event) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(event.data as string)
      } catch {
        return
      }

      if (msg.type === 'session_list') {
        setSessions((msg.sessions as any[]) ?? [])
      } else if (msg.type === 'output') {
        appendOutput(msg.session_id as string, (msg.lines as string[]) ?? [])
      } else if (msg.type === 'status_change') {
        updateSession(msg.session_id as string, { status: msg.status as any })
      }
    }

    ws.onerror = () => {
      setConnectionStatus('disconnected')
    }

    ws.onclose = () => {
      setConnectionStatus('disconnected')
      wsRef.current = null
      if (!mountedRef.current) return
      timerRef.current = setTimeout(() => {
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF)
        connect()
      }, backoffRef.current)
    }

    wsRef.current = ws
  }, [relayUrl, appToken, setSessions, updateSession, appendOutput, setConnectionStatus])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { sendMessage, connectionStatus: useSessionStore((s) => s.connectionStatus) }
}

/**
 * store/sessions.ts — Zustand store for session state.
 * Persists connectionStatus to AsyncStorage.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type SessionStatus = 'active' | 'idle' | 'waiting_approval' | 'stopped'
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting'

export interface SessionRecord {
  id: string
  project_id: string
  project_name: string
  project_description: string
  status: SessionStatus
  daemon_id?: string
  started_at: string
  last_activity: string
  output: string[]
}

interface SessionsState {
  sessions: SessionRecord[]
  connectionStatus: ConnectionStatus
  activeSessionId: string | null
  relayUrl: string
  appToken: string

  setSessions: (sessions: SessionRecord[]) => void
  updateSession: (id: string, patch: Partial<SessionRecord>) => void
  appendOutput: (sessionId: string, lines: string[]) => void
  setConnectionStatus: (status: ConnectionStatus) => void
  setActiveSession: (id: string | null) => void
  setCredentials: (relayUrl: string, appToken: string) => void
}

export const useSessionStore = create<SessionsState>()(
  persist(
    (set, get) => ({
      sessions: [],
      connectionStatus: 'disconnected',
      activeSessionId: null,
      relayUrl: '',
      appToken: '',

      setSessions: (sessions) => set({ sessions: sessions.map((s) => ({
        ...s,
        output: get().sessions.find((e) => e.id === s.id)?.output ?? [],
      })) }),

      updateSession: (id, patch) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, ...patch } : s
          ),
        })),

      appendOutput: (sessionId, lines) =>
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s
            const output = [...(s.output ?? []), ...lines].slice(-500)
            return { ...s, output }
          }),
        })),

      setConnectionStatus: (status) => set({ connectionStatus: status }),

      setActiveSession: (id) => set({ activeSessionId: id }),

      setCredentials: (relayUrl, appToken) => set({ relayUrl, appToken }),
    }),
    {
      name: 'claude-remote-sessions',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        connectionStatus: state.connectionStatus,
        relayUrl: state.relayUrl,
        appToken: state.appToken,
      }),
    }
  )
)

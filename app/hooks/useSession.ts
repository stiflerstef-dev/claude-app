/**
 * hooks/useSession.ts — Helper hook to access a single session by id.
 */

import { useSessionStore, SessionRecord } from '../store/sessions'

export function useSession(id: string): SessionRecord | undefined {
  return useSessionStore((s) => s.sessions.find((sess) => sess.id === id))
}

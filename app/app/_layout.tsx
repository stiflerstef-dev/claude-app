/**
 * _layout.tsx — Root navigation layout using expo-router.
 * Redirects to /login if no credentials stored.
 */

import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { useSessionStore } from '../store/sessions'
import { useWebSocket } from '../hooks/useWebSocket'

export default function RootLayout() {
  // Initialise WebSocket connection at root level
  useWebSocket()

  return (
    <Stack>
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="(main)/index" options={{ headerShown: false }} />
      <Stack.Screen
        name="(main)/session/[id]"
        options={{ headerShown: false, presentation: 'card' }}
      />
    </Stack>
  )
}

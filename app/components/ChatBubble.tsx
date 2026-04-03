/**
 * ChatBubble.tsx — Renders a single chat message in the session view.
 * Supports user, claude output, tool_call, and system message types.
 */

import React from 'react'
import { View, Text, StyleSheet, useColorScheme } from 'react-native'

export type MessageType = 'user' | 'claude' | 'tool_call' | 'system'

export interface ChatMessage {
  id: string
  type: MessageType
  content: string
  toolName?: string
}

interface Props {
  message: ChatMessage
}

export function ChatBubble({ message }: Props) {
  const isDark = useColorScheme() === 'dark'

  if (message.type === 'system') {
    return (
      <View style={styles.systemRow}>
        <Text style={styles.systemText}>{message.content}</Text>
      </View>
    )
  }

  if (message.type === 'tool_call') {
    return (
      <View style={styles.toolRow}>
        <View style={[styles.toolBubble, isDark ? styles.toolDark : styles.toolLight]}>
          {message.toolName && (
            <Text style={styles.toolName}>{message.toolName}</Text>
          )}
          <Text style={styles.toolContent} numberOfLines={4}>
            {message.content}
          </Text>
        </View>
      </View>
    )
  }

  if (message.type === 'user') {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.content}</Text>
        </View>
      </View>
    )
  }

  // claude output
  return (
    <View style={styles.claudeRow}>
      <View style={[styles.claudeBubble, isDark ? styles.claudeDark : styles.claudeLight]}>
        <Text style={[styles.claudeText, isDark ? styles.claudeTextDark : styles.claudeTextLight]}>
          {message.content}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  systemRow: { alignItems: 'center', marginVertical: 4 },
  systemText: { fontSize: 11, color: '#999', textAlign: 'center' },

  userRow: { alignItems: 'flex-end', marginVertical: 4, marginHorizontal: 12 },
  userBubble: {
    backgroundColor: '#1D9E75',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '80%',
  },
  userText: { color: '#FFF', fontSize: 14 },

  claudeRow: { alignItems: 'flex-start', marginVertical: 4, marginHorizontal: 12 },
  claudeBubble: {
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '85%',
    borderWidth: 1,
  },
  claudeLight: { backgroundColor: '#FFF', borderColor: '#E5E5E3' },
  claudeDark: { backgroundColor: '#2A2A28', borderColor: '#3A3A38' },
  claudeText: { fontSize: 14 },
  claudeTextLight: { color: '#1A1A18' },
  claudeTextDark: { color: '#F0F0EE' },

  toolRow: { alignItems: 'flex-start', marginVertical: 4, marginHorizontal: 12 },
  toolBubble: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '85%',
  },
  toolLight: { backgroundColor: '#F3F3F1' },
  toolDark: { backgroundColor: '#222220' },
  toolName: { fontSize: 11, fontWeight: '700', color: '#888', marginBottom: 2, fontFamily: 'monospace' },
  toolContent: { fontSize: 12, color: '#666', fontFamily: 'monospace' },
})

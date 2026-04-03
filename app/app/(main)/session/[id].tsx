/**
 * session/[id].tsx — Chat view for a single Claude Code session.
 * Shows output as chat bubbles. Approval bar when waiting.
 * Input bar with multiline TextInput, mic, and send button.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSessionStore } from '../../../store/sessions'
import { useWebSocket } from '../../../hooks/useWebSocket'
import { useSession } from '../../../hooks/useSession'
import { ChatBubble, ChatMessage, MessageType } from '../../../components/ChatBubble'
import { ApprovalBar } from '../../../components/ApprovalBar'
import { StatusBadge } from '../../../components/StatusBadge'
import { VoiceInput } from '../../../components/VoiceInput'

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const isDark = useColorScheme() === 'dark'
  const session = useSession(id)
  const { sendMessage } = useWebSocket()
  const [inputText, setInputText] = useState('')
  const listRef = useRef<FlatList>(null)

  const messages: ChatMessage[] = (session?.output ?? []).map((line, i) => ({
    id: String(i),
    type: classifyLine(line),
    content: line,
    toolName: extractToolName(line),
  }))

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true })
    }
  }, [messages.length])

  const handleSend = useCallback(() => {
    const text = inputText.trim()
    if (!text || !id) return
    sendMessage({ type: 'send_input', session_id: id, text })
    setInputText('')
  }, [inputText, id, sendMessage])

  const handleApprove = () => sendMessage({ type: 'approve', session_id: id })
  const handleDeny = () => sendMessage({ type: 'deny', session_id: id })
  const handleStop = () => {
    sendMessage({ type: 'stop_session', session_id: id })
    router.back()
  }

  if (!session) {
    return (
      <View style={[styles.container, isDark ? styles.bgDark : styles.bgLight]}>
        <Text style={{ color: '#999', textAlign: 'center', marginTop: 100 }}>Session not found.</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDark ? styles.bgDark : styles.bgLight]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, isDark ? styles.headerDark : styles.headerLight]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, isDark ? styles.textDark : styles.textLight]} numberOfLines={1}>
            {session.project_name}
          </Text>
          <StatusBadge status={session.status} />
        </View>
        <TouchableOpacity onPress={handleStop} style={styles.stopBtn}>
          <Text style={styles.stopText}>Stop</Text>
        </TouchableOpacity>
      </View>

      {/* Chat area */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatBubble message={item} />}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Approval bar */}
      {session.status === 'waiting_approval' && (
        <ApprovalBar onApprove={handleApprove} onDeny={handleDeny} />
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, isDark ? styles.inputBarDark : styles.inputBarLight]}>
        <TextInput
          style={[styles.textInput, isDark ? styles.textInputDark : styles.textInputLight, { maxHeight: 88 }]}
          placeholder="Send a message..."
          placeholderTextColor="#999"
          value={inputText}
          onChangeText={setInputText}
          multiline
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <VoiceInput onTranscript={(t) => setInputText(t)} />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

function classifyLine(line: string): MessageType {
  if (line.startsWith('> ') || line.startsWith('You: ')) return 'user'
  if (line.includes('Tool:') || line.match(/^\[.*\]/)) return 'tool_call'
  if (line.startsWith('---') || line.startsWith('===')) return 'system'
  return 'claude'
}

function extractToolName(line: string): string | undefined {
  const m = line.match(/Tool:\s*(\w+)/)
  if (m) return m[1]
  const m2 = line.match(/^\[(\w+)\]/)
  if (m2) return m2[1]
  return undefined
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgLight: { backgroundColor: '#FAFAF9' },
  bgDark: { backgroundColor: '#1A1A18' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 54,
    paddingBottom: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  headerLight: { backgroundColor: '#FAFAF9', borderBottomColor: '#E5E5E3' },
  headerDark: { backgroundColor: '#1A1A18', borderBottomColor: '#2A2A28' },
  backBtn: { paddingRight: 8 },
  backIcon: { fontSize: 28, color: '#1D9E75', lineHeight: 32 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  textLight: { color: '#1A1A18' },
  textDark: { color: '#F5F5F3' },
  stopBtn: { paddingLeft: 8 },
  stopText: { color: '#DC2626', fontSize: 14, fontWeight: '600' },

  chatContent: { paddingVertical: 12 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
  },
  inputBarLight: { backgroundColor: '#FAFAF9', borderTopColor: '#E5E5E3' },
  inputBarDark: { backgroundColor: '#1A1A18', borderTopColor: '#2A2A28' },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
  },
  textInputLight: { backgroundColor: '#FFF', borderColor: '#E5E5E3', color: '#1A1A18' },
  textInputDark: { backgroundColor: '#2A2A28', borderColor: '#3A3A38', color: '#F5F5F3' },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1D9E75',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#A0C8B8' },
  sendIcon: { color: '#FFF', fontSize: 20, fontWeight: '700' },
})

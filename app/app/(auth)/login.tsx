/**
 * login.tsx — Auth screen.
 * User pastes relay URL + app token. Validated by attempting WS connection.
 * Credentials stored in expo-secure-store.
 */

import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { useRouter } from 'expo-router'
import { useSessionStore } from '../../store/sessions'

export default function LoginScreen() {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const router = useRouter()
  const setCredentials = useSessionStore((s) => s.setCredentials)

  const [relayUrl, setRelayUrl] = useState('')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConnect = async () => {
    setError('')
    if (!relayUrl.trim() || !token.trim()) {
      setError('Both fields are required.')
      return
    }
    setLoading(true)
    try {
      await validateConnection(relayUrl.trim(), token.trim())
      await SecureStore.setItemAsync('relay_url', relayUrl.trim())
      await SecureStore.setItemAsync('app_token', token.trim())
      setCredentials(relayUrl.trim(), token.trim())
      router.replace('/(main)')
    } catch (e: any) {
      setError(e.message ?? 'Connection failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDark ? styles.bgDark : styles.bgLight]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, isDark ? styles.textDark : styles.textLight]}>
          claude/remote
        </Text>
        <Text style={styles.subtitle}>Connect to your relay server</Text>

        <Text style={[styles.label, isDark ? styles.textDark : styles.textLight]}>Relay URL</Text>
        <TextInput
          style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
          placeholder="wss://your-relay.example.com"
          placeholderTextColor="#999"
          value={relayUrl}
          onChangeText={setRelayUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <Text style={[styles.label, isDark ? styles.textDark : styles.textLight]}>App Token</Text>
        <TextInput
          style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
          placeholder="Paste your app token"
          placeholderTextColor="#999"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.connectBtn, loading && styles.connectBtnDisabled]}
          onPress={handleConnect}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.connectBtnText}>Connect</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

async function validateConnection(relayUrl: string, token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const wsUrl = relayUrl.replace(/\/$/, '') + '/app'
    const ws = new WebSocket(wsUrl)
    const timeout = setTimeout(() => {
      ws.close()
      reject(new Error('Connection timed out'))
    }, 5000)

    ws.onopen = () => {
      clearTimeout(timeout)
      ws.close()
      resolve()
    }
    ws.onerror = () => {
      clearTimeout(timeout)
      reject(new Error('Could not reach relay server. Check URL and token.'))
    }
  })
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgLight: { backgroundColor: '#FAFAF9' },
  bgDark: { backgroundColor: '#1A1A18' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 32 },
  textLight: { color: '#1A1A18' },
  textDark: { color: '#F5F5F3' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
  },
  inputLight: { backgroundColor: '#FFF', borderColor: '#E5E5E3', color: '#1A1A18' },
  inputDark: { backgroundColor: '#2A2A28', borderColor: '#3A3A38', color: '#F5F5F3' },
  error: { color: '#DC2626', fontSize: 13, marginTop: 10 },
  connectBtn: {
    backgroundColor: '#1D9E75',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  connectBtnDisabled: { opacity: 0.6 },
  connectBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
})

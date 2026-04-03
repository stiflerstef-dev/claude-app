/**
 * index.tsx — Dashboard screen.
 * Lists all active sessions with status badges and last activity time.
 */

import React, { useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  useColorScheme,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSessionStore, SessionRecord } from '../../store/sessions'
import { ProjectCard } from '../../components/ProjectCard'

export default function DashboardScreen() {
  const router = useRouter()
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const { sessions, connectionStatus } = useSessionStore()
  const [refreshing, setRefreshing] = React.useState(false)

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 500)
  }, [])

  const handlePress = (session: SessionRecord) => {
    router.push(`/(main)/session/${session.id}`)
  }

  return (
    <View style={[styles.container, isDark ? styles.bgDark : styles.bgLight]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, isDark ? styles.textDark : styles.textLight]}>
          claude/remote
        </Text>
        <View style={[styles.dot, connectionStatus === 'connected' ? styles.dotGreen : styles.dotRed]} />
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProjectCard session={item} onPress={() => handlePress(item)} />
        )}
        contentContainerStyle={sessions.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💻</Text>
            <Text style={styles.emptyText}>No active sessions.</Text>
            <Text style={styles.emptySubtext}>Start Claude Code on your machine.</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgLight: { backgroundColor: '#FAFAF9' },
  bgDark: { backgroundColor: '#1A1A18' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  textLight: { color: '#1A1A18' },
  textDark: { color: '#F5F5F3' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotGreen: { backgroundColor: '#1D9E75' },
  dotRed: { backgroundColor: '#DC2626' },
  list: { paddingVertical: 8 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#555' },
  emptySubtext: { fontSize: 13, color: '#999', marginTop: 4 },
})

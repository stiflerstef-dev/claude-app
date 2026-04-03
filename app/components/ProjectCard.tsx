/**
 * ProjectCard.tsx — Session list row on the dashboard.
 * Shows project name, description, status badge and last activity time.
 */

import React from 'react'
import { TouchableOpacity, View, Text, StyleSheet, useColorScheme } from 'react-native'
import { StatusBadge } from './StatusBadge'
import { SessionRecord } from '../store/sessions'

interface Props {
  session: SessionRecord
  onPress: () => void
}

export function ProjectCard({ session, onPress }: Props) {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'

  const lastActivity = new Date(session.last_activity)
  const timeStr = lastActivity.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}
      activeOpacity={0.7}
    >
      <View style={styles.top}>
        <Text style={[styles.name, isDark ? styles.textDark : styles.textLight]} numberOfLines={1}>
          {session.project_name}
        </Text>
        <StatusBadge status={session.status} />
      </View>
      {!!session.project_description && (
        <Text style={styles.description} numberOfLines={1}>
          {session.project_description}
        </Text>
      )}
      <Text style={styles.time}>{timeStr}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#2A2A28',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  textLight: { color: '#1A1A18' },
  textDark: { color: '#F5F5F3' },
  description: {
    fontSize: 13,
    color: '#888',
    marginBottom: 6,
  },
  time: {
    fontSize: 11,
    color: '#AAA',
  },
})

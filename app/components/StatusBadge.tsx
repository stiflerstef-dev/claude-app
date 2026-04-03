/**
 * StatusBadge.tsx — Colored pill badge for session status.
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { SessionStatus } from '../store/sessions'

const STATUS_STYLES: Record<SessionStatus, { bg: string; text: string; label: string }> = {
  active:           { bg: '#1D9E75', text: '#FFFFFF', label: 'Active' },
  idle:             { bg: 'transparent', text: '#888', label: 'Idle' },
  waiting_approval: { bg: '#FAEEDA', text: '#854F0B', label: 'Needs Approval' },
  stopped:          { bg: '#FEE2E2', text: '#991B1B', label: 'Stopped' },
}

interface Props {
  status: SessionStatus
}

export function StatusBadge({ status }: Props) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.idle
  return (
    <View style={[
      styles.badge,
      { backgroundColor: style.bg },
      status === 'idle' ? styles.idleBorder : null,
    ]}>
      <Text style={[styles.text, { color: style.text }]}>{style.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  idleBorder: {
    borderWidth: 1,
    borderColor: '#CCC',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
})

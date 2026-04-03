/**
 * ApprovalBar.tsx — Shown when Claude is waiting for approval.
 * Renders approve/deny buttons at the bottom of the session screen.
 */

import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

interface Props {
  onApprove: () => void
  onDeny: () => void
}

export function ApprovalBar({ onApprove, onDeny }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Claude wants to proceed — approve?</Text>
      <View style={styles.buttons}>
        <TouchableOpacity style={[styles.btn, styles.denyBtn]} onPress={onDeny} activeOpacity={0.8}>
          <Text style={styles.denyText}>Deny</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={onApprove} activeOpacity={0.8}>
          <Text style={styles.approveText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAEEDA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0D9B8',
  },
  label: {
    fontSize: 13,
    color: '#854F0B',
    fontWeight: '500',
    marginBottom: 10,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveBtn: { backgroundColor: '#1D9E75' },
  denyBtn: { backgroundColor: '#DC2626' },
  approveText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  denyText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
})

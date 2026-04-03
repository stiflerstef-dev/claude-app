/**
 * VoiceInput.tsx — Mic button with live transcript preview.
 * Uses @react-native-voice/voice for STT.
 * On silence (1.5s): stops listening and populates the input field.
 * Does NOT auto-send — user must confirm with Send button.
 */

import React from 'react'
import { TouchableOpacity, View, Text, StyleSheet, Animated, Easing } from 'react-native'
import { useSpeech } from '../hooks/useSpeech'

interface Props {
  onTranscript: (text: string) => void
}

export function VoiceInput({ onTranscript }: Props) {
  const { isListening, transcript, available, startListening, stopListening } = useSpeech()
  const pulseAnim = React.useRef(new Animated.Value(1)).current

  React.useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      ).start()
    } else {
      pulseAnim.stopAnimation()
      pulseAnim.setValue(1)
      if (transcript) onTranscript(transcript)
    }
  }, [isListening])

  if (!available) {
    return (
      <View style={styles.unavailable}>
        <Text style={styles.unavailableText}>Speech unavailable</Text>
      </View>
    )
  }

  return (
    <View>
      {isListening && !!transcript && (
        <View style={styles.preview}>
          <Text style={styles.previewText} numberOfLines={2}>{transcript}</Text>
        </View>
      )}
      <TouchableOpacity
        onPress={isListening ? stopListening : startListening}
        style={styles.micBtn}
        activeOpacity={0.8}
      >
        <Animated.View style={[styles.pulse, { transform: [{ scale: pulseAnim }] }, isListening ? styles.pulseActive : null]} />
        <Text style={styles.micIcon}>{isListening ? '⏹' : '🎤'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(220,38,38,0.2)',
  },
  pulseActive: {
    backgroundColor: 'rgba(220,38,38,0.3)',
  },
  micIcon: { fontSize: 18 },
  preview: {
    position: 'absolute',
    bottom: 48,
    left: -120,
    width: 200,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E5E3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  previewText: { fontSize: 13, color: '#333' },
  unavailable: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  unavailableText: { fontSize: 10, color: '#AAA', textAlign: 'center' },
})

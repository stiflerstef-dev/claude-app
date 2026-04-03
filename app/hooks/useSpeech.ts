/**
 * hooks/useSpeech.ts — Speech-to-text (STT) and text-to-speech (TTS) helpers.
 * STT via @react-native-voice/voice.
 * TTS via expo-speech.
 * STT stops automatically after 1.5s of silence.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import * as Speech from 'expo-speech'
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice'

export function useSpeech() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [available, setAvailable] = useState(true)
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    Voice.isAvailable()
      .then((avail) => setAvailable(!!avail))
      .catch(() => setAvailable(false))

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const result = e.value?.[0] ?? ''
      setTranscript(result)
      resetSilenceTimer()
    }

    Voice.onSpeechError = (_e: SpeechErrorEvent) => {
      stopListening()
    }

    return () => {
      Voice.destroy().then(Voice.removeAllListeners)
      if (silenceTimer.current) clearTimeout(silenceTimer.current)
    }
  }, [])

  const resetSilenceTimer = () => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current)
    silenceTimer.current = setTimeout(() => {
      stopListening()
    }, 1500)
  }

  const startListening = useCallback(async () => {
    if (!available) return
    try {
      setTranscript('')
      await Voice.start('nl-NL')
      setIsListening(true)
      resetSilenceTimer()
    } catch {
      setAvailable(false)
    }
  }, [available])

  const stopListening = useCallback(async () => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current)
    try {
      await Voice.stop()
    } catch {}
    setIsListening(false)
  }, [])

  const speak = useCallback((text: string) => {
    Speech.speak(text, { language: 'nl-NL' })
  }, [])

  const stopSpeaking = useCallback(() => {
    Speech.stop()
  }, [])

  return {
    isListening,
    transcript,
    available,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  }
}

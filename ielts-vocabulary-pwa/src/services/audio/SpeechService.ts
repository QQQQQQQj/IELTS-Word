import type { VoiceLocale } from '../../db/types'

export type SpeechStatus =
  | 'spoken'
  | 'unavailable'
  | 'no-voice'
  | 'error'
  | 'cancelled'

export interface SpeechResult {
  status: SpeechStatus
}

/** Prefers the exact locale, then any English voice. */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  locale: VoiceLocale,
): SpeechSynthesisVoice | undefined {
  const normalized = locale.toLowerCase()
  return (
    voices.find((voice) => voice.lang.toLowerCase() === normalized) ??
    voices.find((voice) =>
      voice.lang.toLowerCase().replace('_', '-').startsWith('en'),
    )
  )
}

function synthesis(): SpeechSynthesis | undefined {
  if (typeof speechSynthesis === 'undefined' || !speechSynthesis) {
    return undefined
  }
  return speechSynthesis
}

/**
 * Cancellable browser TTS wrapper. Every `speak` call cancels the previous
 * utterance first, so repeated taps never stack audio. All failure paths
 * resolve with a typed status instead of throwing.
 */
export class SpeechService {
  private active = false

  isSupported(): boolean {
    return synthesis() !== undefined
  }

  cancel(): void {
    this.active = false
    synthesis()?.cancel()
  }

  speak(text: string, locale: VoiceLocale): Promise<SpeechResult> {
    const engine = synthesis()
    if (!engine || typeof SpeechSynthesisUtterance === 'undefined') {
      return Promise.resolve({ status: 'unavailable' })
    }
    engine.cancel()

    const voices = engine.getVoices()
    const voice = pickVoice(voices, locale)
    if (voices.length > 0 && !voice) {
      return Promise.resolve({ status: 'no-voice' })
    }

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = locale
      if (voice) {
        utterance.voice = voice
      }
      utterance.rate = 0.95
      this.active = true
      utterance.onend = () => {
        this.active = false
        resolve({ status: 'spoken' })
      }
      utterance.onerror = () => {
        const status = this.active ? 'error' : 'cancelled'
        this.active = false
        resolve({ status })
      }
      try {
        engine.speak(utterance)
      } catch {
        this.active = false
        resolve({ status: 'error' })
      }
    })
  }
}

/** Application-wide singleton. */
export const speechService = new SpeechService()

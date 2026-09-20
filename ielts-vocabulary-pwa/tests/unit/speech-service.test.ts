import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SpeechService, pickVoice } from '../../src/services/audio/SpeechService'

function voice(lang: string, name: string): SpeechSynthesisVoice {
  return {
    lang,
    name,
    default: false,
    localService: true,
    voiceURI: name,
  } as SpeechSynthesisVoice
}

describe('pickVoice', () => {
  const voices = [
    voice('zh-CN', 'Chinese'),
    voice('en-US', 'US English'),
    voice('en-GB', 'UK English'),
  ]

  it('prefers the exact requested locale', () => {
    expect(pickVoice(voices, 'en-GB')?.name).toBe('UK English')
    expect(pickVoice(voices, 'en-US')?.name).toBe('US English')
  })

  it('falls back to any English voice', () => {
    const onlyUs = [voice('zh-CN', 'Chinese'), voice('en-US', 'US English')]
    expect(pickVoice(onlyUs, 'en-GB')?.name).toBe('US English')
  })

  it('returns undefined when no English voice exists', () => {
    expect(pickVoice([voice('zh-CN', 'Chinese')], 'en-US')).toBeUndefined()
  })
})

describe('SpeechService', () => {
  const cancel = vi.fn()
  const speak = vi.fn()
  const getVoices = vi.fn(() => [voice('en-US', 'US English')])

  beforeEach(() => {
    vi.stubGlobal('speechSynthesis', {
      cancel,
      speak,
      getVoices,
    })
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        text: string
        lang = ''
        voice: SpeechSynthesisVoice | null = null
        rate = 1
        onend: (() => void) | null = null
        onerror: (() => void) | null = null
        constructor(text: string) {
          this.text = text
        }
      },
    )
    cancel.mockClear()
    speak.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('cancels previous playback before speaking again', async () => {
    const service = new SpeechService()
    speak.mockImplementation((utterance: { onend: (() => void) | null }) => {
      utterance.onend?.()
    })
    const result = await service.speak('apple', 'en-US')
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(speak).toHaveBeenCalledTimes(1)
    expect(result.status).toBe('spoken')
  })

  it('returns a structured result instead of throwing when unsupported', async () => {
    vi.unstubAllGlobals()
    vi.stubGlobal('speechSynthesis', undefined)
    const service = new SpeechService()
    const result = await service.speak('apple', 'en-US')
    expect(result.status).toBe('unavailable')
  })

  it('reports missing English voices', async () => {
    getVoices.mockReturnValueOnce([voice('zh-CN', 'Chinese')])
    const service = new SpeechService()
    const result = await service.speak('apple', 'en-GB')
    expect(result.status).toBe('no-voice')
    expect(speak).not.toHaveBeenCalled()
  })
})

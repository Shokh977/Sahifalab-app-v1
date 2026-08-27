import { useRef, useState } from 'react'
import { Share, Alert } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { captureRef } from 'react-native-view-shot'
import type { ResultTicketProps } from '../components/daily-quiz/ResultTicket'

const EXPORT_WIDTH = 1080
const EXPORT_HEIGHT = 1350 // 4:5, per spec — captured from a fixed off-screen
                            // canvas, never a scaled copy of the on-screen view.

/**
 * No analytics SDK is wired up anywhere in this app yet (checked — nothing
 * like Amplitude/Segment/Firebase Analytics is installed or configured).
 * This is a clearly-labelled stub so the call sites the brief asks for
 * exist and are easy to wire to a real backend later; today it only logs
 * in dev and is a no-op otherwise.
 */
function trackEvent(name: string, props?: Record<string, unknown>) {
  if (__DEV__) console.log('[track]', name, props ?? {})
}

function shareText(props: ResultTicketProps): string {
  return `5 SAVOL #${props.round} — ${props.score}/${props.total} to'g'ri. Sen ham sinab ko'r: https://sahifalab.uz/r/${props.referralCode}`
}

export function useShareTicket(props: ResultTicketProps) {
  const hostRef = useRef<any>(null)
  const [capturing, setCapturing] = useState(false)
  const [copied, setCopied] = useState(false)

  async function share() {
    if (capturing) return
    setCapturing(true)
    trackEvent('result_share_opened')
    const message = shareText(props)
    try {
      const uri = await captureRef(hostRef, {
        width: EXPORT_WIDTH, height: EXPORT_HEIGHT, format: 'png', result: 'tmpfile',
      })
      await Share.share({ message, url: uri })
      trackEvent('result_share_completed', { score: props.score, channel: 'native_share' })
    } catch {
      // Capture failed — fall back to a text-only share rather than
      // blocking the user entirely (spec: "handle capture failure ...
      // fall back to text-only share").
      Alert.alert('Rasm yaratilmadi, qayta urinib ko\'ring')
      try {
        await Share.share({ message })
        trackEvent('result_share_completed', { score: props.score, channel: 'text_only' })
      } catch {}
    } finally {
      setCapturing(false)
    }
  }

  async function copyLink() {
    await Clipboard.setStringAsync(shareText(props))
    trackEvent('result_copy_link')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return { hostRef, capturing, copied, share, copyLink }
}

export { EXPORT_WIDTH, EXPORT_HEIGHT }

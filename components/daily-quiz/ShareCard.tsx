import React, { useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native'
import ViewShot from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import * as Clipboard from 'expo-clipboard'
import { Copy, Share2 } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'

function squares(perQuestionCorrect?: boolean[]): string {
  if (!perQuestionCorrect || perQuestionCorrect.length === 0) return ''
  return perQuestionCorrect.map(ok => (ok ? '🟩' : '🟥')).join('')
}

function shareText(quizNumber: number, correctCount: number, perQuestionCorrect?: boolean[], elapsedMs?: number): string {
  const sq = squares(perQuestionCorrect)
  const timePart = elapsedMs != null ? ` · ${Math.round(elapsedMs / 1000)}s` : ''
  const line2 = sq ? `${sq}  ${correctCount}/5${timePart}` : `${correctCount}/5${timePart}`
  return `5 SAVOL #${quizNumber}\n${line2}\nsahifalab.uz`
}

/**
 * Spoiler-free share card (spec Part 6 — "the growth loop, build this
 * properly"). No correct answers revealed — safe to paste into any
 * Telegram group, an implicit challenge to everyone who sees it.
 */
export function ShareCard({
  quizNumber, correctCount, perQuestionCorrect, elapsedMs,
}: {
  quizNumber: number
  correctCount: number
  perQuestionCorrect?: boolean[]
  elapsedMs?: number
}) {
  const { c } = useTheme()
  const viewShotRef = useRef<ViewShot>(null)
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)

  const text = shareText(quizNumber, correctCount, perQuestionCorrect, elapsedMs)
  const sq = squares(perQuestionCorrect)

  async function copyText() {
    await Clipboard.setStringAsync(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function shareImage() {
    if (!viewShotRef.current || sharing) return
    try {
      setSharing(true)
      const uri = await (viewShotRef.current as any).capture()
      const available = await Sharing.isAvailableAsync()
      if (!available) {
        Alert.alert('Ulashib bo\'lmadi', "Bu qurilmada ulashish mavjud emas.")
        return
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Ulashish' })
    } catch {}
    finally { setSharing(false) }
  }

  return (
    <View style={{ width: '100%', gap: spacing.sm }}>
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
        <View style={[styles.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
            5 SAVOL #{quizNumber}
          </Text>
          {sq ? <Text style={styles.squares}>{sq}</Text> : null}
          <Text style={[styles.score, { color: c.textSecondary, fontFamily: typography.fontFamily.semibold }]}>
            {correctCount}/5{elapsedMs != null ? ` · ${Math.round(elapsedMs / 1000)}s` : ''}
          </Text>
          <Text style={[styles.domain, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            sahifalab.uz
          </Text>
        </View>
      </ViewShot>

      <View style={styles.actions}>
        <Pressable onPress={copyText} style={[styles.actionBtn, { backgroundColor: c.bgTertiary }]}>
          <Copy size={15} color={c.textPrimary} />
          <Text style={[styles.actionText, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            {copied ? 'Nusxalandi!' : 'Nusxalash'}
          </Text>
        </Pressable>
        <Pressable onPress={shareImage} style={[styles.actionBtn, { backgroundColor: c.accentPrimary }]}>
          <Share2 size={15} color="#fff" />
          <Text style={[styles.actionText, { color: '#fff', fontFamily: typography.fontFamily.semibold }]}>
            Ulashish
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.cardLg, borderWidth: 1.5, padding: spacing.lg,
    alignItems: 'center', gap: 6,
  },
  title:   { fontSize: 16 },
  squares: { fontSize: 20, letterSpacing: 2 },
  score:   { fontSize: 14 },
  domain:  { fontSize: 11, marginTop: 4 },

  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: radius.full,
  },
  actionText: { fontSize: 13 },
})

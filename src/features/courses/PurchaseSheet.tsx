/**
 * "Kursni sotib olish" (Phase 7b): the course and price, the three steps of
 * the manual payment, then "Telegram orqali davom etish".
 *
 * Opening the sheet creates nothing. The button asks for the PAY-XXXX-YYYY
 * code, copies it (the pay bot reads it as a plain message; /start takes no
 * parameter), records purchase_start and hands off to Telegram. Errors (e.g.
 * the 3-open-requests limit) stay in the sheet with a retry.
 */
import React, { useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { BookOpen, CircleAlert, Send } from 'lucide-react-native'
import { enrollments, type Course, type EnrollmentCodeResponse } from '../../../lib/api'
import { track } from '../../../lib/analytics'
import { useTheme } from '../../design/ThemeProvider'
import { avatarSize, iconSize, iconStroke, radius, space } from '../../design/spacing'
import { tabular, type as typeScale } from '../../design/typography'
import { Button, ListRow, Sheet, showToast } from '../../components/ui'
import { uzText } from '../today/today'
import { priceLabel } from './courses'
import { rememberPurchase } from './purchase'

export const PURCHASE_STEPS = [
  'Ilova sizga toʻlov kodini beradi',
  'Telegram botda toʻlab, chek rasmini yuborasiz',
  'Tasdiqlangach kurs ochiladi va xabar keladi',
] as const

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : ''
  if (/already enrolled/i.test(msg)) return 'Siz bu kursga allaqachon yozilgansiz.'
  if (/not paid/i.test(msg)) return 'Bu kurs bepul — sotib olish shart emas.'
  // Already-Uzbek messages: the 3-open-requests limit and the request timeout.
  if (/tadan ortiq|vaqti tugadi/i.test(msg)) return msg
  return 'Kod olinmadi. Qayta urinib koʻring.'
}

export function PurchaseSheet({ visible, course, onClose, onStarted }: {
  visible: boolean
  course: Course
  onClose: () => void
  /** Code issued and copied; the screen moves to the status screen. */
  onStarted: (code: EnrollmentCodeResponse) => void
}) {
  const { colors } = useTheme()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function proceed() {
    setBusy(true)
    setError(null)
    try {
      const code = await enrollments.requestCode(course.id)
      rememberPurchase({ course_id: course.id, reference_code: code.reference_code, status: code.status, expires_at: code.expires_at })
      await Clipboard.setStringAsync(code.reference_code).catch(() => {})
      track('purchase_start', { course_id: course.id, price: course.price }, course.id)
      onStarted(code)
      showToast('info', `${code.reference_code} nusxalandi — botga yuboring`)
      Linking.openURL(code.telegram_bot_url).catch(() => {})
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  function close() {
    setError(null)
    onClose()
  }

  return (
    <Sheet visible={visible} onClose={close} title="Kursni sotib olish">
      <View style={styles.body}>
        <ListRow
          title={uzText(course.title)}
          subtitle={priceLabel(course)}
          leading={course.thumbnail_url ? { kind: 'thumbnail', uri: course.thumbnail_url } : { kind: 'icon', icon: BookOpen }}
        />

        <View style={styles.steps} accessibilityRole="list">
          {PURCHASE_STEPS.map((label, i) => (
            <View key={label} style={styles.step}>
              <View style={[styles.num, { backgroundColor: colors.accentSoft }]}>
                <Text style={[typeScale.callout, tabular, { color: colors.accentText }]}>{i + 1}</Text>
              </View>
              <Text style={[typeScale.body, styles.flex, { color: colors.text }]}>{label}</Text>
            </View>
          ))}
        </View>

        {error && (
          <View style={[styles.error, { backgroundColor: colors.surfaceRaised }]} accessibilityLiveRegion="polite">
            <CircleAlert size={iconSize.sm} color={colors.dangerText} strokeWidth={iconStroke} />
            <Text style={[typeScale.callout, styles.flex, { color: colors.text }]}>{error}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <Button
            label={error ? 'Qayta urinish' : 'Telegram orqali davom etish'}
            icon={Send}
            size="lg"
            fullWidth
            loading={busy}
            onPress={proceed}
          />
          <Button label="Bekor qilish" variant="ghost" fullWidth onPress={close} />
        </View>
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  body: { gap: space.md, paddingBottom: space.md },
  steps: { gap: space.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  num: { width: avatarSize.sm, height: avatarSize.sm, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  error: { flexDirection: 'row', alignItems: 'center', gap: space.xs, padding: space.sm, borderRadius: radius.md },
  actions: { gap: space.xs },
})

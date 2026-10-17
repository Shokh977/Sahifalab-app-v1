/**
 * "Kuniga nechta yangi karta?" — asked when copying a deck of more than 50
 * cards (and when changing it later on the deck). 10 / 20 / 30, default 20.
 * Only that many new cards are introduced per day (server-side limit).
 */
import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../design/ThemeProvider'
import { space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Button, Chip, Sheet } from '../../components/ui'
import { DAILY_NEW_DEFAULT, DAILY_NEW_OPTIONS } from './cards'

export function DailyNewSheet({ visible, cardCount, initial, confirmLabel, loading, onConfirm, onClose }: {
  visible: boolean
  cardCount: number
  initial?: number | null
  confirmLabel: string
  loading?: boolean
  onConfirm: (perDay: number) => void
  onClose: () => void
}) {
  const { colors } = useTheme()
  const start = initial && (DAILY_NEW_OPTIONS as readonly number[]).includes(initial) ? initial : DAILY_NEW_DEFAULT
  const [perDay, setPerDay] = useState<number>(start)
  // Back to the saved value each time the sheet opens.
  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (visible) setPerDay(start)
  }
  const days = Math.ceil(cardCount / perDay)

  return (
    <Sheet visible={visible} onClose={onClose} title="Kuniga nechta yangi karta?">
      <View style={styles.body}>
        <Text style={[typeScale.body, { color: colors.textMuted }]}>
          Toʻplamda {cardCount} ta karta. Har kuni faqat shuncha yangi karta chiqadi, qolgan vaqt takrorlashga ketadi.
        </Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {DAILY_NEW_OPTIONS.map(n => (
            <Chip key={n} variant="choice" label={`${n} ta`} selected={perDay === n} onPress={() => setPerDay(n)} />
          ))}
        </View>
        <Text style={[typeScale.callout, { color: colors.textMuted }]}>Taxminan {days} kunda hammasi ochiladi.</Text>
        <Button label={confirmLabel} size="lg" fullWidth loading={loading} onPress={() => onConfirm(perDay)} />
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  body: { gap: space.md, paddingBottom: space.md },
  chips: { flexDirection: 'row', gap: space.xs },
})

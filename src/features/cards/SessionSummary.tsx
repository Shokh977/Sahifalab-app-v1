/**
 * End of a study session: accuracy, cards and time as StatTiles, how many
 * cards come back tomorrow, the deck's mastery change and XP; then back to
 * Bugun or another deck.
 */
import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CalendarClock } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { layout, space } from '../../design/spacing'
import { tabular, type as typeScale } from '../../design/typography'
import { Button, Card, ListRow, ProgressBar, StatTile } from '../../components/ui'
import { uzText } from '../today/today'

export interface SessionSummaryProps {
  deckTitle: string
  reviewed: number
  correct: number
  seconds: number
  xp: number
  tomorrow: number | null
  masteryBefore: number
  masteryAfter: number
  onHome: () => void
  onOther: () => void
}

function clock(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`
}

export function SessionSummary(p: SessionSummaryProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const accuracy = p.reviewed > 0 ? Math.round((p.correct / p.reviewed) * 100) : 0

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xl }]}>
        <Text style={[typeScale.overline, { color: colors.textMuted }]}>{uzText(p.deckTitle)}</Text>
        <Text style={[typeScale.title1, { color: colors.text }]} accessibilityRole="header">Sessiya yakunlandi</Text>

        <View style={styles.tiles}>
          <StatTile value={accuracy} label="aniqlik" format={n => `${n}%`} />
          <StatTile value={p.reviewed} label="karta" />
          <StatTile value={p.seconds} label="vaqt" format={clock} />
        </View>

        <Card style={styles.rows}>
          <ListRow
            title={p.tomorrow == null ? 'Ertangi kartalar hisoblanmoqda…' : `Ertaga: ${p.tomorrow} ta karta`}
            subtitle="Takrorlash vaqti kelganlari"
            leading={{ kind: 'icon', icon: CalendarClock }}
          />
        </Card>

        <Card style={styles.gap}>
          <View style={styles.between}>
            <Text style={[typeScale.callout, { color: colors.textMuted }]}>Toʻplam oʻrganildi</Text>
            <Text style={[typeScale.callout, tabular, { color: colors.text }]}>
              {Math.round(p.masteryBefore * 100)}% → {Math.round(p.masteryAfter * 100)}%
            </Text>
          </View>
          <ProgressBar value={p.masteryAfter} thickness="thick" color={colors.success} accessibilityLabel="Toʻplam oʻrganildi" />
          {p.xp > 0 && (
            <Text style={[typeScale.headline, tabular, { color: colors.accentText }]}>+{p.xp} XP</Text>
          )}
        </Card>

        <View style={styles.gap}>
          <Button label="Bugunga qaytish" size="lg" fullWidth onPress={p.onHome} />
          <Button label="Boshqa toʻplam" variant="secondary" size="lg" fullWidth onPress={p.onOther} />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.xl, gap: layout.cardGap },
  tiles: { flexDirection: 'row', gap: space.xs },
  rows: { paddingVertical: space.xxs },
  gap: { gap: space.xs },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
})

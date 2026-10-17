/**
 * Weekly rank teaser: "#57", "#56 gacha 120 XP" and a progress bar.
 * Opens Bellashuv.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Trophy } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { iconSize, iconStroke, space } from '../../design/spacing'
import { tabular, type as typeScale } from '../../design/typography'
import { Card, ProgressBar } from '../../components/ui'
import type { RankGap } from './today'

export function RankTeaser({ gap, onPress }: { gap: RankGap; onPress: () => void }) {
  const { colors } = useTheme()

  const rankText = gap.kind === 'none' ? '—' : `#${gap.rank}`
  const line = gap.kind === 'gap' ? `#${gap.target} gacha ${gap.xp} XP`
    : gap.kind === 'top' ? 'Siz birinchi oʻrindasiz'
    : gap.kind === 'unknown' ? 'Haftalik reytingdagi oʻrningiz'
    : 'Fokus qiling va haftalik reytingga kiring'

  return (
    <Card variant="pressable" onPress={onPress} accessibilityLabel={`Haftalik reyting. ${gap.kind === 'none' ? '' : rankText + '. '}${line}`}>
      <View style={styles.row}>
        {gap.kind === 'none' ? (
          <Trophy size={iconSize.md} color={colors.accentText} strokeWidth={iconStroke} />
        ) : (
          <Text style={[typeScale.title1, tabular, { color: colors.text }]}>{rankText}</Text>
        )}
        <View style={styles.text}>
          <Text style={[typeScale.overline, { color: colors.textMuted }]}>Haftalik reyting</Text>
          <Text style={[typeScale.callout, tabular, { color: colors.text }]}>{line}</Text>
        </View>
      </View>
      {gap.kind === 'gap' && <ProgressBar value={gap.progress} style={styles.bar} accessibilityLabel={line} />}
    </Card>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  text: { flex: 1, gap: 2 },
  bar: { marginTop: space.sm },
})

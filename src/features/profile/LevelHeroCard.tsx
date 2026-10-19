/**
 * Level hero on the accent gradient: "DARAJA 8" in a white pill, the level
 * title, the XP bar, "20 687 / 24 300 XP" and "3 613 XP qoldi" — white text
 * only at 18 px extra bold or more (Phase 7.5 B1; D2 redesigns this card).
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { getLevelInfo } from '../../../lib/levelTitles'
import { useTheme } from '../../design/ThemeProvider'
import { progressThickness, radius, space } from '../../design/spacing'
import { fonts, tabular, type as typeScale } from '../../design/typography'
import { AccentFill } from '../../components/ui'
import { uzText } from '../today/today'
import { groupThousands } from './profileFormat'

/** Track over the accent fill: onAccent at low opacity. */
const TRACK_OPACITY = 0.18

export function LevelHeroCard({ level, xp, nextXp }: { level: number; xp: number; nextXp: number }) {
  const { colors } = useTheme()
  const info = getLevelInfo(level)
  const target = Math.max(nextXp, xp, 1)
  const left = Math.max(0, target - xp)
  const fraction = Math.min(1, Math.max(0, xp / target))

  return (
    <View
      accessible
      accessibilityLabel={`${level}-daraja, ${uzText(info.title)}. ${xp} dan ${target} XP, ${left} XP qoldi`}
      style={styles.card}
    >
      <AccentFill radius={radius.xl} />
      <View style={[styles.pill, { backgroundColor: colors.onAccent }]}>
        <Text style={[typeScale.overline, { color: colors.accentText }]}>Daraja {level}</Text>
      </View>
      <Text style={[typeScale.title1, styles.heavy, { color: colors.onAccent }]} numberOfLines={1}>{uzText(info.title)}</Text>
      <View style={styles.track}>
        <View style={[StyleSheet.absoluteFill, styles.trackBg, { backgroundColor: colors.onAccent }]} />
        <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: colors.onAccent }]} />
      </View>
      <View style={styles.row}>
        <Text style={[typeScale.onAccent, tabular, { color: colors.onAccent }]}>
          {groupThousands(xp)} / {groupThousands(target)} XP
        </Text>
        <Text style={[typeScale.onAccent, tabular, { color: colors.onAccent }]}>{groupThousands(left)} qoldi</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: space.lg, gap: space.xs },
  pill: { alignSelf: 'flex-start', borderRadius: radius.full, paddingHorizontal: space.xs, paddingVertical: space.xxs },
  heavy: { fontFamily: fonts.extrabold },
  track: { height: progressThickness.thick, borderRadius: radius.full, overflow: 'hidden', marginTop: space.xs },
  trackBg: { opacity: TRACK_OPACITY },
  fill: { height: '100%', borderRadius: radius.full },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.xs },
})

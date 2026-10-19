/**
 * "Bugungi reja" (Phase 7.5 C3): a 2×2 grid of PlanTiles — Fokus, 5 Savol,
 * Kartalar, the current course — with the one "KEYINGI" tile first (the
 * primary action), then unfinished tiles, your running competition and
 * Haftalik sharh (Phase 8), then done ones. A mini progress
 * (one segment per item) and "2 / 4" sit by the title. When a tile becomes
 * done it glides to its new place (LinearTransition, springs.ui); reduce
 * motion: no movement.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { LinearTransition, useReducedMotion } from 'react-native-reanimated'
import { CircleHelp, GraduationCap, Layers, NotebookPen, Timer, Trophy, type LucideIcon } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { springs } from '../../design/motion'
import { layout, radius, space } from '../../design/spacing'
import type { TintName } from '../../design/tokens'
import { fonts, tabular, type as typeScale } from '../../design/typography'
import { SectionTitle } from '../../components/ui'
import { PlanTile } from './PlanTile'
import { planTiles, type PlanInput, type PlanKey } from './today'

const ICONS: Record<PlanKey, LucideIcon> = {
  focus: Timer, quiz: CircleHelp, cards: Layers, course: GraduationCap, competition: Trophy, review: NotebookPen,
}
const TINTS: Record<PlanKey, TintName> = {
  focus: 'orange', quiz: 'blue', cards: 'orange', course: 'violet', competition: 'gold', review: 'teal',
}
const SEGMENT = { width: 14, height: 6 }

const layoutTransition = LinearTransition.springify().duration(springs.ui.duration).dampingRatio(springs.ui.dampingRatio)

export function TodayPlan({ input, next, onOpen }: {
  input: PlanInput
  /** The tile the primary action points at ("KEYINGI"). */
  next: PlanKey | null
  onOpen: (key: PlanKey, isNext: boolean) => void
}) {
  const { colors } = useTheme()
  const reduceMotion = useReducedMotion()
  const { tiles, done, total } = planTiles(input, next)

  return (
    <View style={styles.section}>
      <SectionTitle
        title="Bugungi reja"
        right={
          <View style={styles.meta} accessible accessibilityLabel={`${done} / ${total} bajarildi`}>
            <View style={styles.segments}>
              {Array.from({ length: total }, (_, i) => (
                <View key={i} style={[styles.segment, { backgroundColor: i < done ? colors.green : colors.track }]} />
              ))}
            </View>
            <Text style={[typeScale.callout, tabular, { color: colors.textMuted }]}>{done} / {total}</Text>
          </View>
        }
      />
      <View style={styles.grid}>
        {tiles.map(t => (
          <Animated.View key={t.key} layout={reduceMotion ? undefined : layoutTransition} style={styles.cell}>
            <PlanTile
              variant={t.next ? 'next' : t.done ? 'done' : 'default'}
              icon={ICONS[t.key]}
              tint={TINTS[t.key]}
              value={t.value}
              title={t.title}
              sub={t.sub}
              progress={t.progress}
              status={t.status && !t.done
                ? <Text style={[typeScale.small, tabular, styles.status, { color: colors.textMuted }]}>{t.status}</Text>
                : undefined}
              onPress={() => onOpen(t.key, t.next)}
            />
          </Animated.View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: layout.cardGap },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  segments: { flexDirection: 'row', gap: 3 },
  segment: { width: SEGMENT.width, height: SEGMENT.height, borderRadius: radius.full },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.cardGap },
  cell: { flexBasis: '40%', flexGrow: 1, maxWidth: '50%' },
  status: { fontFamily: fonts.bold },
})

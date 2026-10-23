/**
 * "Bugungi reja" — the plan grid (plan redesign; card model in
 * planCards.ts, card drawing in PlanTile.tsx). Two columns, gap 12, every
 * task card the same size and anatomy; exactly one orange "next" card while
 * anything is unfinished; Tahlil full width below an even grid or the
 * filler of an odd one, so the grid never has a hole. A mini progress (one
 * segment per counted task) and "2 / 4" sit by the title. When a card's
 * place changes it glides there (LinearTransition, springs.ui); reduce
 * motion: no movement.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { LinearTransition, useReducedMotion } from 'react-native-reanimated'
import { useTheme } from '../../design/ThemeProvider'
import { springs } from '../../design/motion'
import { layout, radius, space } from '../../design/spacing'
import { tabular, type as typeScale } from '../../design/typography'
import { SectionTitle } from '../../components/ui'
import { PlanReviewWide, PlanTile } from './PlanTile'
import { planCards, type PlanCard, type PlanCardsInput } from './planCards'
import type { PlanKey } from './today'

const SEGMENT = { width: 14, height: 6 }
const GRID_GAP = 12

const layoutTransition = LinearTransition.springify().duration(springs.ui.duration).dampingRatio(springs.ui.dampingRatio)

export function TodayPlan({ input, next, onOpen }: {
  input: PlanCardsInput
  /** The primary action's task; the next card falls back from it (planCards.pickNext). */
  next: PlanKey | null
  onOpen: (card: PlanCard) => void
}) {
  const { colors } = useTheme()
  const reduceMotion = useReducedMotion()
  const { grid, wide, done, total } = planCards(input, next)

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
        {grid.map(card => (
          <Animated.View key={card.key} layout={reduceMotion ? undefined : layoutTransition} style={styles.cell}>
            <PlanTile card={card} onPress={() => onOpen(card)} />
          </Animated.View>
        ))}
      </View>
      {wide && (
        <Animated.View layout={reduceMotion ? undefined : layoutTransition}>
          <PlanReviewWide card={wide} onPress={() => onOpen(wide)} />
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: layout.cardGap },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  segments: { flexDirection: 'row', gap: 3 },
  segment: { width: SEGMENT.width, height: SEGMENT.height, borderRadius: radius.full },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  // Two equal columns: each cell grows from 40 % and stops at half.
  cell: { flexBasis: '40%', flexGrow: 1, maxWidth: '48.5%' },
})

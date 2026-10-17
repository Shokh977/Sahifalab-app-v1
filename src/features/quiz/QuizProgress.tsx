/**
 * Five-segment progress: answered ones green or red, the current one
 * orange, the rest neutral. Each segment has a spoken state.
 */
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../../design/ThemeProvider'
import { progressThickness, radius, space } from '../../design/spacing'
import type { SegmentState } from './quizPlay'

const SPOKEN: Record<SegmentState, string> = {
  correct: 'toʻgʻri', wrong: 'notoʻgʻri', answered: 'javob berilgan', current: 'hozirgi', todo: 'navbatda',
}

export function QuizProgress({ states }: { states: readonly SegmentState[] }) {
  const { colors } = useTheme()
  const fill: Record<SegmentState, string> = {
    correct: colors.success, wrong: colors.danger, answered: colors.textFaint,
    current: colors.accent, todo: colors.surfaceRaised,
  }
  return (
    <View style={styles.row} accessible accessibilityLabel={states.map((s, i) => `${i + 1}-savol ${SPOKEN[s]}`).join(', ')}>
      {states.map((s, i) => (
        <View key={i} style={[styles.segment, { backgroundColor: fill[s] }]} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xxs + 2 },
  segment: { flex: 1, height: progressThickness.thick - 2, borderRadius: radius.full },
})

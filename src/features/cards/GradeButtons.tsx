/**
 * The four grades after a flip — Bilmayman / Qiyin / Bilaman / Oson —
 * sliding up once the back is shown (springs.ui; a fade under reduce
 * motion). Light haptic on press. Ratings 1–4 go to SM-2 unchanged.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInDown, ReduceMotion, useReducedMotion } from 'react-native-reanimated'
import { useTheme } from '../../design/ThemeProvider'
import { durations, springs } from '../../design/motion'
import { controlHeight, radius, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Pressable } from '../../components/ui'
import { GRADES } from './cards'

const enter = FadeInDown.springify().duration(springs.ui.duration).dampingRatio(springs.ui.dampingRatio).reduceMotion(ReduceMotion.Never)
const enterReduced = FadeIn.duration(durations.fast)

export function GradeButtons({ onGrade, disabled }: { onGrade: (rating: number) => void; disabled?: boolean }) {
  const { colors } = useTheme()
  const reduceMotion = useReducedMotion()
  const tone = {
    danger: colors.dangerText,
    warning: colors.accentText,
    success: colors.successText,
    accent: colors.text,
  } as const

  return (
    <Animated.View entering={reduceMotion ? enterReduced : enter} style={styles.row}>
      {GRADES.map(g => (
        <Pressable
          key={g.rating}
          onPress={() => onGrade(g.rating)}
          disabled={disabled}
          haptic="light"
          accessibilityLabel={g.label}
          style={[styles.btn, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
        >
          <Text style={[typeScale.callout, { color: tone[g.tone] }]} numberOfLines={1}>{g.label}</Text>
        </Pressable>
      ))}
    </Animated.View>
  )
}

/** Same height as the buttons, so the card doesn't jump before the flip. */
export function GradePlaceholder() {
  return <View style={styles.placeholder} />
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs },
  btn: {
    flex: 1,
    height: controlHeight.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xxs,
  },
  placeholder: { height: controlHeight.lg },
})

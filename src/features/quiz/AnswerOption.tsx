/**
 * One 5 Savol answer: letter badge (A/B/D/E) + text, min height 58, lg radius.
 *
 * States: idle, pending (tapped, waiting for the reveal), correct (green;
 * the check pops in with springs.pop), wrong (shakes ±6 px twice in 240 ms
 * and turns red), reveal (the right option shown after a wrong tap), dim
 * (the other options once revealed). Reduce motion: colour change only.
 */
import React, { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming,
} from 'react-native-reanimated'
import { Check, X } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { shake, springs } from '../../design/motion'
import { answerMinHeight, avatarSize, iconSize, iconStroke, radius, space } from '../../design/spacing'
import { stateOpacity } from '../../design/tokens'
import { type as typeScale } from '../../design/typography'
import { Pressable } from '../../components/ui'
import { optionLetter } from './quizPlay'

export type AnswerState = 'idle' | 'pending' | 'correct' | 'wrong' | 'reveal' | 'dim'

const GREEN = 6   // badgeColors index: green
const RED = 1     // badgeColors index: red

export function AnswerOption({ index, text, state, onPress, disabled }: {
  index: number
  text: string
  state: AnswerState
  onPress: () => void
  disabled: boolean
}) {
  const { colors, badgeColors } = useTheme()
  const reduceMotion = useReducedMotion()
  const x = useSharedValue(0)
  const mark = useSharedValue(state === 'correct' || state === 'wrong' || state === 'reveal' ? 1 : 0)

  useEffect(() => {
    const marked = state === 'correct' || state === 'wrong' || state === 'reveal'
    if (!marked) { mark.set(0); return }
    mark.set(reduceMotion ? 1 : withSpring(1, springs.pop))
    if (state === 'wrong' && !reduceMotion) {
      const step = { duration: shake.duration / 5 }
      x.set(withSequence(
        withTiming(shake.distance, step), withTiming(-shake.distance, step),
        withTiming(shake.distance, step), withTiming(-shake.distance, step),
        withTiming(0, step),
      ))
    }
  }, [state, reduceMotion, mark, x])

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }))
  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: mark.get() }] }))

  const good = state === 'correct' || state === 'reveal'
  const bad = state === 'wrong'
  const bg = good ? badgeColors[GREEN] : bad ? badgeColors[RED] : colors.surface
  const border = good ? colors.success : bad ? colors.danger : state === 'pending' ? colors.accent : colors.border
  // Pending: a soft orange letter badge (no small white text on orange).
  const badgeBg = good ? colors.success : bad ? colors.danger : state === 'pending' ? colors.accentSoft : colors.surfaceRaised
  const badgeFg = state === 'pending' ? colors.accentText : colors.textMuted
  const Mark = good ? Check : bad ? X : null
  const label = `${optionLetter(index)}. ${text}${good ? ', toʻgʻri javob' : bad ? ', notoʻgʻri' : ''}`

  return (
    <Animated.View style={shakeStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        baseOpacity={state === 'dim' ? stateOpacity.done : 1}
        haptic={undefined}
        accessibilityLabel={label}
        accessibilityState={{ disabled, selected: state === 'pending' || good || bad }}
        style={[styles.option, { backgroundColor: bg, borderColor: border }]}
      >
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          {Mark ? (
            <Animated.View style={markStyle}>
              <Mark size={iconSize.sm - 2} color={colors.onAccent} strokeWidth={iconStroke + 1} />
            </Animated.View>
          ) : (
            <Text style={[typeScale.headline, { color: badgeFg }]}>{optionLetter(index)}</Text>
          )}
        </View>
        <Text style={[typeScale.body, styles.text, { color: colors.text }]}>{text}</Text>
        {state === 'pending' && <ActivityIndicator size="small" color={colors.accent} />}
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  option: {
    minHeight: answerMinHeight,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  badge: {
    width: avatarSize.sm,
    height: avatarSize.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
})

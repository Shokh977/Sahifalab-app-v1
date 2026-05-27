/**
 * Rolling-digit timer display.
 * Each character that changes slides upward (old) and is replaced by
 * a new character that slides in from below — 200ms per digit.
 */
import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming,
} from 'react-native-reanimated'
import { useTheme } from '../../hooks/useTheme'
import { typography } from '../../lib/constants'

const DIGIT_H   = 58   // height of the animated container per character
const FONT_SIZE = 48

function RollingChar({ char, color }: { char: string; color: string }) {
  const isDigit = /\d/.test(char)
  const prev    = useRef(char)
  const translateY = useSharedValue(0)
  const opacity    = useSharedValue(1)

  useEffect(() => {
    if (prev.current !== char && isDigit) {
      // Old char slides up and fades, new slides in from below
      translateY.value = withSequence(
        withTiming(-DIGIT_H * 0.5, { duration: 80 }),
        withTiming(DIGIT_H * 0.5,  { duration: 0   }),
        withTiming(0,              { duration: 120  }),
      )
      opacity.value = withSequence(
        withTiming(0,   { duration: 80  }),
        withTiming(0,   { duration: 0   }),
        withTiming(1,   { duration: 120 }),
      )
      prev.current = char
    }
  }, [char])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity:   opacity.value,
  }))

  if (!isDigit) {
    return (
      <Text style={[styles.colon, { color, fontFamily: typography.fontFamily.extrabold }]}>
        {char}
      </Text>
    )
  }

  return (
    <View style={[styles.digitWrap, { height: DIGIT_H }]}>
      <Animated.Text
        style={[
          styles.digit,
          animStyle,
          { color, fontFamily: typography.fontFamily.extrabold },
        ]}
      >
        {char}
      </Animated.Text>
    </View>
  )
}

interface Props {
  remainingSeconds: number
  color:            string
}

function formatTime(seconds: number): string {
  const s   = Math.max(0, seconds)
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function DigitDisplay({ remainingSeconds, color }: Props) {
  const str = formatTime(remainingSeconds)
  return (
    <View style={styles.row}>
      {str.split('').map((ch, i) => (
        <RollingChar key={`${i}-${ch}`} char={ch} color={color} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center' },
  digitWrap: { overflow: 'hidden', justifyContent: 'center', alignItems: 'center', width: 30 },
  digit:     { fontSize: FONT_SIZE, lineHeight: DIGIT_H },
  colon:     { fontSize: FONT_SIZE, lineHeight: DIGIT_H, marginHorizontal: 1, marginBottom: 4 },
})

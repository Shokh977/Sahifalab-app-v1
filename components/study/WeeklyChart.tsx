/**
 * 7-bar chart showing minutes studied per day this week.
 * Bars grow from 0 on mount with 50ms stagger.
 */
import React, { useEffect } from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withDelay, withTiming, Easing,
} from 'react-native-reanimated'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing } from '../../lib/constants'
import type { WeeklyStudyDay } from '../../lib/api'

const DAY_LABELS  = ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sh', 'Ya']
const MAX_BAR_H   = 160
const TODAY_LABEL = new Date().toISOString().slice(0, 10)

function todayDayOfWeek() {
  // 0=Sun…6=Sat → convert to Mon=0…Sun=6
  const d = new Date().getDay()
  return d === 0 ? 6 : d - 1
}

interface BarProps {
  minutes:  number
  maxMin:   number
  goalMet:  boolean
  isToday:  boolean
  label:    string
  index:    number
}

function Bar({ minutes, maxMin, goalMet, isToday, label, index }: BarProps) {
  const { c } = useTheme()
  const frac  = maxMin > 0 ? Math.min(minutes / maxMin, 1) : 0
  const height = Math.max(4, frac * MAX_BAR_H)

  const animH = useSharedValue(0)
  useEffect(() => {
    animH.value = withDelay(index * 50, withTiming(height, {
      duration: 600,
      easing:   Easing.out(Easing.cubic),
    }))
  }, [height])

  const barStyle = useAnimatedStyle(() => ({ height: animH.value }))

  const barColor = minutes === 0
    ? c.bgTertiary
    : goalMet
      ? c.accentPrimary
      : c.bgHover

  return (
    <View style={styles.barCol}>
      <View style={[styles.barTrack, { height: MAX_BAR_H }]}>
        <Animated.View
          style={[
            styles.barFill,
            barStyle,
            { backgroundColor: barColor },
            isToday && { borderWidth: 2, borderColor: c.accentPrimary },
          ]}
        />
      </View>
      {minutes > 0 && (
        <Text style={[styles.minLabel, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
          {minutes}
        </Text>
      )}
      <Text style={[
        styles.dayLabel,
        {
          color:      isToday ? c.accentPrimary : c.textSecondary,
          fontFamily: isToday ? typography.fontFamily.semibold : typography.fontFamily.regular,
        },
      ]}>
        {label}
      </Text>
    </View>
  )
}

interface Props {
  days:     WeeklyStudyDay[]
  goalMin?: number
}

export function WeeklyChart({ days, goalMin = 20 }: Props) {
  const { c } = useTheme()
  const todayDow = todayDayOfWeek()

  // Build 7-slot array anchored to current week Mon–Sun
  const slots: WeeklyStudyDay[] = DAY_LABELS.map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (todayDow - i))
    const dateStr = d.toISOString().slice(0, 10)
    return days.find(day => day.date === dateStr) ?? { date: dateStr, minutes: 0, goal_met: false }
  })

  const maxMin = Math.max(goalMin, ...slots.map(s => s.minutes), 1)

  return (
    <View style={styles.wrap}>
      <View style={styles.bars}>
        {slots.map((slot, i) => (
          <Bar
            key={slot.date}
            minutes={slot.minutes}
            maxMin={maxMin}
            goalMet={slot.goal_met}
            isToday={slot.date === TODAY_LABEL}
            label={DAY_LABELS[i]}
            index={i}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {},
  bars: {
    flexDirection:  'row',
    alignItems:     'flex-end',
    justifyContent: 'space-between',
    gap:            8,
  },
  barCol:   { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { justifyContent: 'flex-end', width: '100%' },
  barFill: {
    width:        '100%',
    borderRadius: 4,
  },
  minLabel: { fontSize: 9 },
  dayLabel: { fontSize: typography.size.xs },
})

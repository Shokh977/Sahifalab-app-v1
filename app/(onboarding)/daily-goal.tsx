/**
 * Onboarding Step 2: Set Daily Study Goal
 * Three preset cards (10 / 20 / 40 minutes). "Oddiy" pre-selected.
 */
import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, Pressable, BackHandler, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Leaf, Flame, Lightning } from 'phosphor-react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated'

import { onboarding } from '../../lib/api'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'

type GoalKey = 'easy' | 'normal' | 'hard'

interface GoalOption {
  key:     GoalKey
  label:   string
  sub:     string
  minutes: number
  Icon:    React.ComponentType<{ size: number; color: string; weight: 'fill' }>
  color:   (c: ReturnType<typeof useTheme>['c']) => string
}

const GOALS: GoalOption[] = [
  {
    key:     'easy',
    label:   'Oson',
    sub:     '10 daqiqa / kun',
    minutes: 10,
    Icon:    Leaf as any,
    color:   c => c.success,
  },
  {
    key:     'normal',
    label:   'Oddiy',
    sub:     '20 daqiqa / kun',
    minutes: 20,
    Icon:    Flame as any,
    color:   c => c.accentPrimary,
  },
  {
    key:     'hard',
    label:   'Jiddiy',
    sub:     '40 daqiqa / kun',
    minutes: 40,
    Icon:    Lightning as any,
    color:   c => c.warning,
  },
]

function RadioIndicator({ selected }: { selected: boolean }) {
  const { c } = useTheme()
  const scale = useSharedValue(selected ? 1 : 0)

  useEffect(() => {
    scale.value = withSpring(selected ? 1 : 0, { damping: 10, stiffness: 200 })
  }, [selected])

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <View style={[styles.radio, { borderColor: selected ? c.accentPrimary : c.border }]}>
      <Animated.View
        style={[
          styles.radioFill,
          fillStyle,
          { backgroundColor: c.accentPrimary },
        ]}
      />
    </View>
  )
}

export default function DailyGoalScreen() {
  const { c }   = useTheme()
  const insets  = useSafeAreaInsets()
  const router  = useRouter()

  const [selected, setSelected] = useState<GoalKey>('normal')
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => sub.remove()
  }, [])

  const handleContinue = async () => {
    if (saving) return
    setSaving(true)
    const goal = GOALS.find(g => g.key === selected)!
    await onboarding.setDailyGoal(goal.minutes)
    setSaving(false)
    router.push('/(onboarding)/notifications' as any)
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xl }]}>
        <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Kunlik maqsad
        </Text>
        <Text style={[styles.subtitle, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          Har kuni qancha vaqt ajratasiz?
        </Text>
      </View>

      {/* Goal cards */}
      <View style={[styles.cards, { paddingHorizontal: spacing.lg }]}>
        {GOALS.map(goal => {
          const isSelected = selected === goal.key
          const iconColor  = goal.color(c)

          return (
            <Pressable
              key={goal.key}
              onPress={() => setSelected(goal.key)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: isSelected ? c.accentPrimaryMuted : c.bgSecondary,
                  borderColor:     isSelected ? c.accentPrimary      : c.border,
                  borderWidth:     isSelected ? 2 : 1,
                  opacity:         pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${iconColor}18` }]}>
                <goal.Icon size={24} color={iconColor} weight="fill" />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                  {goal.label}
                </Text>
                <Text style={[styles.cardSub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                  {goal.sub}
                </Text>
              </View>
              <RadioIndicator selected={isSelected} />
            </Pressable>
          )
        })}

        <Text style={[styles.hint, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
          Keyinroq o'zgartirsa bo'ladi
        </Text>
      </View>

      {/* CTA */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg, paddingHorizontal: spacing.lg }]}>
        <Pressable
          onPress={handleContinue}
          disabled={saving}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: c.accentPrimary, opacity: pressed || saving ? 0.85 : 1 },
          ]}
        >
          {saving
            ? <ActivityIndicator color={c.textInverse} size="small" />
            : <Text style={[styles.ctaLabel, { color: c.textInverse, fontFamily: typography.fontFamily.semibold }]}>
                Davom etish
              </Text>
          }
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom:     spacing.xl,
    gap:               8,
  },
  title:    { fontSize: 24, lineHeight: 30 },
  subtitle: { fontSize: typography.size.base },

  cards: { flex: 1, gap: 16 },

  card: {
    flexDirection:  'row',
    alignItems:     'center',
    borderRadius:   radius.card,
    padding:        16,
    gap:            16,
  },
  iconWrap: {
    width:          44,
    height:         44,
    borderRadius:   10,
    alignItems:     'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: typography.size.lg },
  cardSub:   { fontSize: typography.size.sm },

  radio: {
    width:          24,
    height:         24,
    borderRadius:   12,
    borderWidth:    2,
    alignItems:     'center',
    justifyContent: 'center',
  },
  radioFill: {
    width:        14,
    height:       14,
    borderRadius: 7,
  },

  hint: {
    fontSize:  typography.size.sm,
    textAlign: 'center',
    marginTop: -4,
  },

  bottom:   { paddingTop: spacing.base },
  cta: {
    height:         56,
    borderRadius:   14,
    alignItems:     'center',
    justifyContent: 'center',
  },
  ctaLabel: { fontSize: typography.size.lg },
})

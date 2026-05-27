/**
 * Onboarding Step 1: Pick Interests
 * Uses course categories as interest options. Min 3 required.
 */
import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, BackHandler,
  ActivityIndicator, Pressable,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated'

import { courses as coursesApi, onboarding, type Category } from '../../lib/api'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing } from '../../lib/constants'

const MIN_SELECTED = 3

function InterestChip({
  category,
  selected,
  onToggle,
}: {
  category: Category
  selected: boolean
  onToggle: () => void
}) {
  const { c } = useTheme()
  const scale = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const handlePress = () => {
    scale.value = withSpring(0.95, { damping: 6, stiffness: 300 }, () => {
      scale.value = withSpring(1.05, { damping: 8, stiffness: 200 }, () => {
        scale.value = withSpring(1.0, { damping: 10, stiffness: 180 })
      })
    })
    onToggle()
  }

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.chip,
          {
            backgroundColor: selected ? c.accentPrimaryMuted : c.bgSecondary,
            borderColor:     selected ? c.accentPrimary      : c.border,
          },
        ]}
      >
        {category.icon ? (
          <Text style={styles.chipIcon}>{category.icon}</Text>
        ) : null}
        <Text
          style={[
            styles.chipLabel,
            {
              color:      selected ? c.accentPrimary : c.textPrimary,
              fontFamily: selected
                ? typography.fontFamily.medium
                : typography.fontFamily.regular,
            },
          ]}
        >
          {category.name}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

export default function InterestsScreen() {
  const { c }   = useTheme()
  const insets  = useSafeAreaInsets()
  const router  = useRouter()

  const [categories, setCategories] = useState<Category[]>([])
  const [selected,   setSelected]   = useState<Set<number>>(new Set())
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)

  // Disable hardware back
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => sub.remove()
  }, [])

  useEffect(() => {
    coursesApi.getCategories()
      .then(cats => setCategories(cats))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const canContinue = selected.size >= MIN_SELECTED

  const handleContinue = async () => {
    if (!canContinue || saving) return
    setSaving(true)
    await onboarding.saveInterests([...selected])
    setSaving(false)
    router.push('/(onboarding)/daily-goal' as any)
  }

  const counterText = `${selected.size} ta tanlandi`

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xl }]}>
        <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Nimalarni o'rganmoqchisiz?
        </Text>
        <Text style={[styles.subtitle, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          Kamida 3 ta tanlang
        </Text>
      </View>

      {/* Interest grid */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={c.accentPrimary} size="large" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.grid, { paddingBottom: 120 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.chipWrap}>
            {categories.map(cat => (
              <InterestChip
                key={cat.id}
                category={cat}
                selected={selected.has(cat.id)}
                onToggle={() => toggle(cat.id)}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {/* Fixed bottom */}
      <View
        style={[
          styles.bottom,
          {
            backgroundColor: c.bgPrimary,
            borderTopColor:  c.borderSubtle,
            paddingBottom:   insets.bottom + spacing.lg,
          },
        ]}
      >
        <Text
          style={[
            styles.counter,
            {
              color:      canContinue ? c.accentPrimary : c.textSecondary,
              fontFamily: typography.fontFamily.medium,
            },
          ]}
        >
          {counterText}
        </Text>
        <Pressable
          onPress={handleContinue}
          disabled={!canContinue || saving}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: c.accentPrimary,
              opacity: (!canContinue || saving) ? 0.4 : pressed ? 0.85 : 1,
            },
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
  subtitle: { fontSize: typography.size.sm },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  grid:    { paddingHorizontal: spacing.lg },
  chipWrap: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
  },

  chip: {
    flexDirection:     'row',
    alignItems:        'center',
    borderWidth:       1,
    borderRadius:      8,
    paddingVertical:   10,
    paddingHorizontal: 16,
    gap:               6,
  },
  chipIcon:  { fontSize: 16 },
  chipLabel: { fontSize: typography.size.base },

  bottom: {
    position:          'absolute',
    bottom:            0,
    left:              0,
    right:             0,
    borderTopWidth:    1,
    paddingTop:        spacing.base,
    paddingHorizontal: spacing.lg,
    gap:               8,
  },
  counter: { fontSize: typography.size.sm, textAlign: 'center' },
  cta: {
    height:         56,
    borderRadius:   14,
    alignItems:     'center',
    justifyContent: 'center',
  },
  ctaLabel: { fontSize: typography.size.lg },
})

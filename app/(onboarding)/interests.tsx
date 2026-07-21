import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, BackHandler,
  ActivityIndicator, Pressable,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'

import { courses as coursesApi, onboarding, type Category } from '../../lib/api'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing } from '../../lib/constants'

export const INTERESTS_STORAGE_KEY = 'sahifalab_user_interests'

function OnboardingProgress({ step, total }: { step: number; total: number }) {
  const { c } = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginBottom: spacing.lg }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={{ width: 28, height: 4, borderRadius: 2, backgroundColor: i < step ? c.accentPrimary : c.bgTertiary }} />
      ))}
    </View>
  )
}

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
  const [loadError,  setLoadError]  = useState(false)
  const [saveError,  setSaveError]  = useState(false)

  // Disable hardware back
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => sub.remove()
  }, [])

  const loadCategories = () => {
    setLoading(true)
    setLoadError(false)
    coursesApi.getCategories()
      .then(cats => setCategories(cats))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }

  // If this fetch fails with no retry, the user is stuck forever: hardware
  // back is disabled above and the CTA below requires 3+ categories that
  // never arrived. Always give a way forward.
  useEffect(() => { loadCategories() }, [])

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
    setSaveError(false)
    const ids = [...selected]
    try {
      await Promise.all([
        onboarding.saveInterests(ids),
        AsyncStorage.setItem(INTERESTS_STORAGE_KEY, JSON.stringify(ids)),
      ])
      router.push('/(onboarding)/experience' as any)
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  const counterText = `${selected.size} ta tanlandi`

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xl }]}>
        <OnboardingProgress step={1} total={5} />
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
      ) : loadError ? (
        <View style={styles.loader}>
          <Text style={{ color: c.textSecondary, fontFamily: typography.fontFamily.regular, textAlign: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.base }}>
            Kategoriyalarni yuklab bo'lmadi. Internetni tekshirib, qayta urinib ko'ring.
          </Text>
          <Pressable
            onPress={loadCategories}
            style={({ pressed }) => [styles.cta, { backgroundColor: c.accentPrimary, paddingHorizontal: spacing.xl, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={[styles.ctaLabel, { color: c.textInverse, fontFamily: typography.fontFamily.semibold }]}>
              Qayta urinish
            </Text>
          </Pressable>
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
          {saveError ? "Saqlab bo'lmadi. Qayta urinib ko'ring." : counterText}
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

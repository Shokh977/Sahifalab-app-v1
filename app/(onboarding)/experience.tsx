import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, Pressable, BackHandler, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Plant, BookOpen, RocketLaunch } from 'phosphor-react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated'

import { onboarding } from '../../lib/api'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'
export const EXPERIENCE_STORAGE_KEY = 'sahifalab_user_experience'

interface LevelOption {
  key:      ExperienceLevel
  label:    string
  sub:      string
  Icon:     React.ComponentType<{ size: number; color: string; weight: 'fill' }>
  color:    (c: ReturnType<typeof useTheme>['c']) => string
}

const LEVELS: LevelOption[] = [
  {
    key:   'beginner',
    label: 'Boshlang\'ich',
    sub:   'Yangiman, boshidan boshlayman',
    Icon:  Plant as any,
    color: c => c.success,
  },
  {
    key:   'intermediate',
    label: 'O\'rta',
    sub:   'Ba\'zi bilimlarim bor, rivojlanmoqchiman',
    Icon:  BookOpen as any,
    color: c => c.accentPrimary,
  },
  {
    key:   'advanced',
    label: 'Ilg\'or',
    sub:   'Chuqurroq bilim olmoqchiman',
    Icon:  RocketLaunch as any,
    color: c => c.warning,
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
      <Animated.View style={[styles.radioFill, fillStyle, { backgroundColor: c.accentPrimary }]} />
    </View>
  )
}

export default function ExperienceScreen() {
  const { c }  = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [selected, setSelected] = useState<ExperienceLevel>('beginner')
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => sub.remove()
  }, [])

  const handleContinue = async () => {
    if (saving) return
    setSaving(true)
    await Promise.all([
      onboarding.saveExperience(selected),
      AsyncStorage.setItem(EXPERIENCE_STORAGE_KEY, selected),
    ])
    setSaving(false)
    router.push('/(onboarding)/motivation' as any)
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xl }]}>
        <OnboardingProgress step={2} total={5} />
        <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Qaysi darajadasiz?
        </Text>
        <Text style={[styles.subtitle, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          Siz uchun mos kurslar ko'rsatiladi
        </Text>
      </View>

      <View style={[styles.cards, { paddingHorizontal: spacing.lg }]}>
        {LEVELS.map(level => {
          const isSelected = selected === level.key
          const iconColor  = level.color(c)
          return (
            <Pressable
              key={level.key}
              onPress={() => setSelected(level.key)}
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
                <level.Icon size={24} color={iconColor} weight="fill" />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                  {level.label}
                </Text>
                <Text style={[styles.cardSub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                  {level.sub}
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

function OnboardingProgress({ step, total }: { step: number; total: number }) {
  const { c } = useTheme()
  return (
    <View style={progress.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            progress.dot,
            { backgroundColor: i < step ? c.accentPrimary : c.bgTertiary },
          ]}
        />
      ))}
    </View>
  )
}

const progress = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginBottom: spacing.lg },
  dot: { width: 28, height: 4, borderRadius: 2 },
})

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
    flexDirection: 'row',
    alignItems:    'center',
    borderRadius:  radius.card,
    padding:       16,
    gap:           16,
  },
  iconWrap: {
    width:          44,
    height:         44,
    borderRadius:   10,
    alignItems:     'center',
    justifyContent: 'center',
  },
  cardText:  { flex: 1, gap: 2 },
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
  radioFill: { width: 14, height: 14, borderRadius: 7 },

  hint: { fontSize: typography.size.sm, textAlign: 'center', marginTop: -4 },

  bottom:   { paddingTop: spacing.base },
  cta: {
    height:         56,
    borderRadius:   14,
    alignItems:     'center',
    justifyContent: 'center',
  },
  ctaLabel: { fontSize: typography.size.lg },
})

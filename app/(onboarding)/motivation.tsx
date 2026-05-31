import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, Pressable, BackHandler, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Briefcase, Wrench, Star, ClipboardText } from 'phosphor-react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated'

import { onboarding } from '../../lib/api'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'

type Motivation = 'career' | 'skill' | 'self' | 'exam'

interface MotivationOption {
  key:   Motivation
  label: string
  sub:   string
  Icon:  React.ComponentType<{ size: number; color: string; weight: 'fill' }>
  color: (c: ReturnType<typeof useTheme>['c']) => string
}

const OPTIONS: MotivationOption[] = [
  {
    key:   'career',
    label: 'Karyera uchun',
    sub:   'Ish topish yoki lavozimni ko\'tarish',
    Icon:  Briefcase as any,
    color: c => c.accentPrimary,
  },
  {
    key:   'skill',
    label: 'Yangi ko\'nikma',
    sub:   'Amaliy ko\'nikmalarni o\'rganmoqchiman',
    Icon:  Wrench as any,
    color: c => c.warning,
  },
  {
    key:   'self',
    label: 'O\'z-o\'zini rivojlantirish',
    sub:   'Bilimlarni kengaytirish va o\'sish',
    Icon:  Star as any,
    color: c => '#a855f7',
  },
  {
    key:   'exam',
    label: 'Imtihonga tayyorlanish',
    sub:   'Sertifikat yoki imtihon uchun',
    Icon:  ClipboardText as any,
    color: c => c.success,
  },
]

function SelectIndicator({ selected }: { selected: boolean }) {
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

export default function MotivationScreen() {
  const { c }  = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [selected, setSelected] = useState<Motivation>('career')
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => sub.remove()
  }, [])

  const handleContinue = async () => {
    if (saving) return
    setSaving(true)
    await onboarding.saveMotivation(selected)
    setSaving(false)
    router.push('/(onboarding)/daily-goal' as any)
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xl }]}>
        <OnboardingProgress step={3} total={5} />
        <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Nima uchun o'qiyapsiz?
        </Text>
        <Text style={[styles.subtitle, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          Siz uchun eng muhim narsaga e'tibor qaratamiz
        </Text>
      </View>

      <View style={[styles.cards, { paddingHorizontal: spacing.lg }]}>
        {OPTIONS.map(opt => {
          const isSelected = selected === opt.key
          const iconColor  = opt.color(c)
          return (
            <Pressable
              key={opt.key}
              onPress={() => setSelected(opt.key)}
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
                <opt.Icon size={22} color={iconColor} weight="fill" />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                  {opt.label}
                </Text>
                <Text style={[styles.cardSub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                  {opt.sub}
                </Text>
              </View>
              <SelectIndicator selected={isSelected} />
            </Pressable>
          )
        })}
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

  cards: { flex: 1, gap: 14 },

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
  cardTitle: { fontSize: typography.size.base },
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

  bottom: { paddingTop: spacing.base },
  cta: {
    height:         56,
    borderRadius:   14,
    alignItems:     'center',
    justifyContent: 'center',
  },
  ctaLabel: { fontSize: typography.size.lg },
})

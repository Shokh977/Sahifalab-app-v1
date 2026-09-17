import React, { useEffect } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Animated, { useSharedValue, withRepeat, withTiming, useAnimatedStyle, Easing } from 'react-native-reanimated'
import { typography } from '../../lib/constants'
import { coursesStrings as s } from '../../lib/coursesStrings'
import { EmptyCourseMark } from './icons'
import type { PremiumTheme } from '../../lib/premiumTheme'

function Shimmer({ style, t, reduceMotion }: { style: any; t: PremiumTheme; reduceMotion: boolean }) {
  const opacity = useSharedValue(reduceMotion ? 0.7 : 0.5)
  useEffect(() => {
    if (reduceMotion) return
    opacity.value = withRepeat(withTiming(0.9, { duration: 750, easing: Easing.inOut(Easing.sin) }), -1, true)
  }, [reduceMotion])
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return <Animated.View style={[style, { backgroundColor: t.field }, animStyle]} />
}

export function CoursesSkeleton({ t, reduceMotion }: { t: PremiumTheme; reduceMotion: boolean }) {
  return (
    <View>
      <Shimmer style={{ height: 186, marginHorizontal: 16, borderRadius: 22 }} t={t} reduceMotion={reduceMotion} />
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 14 }}>
        {[70, 90, 60, 80].map((w, i) => (
          <Shimmer key={i} style={{ width: w, height: 32, borderRadius: 999 }} t={t} reduceMotion={reduceMotion} />
        ))}
      </View>
      <View style={{ paddingHorizontal: 16, marginTop: 18, gap: 10 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 13 }}>
            <Shimmer style={{ width: 88, height: 88, borderRadius: 15 }} t={t} reduceMotion={reduceMotion} />
            <View style={{ flex: 1, gap: 7, paddingVertical: 4 }}>
              <Shimmer style={{ width: '40%', height: 9, borderRadius: 4 }} t={t} reduceMotion={reduceMotion} />
              <Shimmer style={{ width: '85%', height: 13, borderRadius: 4 }} t={t} reduceMotion={reduceMotion} />
              <Shimmer style={{ width: '60%', height: 13, borderRadius: 4 }} t={t} reduceMotion={reduceMotion} />
              <Shimmer style={{ width: '45%', height: 10, borderRadius: 4, marginTop: 4 }} t={t} reduceMotion={reduceMotion} />
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

export function CoursesEmptyState({ t, title, hint, ctaLabel, onCta }: {
  t: PremiumTheme; title: string; hint?: string; ctaLabel?: string; onCta?: () => void
}) {
  return (
    <View style={styles.wrap}>
      <EmptyCourseMark size={56} color={t.textTertiary} />
      <Text style={[styles.title, { color: t.textSecondary }]}>{title}</Text>
      {!!hint && <Text style={[styles.hint, { color: t.textTertiary }]}>{hint}</Text>}
      {!!ctaLabel && !!onCta && (
        <Pressable onPress={onCta} hitSlop={12}>
          <Text style={[styles.cta, { color: t.accentText }]}>{ctaLabel}</Text>
        </Pressable>
      )}
    </View>
  )
}

export function CoursesErrorState({ t, onRetry }: { t: PremiumTheme; onRetry: () => void }) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: t.textSecondary }]}>{s.errorLine}</Text>
      <Pressable onPress={onRetry} hitSlop={12}>
        <Text style={[styles.cta, { color: t.accentText }]}>{s.retry}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32, marginTop: 72 },
  title: { fontSize: 14.5, fontFamily: typography.fontFamily.semibold, textAlign: 'center' },
  hint: { fontSize: 12.5, fontFamily: typography.fontFamily.regular, textAlign: 'center', lineHeight: 18 },
  cta: { fontSize: 14, fontFamily: typography.fontFamily.bold, minHeight: 44, textAlignVertical: 'center', marginTop: 2 },
})

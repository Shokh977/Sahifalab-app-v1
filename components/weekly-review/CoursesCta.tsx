import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { BookOpen, ChevronRight } from 'lucide-react-native'
import { typography, spacing, radius } from '../../lib/constants'
import type { WeeklyReviewStatVM } from '../../hooks/useWeeklyReview'

export function CoursesCta({ stats, c }: { stats: WeeklyReviewStatVM[]; c: any }) {
  const router = useRouter()
  const coursesStat = stats.find(s => s.key === 'courses')
  const enrolled = coursesStat?.value ?? 0
  const lessonsThisWeek = coursesStat?.subCount ?? 0

  return (
    <Pressable
      style={[s.root, { backgroundColor: c.bgSecondary, borderColor: c.border }]}
      onPress={() => router.push('/(tabs)/courses' as any)}
      accessibilityRole="button"
      hitSlop={4}
    >
      <View style={[s.chip, { backgroundColor: '#A855F71a' }]}>
        <BookOpen size={18} color="#A855F7" />
      </View>
      <View style={s.body}>
        <Text numberOfLines={1} style={[s.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Kurslar
        </Text>
        <Text numberOfLines={2} style={[s.sub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          {enrolled > 0
            ? `${enrolled} ta kursga yozilgansiz, bu hafta ${lessonsThisWeek} ta dars tugallandi`
            : "Hali birorta kursga yozilmagansiz — boshlab ko'ring"}
        </Text>
      </View>
      <ChevronRight size={18} color={c.textMuted} />
    </Pressable>
  )
}

const s = StyleSheet.create({
  root: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: radius.cardLg, borderWidth: 1, padding: spacing.lg, minHeight: 44,
  },
  chip: { width: 40, height: 40, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 14.5 },
  sub: { fontSize: 12.5, lineHeight: 17 },
})

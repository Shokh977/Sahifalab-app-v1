import React, { useEffect } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ChevronLeft, Sparkles, Moon, Sun } from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../../hooks/useTheme'
import { useWeeklyReview } from '../../hooks/useWeeklyReview'
import { WEEKLY_REVIEW_SEEN_KEY } from '../../components/dashboard/BugunGrid/WeeklyReviewGridCard'
import { typography, spacing, radius } from '../../lib/constants'
import { Hero } from '../../components/weekly-review/Hero'
import { FocusCard } from '../../components/weekly-review/FocusCard'
import { DailyActivityCard } from '../../components/weekly-review/DailyActivityCard'
import { StatsGrid } from '../../components/weekly-review/StatsGrid'
import { CoursesCta } from '../../components/weekly-review/CoursesCta'
import { TavsiyaCard } from '../../components/weekly-review/TavsiyaCard'
import { LastWeekSummary } from '../../components/weekly-review/LastWeekSummary'
import { WeeklyReviewSkeleton } from '../../components/weekly-review/Skeleton'
import { StudyMethodCard } from '../../components/weekly-review/StudyMethodCard'
import { CategoryInsightCard } from '../../components/weekly-review/CategoryInsightCard'
import { TutorOpportunityCard } from '../../components/weekly-review/TutorOpportunityCard'

export default function WeeklyReviewScreen() {
  const { c, theme, toggle } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { data, status, error, refetch } = useWeeklyReview()

  // Marks the completed-week review as seen for the dashboard's
  // WeeklyReviewGridCard unread dot — recorded here (the actual review
  // screen), not on the dashboard card itself, so glancing at the card
  // never counts as read.
  useEffect(() => {
    if (data?.lastWeek) {
      AsyncStorage.setItem(WEEKLY_REVIEW_SEEN_KEY, data.lastWeek.weekStart).catch(() => {})
    }
  }, [data?.lastWeek?.weekStart])

  return (
    <SafeAreaView style={[s.root, { backgroundColor: c.bgPrimary }]} edges={['top', 'bottom']}>
      <View style={[s.navBar, { borderBottomColor: c.border, backgroundColor: c.bgPrimary }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))}
          hitSlop={12} style={s.navBtn} accessibilityRole="button" accessibilityLabel="Orqaga"
        >
          <ChevronLeft size={24} color={c.accentPrimary} />
        </Pressable>
        <Text numberOfLines={1} style={[s.navTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Haftalik sharh
        </Text>
        <Pressable onPress={toggle} hitSlop={12} style={s.navBtn} accessibilityRole="button" accessibilityLabel="Mavzuni almashtirish">
          {theme === 'dark' ? <Sun size={20} color={c.textSecondary} /> : <Moon size={20} color={c.textSecondary} />}
        </Pressable>
      </View>

      {status === 'loading' ? (
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <WeeklyReviewSkeleton c={c} />
        </ScrollView>
      ) : status === 'error' ? (
        <View style={s.center}>
          <Text style={s.stateIcon}>⚠️</Text>
          <Text style={[s.stateTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Yuklab bo'lmadi
          </Text>
          <Text style={[s.stateBody, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {error}
          </Text>
          <Pressable onPress={refetch} style={[s.retryBtn, { backgroundColor: c.accentPrimary }]} accessibilityRole="button">
            <Text style={[s.retryText, { fontFamily: typography.fontFamily.semibold }]}>Qayta urinish</Text>
          </Pressable>
        </View>
      ) : data ? (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[s.scroll, { paddingBottom: spacing.xl * 2 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[s.freeBadge, { backgroundColor: c.accentPrimaryMuted, borderColor: c.accentPrimary + '44' }]}>
            <Sparkles size={13} color={c.accentPrimary} />
            <Text style={[s.freeBadgeText, { color: c.accentPrimary, fontFamily: typography.fontFamily.semibold }]}>
              Har doim bepul
            </Text>
          </View>

          <Hero vm={data} c={c} />
          <FocusCard vm={data} c={c} />
          <DailyActivityCard vm={data} c={c} />
          <StatsGrid stats={data.stats} c={c} />
          {data.studyTip && <StudyMethodCard tip={data.studyTip} c={c} />}
          {data.categoryInsight && <CategoryInsightCard insight={data.categoryInsight} c={c} />}
          <CoursesCta stats={data.stats} c={c} />
          <TavsiyaCard vm={data} c={c} />
          {data.tutorSuggestion && <TutorOpportunityCard suggestion={data.tutorSuggestion} c={c} />}
          <LastWeekSummary lastWeek={data.lastWeek} c={c} />
        </ScrollView>
      ) : null}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1 },
  navBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xs, paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn:   { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 16 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: spacing.xl },
  stateIcon:  { fontSize: 40 },
  stateTitle: { fontSize: 16 },
  stateBody:  { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  retryBtn:   { marginTop: 8, paddingHorizontal: 28, paddingVertical: 12, borderRadius: radius.full, minHeight: 44, justifyContent: 'center' },
  retryText:  { color: '#fff', fontSize: 14 },

  scroll: { padding: spacing.lg, gap: spacing.md },
  freeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1,
  },
  freeBadgeText: { fontSize: 11 },
})

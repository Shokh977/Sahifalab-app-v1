/**
 * Bellashuv — redesign Phase 4a, rebuilt to the v2 board in Phase 7.5 D1.
 * Competitions first ("Bellashuvlar": the hero with your live or the next
 * competition, other open ones, the finished ones), then a compact 5 Savol
 * card — its main entry point is now the Bugun plan tile. The weekly XP
 * ranking lives on Reyting only (Bugun's ranking card opens it).
 */
import React, { useCallback, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { Trophy } from 'lucide-react-native'
import { challenges as challengesApi, type Challenge } from '../../lib/api'
import { useDashboardStore } from '../../stores/dashboardStore'
import { ProfileAvatarButton } from '../../components/layout/ProfileAvatarButton'
import { useTheme } from '../../src/design/ThemeProvider'
import { avatarSize, layout, space } from '../../src/design/spacing'
import { type as typeScale } from '../../src/design/typography'
import { Card, EmptyState, SectionTitle, SkeletonBlock, SkeletonRow, ToastHost, showToast } from '../../src/components/ui'
import { useMinuteClock } from '../../src/features/today/useMinuteClock'
import { endedCompetitions, otherCompetitions, pickMainCompetition } from '../../src/features/bellashuv/bellashuv'
import { CompetitionsCard } from '../../src/features/bellashuv/CompetitionsCard'
import { QuizTodayCard } from '../../src/features/bellashuv/QuizTodayCard'

export default function BellashuvScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const now = useMinuteClock()

  const quiz = useDashboardStore(s => s.data?.quiz ?? null)
  const quizFetchedAt = useDashboardStore(s => s.data?.quizFetchedAt ?? Date.now())

  const [mine, setMine] = useState<Challenge[]>([])
  const [open, setOpen] = useState<Challenge[]>([])
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [mineRes, listRes] = await Promise.all([challengesApi.mine(), challengesApi.list('upcoming_active')])
      const myIds = new Set(mineRes.map(c => c.id))
      setMine(mineRes)
      setOpen(listRes.filter(c => !myIds.has(c.id)))
      setFailed(false)
    } catch {
      setFailed(true)
    }
    setLoaded(true)
    setRefreshing(false)
  }, [])

  useFocusEffect(useCallback(() => {
    load()
    useDashboardStore.getState().refreshToday()
  }, [load]))

  async function join(ch: Challenge) {
    setJoiningId(ch.id)
    // Optimistic: move it to "mine" right away, re-sync after.
    setOpen(prev => prev.filter(x => x.id !== ch.id))
    setMine(prev => [...prev, { ...ch, joined: true, progress_value: 0, completed_at: null, rank: null }])
    try {
      await challengesApi.join(ch.id)
      load()
    } catch (e: any) {
      setMine(prev => prev.filter(x => x.id !== ch.id))
      setOpen(prev => [...prev, ch])
      showToast('error', e?.message ?? 'Qoʻshilib boʻlmadi')
    } finally {
      setJoiningId(null)
    }
  }

  const openChallenge = (c: Challenge) => router.push(`/(screens)/challenge/${c.slug}` as any)
  const main = pickMainCompetition(mine, open)
  const others = otherCompetitions(mine, open, main)
  const ended = endedCompetitions(mine)
  const liveCount = [...mine, ...open].filter(c => c.status === 'active' && !c.completed_at).length
  const openQuiz = () => router.push(quiz ? { pathname: '/(screens)/daily-quiz', params: { quizId: String(quiz.id) } } as any : '/(screens)/daily-quiz' as any)
  const openResults = () => quiz && router.push({ pathname: '/(screens)/daily-quiz-results', params: { quizId: String(quiz.id) } } as any)

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[typeScale.screenTitle, styles.flex, { color: colors.text }]} accessibilityRole="header">Bellashuv</Text>
        <ProfileAvatarButton size={avatarSize.sm} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); useDashboardStore.getState().refreshToday() }}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <View style={styles.section}>
          <SectionTitle title="Bellashuvlar" meta={liveCount > 0 ? `${liveCount} ta faol` : undefined} />
          {!loaded ? (
            <Card>
              <SkeletonBlock height={space.huge * 2} />
              <SkeletonRow />
            </Card>
          ) : failed && mine.length === 0 && open.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="Bellashuvlar yuklanmadi"
              body="Internet aloqasini tekshirib, qayta urinib koʻring."
              action={{ label: 'Qayta urinish', onPress: load }}
            />
          ) : main || others.length > 0 || ended.length > 0 ? (
            <CompetitionsCard
              main={main}
              others={others}
              ended={ended}
              now={now}
              joiningId={joiningId}
              onJoin={join}
              onOpen={openChallenge}
              onFocus={() => router.push('/(tabs)/study' as any)}
              onJoined={load}
            />
          ) : (
            <EmptyState icon={Trophy} title="Hozircha bellashuv yoʻq" body="Tez orada yangi bellashuv qoʻshiladi." />
          )}
        </View>

        <QuizTodayCard quiz={quiz} fetchedAt={quizFetchedAt} now={now} onOpen={openQuiz} onResults={openResults} />
      </ScrollView>
      <ToastHost />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: layout.gutter, paddingVertical: space.xs },
  flex: { flex: 1 },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.xs, gap: layout.sectionGap },
  section: { gap: space.sm },
})

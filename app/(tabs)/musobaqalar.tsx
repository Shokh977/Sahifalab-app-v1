/**
 * Bellashuv — redesign Phase 4a.
 * Today's 5 Savol, the one competition card (your live one, or the next
 * with a countdown and a reminder), compact rows for other live/joinable
 * competitions, the weekly ranking with your row pinned, and the finished
 * competitions collapsed into one row.
 */
import React, { useCallback, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { ChevronDown, ChevronUp, Trophy } from 'lucide-react-native'
import { challenges as challengesApi, leaderboard, type Challenge, type LeaderboardEntry } from '../../lib/api'
import { METRIC_UNIT_LABEL, fmtMetricValue } from '../../lib/challenges'
import { useAuthStore } from '../../stores/authStore'
import { useDashboardStore } from '../../stores/dashboardStore'
import { ProfileAvatarButton } from '../../components/layout/ProfileAvatarButton'
import { useTheme } from '../../src/design/ThemeProvider'
import { avatarSize, layout, space } from '../../src/design/spacing'
import { type as typeScale } from '../../src/design/typography'
import { Button, Card, EmptyState, ListRow, Pressable, SkeletonBlock, SkeletonRow, ToastHost, showToast } from '../../src/components/ui'
import { useMinuteClock } from '../../src/features/today/useMinuteClock'
import { uzText } from '../../src/features/today/today'
import {
  endedCompetitions, endedResultText, otherCompetitions, pickMainCompetition, timeLeft,
} from '../../src/features/bellashuv/bellashuv'
import { CompetitionCard } from '../../src/features/bellashuv/CompetitionCard'
import { QuizTodayCard } from '../../src/features/bellashuv/QuizTodayCard'
import { WeeklyRanking } from '../../src/features/bellashuv/WeeklyRanking'

function rowSubtitle(c: Challenge, now: number): string {
  if (c.status === 'upcoming') return `Boshlanishiga ${timeLeft(c.starts_at, now).replace(' qoldi', '')}`
  return `${c.joined ? 'Faol' : 'Ochiq'} · ${timeLeft(c.ends_at, now)}`
}

export default function BellashuvScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const now = useMinuteClock()
  const userId = useAuthStore(s => s.user?.telegram_id ?? null)

  const quiz = useDashboardStore(s => s.data?.quiz ?? null)
  const quizFetchedAt = useDashboardStore(s => s.data?.quizFetchedAt ?? Date.now())
  const cachedLb = useDashboardStore(s => s.data?.leaderboard ?? [])
  const cachedRank = useDashboardStore(s => s.data?.myLeaderRank ?? null)

  const [mine, setMine] = useState<Challenge[]>([])
  const [open, setOpen] = useState<Challenge[]>([])
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [showEnded, setShowEnded] = useState(false)
  const [lb, setLb] = useState<{ entries: LeaderboardEntry[]; myRank: number | null } | null>(null)

  const load = useCallback(async () => {
    const [comp, week] = await Promise.allSettled([
      Promise.all([challengesApi.mine(), challengesApi.list('upcoming_active')]),
      leaderboard.weekly(),
    ])
    if (comp.status === 'fulfilled') {
      const [mineRes, listRes] = comp.value
      const myIds = new Set(mineRes.map(c => c.id))
      setMine(mineRes)
      setOpen(listRes.filter(c => !myIds.has(c.id)))
      setFailed(false)
    } else {
      setFailed(true)
    }
    if (week.status === 'fulfilled') {
      const entries = week.value.entries.map(e => ({ ...e, is_me: userId != null && e.telegram_id === userId }))
      setLb({ entries, myRank: week.value.my_rank ?? entries.find(e => e.is_me)?.rank ?? null })
    }
    setLoaded(true)
    setRefreshing(false)
  }, [userId])

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
  const entries = lb?.entries ?? cachedLb
  const myRank = lb?.myRank ?? cachedRank

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[typeScale.title1, styles.flex, { color: colors.text }]} accessibilityRole="header">Bellashuv</Text>
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
        <QuizTodayCard
          quiz={quiz}
          fetchedAt={quizFetchedAt}
          now={now}
          onOpen={() => router.push(quiz ? { pathname: '/(screens)/daily-quiz', params: { quizId: String(quiz.id) } } as any : '/(screens)/daily-quiz' as any)}
        />

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
        ) : main ? (
          <CompetitionCard main={main} now={now} onOpen={() => openChallenge(main.challenge)} />
        ) : (
          <EmptyState icon={Trophy} title="Hozircha bellashuv yoʻq" body="Tez orada yangi bellashuv qoʻshiladi." />
        )}

        {others.length > 0 && (
          <Card style={styles.rows}>
            {others.map(c => (
              <View key={c.id} style={styles.otherRow}>
                <View style={styles.flex}>
                  <ListRow
                    title={uzText(c.title)}
                    subtitle={rowSubtitle(c, now)}
                    leading={c.cover_image_url ? { kind: 'thumbnail', uri: c.cover_image_url } : { kind: 'icon', icon: Trophy }}
                    trailing={c.joined ? { kind: 'chevron' } : undefined}
                    onPress={() => openChallenge(c)}
                  />
                </View>
                {!c.joined && (
                  <Button label="Qoʻshilish" size="sm" loading={joiningId === c.id} onPress={() => join(c)} />
                )}
              </View>
            ))}
          </Card>
        )}

        <WeeklyRanking entries={entries} myRank={myRank} onAll={() => router.push('/(screens)/leaderboard' as any)} />

        {ended.length > 0 && (
          <Card style={styles.rows}>
            <Pressable
              noFeedback
              onPress={() => setShowEnded(v => !v)}
              accessibilityState={{ expanded: showEnded }}
              accessibilityLabel={`Yakunlangan bellashuvlar, ${ended.length} ta`}
              style={styles.endedHeader}
            >
              <Text style={[typeScale.headline, styles.flex, { color: colors.text }]}>
                Yakunlangan bellashuvlar · {ended.length} ta
              </Text>
              {showEnded
                ? <ChevronUp size={avatarSize.sm / 2} color={colors.textMuted} />
                : <ChevronDown size={avatarSize.sm / 2} color={colors.textMuted} />}
            </Pressable>
            {showEnded && ended.map(c => (
              <ListRow
                key={c.id}
                title={uzText(c.title)}
                subtitle={endedSubtitle(c)}
                leading={c.cover_image_url ? { kind: 'thumbnail', uri: c.cover_image_url } : { kind: 'icon', icon: Trophy }}
                trailing={{ kind: 'chevron' }}
                onPress={() => openChallenge(c)}
              />
            ))}
          </Card>
        )}
      </ScrollView>
      <ToastHost />
    </View>
  )
}

function endedSubtitle(c: Challenge): string {
  return endedResultText(c, v => fmtMetricValue(v, c.metric), METRIC_UNIT_LABEL[c.metric])
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: layout.gutter, paddingVertical: space.xs },
  flex: { flex: 1 },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.xs, gap: layout.sectionGap },
  rows: { paddingVertical: space.xxs },
  otherRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  endedHeader: { flexDirection: 'row', alignItems: 'center', minHeight: layout.minTouch },
})

/**
 * Competition detail — redesign Phase 4b.
 * Cover header under a dark scrim, the goal, your progress by type, the
 * reward, then the ranking in a FlashList. When you're ranked but your row
 * isn't on screen (beyond the top 20, or scrolled away) it stays pinned
 * above the action bar.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { FlashList, type ViewToken } from '@shopify/flash-list'
import { Award, Trophy } from 'lucide-react-native'
import {
  challenges as challengesApi, type ChallengeDetail, type ChallengeLeaderboardEntry, type TeamLeaderboard,
} from '../../../lib/api'
import { useAuthStore } from '../../../stores/authStore'
import {
  challengeGoalText, computePercentile, fmtMetricGoal, fmtMetricValue, metricCtaLabel, metricCtaRoute,
  metricRuleText, paceHint, percentileFraming, teamStandingLine,
} from '../../../lib/challenges'
import { ConsistencyDayDots, type DayDotState } from '../../../components/study/ConsistencyDayDots'
import { TeamHeadToHeadBar } from '../../../components/study/TeamHeadToHeadBar'
import { useTheme } from '../../../src/design/ThemeProvider'
import { layout, space } from '../../../src/design/spacing'
import { tabular, type as typeScale } from '../../../src/design/typography'
import {
  Button, Card, EmptyState, ProgressBar, ScreenHeader, SkeletonBlock, SkeletonRow, ToastHost, showToast,
} from '../../../src/components/ui'
import { useMinuteClock } from '../../../src/features/today/useMinuteClock'
import { uzText } from '../../../src/features/today/today'
import { ChallengeHeader } from '../../../src/features/bellashuv/ChallengeHeader'
import { RankRow } from '../../../src/features/bellashuv/RankRow'
import { isOutsideList, progressFraction, showPinnedRow, statusLine } from '../../../src/features/bellashuv/challengeDetail'

const VIEWABILITY = { itemVisiblePercentThreshold: 60 }

export default function ChallengeDetailScreen() {
  const { colors, deckColors } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const now = useMinuteClock()
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const myId = useAuthStore(s => s.user?.telegram_id ?? null)
  const me = useAuthStore(s => s.user)

  const [data, setData] = useState<ChallengeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [joining, setJoining] = useState(false)
  const [teamLb, setTeamLb] = useState<TeamLeaderboard | null>(null)
  const [myRowVisible, setMyRowVisible] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await challengesApi.get(slug)
      setData(res)
      setFailed(false)
      if (res.challenge_type === 'team' && res.joined) {
        challengesApi.teamLeaderboard(res.id).then(setTeamLb).catch(() => {})
      }
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [slug])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function join() {
    if (!data) return
    setJoining(true)
    try {
      await challengesApi.join(data.id)
      await load()
    } catch (e: any) {
      showToast('error', e?.message ?? 'Qoʻshilib boʻlmadi')
    } finally {
      setJoining(false)
    }
  }

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/musobaqalar' as any))

  // Track whether your real row is on screen (for the pinned copy). The
  // callback must keep one identity, so it reads the id through a ref.
  const myIdRef = useRef(myId)
  useEffect(() => { myIdRef.current = myId }, [myId])
  const onViewable = useCallback(({ viewableItems }: { viewableItems: ViewToken<ChallengeLeaderboardEntry>[] }) => {
    setMyRowVisible(viewableItems.some(v => v.item?.user_id === myIdRef.current))
  }, [])

  const rows = useMemo(
    () => (data && data.challenge_type !== 'team' ? data.leaderboard : []),
    [data],
  )

  // ── Loading / error ─────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <SkeletonBlock height="auto" borderRadius={0} style={styles.coverSkeleton} />
        <View style={styles.body}>
          <SkeletonBlock height={space.huge} />
          {[0, 1, 2, 3].map(i => <SkeletonRow key={i} />)}
        </View>
      </View>
    )
  }
  if (!data) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <ScreenHeader onBack={back} />
        <EmptyState
          icon={Trophy}
          title={failed ? 'Bellashuv yuklanmadi' : 'Bellashuv topilmadi'}
          body={failed ? 'Internet aloqasini tekshirib, qayta urinib koʻring.' : undefined}
          action={{ label: 'Qayta urinish', onPress: () => { setLoading(true); load() } }}
        />
      </View>
    )
  }

  const target = data.target_value ?? 0
  const fraction = progressFraction(data)
  const percentile = computePercentile(data.rank, data.participant_count)
  const inList = rows.some(r => r.user_id === myId)
  const ranked = data.joined && data.rank != null && data.challenge_type !== 'team'
  const pinned = ranked && showPinnedRow({ ranked, inList: !isOutsideList(rows, myId, data.rank), rowVisible: inList && myRowVisible })
  const active = data.status !== 'ended' && data.status !== 'cancelled'
  const showAction = active && (!data.joined || (data.status === 'active' && !data.completed_at))

  const progressCard = (() => {
    if (!data.joined) return null
    if (data.challenge_type === 'team') {
      return (
        <Card style={styles.gap}>
          <Text style={[typeScale.headline, { color: colors.text }]}>Guruhlar jangi</Text>
          <TeamHeadToHeadBar
            teamAName={data.team_a_name ?? 'Guruh A'} teamAColor={data.team_a_color ?? deckColors[0]} teamATotal={data.team_a_total}
            teamBName={data.team_b_name ?? 'Guruh B'} teamBColor={data.team_b_color ?? deckColors[4]} teamBTotal={data.team_b_total}
            fmtValue={v => fmtMetricGoal(v, data.metric)}
          />
          <Text style={[typeScale.callout, { color: colors.text }]}>Sizning hissangiz: {fmtMetricGoal(data.progress_value, data.metric)}</Text>
          {!data.completed_at && (
            <Text style={[typeScale.callout, { color: colors.textMuted }]}>
              {teamStandingLine(
                data.team === 'A' ? data.team_a_total : data.team_b_total,
                data.team === 'A' ? data.team_b_total : data.team_a_total,
                data.metric,
              )}
            </Text>
          )}
        </Card>
      )
    }
    if (data.challenge_type === 'consistency') {
      return (
        <Card style={styles.gap}>
          <Text style={[typeScale.headline, { color: colors.text }]}>Sizning seriyangiz</Text>
          <ConsistencyDayDots
            days={data.daily_progress.map((d): DayDotState => (d.qualified ? 'filled' : d.value > 0 ? 'grace' : 'hollow'))}
            color={colors.accent}
            label={`${data.qualifying_days} / ${data.required_days ?? 0}`}
          />
          <Text style={[typeScale.callout, { color: data.completed_at ? colors.successText : colors.textMuted }]}>
            {data.failed_at
              ? 'Seriya uzildi. Keyingi bellashuvda yana urinib koʻring!'
              : data.completed_at
                ? 'Seriyani yakunladingiz!'
                : `${data.current_run} kunlik seriya · ${Math.max(0, (data.allowed_misses ?? 0) - data.misses_used)} ta imkoniyat qoldi`}
          </Text>
        </Card>
      )
    }
    if (data.challenge_type === 'sprint') {
      return (
        <Card style={styles.gap}>
          <Text style={[typeScale.headline, { color: colors.text }]}>Sizning oʻrningiz</Text>
          <Text style={[typeScale.display, tabular, { color: colors.accentText }]}>{data.rank != null ? `#${data.rank}` : '0'}</Text>
          <Text style={[typeScale.callout, { color: colors.textMuted }]}>{percentileFraming(percentile)}</Text>
          {data.winner_count != null && (
            <Text style={[typeScale.callout, { color: colors.textMuted }]}>Top {data.winner_count} gʻolib boʻladi</Text>
          )}
        </Card>
      )
    }
    if (data.completed_at) {
      return (
        <Card>
          <Text style={[typeScale.headline, { color: colors.successText }]}>Yakunladingiz!</Text>
        </Card>
      )
    }
    return (
      <Card style={styles.gap}>
        <Text style={[typeScale.headline, { color: colors.text }]}>Sizning progressingiz</Text>
        <Text style={[typeScale.title1, tabular, { color: colors.text }]}>
          {fmtMetricValue(data.progress_value, data.metric)} / {fmtMetricGoal(target, data.metric)}
        </Text>
        {fraction != null && <ProgressBar value={fraction} thickness="thick" accessibilityLabel="Bellashuvdagi taraqqiyot" />}
        <Text style={[typeScale.callout, { color: colors.textMuted }]}>
          {fraction != null ? `${Math.round(fraction * 100)}% · ` : ''}{paceHint(data)}
        </Text>
      </Card>
    )
  })()

  const header = (
    <View>
      <ChallengeHeader
        title={data.title}
        coverUrl={data.cover_image_url}
        status={statusLine(data, now)}
        participants={data.participant_count}
        onBack={back}
      />
      <View style={styles.body}>
        <Card style={styles.gap}>
          <Text style={[typeScale.headline, { color: colors.text }]}>{uzText(challengeGoalText(data))}</Text>
          <Text style={[typeScale.callout, { color: colors.textMuted }]}>{uzText(metricRuleText(data.metric))}</Text>
          {data.description ? <Text style={[typeScale.body, { color: colors.textMuted }]}>{uzText(data.description)}</Text> : null}
        </Card>

        {progressCard}

        <Card style={styles.reward}>
          <Award size={space.lg} color={colors.coin} />
          <Text style={[typeScale.callout, styles.flex, { color: colors.text }]}>
            Yakunlaganda: +{data.reward_xp} tanga{data.badge_key ? ` va «${data.badge_key}» nishoni` : ''}
          </Text>
        </Card>

        {data.challenge_type === 'team' ? (
          teamLb && (
            <Card style={styles.gap}>
              <Text style={[typeScale.headline, { color: colors.text }]}>Faol ishtirokchilar</Text>
              <View style={styles.teamCols}>
                {([['a', teamLb.team_a], ['b', teamLb.team_b]] as const).map(([key, team]) => (
                  <View key={key} style={[styles.flex, styles.gapSm]}>
                    <Text numberOfLines={1} style={[typeScale.overline, { color: colors.textMuted }]}>{uzText(team.name ?? '')}</Text>
                    {team.top.map((p, i) => (
                      <View key={p.user_id} style={styles.teamRow}>
                        <Text style={[typeScale.callout, tabular, { color: colors.textMuted }]}>#{i + 1}</Text>
                        <Text numberOfLines={1} style={[typeScale.callout, styles.flex, { color: colors.text }]}>{uzText(p.first_name)}</Text>
                        <Text style={[typeScale.callout, tabular, { color: colors.textMuted }]}>{fmtMetricValue(p.progress_value, data.metric)}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </Card>
          )
        ) : (
          <Text style={[typeScale.overline, { color: colors.textMuted }]} accessibilityRole="header">Reyting</Text>
        )}
      </View>
    </View>
  )

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <FlashList
        data={rows}
        keyExtractor={r => String(r.user_id)}
        ListHeaderComponent={header}
        ListEmptyComponent={data.challenge_type === 'team' ? null : (
          <Text style={[typeScale.callout, styles.emptyLb, { color: colors.textMuted }]}>Hali ishtirokchilar yoʻq</Text>
        )}
        renderItem={({ item }) => (
          <RankRow
            rank={item.rank}
            name={item.first_name || item.username || ''}
            photoUrl={item.photo_url}
            subtitle={item.completed_at ? 'Yakunladi' : undefined}
            value={fmtMetricGoal(item.progress_value, data.metric)}
            mine={item.user_id === myId}
            style={styles.listRow}
          />
        )}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={VIEWABILITY}
        contentContainerStyle={{ paddingBottom: space.xxl + (showAction ? layout.minTouch * 2 : insets.bottom) }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.accent} colors={[colors.accent]} />
        }
      />

      {(pinned || showAction) && (
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + space.sm }]}>
          {pinned && data.rank != null && (
            <RankRow
              rank={data.rank}
              name={me?.first_name ?? ''}
              photoUrl={me?.photo_url}
              subtitle={data.status === 'active' ? 'Sizning oʻrningiz' : undefined}
              value={fmtMetricGoal(data.progress_value, data.metric)}
              mine
            />
          )}
          {showAction && (
            !data.joined ? (
              <Button label="Qoʻshilish" size="lg" fullWidth loading={joining} onPress={join} />
            ) : (
              <Button label={metricCtaLabel(data.metric)} size="lg" fullWidth onPress={() => router.push(metricCtaRoute(data.metric) as any)} />
            )
          )}
        </View>
      )}
      <ToastHost />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: layout.gutter, paddingTop: space.lg, gap: layout.cardGap, paddingBottom: space.xs },
  gap: { gap: space.xs },
  gapSm: { gap: space.xxs },
  flex: { flex: 1 },
  reward: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  teamCols: { flexDirection: 'row', gap: space.md },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  listRow: { marginHorizontal: layout.gutter - space.xs },
  emptyLb: { paddingHorizontal: layout.gutter, paddingVertical: space.md },
  coverSkeleton: { width: '100%', aspectRatio: 16 / 9 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: layout.gutter,
    paddingTop: space.sm,
    gap: space.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})

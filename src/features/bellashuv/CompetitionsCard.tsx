/**
 * "Bellashuvlar" (Phase 7.5 D1): one card for the competitions.
 *   1. The hero — the live competition (or the next): blurred cover, sharp
 *      thumbnail, "● FAOL · 5 KUN QOLDI". Its body:
 *        live + joined   → #rank / your hours / players, the top-10 row
 *                          (never an empty bar), "Fokusni boshlash";
 *                          team competitions add the team bar;
 *        live, not joined → the goal, "Qoʻshilish", "Batafsil";
 *        next            → countdown tiles, "Eslatma qoʻyish".
 *   2. Other live/open competitions as compact rows ("BOSHQA").
 *   3. "YAKUNLANGAN": the 3 latest finished, "Barchasi (n)" expands.
 */
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Bell, BellRing, Timer, Trophy, UserPlus } from 'lucide-react-native'
import { challenges as challengesApi, type Challenge } from '../../../lib/api'
import { challengeGoalText, fmtMetricGoal } from '../../../lib/challenges'
import { TeamHeadToHeadBar } from '../../../components/study/TeamHeadToHeadBar'
import { useTheme } from '../../design/ThemeProvider'
import { iconSize, iconStroke, layout, radius, space } from '../../design/spacing'
import { fonts, tabular, type as typeScale } from '../../design/typography'
import { Button, Countdown, ListRow, Pressable, ProgressBar, showToast } from '../../components/ui'
import { uzText } from '../today/today'
import { endedChip, endedMeta, timeLeft, type MainCompetition } from './bellashuv'
import { CompetitionHero } from './CompetitionHero'
import { hasReminder, setReminder } from './competitionReminder'
import { TOP_N, topTenGap, type TopTen } from './topTen'

const CARD_RADIUS = 28
const ENDED_SHOWN = 3
const ENDED_THUMB = 52

function heroStatus(main: NonNullable<MainCompetition>, now: number): string {
  const c = main.challenge
  if (main.kind === 'live') return `Faol · ${timeLeft(c.ends_at, now)}`
  const left = timeLeft(c.starts_at, now).replace(' qoldi', '')
  return `${left}dan keyin`
}

function HeroStat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.stat, { backgroundColor: colors.surfaceRaised }]} accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={[typeScale.heroStat, tabular, { color: accent ? colors.accentText : colors.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[typeScale.small, { color: colors.textMuted }]} numberOfLines={1}>{label}</Text>
    </View>
  )
}

export function CompetitionsCard({ main, others, ended, now, joiningId, onJoin, onOpen, onFocus, onJoined }: {
  main: MainCompetition
  others: readonly Challenge[]
  ended: readonly Challenge[]
  now: number
  joiningId: string | null
  onJoin: (c: Challenge) => void
  onOpen: (c: Challenge) => void
  onFocus: () => void
  /** After "Qoʻshilish" on the hero: reload. */
  onJoined: () => void
}) {
  const { colors, deckColors, elevation } = useTheme()
  const c = main?.challenge
  const [reminded, setReminded] = useState(false)
  const [joining, setJoining] = useState(false)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (main?.kind !== 'next' || !c) return
    let alive = true
    hasReminder(c.id).then(v => { if (alive) setReminded(v) })
    return () => { alive = false }
  }, [main?.kind, c])

  // Distance to the top 10 for a live individual competition you've joined.
  const wantsTopTen = main?.kind === 'live' && !!c?.joined && c.challenge_type !== 'team'
  const [topTen, setTopTen] = useState<{ id: string; value: TopTen | null } | null>(null)
  useEffect(() => {
    if (!wantsTopTen || !c) return
    let alive = true
    challengesApi.leaderboard(c.id, TOP_N)
      .then(r => { if (alive) setTopTen({ id: c.id, value: topTenGap(r.caller, r.leaderboard) }) })
      .catch(() => { if (alive) setTopTen({ id: c.id, value: null }) })
    return () => { alive = false }
  }, [wantsTopTen, c])
  const gap = wantsTopTen && c && topTen?.id === c.id ? topTen.value : null

  const join = async () => {
    if (!c) return
    setJoining(true)
    try {
      await challengesApi.join(c.id)
      showToast('success', 'Bellashuvga qoʻshildingiz')
      onJoined()
    } catch (e) {
      showToast('error', e instanceof Error && e.message ? e.message : 'Qoʻshilib boʻlmadi. Qayta urinib koʻring.')
    } finally {
      setJoining(false)
    }
  }

  const remind = async () => {
    if (!c) return
    const ok = await setReminder(c)
    if (ok) {
      setReminded(true)
      showToast('success', 'Bellashuv boshlanganda eslatamiz')
    } else {
      showToast('error', 'Eslatma qoʻyilmadi. Bildirishnomalarga ruxsat bering.')
    }
  }

  const shownEnded = showAll ? ended : ended.slice(0, ENDED_SHOWN)

  let body: React.ReactNode = null
  if (main && c && main.kind === 'live' && c.joined) {
    body = (
      <>
        <View style={styles.stats}>
          <HeroStat value={c.rank != null ? `#${c.rank}` : '—'} label="oʻrningiz" accent />
          <HeroStat value={fmtMetricGoal(c.progress_value, c.metric)} label="hissangiz" />
          <HeroStat value={String(c.participant_count)} label="ishtirokchi" />
        </View>
        {gap && (
          <View style={styles.gapBlock}>
            <View style={styles.between}>
              {gap.kind === 'in' ? (
                <Text style={[typeScale.callout, styles.bold, { color: colors.successText }]}>Top 10 dasiz · #{gap.rank}</Text>
              ) : (
                <>
                  <Text style={[typeScale.callout, { color: colors.textMuted }]}>Top 10 gacha</Text>
                  <Text style={[typeScale.callout, tabular, styles.bold, { color: colors.text }]}>{fmtMetricGoal(gap.left, c.metric)} qoldi</Text>
                </>
              )}
            </View>
            <ProgressBar value={gap.kind === 'in' ? 1 : gap.progress} thickness="thick" accessibilityLabel="Top 10 gacha" />
          </View>
        )}
        {c.challenge_type === 'team' && c.team ? (
          <TeamHeadToHeadBar
            teamAName={c.team_a_name ?? 'Guruh A'} teamAColor={c.team_a_color ?? deckColors[0]} teamATotal={c.team_a_total}
            teamBName={c.team_b_name ?? 'Guruh B'} teamBColor={c.team_b_color ?? deckColors[4]} teamBTotal={c.team_b_total}
            fmtValue={v => fmtMetricGoal(v, c.metric)}
          />
        ) : null}
        <Button label="Fokusni boshlash" icon={Timer} size="lg" fullWidth onPress={onFocus} />
      </>
    )
  } else if (main && c && main.kind === 'live') {
    body = (
      <>
        <Text style={[typeScale.callout, { color: colors.textMuted }]} numberOfLines={2}>{uzText(challengeGoalText(c))}</Text>
        <View style={styles.row}>
          <Button label="Qoʻshilish" icon={UserPlus} size="lg" loading={joining} onPress={join} style={styles.grow} />
          <Button label="Batafsil" variant="ghost" onPress={() => onOpen(c)} />
        </View>
      </>
    )
  } else if (main && c) {
    body = (
      <>
        <Countdown target={c.starts_at} />
        <Text style={[typeScale.callout, { color: colors.textMuted }]} numberOfLines={2}>{uzText(challengeGoalText(c))}</Text>
        <View style={styles.row}>
          <Button
            label={reminded ? 'Eslatma qoʻyildi' : 'Eslatma qoʻyish'}
            icon={reminded ? BellRing : Bell}
            variant="secondary"
            disabled={reminded}
            onPress={remind}
            style={styles.grow}
          />
          <Button label="Batafsil" variant="ghost" onPress={() => onOpen(c)} />
        </View>
      </>
    )
  }

  return (
    // Shadow on the outer view; the inner one clips to the rounded corners.
    <View style={[styles.shadow, elevation]}>
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {main && c ? (
        <CompetitionHero
          title={c.title}
          coverUrl={c.cover_image_url}
          status={heroStatus(main, now)}
          live={main.kind === 'live'}
          onPressCover={() => onOpen(c)}
          flat
        >
          {body}
        </CompetitionHero>
      ) : null}

      {others.length > 0 && (
        <View style={[styles.block, main && { borderTopWidth: 1, borderTopColor: colors.border }]}>
          <Text style={[typeScale.overline, { color: colors.textMuted }]}>Boshqa</Text>
          {others.map(o => (
            <View key={o.id} style={styles.row}>
              <View style={styles.flex}>
                <ListRow
                  title={uzText(o.title)}
                  subtitle={o.status === 'upcoming' ? `Boshlanishiga ${timeLeft(o.starts_at, now).replace(' qoldi', '')}` : `${o.joined ? 'Faol' : 'Ochiq'} · ${timeLeft(o.ends_at, now)}`}
                  leading={o.cover_image_url ? { kind: 'thumbnail', uri: o.cover_image_url } : { kind: 'icon', icon: Trophy }}
                  trailing={o.joined ? { kind: 'chevron' } : undefined}
                  onPress={() => onOpen(o)}
                />
              </View>
              {!o.joined && <Button label="Qoʻshilish" size="sm" loading={joiningId === o.id} onPress={() => onJoin(o)} />}
            </View>
          ))}
        </View>
      )}

      {ended.length > 0 && (
        <View style={[styles.block, (main || others.length > 0) && { borderTopWidth: 1, borderTopColor: colors.border }]}>
          <View style={styles.between}>
            <Text style={[typeScale.overline, { color: colors.textMuted }]}>Yakunlangan</Text>
            {ended.length > ENDED_SHOWN && (
              <Pressable onPress={() => setShowAll(v => !v)} hitSlop={space.xs} accessibilityState={{ expanded: showAll }}>
                <Text style={[typeScale.callout, styles.bold, { color: colors.accentText }]}>
                  {showAll ? 'Kamroq' : `Barchasi (${ended.length})`}
                </Text>
              </Pressable>
            )}
          </View>
          {shownEnded.map(e => {
            const chip = endedChip(e)
            return (
              <Pressable key={e.id} onPress={() => onOpen(e)} accessibilityLabel={`${uzText(e.title)}, ${endedMeta(e)}${chip ? `, ${chip.label}` : ''}`} style={styles.endedRow}>
                <View style={[styles.thumb, { backgroundColor: colors.surfaceRaised }]}>
                  {e.cover_image_url
                    ? <Image source={{ uri: e.cover_image_url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
                    : <Trophy size={iconSize.sm} color={colors.textMuted} strokeWidth={iconStroke} />}
                </View>
                <View style={styles.flex}>
                  <Text style={[typeScale.rowTitle, { color: colors.text }]} numberOfLines={1}>{uzText(e.title)}</Text>
                  <Text style={[typeScale.small, { color: colors.textMuted }]} numberOfLines={1}>{endedMeta(e)}</Text>
                </View>
                {chip && (
                  <View style={[styles.chip, { backgroundColor: chip.gold ? colors.goldChip : colors.surfaceRaised }]}>
                    <Text style={[typeScale.callout, tabular, styles.heavy, { color: chip.gold ? colors.goldChipText : colors.textMuted }]}>{chip.label}</Text>
                  </View>
                )}
              </Pressable>
            )
          })}
        </View>
      )}
    </View>
    </View>
  )
}

const styles = StyleSheet.create({
  shadow: { borderRadius: CARD_RADIUS },
  card: { borderRadius: CARD_RADIUS, borderWidth: 1, overflow: 'hidden' },
  stats: { flexDirection: 'row', gap: space.xs },
  stat: { flex: 1, borderRadius: radius.md, paddingVertical: space.sm - 2, paddingHorizontal: space.sm, gap: 2 },
  gapBlock: { gap: space.xs },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs, minHeight: layout.minTouch - space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  grow: { flex: 1, alignSelf: 'auto' },
  flex: { flex: 1, minWidth: 0 },
  bold: { fontFamily: fonts.bold },
  heavy: { fontFamily: fonts.extrabold },
  block: { paddingHorizontal: space.md, paddingTop: space.sm + 2, paddingBottom: space.xs, gap: space.xxs },
  endedRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm - 2 },
  thumb: { width: ENDED_THUMB, height: ENDED_THUMB, borderRadius: radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  chip: { borderRadius: radius.full, paddingHorizontal: space.sm - 2, paddingVertical: space.xxs + 1 },
})

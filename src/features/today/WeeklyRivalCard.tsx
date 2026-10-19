/**
 * "Haftalik reyting" on Bugun (Phase 7.5 C4): the top three avatars, how
 * many people play this week and the days left until the reset; the rival
 * ladder (above you / you / below you); and a footer — the XP to pass the
 * person above and the focus minutes that earns it (real XP rules) —
 * that opens Fokus with the timer preset.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import type { LeaderboardEntry } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { iconSize, iconStroke, radius, space } from '../../design/spacing'
import { fonts, tabular, type as typeScale } from '../../design/typography'
import { Avatar, Card, Pressable, SectionTitle } from '../../components/ui'
import { groupDigits } from '../courses/courses'
import { RivalLadder } from './RivalLadder'
import { TrophyIcon } from './TrophyIcon'
import { gapAbove } from './ladder'
import { daysToWeeklyReset, focusMinutesForXp, ladderFor } from './rivals'
import { uzText } from './today'

const STACK = 34
const STACK_OVERLAP = -10
const STACK_BORDER = 2.5
const TOP_N = 3
/** The weekly list holds at most this many rows. */
const LIST_MAX = 100

export function WeeklyRivalCard({ entries, around, myRank, total, todayMinutes, now, onAll, onFocus }: {
  entries: readonly LeaderboardEntry[]
  around?: readonly LeaderboardEntry[]
  myRank: number | null
  /** People with XP this week (newer backends). */
  total?: number | null
  todayMinutes: number
  now: number
  onAll: () => void
  /** Open Fokus, preset to this many minutes. */
  onFocus: (minutes?: number) => void
}) {
  const { colors } = useTheme()
  const top = [...entries].sort((a, b) => a.rank - b.rank).slice(0, TOP_N)
  const people = total ?? entries.length
  const peopleText = total == null && entries.length >= LIST_MAX ? `${LIST_MAX}+ kishi bu hafta` : `${groupDigits(people)} kishi bu hafta`
  const more = Math.max(0, people - top.length)
  const days = daysToWeeklyReset(now)

  const ladder = ladderFor(entries, around, myRank)
  const rows = ladder.map(e => ({
    id: e.telegram_id, name: e.first_name || e.username || '', photoUrl: e.photo_url, rank: e.rank, xp: e.score, isMe: e.is_me,
  }))
  const gap = gapAbove(ladder)
  const me = ladder.find(e => e.is_me)
  const second = me && me.rank === 1 ? ladder.find(e => !e.is_me) : undefined
  const minutes = gap ? focusMinutesForXp(gap.xp, todayMinutes) : undefined

  if (entries.length === 0 && rows.length === 0) return null

  const footer = (
    <Pressable onPress={() => onFocus(minutes)} accessibilityRole="button" style={styles.footerPress}
      accessibilityLabel={gap ? `${gap.xp} XP, ${gap.name.first_name}ni quvib oʻtasiz. Taxminan ${minutes} daqiqa fokus` : 'Fokusni boshlash'}
    >
      <TrophyIcon />
      <Text style={[typeScale.label, styles.flex, { color: colors.text }]}>
        {gap ? (
          <>
            <Text style={styles.heavy}>{groupDigits(gap.xp)} XP</Text> — {uzText(gap.name.first_name || 'U')}ni quvib oʻtasiz.{'\n'}
            <Text style={[typeScale.callout, { color: colors.textMuted }]}>Taxminan {minutes} daqiqa fokus</Text>
          </>
        ) : second ? (
          <>
            <Text style={styles.heavy}>Birinchi oʻrindasiz</Text> — {uzText(second.first_name || 'U')} {groupDigits(Math.max(0, (me?.score ?? 0) - second.score))} XP orqada
          </>
        ) : (
          'Fokus qilib reytingga kiring'
        )}
      </Text>
      <ChevronRight size={iconSize.sm - 2} color={colors.textMuted} strokeWidth={iconStroke + 0.2} />
    </Pressable>
  )

  return (
    <View style={styles.section}>
      <SectionTitle title="Haftalik reyting" link={{ label: 'Hammasi', onPress: onAll }} />
      <Card style={styles.card}>
        <View style={styles.head}>
          <View style={styles.stack} accessible accessibilityLabel={`Top ${top.length}: ${top.map(t => t.first_name).join(', ')}`}>
            {top.map((e, i) => (
              <View key={e.telegram_id} style={[styles.stackItem, i > 0 && styles.overlap, { borderColor: colors.surface }]}>
                <Avatar name={e.first_name || '?'} id={e.telegram_id} uri={e.photo_url} diameter={STACK - STACK_BORDER * 2} />
              </View>
            ))}
            {more > 0 && (
              <View style={[styles.stackItem, styles.overlap, { borderColor: colors.surface, backgroundColor: colors.surfaceRaised }]}>
                <Text style={[typeScale.overline, tabular, styles.moreText, { color: colors.textMuted }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1}>+{more > 999 ? '999' : more}</Text>
              </View>
            )}
          </View>
          <Text style={[typeScale.callout, styles.flex, { color: colors.textMuted }]} numberOfLines={2}>{peopleText}</Text>
          <View style={[styles.pill, { backgroundColor: colors.surfaceRaised }]}>
            <Text style={[typeScale.small, tabular, styles.bold, { color: colors.textMuted }]}>{days} kun qoldi</Text>
          </View>
        </View>

        {rows.length > 0 ? <RivalLadder rows={rows} footer={footer} /> : (
          <View style={[styles.soloFooter, { backgroundColor: colors.surfaceRaised }]}>{footer}</View>
        )}
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  card: { gap: space.sm + 2, borderRadius: radius.xl },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stack: { flexDirection: 'row' },
  stackItem: { width: STACK, height: STACK, borderRadius: radius.full, borderWidth: STACK_BORDER, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  overlap: { marginLeft: STACK_OVERLAP },
  moreText: { letterSpacing: 0, textTransform: 'none' },
  flex: { flex: 1 },
  pill: { borderRadius: radius.full, paddingHorizontal: space.xs + 1, paddingVertical: space.xxs + 1 },
  bold: { fontFamily: fonts.bold },
  heavy: { fontFamily: fonts.extrabold },
  footerPress: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  soloFooter: { borderRadius: radius.md + 2, paddingVertical: space.sm, paddingHorizontal: space.sm + 2 },
})

/**
 * PlanTile — one "Bugungi reja" card (plan redesign). Same anatomy and size
 * for every task, top to bottom:
 *   1. identity: tinted 32 px icon tile + uppercase type label; status slot
 *      on the right (done ✓ · new dot · the next card's play button)
 *   2. metric: one number + unit ("25 daq", "2/5 toʻgʻri", "93 kishi")
 *   3. caption: what it is, one line
 *   4. signal (bar / segments / week bars, pinned to the bottom) + meta line
 * The one "next" card: solid orange with white content in dark mode;
 * bright orange with near-black content in light mode (planNext). No
 * decorative backgrounds. Light: soft shadow; dark: none.
 *
 * PlanReviewWide is Tahlil's full-width layout (below an even grid).
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { ChartColumn, Check, ChevronRight, CircleHelp, GraduationCap, Layers, Play, Timer, Trophy, type LucideIcon } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { planReviewSoftBar, planTypeColors, type PlanType } from '../../design/tokens'
import { fonts } from '../../design/typography'
import { Pressable } from '../../components/ui'
import { WEEKDAYS_SHORT, peakDay, type PlanCard, type PlanSignal } from './planCards'

export const PLAN_CARD_HEIGHT = 172
const RADIUS = 22
const PAD = 14
const TILE = 32
const TILE_RADIUS = 10
const PLAY = 32
const CHECK = 22
const DOT = 8
const BAR_H = 6
const BAR_R = 3
const SEG_GAP = 4
const SIGNAL_H = 16
/** Big text may grow with the system font size, but not past this. */
const MAX_SCALE = 1.3

const ICONS: Record<PlanType, LucideIcon> = {
  cards: Layers, focus: Timer, quiz: CircleHelp, course: GraduationCap, competition: Trophy, review: ChartColumn,
}

interface Ink { label: string; text: string; muted: string; fill: string; track: string; tile: string; icon: string }

function useInk(type: PlanType, next: boolean): Ink {
  const { colors, scheme, planNext } = useTheme()
  const t = planTypeColors[scheme][type]
  if (next) {
    const n = planNext
    return { label: n.ink, text: n.ink, muted: n.ink, fill: n.fill, track: n.track, tile: n.tile, icon: n.ink }
  }
  return { label: t.ink, text: colors.text, muted: colors.textMuted, fill: t.fill, track: colors.track, tile: t.tile, icon: t.ink }
}

function Bar({ value, ink }: { value: number; ink: Ink }) {
  return (
    <View style={[styles.bar, { backgroundColor: ink.track }]}>
      <View style={[styles.barFill, { width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, backgroundColor: ink.fill }]} />
    </View>
  )
}

function Segments({ total, filled, ink }: { total: number; filled: number; ink: Ink }) {
  return (
    <View style={styles.segments}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.segment, { backgroundColor: i < filled ? ink.fill : ink.track }]} />
      ))}
    </View>
  )
}

function WeekBars({ minutes, height, gap, ink, soft }: { minutes: number[]; height: number; gap: number; ink: Ink; soft: string }) {
  const max = Math.max(1, ...minutes)
  const peak = peakDay(minutes)
  return (
    <View style={[styles.week, { height, gap }]}>
      {minutes.map((m, i) => (
        <View key={i} style={styles.weekCol}>
          <View
            style={{
              height: Math.max(BAR_H / 2, Math.round((m / max) * height)),
              borderRadius: BAR_R,
              backgroundColor: m === 0 ? ink.track : i === peak ? ink.fill : soft,
            }}
          />
        </View>
      ))}
    </View>
  )
}

function Signal({ signal, ink, soft }: { signal: PlanSignal; ink: Ink; soft: string }) {
  if (signal.kind === 'bar') return <Bar value={signal.value} ink={ink} />
  if (signal.kind === 'segments') return <Segments total={signal.total} filled={signal.filled} ink={ink} />
  return <WeekBars minutes={signal.minutes} height={SIGNAL_H} gap={3} ink={ink} soft={soft} />
}

function StatusSlot({ card, ink, onPress }: { card: PlanCard; ink: Ink; onPress: () => void }) {
  const { colors, planNext } = useTheme()
  if (card.status === 'next') {
    const n = planNext
    return (
      <Pressable onPress={onPress} accessibilityLabel="Boshlash" hitSlop={6} style={[styles.play, { backgroundColor: n.playBg }]}>
        <Play size={14} color={n.playIcon} fill={n.playIcon} strokeWidth={2} />
      </Pressable>
    )
  }
  if (card.status === 'done') {
    return (
      <View style={[styles.check, { backgroundColor: colors.green }]} accessible accessibilityLabel="Bajarildi">
        <Check size={13} color="#FFFFFF" strokeWidth={3.2} />
      </View>
    )
  }
  if (card.status === 'new') {
    return <View style={[styles.dot, { backgroundColor: ink.fill }]} accessible accessibilityLabel="Yangi" />
  }
  return null
}

function Identity({ card, ink, onPress }: { card: PlanCard; ink: Ink; onPress: () => void }) {
  const Icon = ICONS[card.type]
  return (
    <View style={styles.identity}>
      <View style={[styles.tile, { backgroundColor: ink.tile }]}>
        <Icon size={18} color={ink.icon} strokeWidth={2.2} />
      </View>
      <Text style={[styles.label, { color: ink.label }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>
        {card.label}
      </Text>
      <View style={styles.flex} />
      <StatusSlot card={card} ink={ink} onPress={onPress} />
    </View>
  )
}

function Metric({ card, ink }: { card: PlanCard; ink: Ink }) {
  return (
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} maxFontSizeMultiplier={MAX_SCALE}>
      <Text style={[styles.metric, { color: ink.text }]}>{card.metric}</Text>
      <Text style={[styles.unit, { color: ink.muted }]}>{` ${card.unit}`}</Text>
    </Text>
  )
}

export function PlanTile({ card, onPress }: { card: PlanCard; onPress: () => void }) {
  const { colors, scheme, elevation, planNext } = useTheme()
  const ink = useInk(card.type, card.next)
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={card.a11y}
      style={[
        styles.card,
        card.next
          ? { backgroundColor: planNext.bg, borderColor: planNext.border }
          : { backgroundColor: colors.surface, borderColor: colors.border },
        elevation,
      ]}
    >
      <Identity card={card} ink={ink} onPress={onPress} />
      <View style={styles.body}>
        <Metric card={card} ink={ink} />
        <Text style={[styles.caption, { color: ink.text }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{card.caption}</Text>
      </View>
      <View style={styles.flex} />
      <View style={styles.signal} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Signal signal={card.signal} ink={ink} soft={planReviewSoftBar[scheme]} />
      </View>
      <Text style={[styles.meta, { color: ink.muted }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{card.meta}</Text>
    </Pressable>
  )
}

/** Tahlil at full width: tile + label over the title, chevron; then the
 *  week's total on the left and a 7-bar chart with day labels on the right. */
export function PlanReviewWide({ card, onPress }: { card: PlanCard; onPress: () => void }) {
  const { colors, scheme, elevation } = useTheme()
  const ink = useInk('review', false)
  const minutes = card.signal.kind === 'week' ? card.signal.minutes : []
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={card.a11y}
      accessibilityRole="link"
      style={[styles.wide, { backgroundColor: colors.surface, borderColor: colors.border }, elevation]}
    >
      <View style={styles.wideTop}>
        <View style={[styles.wideTile, { backgroundColor: ink.tile }]}>
          <ChartColumn size={22} color={ink.icon} strokeWidth={2.2} />
        </View>
        <View style={styles.flex}>
          <View style={styles.wideLabelRow}>
            <Text style={[styles.label, { color: ink.label }]} maxFontSizeMultiplier={MAX_SCALE}>{card.label}</Text>
            {card.status === 'new' && <View style={[styles.dot, { backgroundColor: ink.fill }]} accessibilityLabel="Yangi" />}
          </View>
          <Text style={[styles.wideTitle, { color: colors.text }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{card.caption}</Text>
        </View>
        <ChevronRight size={20} color={colors.textMuted} strokeWidth={2.2} />
      </View>
      <View style={styles.wideBottom}>
        <View style={styles.flex}>
          <Metric card={card} ink={ink} />
          <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{card.meta}</Text>
        </View>
        <View style={styles.chart} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <WeekBars minutes={minutes} height={40} gap={6} ink={ink} soft={planReviewSoftBar[scheme]} />
          <View style={styles.dayRow}>
            {WEEKDAYS_SHORT.map(d => (
              <Text key={d} style={[styles.day, { color: colors.textMuted }]} maxFontSizeMultiplier={1.1}>{d}</Text>
            ))}
          </View>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { height: PLAN_CARD_HEIGHT, borderRadius: RADIUS, borderWidth: 1, padding: PAD },
  flex: { flex: 1 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: PLAY },
  tile: { width: TILE, height: TILE, borderRadius: TILE_RADIUS, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.extrabold, fontSize: 11, lineHeight: 14, letterSpacing: 0.77, textTransform: 'uppercase', flexShrink: 1 },
  play: { width: PLAY, height: PLAY, borderRadius: PLAY / 2, alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
  check: { width: CHECK, height: CHECK, borderRadius: CHECK / 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
  body: { marginTop: 12, gap: 4 },
  metric: { fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 28, letterSpacing: -0.4 },
  unit: { fontFamily: fonts.bold, fontSize: 13 },
  caption: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 17 },
  signal: { height: SIGNAL_H, justifyContent: 'center' },
  bar: { height: BAR_H, borderRadius: BAR_R, overflow: 'hidden' },
  barFill: { height: BAR_H, borderRadius: BAR_R },
  segments: { flexDirection: 'row', gap: SEG_GAP },
  segment: { flex: 1, height: BAR_H, borderRadius: BAR_R },
  week: { flexDirection: 'row', alignItems: 'flex-end' },
  weekCol: { flex: 1, justifyContent: 'flex-end' },
  meta: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, marginTop: 4 },
  wide: { borderRadius: RADIUS, borderWidth: 1, padding: PAD, gap: 14 },
  wideTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wideTile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  wideLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wideTitle: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  wideBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  chart: { width: 176, gap: 4 },
  dayRow: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, textAlign: 'center', fontFamily: fonts.bold, fontSize: 10, lineHeight: 12 },
})

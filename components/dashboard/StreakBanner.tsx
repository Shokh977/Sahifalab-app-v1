/**
 * StreakBanner — redesigned per sahifalab-tree-mockup.
 *
 * Layout: flame + streak count (left) | animated tree (right)
 * Bottom: daily progress bar with percentage
 * States: done (green) | progress (orange) | at_risk (icy blue) | start (neutral)
 */
import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native'
import { useRouter } from 'expo-router'
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Path } from 'react-native-svg'
import { TreeStage, treeStageFromStreak } from '../ui/TreeStage'
import type { TreeHealth } from '../ui/TreeStage'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import type { FocusStats } from '../../lib/api'

// ── Flame SVG ─────────────────────────────────────────────────────────────────
function FlameIcon({ size = 22, frost = false }: { size?: number; frost?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <SvgGradient id="fg" x1="0%" y1="100%" x2="0%" y2="0%">
          <Stop offset="0%" stopColor={frost ? '#5A9AB5' : '#FF8A00'} />
          <Stop offset="100%" stopColor={frost ? '#9BC4D8' : '#FF5E00'} />
        </SvgGradient>
      </Defs>
      <Path
        d="M12 2C10.5 6 7 8 7 12.5C7 15.5 9.5 18 12 19C14.5 18 17 15.5 17 12.5C17 8 13.5 6 12 2Z"
        fill="url(#fg)"
      />
      <Path
        d="M12 9C11.2 11 10 12 10 13.8C10 15.2 11 16.5 12 17C13 16.5 14 15.2 14 13.8C14 12 12.8 11 12 9Z"
        fill={frost ? '#B0D4E8' : '#FFD700'}
        opacity={0.7}
      />
    </Svg>
  )
}

// ── State helpers ─────────────────────────────────────────────────────────────
type BannerState = 'done' | 'progress' | 'at_risk' | 'start'

function getBannerState(stats: FocusStats, goalDone: boolean): BannerState {
  if (goalDone) return 'done'
  const last = stats.last_study_at ? new Date(stats.last_study_at) : null
  if (!last) return 'start'
  const diffDays = Math.floor((Date.now() - last.getTime()) / 86_400_000)
  if (diffDays >= 2 && stats.streak_days > 0) return 'at_risk'
  return 'progress'
}

const PROGRESS_MSGS = [
  "Har bir daqiqa seni maqsadga yaqinlashtiradi.",
  "Izchillik — muvaffaqiyatning kaliti.",
  "Kichik qadamlar — katta natijalarga olib boradi.",
  "Sen buni uddalay olasan!",
  "Bugun o'qigan narsa — ertangi kuchingiz.",
]
const DONE_MSGS = [
  "Bugun g'olib siz! Davom eting 🏆",
  "Zo'r! Seriyangiz kuchayib bormoqda.",
  "Maqsad bajarildi — bu g'alaba!",
  "Har kun shunday davom etsangiz — muvaffaqiyat muqarrar.",
]
const msg = (pool: string[], seed: number) => pool[seed % pool.length]

function getMilestoneHint(streak: number): string {
  if (streak === 0) return 'Yangi urug\' eking — bugun boshlang 🌱'
  if (streak === 1) return 'Birinchi qadam tashlandi! 🌱'
  if (streak < 7)   return `Yana ${7 - streak} kun — haftalik marra!`
  if (streak < 30)  return `Yana ${30 - streak} kun — oylik marra!`
  if (streak < 100) return `Top 5% o'quvchidasiz 🌟`
  return `Top 2% o'quvchidasiz 🏆`
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  stats:    FocusStats
  goalDone: boolean
}

export function StreakBanner({ stats, goalDone }: Props) {
  const { c, theme } = useTheme()
  const isDark = theme === 'dark'
  const router = useRouter()

  const state     = getBannerState(stats, goalDone)
  const seed      = stats.streak_days + new Date().getDate()
  const frost     = state === 'at_risk'
  const pct       = stats.daily_goal > 0
    ? Math.min(100, Math.round((stats.today_minutes / stats.daily_goal) * 100))
    : 0

  const stage    = treeStageFromStreak(stats.streak_days)
  const health: TreeHealth = state === 'done' ? 'healthy' : frost ? 'frost' : state === 'start' ? 'healthy' : 'healthy'

  // ── Animated progress bar ─────────────────────────────────────────────────
  const barAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(barAnim, {
      toValue:         pct / 100,
      duration:        800,
      delay:           200,
      useNativeDriver: false,
    }).start()
  }, [pct])

  // ── Dynamic text ──────────────────────────────────────────────────────────
  let message: string
  if (state === 'done') {
    message = msg(DONE_MSGS, seed)
  } else if (state === 'at_risk') {
    message = stats.freeze_count > 0
      ? `Daraxtingiz sovuqqa chidolmaydi ❄️ (${stats.freeze_count} freeze bor)`
      : 'Daraxtingiz sovuqqa chidolmaydi ❄️'
  } else if (state === 'start') {
    message = getMilestoneHint(stats.streak_days)
  } else {
    // progress — show milestone hint if no minutes yet, else motivation
    message = stats.today_minutes > 0
      ? msg(PROGRESS_MSGS, seed)
      : getMilestoneHint(stats.streak_days)
  }

  // ── Colors per state ─────────────────────────────────────────────────────
  const FROST_ACCENT  = '#7FB8D8'
  const streakNumColor = frost ? FROST_ACCENT : c.accentPrimary
  const barColor = state === 'done'
    ? c.success
    : frost
    ? FROST_ACCENT
    : c.accentPrimary

  const borderColor = state === 'done'
    ? 'rgba(52,199,89,0.35)'
    : frost
    ? 'rgba(100,160,220,0.4)'
    : c.border

  // ── Bar width interpolation ──────────────────────────────────────────────
  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })

  return (
    <Pressable
      onPress={() => router.push('/(screens)/streak-detail' as any)}
      style={({ pressed }) => [
        styles.banner,
        { borderColor, opacity: pressed ? 0.88 : 1 },
        isDark
          ? frost
            ? { backgroundColor: 'rgba(100,140,180,0.12)' }
            : state === 'done'
            ? { backgroundColor: 'rgba(52,199,89,0.08)' }
            : { backgroundColor: c.bgSecondary }
          : frost
          ? { backgroundColor: 'rgba(100,160,220,0.08)' }
          : state === 'done'
          ? { backgroundColor: 'rgba(52,199,89,0.06)' }
          : { backgroundColor: c.bgSecondary },
      ]}
    >
      {/* ── Left: flame + streak number + message ─────────────────────────── */}
      <View style={styles.left}>
        {/* Flame + count row */}
        <View style={styles.countRow}>
          <FlameIcon size={22} frost={frost} />
          <Text style={[
            styles.streakNum,
            { color: streakNumColor, fontFamily: typography.fontFamily.extrabold },
          ]}>
            {stats.streak_days}
          </Text>
          <Text style={[styles.streakLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            kunlik seriya
          </Text>
        </View>

        {/* Message */}
        <Text
          style={[styles.message, { color: frost ? FROST_ACCENT : c.textSecondary, fontFamily: typography.fontFamily.regular }]}
          numberOfLines={2}
        >
          {message}
        </Text>
      </View>

      {/* ── Right: tree ───────────────────────────────────────────────────── */}
      <TreeStage stage={stage} health={health} size={85} />

      {/* ── Bottom: progress bar spanning full width ─────────────────────── */}
      <View style={styles.barWrap}>
        <View style={styles.barMeta}>
          <Text style={[styles.barLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Bugun: {stats.today_minutes} / {stats.daily_goal} daq
          </Text>
          <Text style={[styles.barPct, { color: state === 'done' ? c.success : frost ? FROST_ACCENT : c.textSecondary, fontFamily: typography.fontFamily.semibold }]}>
            {pct}%
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: c.bgTertiary }]}>
          <Animated.View style={[styles.fill, { width: barWidth, backgroundColor: barColor }]} />
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: spacing.base,
    marginTop:        spacing.sm,
    borderRadius:     20,
    borderWidth:      1,
    paddingHorizontal: spacing.base,
    paddingTop:       spacing.base,
    paddingBottom:    spacing.sm,
    flexDirection:    'row',
    flexWrap:         'wrap',
    alignItems:       'flex-start',
    gap:              0,
    overflow:         'hidden',
    position:         'relative',
  },
  left: {
    flex:    1,
    gap:     spacing.xs,
    paddingRight: spacing.sm,
    paddingBottom: spacing.sm,
  },
  countRow: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    gap:           6,
  },
  streakNum: {
    fontSize:   30,
    lineHeight: 34,
  },
  streakLabel: {
    fontSize:    13,
    lineHeight:  20,
    marginBottom: 2,
  },
  message: {
    fontSize:   12,
    lineHeight: 17,
    maxWidth:   200,
  },

  // Bar — full width below the left+right columns
  barWrap: {
    width:     '100%',
    gap:       5,
    marginTop: 4,
  },
  barMeta: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  barLabel: {
    fontSize: 11,
  },
  barPct: {
    fontSize: 11,
  },
  track: {
    width:        '100%',
    height:       4,
    borderRadius: 2,
    overflow:     'hidden',
  },
  fill: {
    height:       4,
    borderRadius: 2,
  },
})

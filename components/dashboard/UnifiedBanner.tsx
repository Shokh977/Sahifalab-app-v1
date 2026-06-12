/**
 * UnifiedBanner — single premium card merging streak hero + tree + level/XP.
 * Streak is the visual hero (daily urgency). Level is compact at the bottom.
 * Background gradient + border shift based on session state.
 */
import React, { useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, Pressable, Animated, Easing,
} from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronRight } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius, getLevelTier } from '../../lib/constants'
import { MagicTree } from '../streak/MagicTree'
import { stageFromStreak } from '../../lib/treeTheme'
import type { TreeState } from '../../lib/treeTheme'
import type { FocusStats } from '../../lib/api'

// ── XP helpers ────────────────────────────────────────────────────────────────
function nextLevelXP(level: number): number {
  return Math.round(100 * Math.pow(level + 1, 2.5))
}

// ── Tier config ───────────────────────────────────────────────────────────────
const TIER_EMOJI: Record<string, string> = {
  Bronze: '🥉', Silver: '🥈', Gold: '🥇',
  Platinum: '🏅', Diamond: '💎', Legend: '⭐',
}

// ── State type ────────────────────────────────────────────────────────────────
type BannerState = 'done' | 'atRisk' | 'normal' | 'lost'

function getBannerState(stats: FocusStats, goalDone: boolean): BannerState {
  if (goalDone) return 'done'
  const streak = stats.streak_days ?? 0
  if (streak === 0) return 'lost'
  const hour = new Date().getHours()
  if (hour >= 20) return 'atRisk'
  return 'normal'
}

// ── Contextual message ────────────────────────────────────────────────────────
function getMessage(stats: FocusStats, state: BannerState): { text: string; colorKey: 'success' | 'accent' | 'frost' | 'secondary' } {
  if (state === 'done')   return { text: "Bugun bajarildi ✓ Davom eting!", colorKey: 'success' }
  if (state === 'atRisk') return { text: "Daraxtingiz sovuqqa bardosh berolmaydi ❄️", colorKey: 'frost' }

  const s = stats.streak_days ?? 0

  if (s === 0) return { text: "Birinchi qadamni tashlang 🌱", colorKey: 'secondary' }
  if (s === 1) return { text: "Birinchi kun! Urug' unib chiqdi 🌱", colorKey: 'secondary' }
  if (s === 2) return { text: "Ikkinchi kun — ildiz otmoqda!", colorKey: 'secondary' }
  if (s < 7)   return { text: `Yana ${7 - s} kun — haftalik marra! 💪`, colorKey: 'accent' }
  if (s === 7) return { text: "Bir hafta! Yangi bosqich ochildi 🎉", colorKey: 'success' }
  if (s < 14)  return { text: "Daraxt o'sib bormoqda 🌿", colorKey: 'secondary' }
  if (s < 30)  return { text: `Oylik marraga ${30 - s} kun! 🌳`, colorKey: 'accent' }
  if (s < 60)  return { text: "Bir oylik o'quvchi — top 5% 🏆", colorKey: 'accent' }
  if (s < 100) return { text: `Legendar marraga ${100 - s} kun 🎖️`, colorKey: 'accent' }
  return { text: "Legendar o'quvchi 💎", colorKey: 'accent' }
}

// ── Frost particle ────────────────────────────────────────────────────────────
function FrostParticle({ x, delay }: { x: number; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [])

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 80] })
  const opacity    = anim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.5, 0.4, 0] })

  return (
    <Animated.View style={[styles.frostDot, { left: x, opacity, transform: [{ translateY }] }]} />
  )
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  stats:   FocusStats
  level:   number
  totalXP: number
}

export function UnifiedBanner({ stats, level, totalXP }: Props) {
  const { c } = useTheme()
  const router = useRouter()

  const streak  = stats.streak_days  ?? 0
  const todayM  = stats.today_minutes ?? 0
  const goalM   = stats.daily_goal    > 0 ? stats.daily_goal : 20
  const goalDone = todayM >= goalM

  const bannerState = getBannerState(stats, goalDone)
  const { text: msgText, colorKey: msgColorKey } = getMessage(stats, bannerState)

  const isAtRisk  = bannerState === 'atRisk'
  const isLost    = bannerState === 'lost'
  const isDone    = bannerState === 'done'

  // Tree + stage
  const stage        = stageFromStreak(streak)
  const treeState: TreeState = isAtRisk ? 'frozen' : isLost ? 'dead' : 'alive'

  // Daily goal progress
  const goalPct = goalM > 0 ? Math.min(1, todayM / goalM) : 0

  // Level — use absolute threshold to match profile screen
  const tier     = getLevelTier(level)
  const xpTarget = nextLevelXP(level)
  const xpPct    = xpTarget > 0 ? Math.min(1, totalXP / xpTarget) : 0

  // ── Animations ───────────────────────────────────────────────────────────
  const goalBarAnim = useRef(new Animated.Value(0)).current
  const xpBarAnim   = useRef(new Animated.Value(0)).current
  const shimmerAnim = useRef(new Animated.Value(-30)).current

  useEffect(() => {
    Animated.timing(goalBarAnim, { toValue: goalPct, duration: 600, delay: 200, easing: Easing.out(Easing.quad), useNativeDriver: false }).start()
  }, [goalPct])

  useEffect(() => {
    Animated.timing(xpBarAnim, { toValue: xpPct, duration: 600, delay: 200, easing: Easing.out(Easing.quad), useNativeDriver: false }).start()
  }, [xpPct])

  // Shimmer when goal done
  useEffect(() => {
    if (!isDone) { shimmerAnim.setValue(-30); return }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 400, duration: 1200, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(2800),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [isDone])

  // ── Color derivations ─────────────────────────────────────────────────────
  const FROST = '#7FB8D8'
  const FROST_BORDER = 'rgba(77,166,255,0.25)'
  const DONE_BORDER  = `${c.success}40`

  const borderColor = isDone ? DONE_BORDER : isAtRisk ? FROST_BORDER : c.border

  const streakNumColor = isDone  ? c.success
                       : isAtRisk ? FROST
                       : isLost   ? c.textDisabled
                       : c.accentPrimary

  const msgColor = msgColorKey === 'success'   ? c.success
                 : msgColorKey === 'accent'    ? c.accentPrimary
                 : msgColorKey === 'frost'     ? FROST
                 : c.textSecondary

  // Progress bar colors
  const barGradient: [string, string] = isDone  ? [c.success, c.success]
                                      : isAtRisk ? [FROST, '#5A9AB5']
                                      : [c.accentPrimary, '#FFD700']

  // Progress unfilled masks
  const goalUnfilled = goalBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['100%', '0%'] })
  const xpUnfilled   = xpBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['100%', '0%'] })

  // Background state gradient
  const stateGradColors: [string, string] = isDone
    ? ['rgba(52,199,89,0.10)',  'transparent']
    : isAtRisk
    ? ['rgba(90,154,181,0.12)', 'transparent']
    : isLost
    ? ['transparent',           'transparent']
    : ['rgba(245,166,35,0.08)', 'transparent']

  return (
    <Pressable
      onPress={() => router.push('/(screens)/streak-detail' as any)}
      style={({ pressed }) => [styles.wrapper, { opacity: pressed ? 0.93 : 1 }]}
    >
      <View style={[styles.card, { backgroundColor: c.bgSecondary, borderColor }]}>

        {/* State gradient overlay */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <LinearGradient
            colors={stateGradColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          />
        </View>

        {/* Frost particles */}
        {isAtRisk && (
          <>
            <FrostParticle x={30}  delay={0}    />
            <FrostParticle x={80}  delay={1200} />
            <FrostParticle x={140} delay={600}  />
          </>
        )}

        {/* ── Main content ───────────────────────────────────────────────── */}
        <View style={styles.content}>

          {/* Row 1 + 2 + 3 (left) alongside tree (right) */}
          <View style={styles.topSection}>

            {/* Left column */}
            <View style={styles.leftCol}>
              {/* Row 1: flame + streak number + label */}
              <View style={styles.streakRow}>
                <Text style={[styles.flame, { opacity: isLost ? 0.4 : 1 }]}>🔥</Text>
                <Text style={[styles.streakNum, { color: streakNumColor, fontFamily: typography.fontFamily.extrabold }]}>
                  {streak}
                </Text>
                <Text style={[styles.streakLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                  {streak === 0 ? 'Yangi boshlanish' : 'kunlik seriya'}
                </Text>
              </View>

              {/* Row 2: contextual message */}
              <Text
                style={[styles.message, { color: msgColor, fontFamily: typography.fontFamily.medium }]}
                numberOfLines={1}
              >
                {msgText}
              </Text>

              {/* Row 3: daily goal progress */}
              <View style={styles.progressSection}>
                <View style={styles.progressMeta}>
                  <Text style={[styles.progressLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                    {goalDone ? 'Bugungi maqsad ✓' : `Bugun: ${todayM}/${goalM} daq`}
                  </Text>
                  <Text style={[styles.progressPct, {
                    color: isDone ? c.success : isAtRisk ? FROST : c.accentPrimary,
                    fontFamily: typography.fontFamily.semibold,
                  }]}>
                    {Math.min(100, Math.round(goalPct * 100))}%
                  </Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: c.bgTertiary }]}>
                  <LinearGradient
                    colors={barGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <Animated.View style={[styles.barUnfilled, { width: goalUnfilled, backgroundColor: c.bgTertiary }]} />
                  {isDone && (
                    <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerAnim }] }]} />
                  )}
                </View>
              </View>
            </View>

            {/* Right: tree — MagicTree handles sway internally now */}
            <View style={styles.treeWrap}>
              <MagicTree stage={stage} state={treeState} size="thumb" uid="ub" />
            </View>
          </View>

          {/* Separator */}
          <View style={[styles.sep, { backgroundColor: c.border }]} />

          {/* Row 4: Level row */}
          <View style={styles.levelSection}>
            <View style={styles.levelLeft}>
              <Text style={styles.tierEmoji}>{TIER_EMOJI[tier.label] ?? '🏅'}</Text>
              <Text style={[styles.levelNum, { color: tier.border, fontFamily: typography.fontFamily.extrabold }]}>
                Lv.{level}
              </Text>
            </View>
            <Text style={[styles.xpNums, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              {totalXP.toLocaleString()} / {xpTarget.toLocaleString()} XP
            </Text>
            <Text style={[styles.levelNumNext, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
              Lv.{level + 1}
            </Text>
          </View>

          {/* XP bar */}
          <View style={[styles.xpTrack, { backgroundColor: c.bgTertiary }]}>
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: tier.border + 'CC' }]} />
            <Animated.View style={[styles.xpUnfilled, { width: xpUnfilled, backgroundColor: c.bgTertiary }]} />
          </View>
        </View>

        {/* Tap hint chevron */}
        <View style={[styles.chevronWrap, { opacity: 0.4 }]} pointerEvents="none">
          <ChevronRight size={12} color={c.textDisabled} />
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.screenMargin,
    marginTop:        spacing.sm,
  },
  card: {
    borderRadius: 20,
    borderWidth:  1,
    overflow:     'hidden',
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.base,
    paddingBottom:     14,
    gap:               10,
  },

  // Top section: left col + tree
  topSection: {
    flexDirection: 'row',
    alignItems:    'flex-start',
  },
  leftCol: {
    flex: 1,
    gap:  6,
    paddingRight: 8,
  },

  // Row 1
  streakRow: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    gap:           4,
  },
  flame:       { fontSize: 22 },
  streakNum:   { fontSize: 30, lineHeight: 34 },
  streakLabel: { fontSize: 14, lineHeight: 20, marginBottom: 2 },

  // Row 2
  message: { fontSize: 12, lineHeight: 17 },

  // Row 3
  progressSection: { gap: 4, marginTop: 4 },
  progressMeta: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  progressLabel: { fontSize: 11 },
  progressPct:   { fontSize: 11 },
  barTrack: {
    height:       4,
    borderRadius: 2,
    overflow:     'hidden',
  },
  barUnfilled: {
    position: 'absolute',
    right:    0,
    top:      0,
    bottom:   0,
  },
  shimmer: {
    position:        'absolute',
    top:             0,
    bottom:          0,
    width:           24,
    backgroundColor: 'rgba(255,255,255,0.30)',
  },

  // Tree
  treeWrap: {
    width:          80,
    height:         100,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },

  // Separator
  sep: {
    height:  StyleSheet.hairlineWidth,
    opacity: 0.5,
  },

  // Row 4 level
  levelSection: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  levelLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  tierEmoji:    { fontSize: 15 },
  levelNum:     { fontSize: 13 },
  levelNumNext: { fontSize: 12 },
  xpNums:       { fontSize: 11 },

  // XP bar
  xpTrack: {
    height:       3,
    borderRadius: 1.5,
    overflow:     'hidden',
  },
  xpUnfilled: {
    position: 'absolute',
    right:    0,
    top:      0,
    bottom:   0,
  },

  // Frost particles
  frostDot: {
    position:     'absolute',
    top:          8,
    width:        4,
    height:       4,
    borderRadius: 2,
    backgroundColor: '#B0D4E8',
  },

  // Chevron hint
  chevronWrap: {
    position: 'absolute',
    right:    8,
    bottom:   16,
  },
})

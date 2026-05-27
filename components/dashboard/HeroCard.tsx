import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, Easing } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Defs, Pattern as SvgPattern, Rect as SvgRect, Path as SvgPath } from 'react-native-svg'
import { typography, spacing, radius, getLevelTier } from '../../lib/constants'

// ── Gradient stops: rich orange, lighter left → deeper right ─────────────────
const GRAD_START = '#F7A830'
const GRAD_END   = '#B54208'

// ── Text colours (white-on-orange) ───────────────────────────────────────────
const WHITE      = '#FFFFFF'
const WHITE_75   = 'rgba(255,255,255,0.72)'
const TRACK_BG   = 'rgba(0,0,0,0.22)'
const SEP_COLOR  = 'rgba(255,255,255,0.20)'
const FILL_COLOR = 'rgba(255,255,255,0.88)'

function levelStartXP(level: number): number {
  if (level <= 1) return 0
  return Math.round(100 * Math.pow(level, 2.5))
}

function computeXP(totalXP: number, level: number) {
  const xpAtLevel     = levelStartXP(level)
  const xpAtNextLevel = levelStartXP(level + 1)
  const xpInLevel     = Math.max(0, totalXP - xpAtLevel)
  const xpToAdvance   = xpAtNextLevel - xpAtLevel
  return { xpInLevel, xpToAdvance }
}

interface Props {
  level:   number
  totalXP: number
}

export function HeroCard({ level, totalXP }: Props) {
  const tier = getLevelTier(level)
  const { xpInLevel, xpToAdvance } = computeXP(totalXP, level)

  const xpPct = xpToAdvance > 0 ? Math.min(1, xpInLevel / xpToAdvance) : 0

  const xpAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(xpAnim, {
      toValue:         xpPct,
      duration:        900,
      delay:           200,
      easing:          Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start()
  }, [xpPct])

  const xpBarW = xpAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })

  return (
    <LinearGradient
      colors={[GRAD_START, GRAD_END]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.card}
    >
      {/* ── Subtle white grid overlay ── */}
      <Svg style={StyleSheet.absoluteFillObject}>
        <Defs>
          <SvgPattern
            id="grid"
            x="0" y="0"
            width="22" height="22"
            patternUnits="userSpaceOnUse"
          >
            <SvgPath
              d="M 22 0 L 0 0 0 22"
              fill="none"
              stroke="white"
              strokeWidth="0.6"
              strokeOpacity="0.18"
            />
          </SvgPattern>
        </Defs>
        <SvgRect width="100%" height="100%" fill="url(#grid)" />
      </Svg>

      {/* ── Level badge + XP numbers ── */}
      <View style={styles.row}>
        <View style={styles.levelCircle}>
          <Text style={[styles.levelText, { color: WHITE, fontFamily: typography.fontFamily.bold }]}>
            Lv.{level}
          </Text>
        </View>
        <Text style={[styles.xpNums, { color: WHITE_75, fontFamily: typography.fontFamily.regular }]}>
          {xpInLevel.toLocaleString()} / {xpToAdvance.toLocaleString()} XP
        </Text>
      </View>

      {/* ── XP progress bar ── */}
      <View style={[styles.track, { backgroundColor: TRACK_BG }]}>
        <Animated.View style={[styles.fill, { width: xpBarW, backgroundColor: FILL_COLOR }]} />
      </View>

      {/* ── Tier label ── */}
      <Text style={[styles.tierLabel, { color: WHITE_75, fontFamily: typography.fontFamily.regular }]}>
        {tier.label} darajasi
      </Text>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.cardLg,
    padding:      spacing.base,
    gap:          10,
    overflow:     'hidden',
  },
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  levelCircle: {
    width:           66,
    height:          66,
    borderRadius:    33,
    borderWidth:     2.5,
    borderColor:     'rgba(255,255,255,0.70)',
    backgroundColor: 'rgba(0,0,0,0.22)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  levelText:  { fontSize: 17 },
  xpNums:     { fontSize: typography.size.sm },
  tierLabel:  { fontSize: typography.size.xs },
  track: {
    height:       7,
    borderRadius: 4,
    overflow:     'hidden',
  },
  fill: {
    height:       7,
    borderRadius: 4,
  },
})

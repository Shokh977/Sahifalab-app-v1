import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { typography } from '../../lib/constants'
import { getLevelInfo, getLevelEmoji } from '../../lib/levelTitles'
import { MagicTree } from '../streak/MagicTree'
import { stageFromStreak } from '../../lib/treeTheme'

export interface PrivateHeroProps {
  variant: 'private'
  level: number
  xp: number
  nextXp: number
  xpPercent: number
  rank: number | null
  totalFocusMinutes?: number
}

export interface PublicHeroProps {
  variant: 'public'
  level: number
  xp: number
  nextXp: number
  xpPercent: number
  rank: number | null
  streakDays: number
  longestStreak: number
  totalFocusMinutes?: number
}

export type HeroLevelCardProps = PrivateHeroProps | PublicHeroProps

export function HeroLevelCard(props: HeroLevelCardProps) {
  const { level, xp, nextXp, xpPercent, rank } = props
  const totalFocusMinutes = props.totalFocusMinutes ?? 0
  const rawHours  = totalFocusMinutes / 60
  const hoursDisplay = parseFloat(rawHours.toFixed(1)).toString()
  const info      = getLevelInfo(level)
  const emoji     = getLevelEmoji(level)
  const nextInfo  = getLevelInfo(Math.min(level + 1, 29))
  const xpLeft    = Math.max(0, nextXp - xp)

  return (
    <LinearGradient
      colors={['#FFB840', '#F5A623', '#E58C0A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Decorative circles */}
      <View style={styles.deco1} />
      <View style={styles.deco2} />

      {props.variant === 'private' ? (
        <>
          {/* Top row: DARAJA chip + stat chips */}
          <View style={styles.topRow}>
            <View style={styles.darajaChip}>
              <Text style={[styles.darajaText, { fontFamily: typography.fontFamily.bold }]}>
                DARAJA {level}
              </Text>
            </View>
            <View style={styles.chipsRow}>
              <View style={styles.rankChip}>
                <Text style={[styles.rankLabel, { fontFamily: typography.fontFamily.regular }]}>SOAT</Text>
                <Text style={[styles.rankNum, { fontFamily: typography.fontFamily.extrabold }]}>{hoursDisplay}</Text>
                <Text style={[styles.rankSub, { fontFamily: typography.fontFamily.regular }]}>o'qish</Text>
              </View>
              {rank != null && (
                <View style={styles.rankChip}>
                  <Text style={[styles.rankLabel, { fontFamily: typography.fontFamily.regular }]}>REYTING</Text>
                  <Text style={[styles.rankNum, { fontFamily: typography.fontFamily.extrabold }]}>#{rank}</Text>
                  <Text style={[styles.rankSub, { fontFamily: typography.fontFamily.regular }]}>haftalik</Text>
                </View>
              )}
            </View>
          </View>

          {/* Level name */}
          <Text style={[styles.levelName, { fontFamily: typography.fontFamily.extrabold }]}>
            {emoji} {info.title}
          </Text>

          {/* XP progress bar */}
          <View style={styles.xpSection}>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${xpPercent}%` as any }]} />
            </View>
            <View style={styles.xpLabels}>
              <Text style={[styles.xpText, { fontFamily: typography.fontFamily.medium }]}>
                {xp.toLocaleString()} / {nextXp.toLocaleString()} XP
              </Text>
              <Text style={[styles.xpText, { fontFamily: typography.fontFamily.medium }]}>
                {nextInfo.title}gacha {xpLeft.toLocaleString()} XP →
              </Text>
            </View>
          </View>
        </>
      ) : (
        <>
          {/* Public: tree left + text right */}
          <View style={styles.pubTop}>
            <View style={styles.treeTile}>
              <MagicTree
                stage={stageFromStreak((props as PublicHeroProps).streakDays)}
                state="alive"
                size="thumb"
                uid={`hero_pub_${(props as PublicHeroProps).streakDays}`}
              />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.pubDaraja, { fontFamily: typography.fontFamily.bold }]}>
                DARAJA {level}
              </Text>
              <Text style={[styles.pubName, { fontFamily: typography.fontFamily.extrabold }]}>
                {emoji} {info.title}
              </Text>
              <Text style={[styles.pubXP, { fontFamily: typography.fontFamily.medium }]}>
                {xp.toLocaleString()} / {nextXp.toLocaleString()} XP
              </Text>
            </View>
          </View>

          {/* Stats strip */}
          <View style={styles.statsStrip}>
            <View style={styles.stripItem}>
              <Text style={[styles.stripNum, { fontFamily: typography.fontFamily.extrabold }]}>
                {hoursDisplay}
              </Text>
              <Text style={[styles.stripLbl, { fontFamily: typography.fontFamily.regular }]}>soat</Text>
            </View>
            <View style={styles.stripDiv} />
            <View style={styles.stripItem}>
              <Text style={[styles.stripNum, { fontFamily: typography.fontFamily.extrabold }]}>
                {(props as PublicHeroProps).streakDays}
              </Text>
              <Text style={[styles.stripLbl, { fontFamily: typography.fontFamily.regular }]}>kun seriya</Text>
            </View>
            <View style={styles.stripDiv} />
            <View style={styles.stripItem}>
              <Text style={[styles.stripNum, { fontFamily: typography.fontFamily.extrabold }]}>
                {(props as PublicHeroProps).longestStreak}
              </Text>
              <Text style={[styles.stripLbl, { fontFamily: typography.fontFamily.regular }]}>eng uzun</Text>
            </View>
          </View>
        </>
      )}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius:  22,
    padding:       18,
    overflow:      'hidden',
    gap:           14,
    shadowColor:   '#F5A623',
    shadowOffset:  { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius:  14,
    elevation:     12,
  },

  deco1: {
    position: 'absolute', right: -60, top: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  deco2: {
    position: 'absolute', right: -20, bottom: -50,
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Private
  topRow:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  darajaChip: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  darajaText: { fontSize: 11, color: '#fff', letterSpacing: 1 },

  chipsRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           8,
  },
  rankChip: {
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 8,
    alignItems: 'center', minWidth: 64,
  },
  rankLabel: { fontSize: 9,  color: '#8E8E93', letterSpacing: 1, textTransform: 'uppercase' },
  rankNum:   { fontSize: 22, color: '#E08F0A' },
  rankSub:   { fontSize: 10, color: '#8E8E93' },

  levelName: { fontSize: 26, color: '#fff' },

  xpSection: { gap: 6 },
  xpTrack:   {
    height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  xpFill:    { height: 8, borderRadius: 4, backgroundColor: '#fff' },
  xpLabels:  { flexDirection: 'row', justifyContent: 'space-between' },
  xpText:    { fontSize: 11, color: 'rgba(255,255,255,0.88)' },

  // Public
  pubTop:   { flexDirection: 'row', gap: 14, alignItems: 'center' },
  treeTile: {
    width: 80, height: 100,
    alignItems: 'center', justifyContent: 'center',
  },
  pubDaraja: { fontSize: 10, color: 'rgba(255,255,255,0.80)', letterSpacing: 1, textTransform: 'uppercase' },
  pubName:   { fontSize: 20, color: '#fff' },
  pubXP:     { fontSize: 12, color: 'rgba(255,255,255,0.88)' },

  statsStrip: {
    flexDirection:   'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius:    12,
    paddingVertical: 12,
  },
  stripItem: { flex: 1, alignItems: 'center', gap: 3 },
  stripNum:  { fontSize: 18, color: '#fff' },
  stripLbl:  { fontSize: 11, color: 'rgba(255,255,255,0.82)' },
  stripDiv:  { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 },
})

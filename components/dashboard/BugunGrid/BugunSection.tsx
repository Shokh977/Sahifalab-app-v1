import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../../hooks/useTheme'
import { typography, spacing } from '../../../lib/constants'
import { dailyQuiz } from '../../../lib/api'
import { FiveSavolGridCard } from './FiveSavolGridCard'
import { RankGridCard } from './RankGridCard'
import { AiFlashcardGridCard } from './AiFlashcardGridCard'
import { WeeklyReviewGridCard } from './WeeklyReviewGridCard'

function fmtCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}s ${m}d qoldi`
}

/**
 * The "Bugun" 2x2 action grid (design 1a) — replaces the old stacked "5
 * Savol" row, orange reyting strip, and AI-feature rows between the streak
 * hero card and "Tavsiya etilgan". ContextualActionRow (Yangi kurs /
 * Statistika) now renders BELOW this, not between it and the hero card.
 */
export function BugunSection() {
  const { c } = useTheme()
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    dailyQuiz.today().then(res => {
      if (!cancelled) setSecondsRemaining(res.quiz?.seconds_remaining ?? null)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  return (
    <View style={{ paddingHorizontal: spacing.screenMargin }}>
      <View style={styles.header}>
        <Text style={[styles.headerLabel, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          BUGUN
        </Text>
        {secondsRemaining != null && (
          <Text style={[styles.headerCountdown, { color: c.textMuted, fontFamily: typography.fontFamily.semibold }]}>
            {fmtCountdown(secondsRemaining)}
          </Text>
        )}
      </View>

      <View style={styles.grid}>
        <View style={styles.row}>
          <FiveSavolGridCard staggerIndex={0} />
          <RankGridCard staggerIndex={1} />
        </View>
        <View style={styles.row}>
          <AiFlashcardGridCard staggerIndex={2} />
          <WeeklyReviewGridCard staggerIndex={3} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerLabel: { fontSize: 13, letterSpacing: 0.3 },
  headerCountdown: { fontSize: 11 },
  grid: { gap: 10 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
})

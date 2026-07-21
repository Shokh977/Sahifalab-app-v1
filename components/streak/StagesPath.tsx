/**
 * StagesPath — the "Bosqichlar" section on the Seriya screen.
 *
 * Replaces the old static XP_ROWS 7/14/30/100-day rows with a live, per-user
 * vertical progress path through all 10 tree stages, sourced from
 * GET /api/focus/stages (see lib/api.ts focusStages.stages()). Each stage
 * shows exactly what it's worth and whether — and when — the user earned it.
 */
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { MagicTree } from './MagicTree'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import type { StreakStage } from '../../lib/api'
import type { StageNumber } from '../../lib/treeTheme'

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

export const StagesPath = React.memo(function StagesPath({ stages }: { stages: StreakStage[] }) {
  const { c } = useTheme()

  if (stages.length === 0) return null

  const sorted = [...stages].sort((a, b) => a.stage_number - b.stage_number)
  const currentIdx = sorted.findIndex(s => !s.earned)
  const lineFillPct = currentIdx === -1
    ? 100
    : Math.round((currentIdx / sorted.length) * 100)

  return (
    <View style={styles.root}>
      {/* Connecting vertical line, filled up to the user's current position */}
      <View style={[styles.trackLine, { backgroundColor: c.border }]} pointerEvents="none">
        <View style={[styles.trackFill, { backgroundColor: c.brand, height: `${lineFillPct}%` as any }]} />
      </View>

      {sorted.map((s, i) => {
        const isCurrent = i === currentIdx
        const isFuture  = !s.earned && !isCurrent

        return (
          <View key={s.key} style={styles.row}>
            <View style={styles.treeCol}>
              <MagicTree
                stage={s.stage_number as StageNumber}
                state={isFuture ? 'dead' : 'alive'}
                size="thumb"
                uid={`sp_${s.key}`}
                animate={false}
              />
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: c.bgSecondary, borderColor: isCurrent ? c.brand : c.border },
                isCurrent && { borderWidth: 1.5 },
                isFuture && { opacity: 0.45 },
              ]}
            >
              <View style={styles.cardHeader}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.stageName,
                    { color: isFuture ? c.textMuted : c.textPrimary, fontFamily: typography.fontFamily.semibold },
                  ]}
                >
                  {s.title}
                </Text>
                <Text style={[styles.xpBadge, { color: isFuture ? c.textMuted : '#f0b53f', fontFamily: typography.fontFamily.bold }]}>
                  +{s.bonus_xp} XP
                </Text>
              </View>

              {s.earned ? (
                <Text style={[styles.metaLine, { color: c.brand, fontFamily: typography.fontFamily.medium }]}>
                  ✅ Olindi{s.completed_at ? ` · ${formatDate(s.completed_at)}` : ''}
                </Text>
              ) : isCurrent ? (
                <View style={styles.currentMeta}>
                  <Text style={[styles.metaLine, { color: c.brand, fontFamily: typography.fontFamily.medium }]}>
                    Yana {Math.max(0, s.required_days - s.current_days)} kun
                  </Text>
                  <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
                    <View style={[styles.progressFill, { backgroundColor: c.brand, width: `${s.progress_pct}%` as any }]} />
                  </View>
                </View>
              ) : (
                <Text style={[styles.metaLine, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                  {s.required_days} kunlik seriya kerak
                </Text>
              )}
            </View>
          </View>
        )
      })}
    </View>
  )
})

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    paddingLeft: 44,
  },
  trackLine: {
    position: 'absolute',
    left:     20,
    top:      28,
    bottom:   28,
    width:    2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  trackFill: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    marginBottom:  spacing.sm,
  },
  treeCol: {
    position: 'absolute',
    left:     -44,
    width:    40,
    height:   50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flex:              1,
    borderRadius:      radius.lg,
    borderWidth:       1,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    gap:               4,
  },
  cardHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    gap:            spacing.sm,
  },
  stageName: { flex: 1, fontSize: 14 },
  xpBadge:   { fontSize: 12 },
  metaLine:  { fontSize: 12 },
  currentMeta: { gap: 4 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: 4, borderRadius: 2 },
})

/**
 * ProfileMiniStats — two sections shown between the info card and the tab bar.
 *
 * 1. Four mini stat cards: XP | Fokus | Sertifikat | Ko'rishlar
 * 2. Level progress bar: icon + "Daraja N — name" + XP bar + next-level hint
 */
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Zap, Clock, Award, Eye } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { getLevelInfo, getLevelEmoji } from '../../lib/levelTitles'
import type { ProfileData } from '../../lib/types'

interface Props {
  data: ProfileData
}

// ── Mini stat card ────────────────────────────────────────────────────────────

function MiniCard({
  icon, value, label, iconColor,
}: {
  icon:       React.ReactNode
  value:      string
  label:      string
  iconColor:  string
}) {
  const { c } = useTheme()
  return (
    <View style={[styles.miniCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
      <View style={[styles.miniIconWrap, { backgroundColor: `${iconColor}18` }]}>
        {icon}
      </View>
      <Text style={[styles.miniValue, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
        {value}
      </Text>
      <Text style={[styles.miniLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
        {label}
      </Text>
    </View>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProfileMiniStats({ data }: Props) {
  const { c } = useTheme()

  const xpDisplay    = data.total_xp >= 1000
    ? `${(data.total_xp / 1000).toFixed(1)}K`
    : String(data.total_xp)
  const focusDisplay = data.focus_hours >= 10
    ? `${Math.round(data.focus_hours)}s`
    : `${data.focus_hours.toFixed(1)}s`
  const viewsDisplay = data.profile_views >= 1000
    ? `${(data.profile_views / 1000).toFixed(1)}K`
    : String(data.profile_views)

  const pct  = Math.min(100, Math.max(0, data.xp_percent))
  const xpLeft = data.next_level_xp - data.total_xp

  return (
    <View style={styles.wrapper}>
      {/* 4 mini stat cards */}
      <View style={styles.row}>
        <MiniCard
          icon={<Zap size={16} color="#e8792f" />}
          value={`${xpDisplay} XP`}
          label="Tajriba"
          iconColor="#e8792f"
        />
        <MiniCard
          icon={<Clock size={16} color="#60a5fa" />}
          value={focusDisplay}
          label="Fokus"
          iconColor="#60a5fa"
        />
        <MiniCard
          icon={<Award size={16} color="#34d399" />}
          value={String(data.certificates_count)}
          label="Sertifikat"
          iconColor="#34d399"
        />
        <MiniCard
          icon={<Eye size={16} color="#a78bfa" />}
          value={viewsDisplay}
          label="Ko'rishlar"
          iconColor="#a78bfa"
        />
      </View>

      {/* Level progress bar */}
      <View style={[styles.levelCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
        {/* Header row */}
        <View style={styles.levelHeader}>
          <View style={styles.levelLeft}>
            <Text style={styles.levelEmoji}>{getLevelEmoji(data.level)}</Text>
            <View>
              <Text style={[styles.levelTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                Daraja {data.level} — {getLevelInfo(data.level).title}
              </Text>
              <Text style={[styles.levelSub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                {data.total_xp.toLocaleString()} / {data.next_level_xp.toLocaleString()} XP · {pct}%
              </Text>
            </View>
          </View>
          <View style={[styles.pctBadge, { backgroundColor: c.brandSubtle }]}>
            <Text style={[styles.pctText, { color: c.brand, fontFamily: typography.fontFamily.bold }]}>
              {pct}%
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={[styles.track, { backgroundColor: c.bgTertiary }]}>
          <View style={[styles.fill, { width: `${pct}%` as any }]} />
        </View>

        {/* Next level hint */}
        {xpLeft > 0 && (
          <Text style={[styles.nextHint, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            Keyingi daraja uchun {xpLeft.toLocaleString()} XP qoldi
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.base,
    marginTop:        spacing.sm,
    gap:              spacing.sm,
  },

  // Mini card row
  row: {
    flexDirection: 'row',
    gap:           spacing.xs,
  },
  miniCard: {
    flex:           1,
    alignItems:     'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderRadius:   radius.xl,
    borderWidth:    StyleSheet.hairlineWidth,
    gap:            3,
  },
  miniIconWrap: {
    width:          32,
    height:         32,
    borderRadius:   16,
    alignItems:     'center',
    justifyContent: 'center',
  },
  miniValue: {
    fontSize:  typography.size.sm,
    textAlign: 'center',
  },
  miniLabel: {
    fontSize:  10,
    textAlign: 'center',
  },

  // Level card
  levelCard: {
    borderRadius:      radius.xl,
    borderWidth:       StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    gap:               spacing.sm,
  },
  levelHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  levelLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    flex:          1,
  },
  levelEmoji: {
    fontSize: 22,
  },
  levelTitle: {
    fontSize: typography.size.base,
  },
  levelSub: {
    fontSize:  typography.size.xs,
    marginTop: 1,
  },
  pctBadge: {
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      radius.full,
  },
  pctText: {
    fontSize: typography.size.xs,
  },

  // Progress bar
  track: {
    height:       7,
    borderRadius: 4,
    overflow:     'hidden',
  },
  fill: {
    height:          7,
    borderRadius:    4,
    backgroundColor: '#e8792f',
  },
  nextHint: {
    fontSize:  typography.size.xs,
    textAlign: 'center',
  },
})

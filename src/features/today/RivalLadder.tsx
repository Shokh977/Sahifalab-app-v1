/**
 * RivalLadder (Phase 7.5 B5, used by C4) — three ranking rows joined by a
 * thin line behind the avatars: the person above you, you (orange-soft row,
 * "Siz"), the person below ("#24 · 16 XP orqada"). Rows are keyed by user,
 * so when your rank changes they slide into place (LinearTransition,
 * springs.ui) and the XP rolls. Reduce motion: no movement.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { LinearTransition, useReducedMotion } from 'react-native-reanimated'
import { useTheme } from '../../design/ThemeProvider'
import { springs } from '../../design/motion'
import { avatarSize, radius, space } from '../../design/spacing'
import { fonts, tabular, type as typeScale } from '../../design/typography'
import { RollingNumber } from '../../components/ui'
import { RingedAvatar } from '../profile/cosmetics/RingedAvatar'
import { groupDigits } from '../courses/courses'
import { uzText } from './today'

export interface RivalRow {
  id: number
  name: string
  photoUrl?: string | null
  rank: number
  xp: number
  isMe?: boolean
  /** Avatar ring (Pro / earned / seasonal). */
  ring?: string | null
}

const layoutTransition = LinearTransition.springify().duration(springs.ui.duration).dampingRatio(springs.ui.dampingRatio)
const LINE = 2
const ROW_PAD_LEFT = space.xxs

export function RivalLadder({ rows, footer }: { rows: readonly RivalRow[]; footer?: React.ReactNode }) {
  const { colors } = useTheme()
  const reduceMotion = useReducedMotion()
  const me = rows.find(r => r.isMe)

  return (
    <View style={styles.root}>
      <View style={styles.ladder}>
        {rows.length > 1 && (
          <View
            style={[styles.line, { backgroundColor: colors.border, left: ROW_PAD_LEFT + avatarSize.row / 2 - LINE / 2 }]}
            pointerEvents="none"
          />
        )}
        {rows.map(r => {
          const below = me && r.rank > me.rank
          const sub = r.isMe ? `#${r.rank}` : below ? `#${r.rank} · ${groupDigits(me.xp - r.xp)} XP orqada` : `#${r.rank}`
          const name = r.isMe ? 'Siz' : uzText(r.name || 'Foydalanuvchi')
          return (
            <Animated.View
              key={r.id}
              layout={reduceMotion ? undefined : layoutTransition}
              accessible
              accessibilityLabel={`${name}, ${r.rank}-oʻrin, ${r.xp} XP`}
              style={[
                styles.row,
                r.isMe && { backgroundColor: colors.accentSoft, borderColor: colors.orangeLine, borderWidth: 1.5 },
              ]}
            >
              <RingedAvatar ring={r.ring} name={r.name || '?'} id={r.id} uri={r.photoUrl} diameter={avatarSize.row} />
              <View style={styles.text}>
                <Text style={[typeScale.rowTitle, r.isMe && styles.heavy, { color: colors.text }]} numberOfLines={1}>{name}</Text>
                <Text style={[typeScale.small, tabular, r.isMe && styles.semi, { color: r.isMe ? colors.accentText : colors.textMuted }]} numberOfLines={1}>
                  {sub}
                </Text>
              </View>
              <RollingNumber
                value={`${groupDigits(r.xp)} XP`}
                lineHeight={typeScale.rowTitle.lineHeight}
                style={[typeScale.rowTitle, tabular, r.isMe && styles.heavy, { color: colors.text }]}
              />
            </Animated.View>
          )
        })}
      </View>
      {footer ? <View style={[styles.footer, { backgroundColor: colors.surfaceRaised }]}>{footer}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: space.sm + 2 },
  ladder: { gap: space.xxs + 2 },
  line: { position: 'absolute', top: space.lg + 2, bottom: space.lg + 2, width: LINE },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs,
    paddingRight: space.sm,
    paddingLeft: ROW_PAD_LEFT,
    borderRadius: radius.md + 2,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  text: { flex: 1 },
  heavy: { fontFamily: fonts.extrabold },
  semi: { fontFamily: fonts.semibold },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, paddingHorizontal: space.sm + 2, borderRadius: radius.md + 2 },
})

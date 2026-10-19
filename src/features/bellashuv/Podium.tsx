/**
 * Podium (Phase 7.5 B5, used by D1) — the weekly top 3 as columns #2, #1,
 * #3: avatars 56 / 68 / 56 in medal-colour rings with a rank coin over the
 * bottom edge, a crown over #1, name and XP, then podium blocks 44 / 64 /
 * 32 tall in soft medal gradients.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Crown } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { avatarSize, iconSize, iconStroke, radius, space } from '../../design/spacing'
import { medal } from '../../design/tokens'
import { fonts, tabular, type as typeScale } from '../../design/typography'
import { Avatar } from '../../components/ui'
import { groupDigits } from '../courses/courses'
import { uzText } from '../today/today'
import { podiumColumns } from './podiumOrder'

export interface PodiumEntry { id: number; rank: number; name: string; photoUrl?: string | null; xp: number }

const RING = 3
const AVATAR: Record<1 | 2 | 3, number> = { 1: avatarSize.podium, 2: avatarSize.lg, 3: avatarSize.lg }
const COIN: Record<1 | 2 | 3, number> = { 1: 24, 2: 22, 3: 22 }
const BLOCK: Record<1 | 2 | 3, number> = { 1: 64, 2: 44, 3: 32 }

export function Podium({ entries }: { entries: readonly PodiumEntry[] }) {
  const { colors, scheme } = useTheme()
  const columns = podiumColumns(entries)
  if (columns.length === 0) return null

  return (
    <View style={styles.row}>
      {columns.map(e => {
        const r = (Math.min(3, Math.max(1, e.rank)) as 1 | 2 | 3)
        const d = AVATAR[r]
        const first = r === 1
        return (
          <View key={e.id} style={styles.col} accessible accessibilityLabel={`${r}-oʻrin, ${uzText(e.name)}, ${e.xp} XP`}>
            {first && <Crown size={iconSize.sm} color={medal.ring[1]} fill={medal.ring[1]} strokeWidth={iconStroke} />}
            <View style={[styles.ring, { width: d, height: d, borderColor: medal.ring[r] }]}>
              <Avatar name={e.name || '?'} id={e.id} uri={e.photoUrl} diameter={d - RING * 2} />
              <View style={[styles.coin, { width: COIN[r], height: COIN[r], backgroundColor: medal.ring[r], bottom: -space.xs }]}>
                <Text style={[typeScale.levelBadge, tabular, { color: medal.coinText[r] }]}>{r}</Text>
              </View>
            </View>
            <Text
              style={[typeScale.callout, styles.name, { color: colors.text, fontFamily: first ? fonts.extrabold : fonts.bold }]}
              numberOfLines={1}
            >
              {uzText(e.name || 'Foydalanuvchi')}
            </Text>
            <Text style={[typeScale.small, tabular, { color: colors.textMuted }]}>{groupDigits(e.xp)} XP</Text>
            <LinearGradient
              colors={medal.block[scheme][r]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.block, { height: BLOCK[r] }]}
            />
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.xs, paddingBottom: space.xs },
  col: { flex: 1, alignItems: 'center', gap: space.xxs + 2 },
  ring: { borderRadius: radius.full, borderWidth: RING, alignItems: 'center', justifyContent: 'center' },
  coin: { position: 'absolute', borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  name: { marginTop: space.xs, maxWidth: '100%' },
  block: { width: '100%', borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, borderBottomLeftRadius: space.xxs + 2, borderBottomRightRadius: space.xxs + 2 },
})

import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Trophy, Crown } from 'phosphor-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import type { LeaderboardEntry } from '../../lib/api'

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']

interface Props {
  entries:  LeaderboardEntry[]
  myRank:   number | null
}

const EntryRow = React.memo(function EntryRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  const { c } = useTheme()
  const medalColor = MEDAL_COLORS[index]
  const isTop3 = index < 3

  return (
    <View style={[
      styles.row,
      entry.is_me && { backgroundColor: c.accentPrimaryMuted, borderRadius: radius.sm },
    ]}>
      <View style={styles.rankWrap}>
        {isTop3
          ? <Crown size={16} color={medalColor} weight="fill" />
          : <Text style={[styles.rank, { color: c.textDisabled, fontFamily: typography.fontFamily.medium }]}>
              {entry.rank}
            </Text>
        }
      </View>
      {entry.photo_url ? (
        <Image source={{ uri: entry.photo_url }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <View style={[styles.avatar, { backgroundColor: c.bgTertiary, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: c.textSecondary, fontSize: 11, fontFamily: typography.fontFamily.medium }}>
            {entry.first_name.slice(0, 2).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.nameWrap}>
        <Text
          style={[styles.name, { color: entry.is_me ? c.accentPrimary : c.textPrimary, fontFamily: typography.fontFamily.medium }]}
          numberOfLines={1}
        >
          {entry.is_me ? 'Siz' : entry.first_name}
        </Text>
        <Text style={[styles.level, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
          Daraja {entry.level}
        </Text>
      </View>
      <Text style={[styles.score, { color: c.textSecondary, fontFamily: typography.fontFamily.semibold }]}>
        {entry.score.toLocaleString()}
      </Text>
    </View>
  )
})

export const LeaderboardCard = React.memo(function LeaderboardCard({ entries, myRank }: Props) {
  const { c } = useTheme()
  const router = useRouter()
  const top5 = entries.slice(0, 5)

  return (
    <View style={[styles.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
      <View style={styles.header}>
        <Trophy size={20} color={c.warning} weight="fill" />
        <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          Haftalik reyting
        </Text>
        {myRank !== null && (
          <Text style={[styles.myRank, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            #{myRank}
          </Text>
        )}
      </View>

      {top5.length === 0 ? (
        <Text style={[styles.empty, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
          Reyting hali mavjud emas
        </Text>
      ) : (
        <View style={styles.list}>
          {top5.map((entry, i) => <EntryRow key={entry.telegram_id} entry={entry} index={i} />)}
        </View>
      )}

      <Pressable
        onPress={() => router.push('/(screens)/leaderboard' as any)}
        style={({ pressed }) => [
          styles.seeAll,
          { borderTopColor: c.borderSubtle, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[styles.seeAllText, { color: c.accentPrimary, fontFamily: typography.fontFamily.medium }]}>
          To'liq reytingni ko'rish →
        </Text>
      </Pressable>
    </View>
  )
})

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.cardLg,
    borderWidth:  1,
    overflow:     'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    padding:       spacing.base,
  },
  title:  { flex: 1, fontSize: typography.size.base },
  myRank: { fontSize: typography.size.sm },

  list: { paddingHorizontal: spacing.sm },

  row: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingVertical:   8,
    paddingHorizontal: spacing.sm,
    gap:               10,
  },
  rankWrap: { width: 24, alignItems: 'center' },
  rank:     { fontSize: typography.size.sm },
  avatar: {
    width:        36,
    height:       36,
    borderRadius: 18,
    overflow:     'hidden',
  },
  nameWrap: { flex: 1 },
  name:  { fontSize: typography.size.sm },
  level: { fontSize: typography.size.xs },
  score: { fontSize: typography.size.sm },

  empty: {
    textAlign: 'center',
    padding:   spacing.base,
    fontSize:  typography.size.sm,
  },

  seeAll: {
    borderTopWidth:  1,
    padding:         spacing.sm + 4,
    alignItems:      'center',
  },
  seeAllText: { fontSize: typography.size.sm },
})

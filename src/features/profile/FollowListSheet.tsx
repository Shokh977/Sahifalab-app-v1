/**
 * Followers / following in the kit Sheet (replaces the page-sheet Modal).
 * Tapping someone opens their public profile.
 */
import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { profile as profileApi, type SocialUser } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { ListRow, Sheet, SkeletonRow } from '../../components/ui'
import { uzText } from '../today/today'

export type FollowKind = 'followers' | 'following'

export function FollowListSheet({ kind, userId, onClose, onOpenUser }: {
  kind: FollowKind | null
  userId: number
  onClose: () => void
  onOpenUser: (telegramId: number) => void
}) {
  const { colors } = useTheme()
  const [list, setList] = useState<SocialUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!kind || !userId) return
    let alive = true
    const fn = kind === 'followers' ? profileApi.getFollowers : profileApi.getFollowing
    fn(userId)
      .then(data => { if (alive) { setList(Array.isArray(data) ? data.map((d: any) => d.user) : []); setError(null) } })
      .catch((e: any) => { if (alive) { setError(e?.message ?? 'Xatolik yuz berdi'); setList([]) } })
    return () => { alive = false; setList(null) }
  }, [kind, userId])

  return (
    <Sheet visible={!!kind} onClose={onClose} title={kind === 'following' ? 'Kuzatilayotganlar' : 'Kuzatuvchilar'}>
      <ScrollView style={styles.list} contentContainerStyle={styles.content}>
        {list == null ? (
          [0, 1, 2].map(i => <SkeletonRow key={i} />)
        ) : error ? (
          <Text style={[typeScale.callout, { color: colors.dangerText }]}>{error}</Text>
        ) : list.length === 0 ? (
          <Text style={[typeScale.body, { color: colors.textMuted }]}>
            {kind === 'followers' ? 'Hali kuzatuvchi yoʻq' : 'Hali hech kimni kuzatmayapsiz'}
          </Text>
        ) : (
          list.map(u => (
            <ListRow
              key={u.telegram_id}
              title={uzText(u.full_name || 'Foydalanuvchi')}
              subtitle={u.username ? `@${u.username} · Lv.${u.level}` : `Lv.${u.level}`}
              leading={{ kind: 'avatar', name: u.full_name || '?', uri: u.photo_url, id: u.telegram_id }}
              trailing={{ kind: 'chevron' }}
              onPress={() => { onClose(); onOpenUser(u.telegram_id) }}
            />
          ))
        )}
      </ScrollView>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  list: { flexGrow: 0 },
  content: { paddingBottom: space.md },
})

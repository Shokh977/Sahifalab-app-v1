/**
 * Reyting: tapping a person opens this sheet (iOS preset — the screen
 * behind scales to 0.93). Avatar, name and level title; four tiles —
 * daraja, XP in the period, fokus soatlari and seriya (the streak comes
 * from their public profile, which also warms the profile screen's cache);
 * then
 * "Profilni ochish" and "Kuzatish" / "Kuzatilmoqda" (not on your own row).
 */
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { UserCheck, UserPlus } from 'lucide-react-native'
import { follows, type LeaderboardEntry } from '../../../lib/api'
import { getLevelInfo } from '../../../lib/levelTitles'
import { useAuthStore } from '../../../stores/authStore'
import { useProfileStore } from '../../../stores/profileStore'
import { useTheme } from '../../design/ThemeProvider'
import { avatarSize, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Avatar, Button, Sheet, StatTile } from '../../components/ui'
import { groupDigits } from '../courses/courses'
import { uzText } from '../today/today'
import { hoursLabel } from './bellashuv'

export function PersonSheet({ entry, periodLabel, onClose, onOpenProfile }: {
  entry: LeaderboardEntry | null
  /** "bu hafta", "bu oy", "jami": the XP tile's label. */
  periodLabel: string
  onClose: () => void
  onOpenProfile: (e: LeaderboardEntry) => void
}) {
  const { colors } = useTheme()
  const loadPublicProfile = useProfileStore(s => s.loadPublicProfile)
  const patchCachedStatus = useProfileStore(s => s.patchCachedStatus)
  const [shown, setShown] = useState<LeaderboardEntry | null>(entry)
  const [extra, setExtra] = useState<{ id: number; streak: number; following: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const myStreak = useAuthStore(s => s.user?.streak_days ?? null)

  // Keep the last person on screen while the sheet closes.
  if (entry && entry !== shown) setShown(entry)

  const id = entry?.telegram_id
  const mine = !!entry?.is_me
  useEffect(() => {
    if (id == null || mine) return
    let cancelled = false
    loadPublicProfile(id)
      .then(p => { if (!cancelled) setExtra({ id, streak: p.streak_days ?? 0, following: !!p.is_following }) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [id, mine, loadPublicProfile])

  const e = shown
  const info = e && extra?.id === e.telegram_id ? extra : null
  const name = e ? (e.is_me ? 'Siz' : uzText(e.first_name || e.username || 'Foydalanuvchi')) : ''
  const streak = e?.is_me ? myStreak : info?.streak ?? null

  const toggleFollow = async () => {
    if (!e || !info) return
    setBusy(true)
    const next = !info.following
    try {
      await (next ? follows.follow(e.telegram_id) : follows.unfollow(e.telegram_id))
      setExtra({ ...info, following: next })
      patchCachedStatus(e.telegram_id, { is_following: next })
    } catch {}
    setBusy(false)
  }

  return (
    <Sheet visible={entry != null} onClose={onClose} scaleBehind>
      {e ? (
        <View style={styles.body}>
          <View style={styles.who}>
            <Avatar name={e.first_name || '?'} id={e.telegram_id} uri={e.photo_url} size="lg" />
            <View style={styles.flex}>
              <Text style={[typeScale.title2, { color: colors.text }]} numberOfLines={2} accessibilityRole="header">{name}</Text>
              <Text style={[typeScale.callout, { color: colors.textMuted }]} numberOfLines={1}>
                {e.rank}-oʻrin · {getLevelInfo(e.level).title}
              </Text>
            </View>
          </View>

          <View style={styles.tiles}>
            <StatTile value={e.level} label="Daraja" style={styles.tile} />
            <StatTile value={e.score} label={`XP · ${periodLabel}`} format={groupDigits} style={styles.tile} />
            <StatTile value={e.minutes} label="Fokus" format={hoursLabel} style={styles.tile} />
            <StatTile
              value={streak ?? 0}
              label="Seriya"
              format={n => (streak == null ? '–' : `${n} kun`)}
              style={styles.tile}
            />
          </View>

          <View style={styles.actions}>
            <Button label="Profilni ochish" fullWidth onPress={() => onOpenProfile(e)} />
            {mine ? null : (
              <Button
                label={info?.following ? 'Kuzatilmoqda' : 'Kuzatish'}
                icon={info?.following ? UserCheck : UserPlus}
                variant="secondary"
                fullWidth
                disabled={!info}
                loading={busy}
                onPress={toggleFollow}
              />
            )}
          </View>
        </View>
      ) : null}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  body: { gap: space.md, paddingTop: space.xs },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: avatarSize.lg },
  flex: { flex: 1, minWidth: 0 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { flexGrow: 1, flexBasis: '45%' },
  actions: { gap: space.sm },
})

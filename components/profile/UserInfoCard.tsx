/**
 * UserInfoCard — the info card shown immediately below the hero card on every profile.
 * Contains: name + role badge, @username, headline, bio, location/website,
 * connection stats row, and action buttons (edit/share for own; connect/message for others).
 */
import React, { useState, useCallback, useEffect } from 'react'
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Share, Linking,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { BadgeCheck, Pencil, Share2, UserPlus, UserCheck, UserX, MessageSquare, MapPin, Globe } from 'lucide-react-native'
import { RoleBadge } from '../ui/RoleBadge'
import { useTheme } from '../../hooks/useTheme'
import { connections as connApi, follows as followApi } from '../../lib/api'
import { useProfileStore } from '../../stores/profileStore'
import { typography, spacing, radius, WEB_URL } from '../../lib/constants'
import type { ProfileData, ConnectionStatus } from '../../lib/types'

interface Props {
  data:               ProfileData
  isOwnProfile:       boolean
  onEditPress?:       () => void
  onMessagePress?:    () => void
  onConnectionsPress?: (tab: 'connections' | 'followers' | 'following') => void
  realCounts?:        { connections?: number; followers?: number; following?: number }
}

type ConnState = ConnectionStatus | 'loading'

function StatPill({ value, label, onPress }: { value: number; label: string; onPress?: () => void }) {
  const { c } = useTheme()
  return (
    <Pressable onPress={onPress} style={styles.stat} disabled={!onPress} hitSlop={6}>
      <Text style={[styles.statValue, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
        {value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value}
      </Text>
      <Text style={[styles.statLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
        {label}
      </Text>
    </Pressable>
  )
}

export function UserInfoCard({ data, isOwnProfile, onEditPress, onMessagePress, onConnectionsPress, realCounts }: Props) {
  const { c } = useTheme()
  const { patchCachedStatus } = useProfileStore()

  const [connState,     setConnState]     = useState<ConnState>(data.connection_status)
  const [connId,        setConnId]        = useState<number | null>(data.connection_id)
  const [following,     setFollowing]     = useState(data.is_following)
  const [connCount,     setConnCount]     = useState(data.connections_count)
  const [followCount,   setFollowCount]   = useState(data.followers_count)
  const [followingCount,setFollowingCount]= useState(data.following_count)

  // Sync counts with ground-truth from the list APIs once they load
  useEffect(() => {
    if (realCounts?.connections != null) setConnCount(realCounts.connections)
  }, [realCounts?.connections])
  useEffect(() => {
    if (realCounts?.followers != null) setFollowCount(realCounts.followers)
  }, [realCounts?.followers])
  useEffect(() => {
    if (realCounts?.following != null) setFollowingCount(realCounts.following)
  }, [realCounts?.following])

  const handleConnect = useCallback(async () => {
    if (connState === 'loading') return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const prev   = connState
    const prevId = connId

    if (connState === 'none') {
      setConnState('loading')
      try {
        const res = await connApi.sendRequest(data.telegram_id)
        setConnState('pending_sent')
        setConnId(res.id)
        patchCachedStatus(data.telegram_id, { connection_status: 'pending_sent', connection_id: res.id })
      } catch { setConnState(prev) }

    } else if (connState === 'pending_sent' && connId) {
      setConnState('loading')
      try {
        await connApi.cancelRequest(connId)
        setConnState('none')
        setConnId(null)
        patchCachedStatus(data.telegram_id, { connection_status: 'none', connection_id: null })
      } catch { setConnState(prev); setConnId(prevId) }

    } else if (connState === 'accepted' && connId) {
      setConnState('loading')
      try {
        await connApi.remove(connId)
        setConnState('none')
        setConnId(null)
        setConnCount(c => Math.max(0, c - 1))
        patchCachedStatus(data.telegram_id, { connection_status: 'none', connection_id: null, connections_count: Math.max(0, connCount - 1) })
      } catch { setConnState(prev); setConnId(prevId) }

    } else if (connState === 'pending_received' && connId) {
      setConnState('loading')
      try {
        await connApi.accept(connId)
        setConnState('accepted')
        setConnCount(c => c + 1)
        patchCachedStatus(data.telegram_id, { connection_status: 'accepted', connections_count: connCount + 1 })
      } catch { setConnState(prev) }
    }
  }, [connState, connId, data.telegram_id, connCount, patchCachedStatus])

  const handleFollow = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const wasFollowing = following
    setFollowing(f => !f)
    setFollowCount(c => wasFollowing ? Math.max(0, c - 1) : c + 1)
    try {
      if (wasFollowing) await followApi.unfollow(data.telegram_id)
      else              await followApi.follow(data.telegram_id)
      patchCachedStatus(data.telegram_id, {
        is_following: !wasFollowing,
        followers_count: wasFollowing ? Math.max(0, followCount - 1) : followCount + 1,
      })
    } catch {
      setFollowing(wasFollowing)
      setFollowCount(c => wasFollowing ? c + 1 : Math.max(0, c - 1))
    }
  }, [following, followCount, data.telegram_id, patchCachedStatus])

  function connectLabel() {
    switch (connState) {
      case 'loading':          return '...'
      case 'accepted':         return "Bog'langan"
      case 'pending_sent':     return "So'rov yuborildi"
      case 'pending_received': return 'Qabul qilish'
      default:                 return "Bog'lanish"
    }
  }

  function connectIcon() {
    if (connState === 'loading')          return null
    if (connState === 'accepted')         return <UserCheck size={15} color={c.textPrimary} />
    if (connState === 'pending_received') return <UserCheck size={15} color="#fff" />
    if (connState === 'pending_sent')     return <UserX size={15} color={c.textPrimary} />
    return <UserPlus size={15} color="#fff" />
  }

  function connectBg() {
    if (connState === 'accepted')         return c.bgTertiary
    if (connState === 'pending_sent')     return c.bgTertiary
    if (connState === 'pending_received') return c.success
    return c.brand
  }

  function connectTextColor() {
    if (connState === 'accepted')         return c.textPrimary
    if (connState === 'pending_sent')     return c.textPrimary
    return '#fff'
  }

  const messageDisabled = !data.can_message

  return (
    <View style={[styles.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>

      {/* Name row */}
      <View style={styles.nameRow}>
        <Text style={[styles.name, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]} numberOfLines={1}>
          {data.first_name}
        </Text>
        <RoleBadge role={(data as any).role} accountType={data.account_type} size={17} />
        {data.account_type === 'company' && (
          <View style={[styles.rolePill, { backgroundColor: 'rgba(96,165,250,0.12)', borderColor: 'rgba(96,165,250,0.3)' }]}>
            <Text style={[styles.rolePillText, { color: '#60a5fa', fontFamily: typography.fontFamily.semibold }]}>
              Kompaniya
            </Text>
          </View>
        )}
        {data.is_verified && data.account_type === 'student' && (
          <BadgeCheck size={17} color="#60a5fa" />
        )}
      </View>

      {/* Username */}
      {data.username && (
        <Text style={[styles.username, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
          @{data.username}
        </Text>
      )}

      {/* Headline */}
      {data.headline && (
        <Text style={[styles.headline, { color: c.brand, fontFamily: typography.fontFamily.medium }]}>
          {data.headline}
        </Text>
      )}

      {/* Bio */}
      {data.bio && (
        <Text style={[styles.bio, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          {data.bio}
        </Text>
      )}

      {/* Location + website */}
      {(data.location_city || data.website_url) && (
        <View style={styles.metaRow}>
          {data.location_city && (
            <View style={styles.metaItem}>
              <MapPin size={13} color={c.textMuted} />
              <Text style={[styles.metaText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                {data.location_city}
              </Text>
            </View>
          )}
          {data.website_url && (
            <Pressable
              style={styles.metaItem}
              onPress={() => {
                const url = data.website_url!.startsWith('http') ? data.website_url! : `https://${data.website_url}`
                Linking.openURL(url).catch(() => null)
              }}
            >
              <Globe size={13} color={c.brand} />
              <Text style={[styles.metaText, { color: c.brand, fontFamily: typography.fontFamily.regular }]} numberOfLines={1}>
                {data.website_url!.replace(/^https?:\/\//, '')}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Stats row */}
      <View style={[styles.statsRow, { borderTopColor: c.border, borderBottomColor: c.border }]}>
        <StatPill value={connCount}     label="Aloqa"      onPress={() => onConnectionsPress?.('connections')} />
        <View style={[styles.statDivider, { backgroundColor: c.border }]} />
        <StatPill value={followCount}   label="Kuzatuvchi" onPress={() => onConnectionsPress?.('followers')} />
        <View style={[styles.statDivider, { backgroundColor: c.border }]} />
        <StatPill value={followingCount} label="Kuzatilgan" onPress={() => onConnectionsPress?.('following')} />
      </View>

      {/* Action buttons */}
      {isOwnProfile ? (
        <View style={styles.actionsRow}>
          <Pressable
            onPress={onEditPress}
            style={[styles.actionBtn, { backgroundColor: c.bgTertiary, borderColor: c.borderStrong, flex: 1 }]}
          >
            <Pencil size={14} color={c.textSecondary} />
            <Text style={[styles.actionBtnText, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
              Profilni tahrirlash
            </Text>
          </Pressable>
          <Pressable
            onPress={() => Share.share({ message: `${WEB_URL}/profile/${data.telegram_id}` })}
            style={[styles.actionBtnIcon, { backgroundColor: c.bgTertiary, borderColor: c.borderStrong }]}
          >
            <Share2 size={16} color={c.textSecondary} />
          </Pressable>
        </View>
      ) : (
        /* Row 1: Bog'lanish + Kuzatish (50/50), Row 2: Xabar (full width) */
        <View style={styles.actionsCol}>
          <View style={styles.actionsRow}>
            {/* Bog'lanish */}
            <Pressable
              onPress={handleConnect}
              disabled={connState === 'loading'}
              style={[styles.actionBtn, { backgroundColor: connectBg(), flex: 1 }]}
            >
              {connState === 'loading' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  {connectIcon()}
                  <Text style={[styles.actionBtnText, { color: connectTextColor(), fontFamily: typography.fontFamily.medium }]}>
                    {connectLabel()}
                  </Text>
                </>
              )}
            </Pressable>

            {/* Kuzatish */}
            <Pressable
              onPress={handleFollow}
              style={[
                styles.actionBtn,
                {
                  flex:            1,
                  backgroundColor: following ? c.brandSubtle : c.bgTertiary,
                  borderColor:     following ? 'rgba(232,121,47,0.3)' : c.borderStrong,
                },
              ]}
            >
              <Text style={[styles.actionBtnText, { color: following ? c.brand : c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
                {following ? 'Kuzatilgan' : 'Kuzatish'}
              </Text>
            </Pressable>
          </View>

          {/* Xabar — full width, disabled when not connected */}
          <Pressable
            onPress={messageDisabled ? undefined : onMessagePress}
            style={[
              styles.actionBtn,
              {
                backgroundColor: messageDisabled ? c.bgTertiary : c.bgTertiary,
                borderColor:     messageDisabled ? c.border : c.borderStrong,
                opacity:         messageDisabled ? 0.45 : 1,
              },
            ]}
          >
            <MessageSquare size={16} color={messageDisabled ? c.textMuted : c.textSecondary} />
            <Text style={[styles.actionBtnText, { color: messageDisabled ? c.textMuted : c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
              Xabar
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.base,
    marginTop:        spacing.sm,
    borderRadius:     14,
    borderWidth:      StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.base,
    paddingTop:       spacing.base,
    paddingBottom:    spacing.sm,
    gap:              spacing.xs,
  },

  // Name row
  nameRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
    flexWrap:      'wrap',
  },
  name: {
    fontSize: typography.size.xl,
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical:   2,
    borderRadius:      radius.full,
    borderWidth:       1,
  },
  rolePillText: {
    fontSize: 11,
  },
  username: {
    fontSize:  typography.size.sm,
    marginTop: -2,
  },
  headline: {
    fontSize:   typography.size.base,
    lineHeight: 20,
  },
  bio: {
    fontSize:   typography.size.sm,
    lineHeight: 19,
  },

  // Meta
  metaRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.md,
    marginTop:     2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  metaText: {
    fontSize: typography.size.sm,
  },

  // Stats
  statsRow: {
    flexDirection:     'row',
    borderTopWidth:    StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal:  -spacing.base,
    paddingHorizontal: spacing.base,
    marginVertical:    spacing.sm,
  },
  stat: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: spacing.sm,
  },
  statValue: {
    fontSize: typography.size.md,
  },
  statLabel: {
    fontSize:  typography.size.xs,
    marginTop: 1,
  },
  statDivider: {
    width:          StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },

  // Action buttons
  actionsCol: {
    gap:       spacing.xs,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap:           spacing.xs,
  },
  actionBtn: {
    height:            40,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               6,
    borderRadius:      radius.full,
    borderWidth:       StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  actionBtnSm: {
    height:            40,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    borderRadius:      radius.full,
    borderWidth:       StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
  },
  actionBtnIcon: {
    width:          40,
    height:         40,
    borderRadius:   20,
    borderWidth:    StyleSheet.hairlineWidth,
    alignItems:     'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: typography.size.sm,
  },
})

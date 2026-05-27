import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, Animated,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  Flame, Trophy, TrendingUp, Video, Info, Bell,
  Users, Heart, MessageCircle, Repeat2, Bookmark,
  AtSign, Zap, Award, CheckCircle,
} from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { useNotificationStore } from '../../stores/notificationStore'
import { notifs, type NotifItem } from '../../lib/api'
import { typography, spacing } from '../../lib/constants'

// ── Notification dictionary ───────────────────────────────────────────────────

const TITLES: Record<string, string> = {
  follow:              "Yangi obunachi",
  like:                "Layk",
  comment:             "Yangi izoh",
  comment_reply:       "Yangi javob",
  repost:              "Repost",
  save:                "Saqlandi",
  mention:             "Eslatma",
  connection_request:  "Ulanish so'rovi",
  connection_accepted: "So'rov qabul qilindi",
  level_up:            "Yangi daraja",
  achievement:         "Yutuq ochildi",
  xp_reward:           "XP mukofot",
  course_complete:     "Kurs yakunlandi",
  certificate:         "Sertifikat tayyor",
  quiz_pass:           "Test natijasi",
  new_student:         "Yangi talaba",
  new_sale:            "Yangi sotish",
  payout:              "To'lov o'tkazildi",
  welcome:             "Sahifalab'ga xush kelibsiz",
  leaderboard_rank:    "Reyting",
  streak_reminder:     "Streak eslatmasi",
  new_content:         "Yangi dars",
}

function notifTitle(type: string): string {
  return TITLES[type] ?? 'Bildirishnoma'
}

function notifBody(type: string, meta: Record<string, any>): string {
  const actor = meta.actor_name ?? meta.first_name ?? 'Kimdir'
  const map: Record<string, string> = {
    follow:              `${actor} sizga obuna bo'ldi.`,
    like:                `${actor} postingizga layk bosdi.`,
    comment:             `${actor} postingizga izoh qoldirdi.`,
    comment_reply:       `${actor} izohingizga javob berdi.`,
    repost:              `${actor} postingizni repost qildi.`,
    save:                `${actor} postingizni saqladi.`,
    mention:             `${actor} sizni eslatib o'tdi.`,
    connection_request:  `${actor} sizga ulanish so'rovi yubordi.`,
    connection_accepted: `${actor} ulanish so'rovingizni qabul qildi.`,
    level_up:            "Tabriklaymiz! Yangi darajaga ko'tarildingiz.",
    achievement:         "Yangi yutuq ochildi — davom eting!",
    xp_reward:           "Postingiz ko'p ko'rindi — XP mukofot oldiniz.",
    course_complete:     "Kurs muvaffaqiyatli yakunlandi.",
    certificate:         "Sertifikatingiz tayyor — yuklab oling.",
    quiz_pass:           "Testni muvaffaqiyatli topshirdingiz.",
    new_student:         "Yangi o'quvchi kursingizga yozildi.",
    new_sale:            "Yangi daromad tushdi.",
    payout:              "Daromadingiz hisobingizga o'tkazildi.",
    welcome:             "Ilm yo'liga xush kelibsiz. Profilingizni to'ldiring.",
    leaderboard_rank:    meta.message ?? "Reyting o'zgardi.",
    streak_reminder:     "Bugun dars o'tmaganiz — streakingizni saqlang!",
    new_content:         meta.lesson_title ? `Yangi dars: ${meta.lesson_title}` : "Yangi dars qo'shildi.",
  }
  return map[type] ?? 'Yangi bildirishnoma'
}

function resolveRoute(type: string, meta: Record<string, any>): string | null {
  switch (type) {
    case 'follow':
    case 'connection_request':
    case 'connection_accepted':
      return meta.actor_id ? `/(screens)/profile/${meta.actor_id}` : null
    case 'new_content':
    case 'course_complete':
    case 'new_student':
    case 'new_sale':
      return meta.course_id ? `/(screens)/course/${meta.course_id}` : null
    case 'certificate':
      return meta.course_id ? `/(screens)/course/${meta.course_id}` : '/(tabs)/profile'
    case 'quiz_pass':
      return meta.test_id ? `/(screens)/test/${meta.test_id}` : null
    case 'level_up':
    case 'achievement':
    case 'xp_reward':
    case 'welcome':
      return '/(tabs)/profile'
    case 'leaderboard_rank':
      return '/(screens)/leaderboard'
    case 'streak_reminder':
      return '/(tabs)/study'
    default:
      return null
  }
}

// ── Icon config ───────────────────────────────────────────────────────────────

type LucideIcon = React.ComponentType<{ size: number; color: string }>

function getIconCfg(type: string): { Icon: LucideIcon; color: string; bg: string } {
  switch (type) {
    case 'follow':
    case 'connection_request':
    case 'connection_accepted':
    case 'new_student':
      return { Icon: Users,          color: '#4DA6FF', bg: 'rgba(77,166,255,0.12)'  }
    case 'like':
    case 'save':
      return { Icon: Heart,          color: '#FF6B9D', bg: 'rgba(255,107,157,0.12)' }
    case 'comment':
    case 'comment_reply':
      return { Icon: MessageCircle,  color: '#4DA6FF', bg: 'rgba(77,166,255,0.12)'  }
    case 'mention':
      return { Icon: AtSign,         color: '#4DA6FF', bg: 'rgba(77,166,255,0.12)'  }
    case 'repost':
      return { Icon: Repeat2,        color: '#4DA6FF', bg: 'rgba(77,166,255,0.12)'  }
    case 'streak_reminder':
      return { Icon: Flame,          color: '#FFB830', bg: 'rgba(255,184,48,0.15)'  }
    case 'achievement':
    case 'leaderboard_rank':
      return { Icon: Trophy,         color: '#FFD700', bg: 'rgba(255,215,0,0.12)'   }
    case 'level_up':
      return { Icon: TrendingUp,     color: '#F5A623', bg: 'rgba(245,166,35,0.12)'  }
    case 'xp_reward':
      return { Icon: Zap,            color: '#F5A623', bg: 'rgba(245,166,35,0.12)'  }
    case 'course_complete':
    case 'certificate':
      return { Icon: Award,          color: '#4DA6FF', bg: 'rgba(77,166,255,0.12)'  }
    case 'quiz_pass':
      return { Icon: CheckCircle,    color: '#34C759', bg: 'rgba(52,199,89,0.12)'   }
    case 'new_content':
      return { Icon: Video,          color: '#4DA6FF', bg: 'rgba(77,166,255,0.12)'  }
    case 'new_sale':
    case 'payout':
      return { Icon: TrendingUp,     color: '#34C759', bg: 'rgba(52,199,89,0.12)'   }
    case 'welcome':
      return { Icon: Bell,           color: '#4DA6FF', bg: 'rgba(77,166,255,0.12)'  }
    default:
      return { Icon: Info,           color: '#9B9BA4', bg: 'rgba(155,155,164,0.12)' }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

function relativeTime(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (mins < 2)   return 'Hozirgina'
  if (mins < 60)  return `${mins} daqiqa oldin`
  if (hours < 24) return `${hours} soat oldin`
  if (days === 1) return 'Kecha'
  if (days < 7)   return `${days} kun oldin`
  return new Date(iso).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow({ c }: { c: any }) {
  const pulse = useRef(new Animated.Value(0.4)).current
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    ).start()
  }, [])
  return (
    <Animated.View style={[styles.skelRow, { opacity: pulse }]}>
      <View style={[styles.skelCircle,  { backgroundColor: c.bgTertiary }]} />
      <View style={styles.skelContent}>
        <View style={[styles.skelLine1, { backgroundColor: c.bgTertiary }]} />
        <View style={[styles.skelLine2, { backgroundColor: c.bgTertiary }]} />
      </View>
      <View style={[styles.skelDot, { backgroundColor: c.bgTertiary }]} />
    </Animated.View>
  )
}

// ── Notification row ──────────────────────────────────────────────────────────

function NotifRow({ item, onPress, c }: { item: NotifItem; onPress: (item: NotifItem) => void; c: any }) {
  const { Icon, color, bg } = getIconCfg(item.type)
  const meta = item.meta ?? {}
  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: item.is_read ? c.bgPrimary : c.bgSecondary },
        pressed && { backgroundColor: c.bgTertiary },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: bg }]}>
        <Icon size={22} color={color} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]} numberOfLines={1}>
          {notifTitle(item.type)}
        </Text>
        <Text style={[styles.body, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]} numberOfLines={2}>
          {notifBody(item.type, meta)}
        </Text>
        <Text style={[styles.time, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
          {relativeTime(item.created_at)}
        </Text>
      </View>
      {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: '#4DA6FF' }]} />}
    </Pressable>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function NotificationsTab() {
  const { c }   = useTheme()
  const insets  = useSafeAreaInsets()
  const router  = useRouter()
  const { fetchUnreadCount, decrement, reset } = useNotificationStore()

  const [items,       setItems]       = useState<NotifItem[]>([])
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore,     setHasMore]     = useState(true)
  const [markingAll,  setMarkingAll]  = useState(false)
  const cursorRef = useRef<number | undefined>(undefined)

  const loadPage = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      cursorRef.current = undefined
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    try {
      const res = await notifs.list(PAGE_SIZE, cursorRef.current)
      const newItems = res.notifications ?? []
      setItems(prev => isRefresh ? newItems : [...prev, ...newItems])
      cursorRef.current = res.next_cursor ?? undefined
      setHasMore(res.next_cursor != null)
    } catch {}
    setLoading(false)
    setLoadingMore(false)
  }, [])

  useEffect(() => {
    loadPage(true)
    fetchUnreadCount()
  }, [])

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true)
    await notifs.markAllRead()
    setItems(prev => prev.map(it => ({ ...it, is_read: true })))
    reset()
    setMarkingAll(false)
  }, [reset])

  const handleNotifPress = useCallback(async (item: NotifItem) => {
    if (!item.is_read) {
      notifs.markRead(item.id)
      setItems(prev => prev.map(it => it.id === item.id ? { ...it, is_read: true } : it))
      decrement(1)
    }
    const route = resolveRoute(item.type, item.meta ?? {})
    if (route) router.push(route as any)
  }, [decrement, router])

  const handleEndReached = useCallback(() => {
    if (!loadingMore && hasMore) loadPage(false)
  }, [loadingMore, hasMore, loadPage])

  const renderItem     = ({ item }: { item: NotifItem }) => (
    <NotifRow item={item} onPress={handleNotifPress} c={c} />
  )
  const renderSep      = () => <View style={[styles.separator, { backgroundColor: c.border }]} />
  const renderFooter   = () => loadingMore
    ? <ActivityIndicator color={c.accentPrimary} style={{ marginVertical: spacing.base }} />
    : null
  const renderEmpty    = () => loading ? null : (
    <View style={styles.emptyState}>
      <Bell size={48} color={c.textDisabled} />
      <Text style={[styles.emptyTitle, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
        Hozircha bildirishnoma yo'q
      </Text>
      <Text style={[styles.emptySub, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
        Faoliyatingiz bo'lganda bu yerda ko'rinadi
      </Text>
    </View>
  )

  return (
    <View style={[styles.root, { backgroundColor: c.bgPrimary }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm, borderBottomColor: c.border }]}>
        <Text style={[styles.topTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Bildirishnomalar
        </Text>
        <Pressable onPress={handleMarkAllRead} disabled={markingAll} hitSlop={8}>
          {markingAll
            ? <ActivityIndicator size="small" color={c.accentPrimary} />
            : <Text style={[styles.markAllText, { color: c.accentPrimary, fontFamily: typography.fontFamily.regular }]}>
                Barchasini o'qish
              </Text>
          }
        </Pressable>
      </View>

      {loading ? (
        <View style={{ paddingTop: spacing.sm }}>
          {[0, 1, 2, 3, 4].map(i => <SkeletonRow key={i} c={c} />)}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          ItemSeparatorComponent={renderSep}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={items.length === 0 ? styles.listEmpty : undefined}
        />
      )}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.screenMargin,
    paddingBottom:     spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topTitle:    { fontSize: 20 },
  markAllText: { fontSize: 13 },

  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.screenMargin,
    paddingVertical:   12,
    gap:               12,
  },
  iconCircle: {
    width:          40,
    height:         40,
    borderRadius:   20,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  content: { flex: 1, gap: 3 },
  title:   { fontSize: 15 },
  body:    { fontSize: 13, lineHeight: 18 },
  time:    { fontSize: 11, marginTop: 2 },

  unreadDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },

  separator: {
    height:     StyleSheet.hairlineWidth,
    marginLeft: spacing.screenMargin + 40 + 12,
  },

  skelRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.screenMargin,
    paddingVertical:   14,
    gap:               12,
  },
  skelCircle:  { width: 40, height: 40, borderRadius: 20 },
  skelContent: { flex: 1, gap: 8 },
  skelLine1:   { height: 14, borderRadius: 7, width: '70%' },
  skelLine2:   { height: 11, borderRadius: 6, width: '90%' },
  skelDot:     { width: 8,  height: 8,  borderRadius: 4 },

  listEmpty:  { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl, marginTop: 80 },
  emptyTitle: { fontSize: 15, textAlign: 'center' },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 20 },
})

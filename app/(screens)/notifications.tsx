import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  View, Text, StyleSheet, FlatList, Pressable,
  RefreshControl, ActivityIndicator, ScrollView,
  Animated, Dimensions, LayoutChangeEvent,
} from 'react-native'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import ReAnimated, { runOnJS } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack, useRouter } from 'expo-router'
import {
  Bell, ChevronLeft, CheckCheck, BellOff,
  Heart, MessageCircle, UserPlus, Repeat2,
  GraduationCap, BookCheck, Award, TrendingUp,
  Trophy, Flame, Zap, Star, Users,
} from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { request } from '../../lib/api'
import { formatTime } from '../../lib/utils'
import { typography, spacing, radius } from '../../lib/constants'
import { useNotificationStore } from '../../stores/notificationStore'

// ── Types ─────────────────────────────────────────────────────────────────────

type NotifCategory = 'SOCIAL' | 'EDUCATIONAL' | 'GROWTH' | 'BUSINESS'

interface NotificationItem {
  id:         number
  type:       string
  category:   NotifCategory
  meta:       Record<string, any>
  is_read:    boolean
  created_at: string
}

// ── Notification dictionary ───────────────────────────────────────────────────

const actor = (meta: Record<string, any>) =>
  meta.actor_name || meta.first_name || 'Foydalanuvchi'

const NOTIF_DICT: Record<string, {
  Icon:    React.ElementType
  color:   string
  message: (meta: Record<string, any>) => string
}> = {
  follow:          { Icon: UserPlus,      color: '#60a5fa', message: () => "Yangi foydalanuvchi sizga obuna bo'ldi." },
  like:            { Icon: Heart,         color: '#f87171', message: m => `${actor(m)} sizning postingizga like bosdi.` },
  comment:         { Icon: MessageCircle, color: '#34d399', message: m => `${actor(m)} sizning postingizga izoh qoldirdi.` },
  comment_reply:   { Icon: MessageCircle, color: '#34d399', message: m => `${actor(m)} izohingizga javob berdi.` },
  repost:          { Icon: Repeat2,       color: '#a78bfa', message: () => "Kimdir sizning postingizni ulashdi." },
  enrollment:      { Icon: GraduationCap, color: '#e8792f', message: m => m.course_title ? `"${m.course_title}" kursiga yozildingiz.` : "Kursga yozildingiz." },
  lesson_complete: { Icon: BookCheck,     color: '#34d399', message: m => m.lesson_title ? `"${m.lesson_title}" yakunlandi.` : "Dars yakunlandi." },
  course_complete: { Icon: Award,         color: '#fbbf24', message: m => m.course_title ? `"${m.course_title}" to'liq yakunlandi!` : "Kurs yakunlandi!" },
  certificate:     { Icon: Award,         color: '#fbbf24', message: m => m.course_title ? `"${m.course_title}" sertifikati tayyor.` : "Sertifikat tayyor." },
  level_up:        { Icon: TrendingUp,    color: '#e8792f', message: m => `Tabriklaymiz! Siz ${m.level ?? '?'}-darajaga ko'tarildingiz! 🎉` },
  achievement:     { Icon: Trophy,        color: '#fbbf24', message: m => m.achievement_name ? `"${m.achievement_name}" yutug'i qo'lga kiritildi!` : "Yangi yutuq!" },
  daily_streak:    { Icon: Flame,         color: '#fb923c', message: m => `${m.streak_days ?? '?'} kunlik ketma-ketlik! Shunchaki zo'r! 🔥` },
  xp_reward:       { Icon: Zap,           color: '#facc15', message: m => `${m.xp ?? 0} XP yutuq sifatida berildi.` },
  new_student:     { Icon: Users,         color: '#60a5fa', message: m => `${m.student_name || 'Yangi talaba'} kursizga yozildi.` },
  new_review:      { Icon: Star,          color: '#fbbf24', message: m => `${actor(m)} kursizga baho qoldirdi.` },
}

function getNotifDef(type: string) {
  return NOTIF_DICT[type] ?? { Icon: Bell, color: '#6b7280', message: () => 'Yangi bildirishnoma' }
}

// ── Category tabs ─────────────────────────────────────────────────────────────

const TABS: { key: 'ALL' | NotifCategory; label: string }[] = [
  { key: 'ALL',         label: 'Barchasi' },
  { key: 'SOCIAL',      label: 'Ijtimoiy' },
  { key: 'EDUCATIONAL', label: "Ta'lim"   },
  { key: 'GROWTH',      label: "O'sish"   },
  { key: 'BUSINESS',    label: 'Biznes'   },
]

// ── Animated tab bar ──────────────────────────────────────────────────────────

function TabBar({
  tab, onSelect, tabUnread, borderColor,
}: {
  tab:         'ALL' | NotifCategory
  onSelect:    (key: 'ALL' | NotifCategory) => void
  tabUnread:   (key: 'ALL' | NotifCategory) => number
  borderColor: string
}) {
  const { c }      = useTheme()
  const scrollRef  = useRef<ScrollView>(null)
  const indicatorX = useRef(new Animated.Value(0)).current
  const indicatorW = useRef(new Animated.Value(0)).current
  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({})

  const moveIndicator = useCallback((key: string) => {
    const layout = tabLayouts.current[key]
    if (!layout) return
    Animated.parallel([
      Animated.spring(indicatorX, { toValue: layout.x,     useNativeDriver: false, speed: 20, bounciness: 4 }),
      Animated.spring(indicatorW, { toValue: layout.width, useNativeDriver: false, speed: 20, bounciness: 4 }),
    ]).start()
  }, [indicatorX, indicatorW])

  useEffect(() => {
    moveIndicator(tab)
    const layout = tabLayouts.current[tab]
    if (layout && scrollRef.current) {
      const screenW   = Dimensions.get('window').width
      const targetX   = Math.max(0, layout.x - screenW / 2 + layout.width / 2)
      scrollRef.current.scrollTo({ x: targetX, animated: true })
    }
  }, [tab, moveIndicator])

  return (
    <View style={[styles.tabBarWrap, { borderBottomColor: borderColor }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map(({ key, label }) => {
          const active = tab === key
          const unread = tabUnread(key)
          return (
            <Pressable
              key={key}
              onLayout={(e: LayoutChangeEvent) => {
                const { x, width } = e.nativeEvent.layout
                tabLayouts.current[key] = { x, width }
                if (key === tab) moveIndicator(key)
              }}
              onPress={() => onSelect(key)}
              style={styles.tabItem}
            >
              <Text style={[
                styles.tabLabel,
                {
                  color:      active ? c.brand : c.textMuted,
                  fontFamily: active ? typography.fontFamily.semibold : typography.fontFamily.regular,
                },
              ]}>
                {label}
              </Text>
              {unread > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: c.brand }]}>
                  <Text style={styles.tabBadgeText}>{unread > 9 ? '9+' : unread}</Text>
                </View>
              )}
            </Pressable>
          )
        })}
      </ScrollView>

      {/* Indicator rendered OUTSIDE the ScrollView so it's positioned relative to the bar, not the scroll content */}
      <Animated.View
        pointerEvents="none"
        style={[styles.indicator, { backgroundColor: c.brand, left: indicatorX, width: indicatorW }]}
      />
    </View>
  )
}

// ── Notification card ─────────────────────────────────────────────────────────

function NotifCard({
  item, onPress,
}: {
  item:    NotificationItem
  onPress: (item: NotificationItem) => void
}) {
  const { c } = useTheme()
  const def   = getNotifDef(item.type)
  const { Icon, color, message } = def

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.notifCard,
        {
          backgroundColor: item.is_read ? c.bgSecondary : c.bgElevated,
          borderColor:     item.is_read ? c.border : c.brand + '33',
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* Unread accent */}
      {!item.is_read && (
        <View style={[styles.unreadBar, { backgroundColor: '#e8792f' }]} />
      )}

      {/* Icon circle */}
      <View style={[styles.iconCircle, { backgroundColor: `${color}22` }]}>
        <Icon size={18} color={color} />
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <Text style={[styles.notifMsg, {
          color:      c.textPrimary,
          fontFamily: item.is_read ? typography.fontFamily.regular : typography.fontFamily.medium,
        }]} numberOfLines={3}>
          {message(item.meta)}
        </Text>
        <Text style={[styles.notifTime, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
          {formatTime(item.created_at)}
        </Text>
      </View>

      {/* Unread dot */}
      {!item.is_read && (
        <View style={[styles.unreadDot, { backgroundColor: '#e8792f' }]} />
      )}
    </Pressable>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { c }  = useTheme()
  const router = useRouter()
  const { reset: resetBadge } = useNotificationStore()

  const [allItems,   setAllItems]   = useState<NotificationItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [marking,    setMarking]    = useState(false)
  const [tab,        setTab]        = useState<'ALL' | NotifCategory>('ALL')

  // ── Swipe gesture ──────────────────────────────────────────────────────────
  // Recreate the gesture whenever tab changes so the worklet captures the
  // current tab string by value — no shared value / ref needed.
  const pan = useMemo(() =>
    Gesture.Pan()
      .activeOffsetX([-15, 15])
      .failOffsetY([-10, 10])
      .onEnd(e => {
        'worklet'
        const idx = TABS.findIndex(t => t.key === tab)
        if ((e.velocityX < -400 || e.translationX < -60) && idx < TABS.length - 1) {
          runOnJS(setTab)(TABS[idx + 1].key)
        } else if ((e.velocityX > 400 || e.translationX > 60) && idx > 0) {
          runOnJS(setTab)(TABS[idx - 1].key)
        }
      }),
  [tab])

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      const data = await request<{ notifications: NotificationItem[] }>(
        '/api/notifications?limit=60', { auth: true }
      )
      const items = data.notifications ?? []
      const hasUnread = items.some(n => !n.is_read)
      // Mark all as read immediately — show them as read right away
      setAllItems(items.map(n => ({ ...n, is_read: true })))
      if (hasUnread) {
        resetBadge()
        request('/api/notifications/read', {
          method: 'POST', auth: true,
          body: JSON.stringify({ notification_ids: null }),
        }).catch(() => {})
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [resetBadge])

  useEffect(() => { load() }, [load])

  const markRead = useCallback((item: NotificationItem) => {
    // No-op: auto-mark-all on load already persists to DB.
    // This handler exists only for future navigation on tap.
  }, [])

  const markAllRead = useCallback(async () => {
    if (marking) return
    setMarking(true)
    setAllItems(prev => prev.map(n => ({ ...n, is_read: true })))
    resetBadge()
    try {
      await request('/api/notifications/read', {
        method: 'POST', auth: true,
        body: JSON.stringify({ notification_ids: null }),
      })
    } catch {}
    finally { setMarking(false) }
  }, [marking])

  const filtered    = tab === 'ALL' ? allItems : allItems.filter(n => n.category === tab)
  const unreadCount = allItems.filter(n => !n.is_read).length

  const tabUnread = (key: 'ALL' | NotifCategory) =>
    key === 'ALL'
      ? unreadCount
      : allItems.filter(n => !n.is_read && n.category === key).length

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bgPrimary }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <ChevronLeft size={22} color={c.textSecondary} />
        </Pressable>
        <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Bildirishnomalar
        </Text>
        {unreadCount > 0 && (
          <Pressable onPress={markAllRead} hitSlop={8} disabled={marking}>
            <CheckCheck size={18} color={marking ? c.textMuted : c.brand} />
          </Pressable>
        )}
      </View>

      {/* Animated tab bar */}
      <TabBar
        tab={tab}
        onSelect={setTab}
        tabUnread={tabUnread}
        borderColor={c.border}
      />

      {/* Swipeable content area */}
      <GestureDetector gesture={pan}>
        <ReAnimated.View style={{ flex: 1 }}>
          {loading ? (
            <ActivityIndicator color={c.brand} style={{ marginTop: spacing['2xl'] }} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => <NotifCard item={item} onPress={markRead} />}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => load(true)}
                  tintColor={c.brand}
                  colors={[c.brand]}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <BellOff size={40} color={c.textMuted} />
                  <Text style={[styles.emptyText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                    Bildirishnomalar yo'q
                  </Text>
                </View>
              }
            />
          )}
        </ReAnimated.View>
      </GestureDetector>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    gap:               spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 2 },
  title: {
    flex:     1,
    fontSize: typography.size.lg,
  },

  // ── Tab bar ────────────────────────────────────────────────────────────────
  tabBarWrap: {
    borderBottomWidth: 1,
    // needed so the absolute-positioned indicator is clipped to this view
    overflow:          'hidden',
  },
  tabBarContent: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.xs,
    paddingBottom:     spacing.sm,    // space for indicator below labels
    flexDirection:     'row',
    alignItems:        'center',
  },
  tabItem: {
    paddingHorizontal: spacing.sm + 4,
    paddingBottom:     4,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
  },
  tabLabel: {
    fontSize: typography.size.sm,
  },
  tabBadge: {
    minWidth:          16,
    height:            16,
    borderRadius:      8,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: {
    color:      '#fff',
    fontSize:   9,
    fontWeight: '700',
  },
  indicator: {
    position:     'absolute',
    bottom:       0,
    height:       2,
    borderRadius: 1,
  },

  // ── Notification card ──────────────────────────────────────────────────────
  listContent: {
    padding:       spacing.base,
    paddingBottom: 80,
    gap:           spacing.xs + 2,
  },
  notifCard: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:             spacing.sm,
    borderRadius:    radius.xl,
    borderWidth:     1,
    padding:         spacing.sm + 2,
    overflow:        'hidden',
    position:        'relative',
  },
  unreadBar: {
    position: 'absolute',
    left:     0,
    top:      0,
    bottom:   0,
    width:    3,
  },
  iconCircle: {
    width:          40,
    height:         40,
    borderRadius:   20,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  notifMsg: {
    fontSize:   typography.size.sm,
    lineHeight: 20,
  },
  notifTime: {
    fontSize:  11,
    marginTop: 4,
  },
  unreadDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
    marginTop:    6,
    flexShrink:   0,
  },
  emptyWrap: {
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: 80,
    gap:             spacing.sm,
  },
  emptyText: {
    fontSize: typography.size.sm,
  },
})

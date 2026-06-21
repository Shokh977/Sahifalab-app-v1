import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Modal, ActivityIndicator } from 'react-native'
import ReAnimated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import {
  Bell, Heart, MessageCircle, UserPlus, Repeat2,
  GraduationCap, BookCheck, Award, TrendingUp,
  Trophy, Flame, Zap, Star, Users, LayoutList,
} from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { request } from '../../lib/api'
import { formatTime } from '../../lib/utils'
import { typography, spacing, radius } from '../../lib/constants'
import { useNotificationStore } from '../../stores/notificationStore'

interface NotifItem {
  id:         number
  type:       string
  meta:       Record<string, any>
  is_read:    boolean
  created_at: string
}

const actor = (m: Record<string, any>) => m.actor_name || m.first_name || 'Foydalanuvchi'

const DICT: Record<string, {
  Icon:    React.ElementType
  color:   string
  title:   string
  message: (m: Record<string, any>) => string
}> = {
  follow:          { Icon: UserPlus,      color: '#60a5fa', title: 'Yangi obunachi',  message: () => "Yangi foydalanuvchi sizga obuna bo'ldi."      },
  like:            { Icon: Heart,         color: '#f87171', title: 'Like',            message: m => `${actor(m)} sizning postingizga like bosdi.`   },
  comment:         { Icon: MessageCircle, color: '#34d399', title: 'Izoh',            message: m => `${actor(m)} izoh qoldirdi.`                    },
  repost:          { Icon: Repeat2,       color: '#a78bfa', title: 'Ulashdi',         message: () => "Kimdir sizning postingizni ulashdi."            },
  enrollment:      { Icon: GraduationCap, color: '#e8792f', title: 'Kurs',            message: m => m.course_title ? `"${m.course_title}" kursiga yozildingiz.` : "Kursga yozildingiz." },
  course_granted:  { Icon: GraduationCap, color: '#10b981', title: 'Kurs ochildi',   message: m => m.course_title ? `🎉 "${m.course_title}" kursi sizga ochildi!` : "🎉 Kurs sizga ochildi!" },
  lesson_complete: { Icon: BookCheck,     color: '#34d399', title: 'Dars yakunlandi', message: m => m.lesson_title ? `"${m.lesson_title}" yakunlandi.` : "Dars yakunlandi." },
  course_complete: { Icon: Award,         color: '#fbbf24', title: 'Kurs yakunlandi', message: m => m.course_title ? `"${m.course_title}" to'liq yakunlandi!` : "Kurs yakunlandi!" },
  certificate:     { Icon: Award,         color: '#fbbf24', title: 'Sertifikat',      message: m => m.course_title ? `"${m.course_title}" sertifikati tayyor.` : "Sertifikat tayyor." },
  level_up:        { Icon: TrendingUp,    color: '#e8792f', title: 'Daraja oshdi',    message: m => `Siz ${m.level ?? '?'}-darajaga ko'tarildingiz!` },
  achievement:     { Icon: Trophy,        color: '#fbbf24', title: 'Yutuq',           message: m => m.achievement_name ? `"${m.achievement_name}" qo'lga kiritildi!` : "Yangi yutuq!" },
  daily_streak:    { Icon: Flame,         color: '#fb923c', title: 'Seriya',          message: m => `${m.streak_days ?? '?'} kunlik ketma-ketlik!`   },
  xp_reward:       { Icon: Zap,           color: '#facc15', title: 'XP',              message: m => `${m.xp ?? 0} XP berildi.`                       },
  new_student:     { Icon: Users,         color: '#60a5fa', title: 'Yangi talaba',    message: m => `${m.student_name || 'Yangi talaba'} kursingizga a'zo bo'ldi.` },
  new_review:      { Icon: Star,          color: '#fbbf24', title: 'Baho',            message: m => `${actor(m)} kursizga baho qoldirdi.`            },
}

function getDef(type: string) {
  return DICT[type] ?? { Icon: Bell, color: '#6b7280', title: 'Bildirishnoma', message: () => 'Yangi bildirishnoma' }
}

interface Props {
  visible:    boolean
  onClose:    () => void
  anchorTop?: number
}

const EASE = Easing.out(Easing.cubic)

export function NotificationsDropdown({ visible, onClose, anchorTop = 60 }: Props) {
  const { c }  = useTheme()
  const router = useRouter()
  const { fetchUnreadCount } = useNotificationStore()

  const [items,   setItems]   = useState<NotifItem[]>([])
  const [loading, setLoading] = useState(false)

  const opacity    = useSharedValue(0)
  const scale      = useSharedValue(0.97)
  const translateY = useSharedValue(-6)

  useEffect(() => {
    if (visible) {
      opacity.value    = withTiming(1, { duration: 170, easing: EASE })
      scale.value      = withTiming(1, { duration: 180, easing: EASE })
      translateY.value = withTiming(0, { duration: 180, easing: EASE })

      setLoading(true)
      request<{ notifications: NotifItem[] }>('/api/notifications?limit=5', { auth: true })
        .then(d => {
          setItems(d.notifications ?? [])
          // Refresh badge after seeing latest notifications
          fetchUnreadCount()
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [visible])

  const animStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }))

  if (!visible) return null

  function openAll() {
    onClose()
    setTimeout(() => router.push('/(screens)/notifications' as any), 50)
  }

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <ReAnimated.View
          style={[styles.panel, { backgroundColor: c.bgSecondary, borderColor: c.border, top: anchorTop }, animStyle]}
        >
          <View style={[styles.header, { borderBottomColor: c.border }]}>
            <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              Bildirishnomalar
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator color={c.brand} style={{ paddingVertical: spacing.xl }} />
          ) : items.length === 0 ? (
            <View style={styles.empty}>
              <Bell size={28} color={c.textMuted} />
              <Text style={[styles.emptyText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                Bildirishnomalar yo'q
              </Text>
            </View>
          ) : (
            items.map((item, idx) => {
              const { Icon, color, title, message } = getDef(item.type)
              return (
                <View key={item.id}>
                  {idx > 0 && <View style={[styles.sep, { backgroundColor: c.border }]} />}
                  <Pressable
                    style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.bgTertiary : 'transparent' }]}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: `${color}22` }]}>
                      <Icon size={20} color={color} strokeWidth={1.8} />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={[styles.rowTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                        {title}
                      </Text>
                      <Text numberOfLines={2} style={[styles.rowMsg, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                        {message(item.meta)}
                      </Text>
                      <Text style={[styles.rowTime, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                        {formatTime(item.created_at)}
                      </Text>
                    </View>
                    {!item.is_read && <View style={[styles.dot, { backgroundColor: c.brand }]} />}
                  </Pressable>
                </View>
              )
            })
          )}

          <Pressable
            onPress={openAll}
            style={({ pressed }) => [styles.seeAll, { borderTopColor: c.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <LayoutList size={16} color={c.brand} />
            <Text style={[styles.seeAllText, { color: c.brand, fontFamily: typography.fontFamily.semibold }]}>
              Barchasini ko'rish →
            </Text>
          </Pressable>
        </ReAnimated.View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  panel: {
    position:      'absolute',
    left:          12,
    right:         12,
    borderRadius:  radius['2xl'],
    borderWidth:   1,
    overflow:      'hidden',
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius:  20,
    elevation:     14,
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.md + 2,
    paddingBottom:     spacing.md,
    borderBottomWidth: 1,
  },
  title:    { fontSize: typography.size.lg },
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm + 2,
  },
  iconCircle: {
    width:          46,
    height:         46,
    borderRadius:   23,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  rowBody:  { flex: 1, gap: 2 },
  rowTitle: { fontSize: typography.size.sm },
  rowMsg:   { fontSize: typography.size.sm },
  rowTime:  { fontSize: typography.size.xs },
  sep: {
    height:           StyleSheet.hairlineWidth,
    marginHorizontal: spacing.base,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4, flexShrink: 0,
  },
  empty: {
    alignItems:      'center',
    gap:             spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyText: { fontSize: typography.size.sm },
  seeAll: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing.sm,
    borderTopWidth:  1,
    paddingVertical: spacing.md,
  },
  seeAllText: { fontSize: typography.size.sm },
})

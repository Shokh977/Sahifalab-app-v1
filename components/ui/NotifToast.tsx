import React, { useEffect, useRef } from 'react'
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X, Flame, Trophy, TrendingUp, Calendar, Video, Info, FileText } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { useNotifToastStore } from '../../stores/notifToastStore'
import { typography, spacing, radius } from '../../lib/constants'
import { useRouter } from 'expo-router'

function notifIcon(type: string, color: string) {
  const size = 20
  switch (type) {
    case 'streak_reminder': return <Flame        size={size} color={color} />
    case 'achievement':     return <Trophy       size={size} color={color} />
    case 'level_up':        return <TrendingUp   size={size} color={color} />
    case 'course_reminder': return <Calendar     size={size} color={color} />
    case 'live_session':    return <Video        size={size} color={color} />
    case 'test_reminder':   return <FileText     size={size} color={color} />
    default:                return <Info         size={size} color={color} />
  }
}

function resolveRoute(data?: Record<string, any>): string | null {
  if (!data?.screen) return null
  switch (data.screen) {
    case 'study_timer':  return '/(tabs)/study'
    case 'course':       return data.course_id ? `/(screens)/course/${data.course_id}` : null
    case 'test':         return data.test_id   ? `/(screens)/test/${data.test_id}`     : null
    case 'certificate':  return data.code      ? `/(screens)/certificate/${data.code}` : null
    case 'leaderboard':  return '/(screens)/leaderboard'
    case 'profile':      return '/(tabs)/profile'
    default:             return null
  }
}

export function NotifToast() {
  const { c }       = useTheme()
  const insets      = useSafeAreaInsets()
  const router      = useRouter()
  const { toast, hideToast } = useNotifToastStore()

  const translateY = useRef(new Animated.Value(-100)).current
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (toast) {
      // Slide in
      Animated.spring(translateY, {
        toValue: 0, useNativeDriver: true,
        tension: 100, friction: 10,
      }).start()

      // Auto-dismiss after 4s
      timerRef.current = setTimeout(() => {
        dismiss()
      }, 4000)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [toast])

  const dismiss = () => {
    Animated.timing(translateY, {
      toValue: -160, duration: 250, useNativeDriver: true,
    }).start(() => hideToast())
  }

  const handlePress = () => {
    const route = resolveRoute(toast?.data)
    dismiss()
    if (route) setTimeout(() => router.push(route as any), 300)
  }

  if (!toast) return null

  const iconColor = toast.type === 'streak_reminder' ? c.warning : c.accentPrimary

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top:             insets.top + 8,
          backgroundColor: c.bgSecondary,
          transform:       [{ translateY }],
          shadowColor:     '#000',
          shadowOffset:    { width: 0, height: 4 },
          shadowOpacity:   0.2,
          shadowRadius:    12,
          elevation:       8,
        },
      ]}
    >
      <Pressable onPress={handlePress} style={styles.inner}>
        <View style={[styles.iconCircle, { backgroundColor: c.bgTertiary }]}>
          {notifIcon(toast.type, iconColor)}
        </View>
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]} numberOfLines={1}>
            {toast.title}
          </Text>
          <Text style={[styles.body, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]} numberOfLines={1}>
            {toast.body}
          </Text>
        </View>
        <Pressable onPress={dismiss} hitSlop={8} style={styles.closeBtn}>
          <X size={16} color={c.textDisabled} />
        </Pressable>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position:          'absolute',
    left:              spacing.screenMargin,
    right:             spacing.screenMargin,
    zIndex:            9999,
    borderRadius:      radius.card,
    overflow:          'hidden',
  },
  inner: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    height:            56,
    gap:               spacing.sm,
  },
  iconCircle: {
    width:          36,
    height:         36,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
  },
  textCol:  { flex: 1, gap: 2 },
  title:    { fontSize: 13 },
  body:     { fontSize: 11 },
  closeBtn: { padding: 4 },
})

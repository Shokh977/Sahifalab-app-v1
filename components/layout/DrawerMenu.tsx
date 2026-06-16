import React, { useEffect, useState } from 'react'
import {
  View, Text, Pressable, StyleSheet,
  Modal, ScrollView, Dimensions,
} from 'react-native'
import { Image } from 'expo-image'
import ReAnimated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  runOnJS, Easing,
} from 'react-native-reanimated'
import { useRouter, usePathname } from 'expo-router'
import {
  Home, Users, BookOpen, Timer, Briefcase, MessageSquare,
  Bookmark, Library, ClipboardList, Trophy,
  GraduationCap, Moon, Sun, ChevronRight, X, Download,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../hooks/useTheme'
import { useAuthStore } from '../../stores/authStore'
import { useMessagingStore } from '../../stores/messagingStore'
import { typography, spacing, radius } from '../../lib/constants'

const DRAWER_W = Math.min(Math.round(Dimensions.get('window').width * 0.78), 300)

const NAV_PRIMARY = [
  { icon: Home,          label: 'Bosh sahifa',    path: '/(tabs)/'              },
  { icon: Users,         label: 'Tarmoq',          path: '/(tabs)/network'       },
  { icon: BookOpen,      label: 'Kurslar',          path: '/(screens)/courses'    },
  { icon: Timer,         label: "O'qish maydoni",  path: '/(screens)/workspace'  },
  { icon: Briefcase,     label: 'Ish joyi',         path: '/(screens)/jobs'       },
  { icon: MessageSquare, label: 'Xabarlar',         path: '/(tabs)/messages'      },
]

const NAV_SECONDARY = [
  { icon: Bookmark,      label: 'Saqlangan',  path: '/(screens)/saved'       },
  { icon: Library,       label: 'Kitoblar',   path: '/(screens)/books'       },
  { icon: Download,      label: 'Yuklamalar', path: '/(screens)/downloads'   },
  { icon: ClipboardList, label: 'Test',       path: '/(screens)/workspace'   },
  { icon: Trophy,        label: 'Reyting',    path: '/(screens)/leaderboard' },
]

// ── Animated theme toggle row ──────────────────────────────────────────────────
function ThemeToggleRow({
  theme, toggle, colors,
}: {
  theme: 'dark' | 'light'
  toggle: () => void
  colors: ReturnType<typeof import('../../hooks/useTheme').useTheme>['c']
}) {
  const rotation = useSharedValue(0)
  const scale    = useSharedValue(1)

  function handlePress() {
    toggle()
    // New icon spins in from behind
    rotation.value = -180
    scale.value    = 0
    rotation.value = withSpring(0, { mass: 0.5, damping: 14, stiffness: 220 })
    scale.value    = withSpring(1, { mass: 0.5, damping: 14, stiffness: 220 })
  }

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }))

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.themeRow,
        { backgroundColor: colors.bgTertiary, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[styles.themeLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily.medium }]}>
        {theme === 'dark' ? 'Tungi rejim' : 'Kunduzgi rejim'}
      </Text>
      <ReAnimated.View style={iconStyle}>
        {theme === 'dark'
          ? <Moon size={16} color={colors.textMuted} />
          : <Sun  size={16} color={colors.brand} />
        }
      </ReAnimated.View>
    </Pressable>
  )
}

interface Props {
  visible: boolean
  onClose: () => void
}

export function DrawerMenu({ visible, onClose }: Props) {
  const { c, theme, toggle } = useTheme()
  const { user }             = useAuthStore()
  const unread               = useMessagingStore(s => s.unreadTotal)
  const router               = useRouter()
  const pathname             = usePathname()
  const insets               = useSafeAreaInsets()

  const [mounted, setMounted] = useState(false)

  const translateX      = useSharedValue(-DRAWER_W)
  const backdropOpacity = useSharedValue(0)

  const OPEN_EASING  = Easing.out(Easing.cubic)
  const CLOSE_EASING = Easing.in(Easing.cubic)

  useEffect(() => {
    if (visible) {
      setMounted(true)
      translateX.value      = withTiming(0,          { duration: 270, easing: OPEN_EASING })
      backdropOpacity.value = withTiming(1,          { duration: 240 })
    } else if (mounted) {
      backdropOpacity.value = withTiming(0,          { duration: 220 })
      translateX.value      = withTiming(-DRAWER_W, { duration: 240, easing: CLOSE_EASING },
        finished => { if (finished) runOnJS(setMounted)(false) }
      )
    }
  }, [visible])

  const drawerStyle   = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }))
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }))

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin'
  const initials  = user ? user.first_name.slice(0, 2).toUpperCase() : '?'

  function navigate(path: string) {
    onClose()
    setTimeout(() => router.push(path as any), 50)
  }

  function isActive(path: string) {
    if (path === '/(tabs)/') return pathname === '/' || pathname === '/index'
    const normalized = path.replace('/(tabs)/', '/').replace('/(screens)/', '/')
    return pathname.startsWith(normalized)
  }

  function NavItem({
    icon: Icon, label, path, badge,
  }: { icon: React.ElementType; label: string; path: string; badge?: number }) {
    const active = isActive(path)
    const color  = active ? c.brand : c.textSecondary
    return (
      <Pressable
        onPress={() => navigate(path)}
        style={({ pressed }) => [
          styles.navItem,
          active  && { backgroundColor: c.brandSubtle },
          pressed && !active && { backgroundColor: c.bgTertiary },
        ]}
      >
        {active && <View style={[styles.activeBar, { backgroundColor: c.brand }]} />}
        <Icon size={18} color={color} strokeWidth={active ? 2.2 : 1.8} />
        <Text style={[styles.navLabel, {
          color,
          fontFamily: active ? typography.fontFamily.semibold : typography.fontFamily.medium,
        }]} numberOfLines={1}>
          {label}
        </Text>
        {badge != null && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </Pressable>
    )
  }

  const teacherActive = pathname.startsWith('/teacher')

  if (!mounted) return null

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <ReAnimated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </ReAnimated.View>

      {/* Drawer panel */}
      <ReAnimated.View
        style={[
          styles.drawer,
          { backgroundColor: c.bgSecondary, borderRightColor: c.border, width: DRAWER_W },
          drawerStyle,
        ]}
      >
        {/* ── Logo header ───────────────────────────────────────────── */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <View style={[styles.logoBox, { backgroundColor: c.brand }]}>
            <BookOpen size={20} color="#fff" strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.logoTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
              SAHIFALAB
            </Text>
            <Text style={[styles.logoSub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              Professional learning workspace
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [styles.closeBtn, { backgroundColor: c.bgTertiary, opacity: pressed ? 0.7 : 1 }]}
          >
            <X size={16} color={c.textMuted} />
          </Pressable>
        </View>

        {/* ── Teacher panel / Become teacher ───────────────────────── */}
        <View style={styles.teacherWrap}>
          {isTeacher ? (
            <Pressable
              onPress={() => navigate('/(screens)/teacher-dashboard' as any)}
              style={({ pressed }) => [
                styles.teacherCard,
                {
                  backgroundColor: teacherActive ? c.brandSubtle : c.bgTertiary,
                  borderColor:     teacherActive ? `${c.brand}40`  : c.borderStrong,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.teacherIconWrap, {
                backgroundColor: teacherActive ? `${c.brand}25` : c.bgElevated,
              }]}>
                <GraduationCap size={18} color={teacherActive ? c.brand : c.textSecondary} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.teacherTitle, {
                  color:      teacherActive ? c.brand : c.textPrimary,
                  fontFamily: typography.fontFamily.semibold,
                }]}>
                  O'qituvchi paneli
                </Text>
                <Text style={[styles.teacherSub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                  Dashboard · Kurslar · Hamyon
                </Text>
              </View>
              <ChevronRight size={14} color={teacherActive ? c.brand : c.textMuted} />
            </Pressable>
          ) : user ? (
            <Pressable
              onPress={() => navigate('/(screens)/become-teacher' as any)}
              style={({ pressed }) => [
                styles.teacherCard,
                {
                  backgroundColor: c.bgTertiary,
                  borderColor:     c.borderStrong,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.teacherIconWrap, { backgroundColor: c.bgElevated }]}>
                <GraduationCap size={18} color={c.textSecondary} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.teacherTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                  O'qituvchi bo'lish
                </Text>
                <Text style={[styles.teacherSub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                  70% komissiya · Ariza topshiring
                </Text>
              </View>
              <ChevronRight size={14} color={c.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* ── Nav list ─────────────────────────────────────────────── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.navContent}
          showsVerticalScrollIndicator={false}
        >
          {NAV_PRIMARY.map(item => (
            <NavItem
              key={item.path}
              {...item}
              badge={item.path === '/(tabs)/messages' ? unread : undefined}
            />
          ))}

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          {NAV_SECONDARY.map(item => (
            <NavItem key={item.path + item.label} {...item} />
          ))}

        </ScrollView>

        {/* ── Bottom ───────────────────────────────────────────────── */}
        <View style={[styles.bottom, { borderTopColor: c.border, paddingBottom: insets.bottom + spacing.sm }]}>
          {/* Theme toggle */}
          <ThemeToggleRow theme={theme} toggle={toggle} colors={c} />

          {/* User card */}
          {user && (
            <Pressable
              onPress={() => navigate('/(tabs)/profile')}
              style={({ pressed }) => [styles.userCard, {
                backgroundColor: c.bgTertiary,
                borderColor:     c.borderStrong,
                opacity: pressed ? 0.8 : 1,
              }]}
            >
              {user.photo_url ? (
                <Image source={{ uri: user.photo_url }} style={styles.userAvatar} contentFit="cover" cachePolicy="memory-disk" />
              ) : (
                <View style={[styles.userAvatar, {
                  backgroundColor: c.brandSubtle,
                  alignItems: 'center', justifyContent: 'center',
                }]}>
                  <Text style={{ color: c.brand, fontSize: 14, fontFamily: typography.fontFamily.bold }}>
                    {initials}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.userName, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]} numberOfLines={1}>
                  {user.first_name}
                </Text>
                <Text style={[styles.userMeta, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                  🎯 Lv.{user.level} · {user.total_xp?.toLocaleString()} XP
                </Text>
              </View>
              <ChevronRight size={14} color={c.textMuted} />
            </Pressable>
          )}
        </View>
      </ReAnimated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  drawer: {
    position:        'absolute',
    top:             0,
    left:            0,
    bottom:          0,
    flexDirection:   'column',
    borderRightWidth: 1,
    shadowColor:     '#000',
    shadowOffset:    { width: 8, height: 0 },
    shadowOpacity:   0.35,
    shadowRadius:    24,
    elevation:       24,
  },

  // Header
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    paddingHorizontal: spacing.base,
    paddingBottom:     spacing.md,
  },
  logoBox: {
    width:          44,
    height:         44,
    borderRadius:   radius.xl,
    alignItems:     'center',
    justifyContent: 'center',
    shadowColor:    '#e8792f',
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.35,
    shadowRadius:   8,
    elevation:      5,
  },
  logoTitle: {
    fontSize:      16,
    letterSpacing: 0.5,
    lineHeight:    20,
  },
  logoSub: {
    fontSize:  10,
    marginTop: 1,
  },
  closeBtn: {
    width:          30,
    height:         30,
    borderRadius:   radius.full,
    alignItems:     'center',
    justifyContent: 'center',
  },

  // Teacher card
  teacherWrap: {
    paddingHorizontal: spacing.md,
    marginBottom:      spacing.sm,
  },
  teacherCard: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm + 2,
    borderRadius:      radius.xl,
    borderWidth:       1,
  },
  teacherIconWrap: {
    width:          36,
    height:         36,
    borderRadius:   radius.lg,
    alignItems:     'center',
    justifyContent: 'center',
  },
  teacherTitle: {
    fontSize:  typography.size.sm,
    lineHeight: 18,
  },
  teacherSub: {
    fontSize:  10,
    marginTop: 2,
  },

  // Nav
  navContent: {
    paddingHorizontal: spacing.sm,
    paddingTop:        spacing.xs,
    paddingBottom:     spacing.sm,
    gap:               2,
  },
  navItem: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm + 2,
    borderRadius:      radius.xl,
    position:          'relative',
    overflow:          'hidden',
  },
  activeBar: {
    position:     'absolute',
    left:         0,
    top:          '20%' as any,
    bottom:       '20%' as any,
    width:        2.5,
    borderRadius: 2,
  },
  navLabel: {
    flex:     1,
    fontSize: typography.size.sm,
  },
  divider: {
    height:           StyleSheet.hairlineWidth,
    marginVertical:   spacing.sm,
    marginHorizontal: spacing.sm,
  },
  badge: {
    minWidth:          18,
    height:            18,
    borderRadius:      9,
    backgroundColor:   '#e8792f',
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color:      '#fff',
    fontSize:   10,
    fontWeight: '700',
  },

  // Bottom
  bottom: {
    paddingHorizontal: spacing.sm,
    paddingTop:        spacing.sm,
    gap:               spacing.sm,
    borderTopWidth:    StyleSheet.hairlineWidth,
  },
  themeRow: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm + 2,
    borderRadius:      radius.xl,
  },
  themeLabel: {
    fontSize: typography.size.sm,
  },
  userCard: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm + 2,
    borderRadius:      radius.xl,
    borderWidth:       1,
  },
  userAvatar: {
    width:        36,
    height:       36,
    borderRadius: 18,
    flexShrink:   0,
  },
  userName: {
    fontSize: typography.size.sm,
  },
  userMeta: {
    fontSize:  10,
    marginTop: 2,
  },
})

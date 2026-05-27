import React, { useState, useRef } from 'react'
import { View, Text, Pressable, Image, StyleSheet, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Menu, Search, Bell } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { useAuthStore } from '../../stores/authStore'
import { useMessagingStore } from '../../stores/messagingStore'
import { useUIStore } from '../../stores/uiStore'
import { DrawerMenu } from './DrawerMenu'
import { AvatarMenu } from './AvatarMenu'
import { NotificationsDropdown } from './NotificationsDropdown'
import { typography, spacing } from '../../lib/constants'

interface NavHeaderProps {
  translateY?:       Animated.Value
  onHeightMeasured?: (h: number) => void
}

export function NavHeader({ translateY, onHeightMeasured }: NavHeaderProps = {}) {
  const { c }    = useTheme()
  const router   = useRouter()
  const insets   = useSafeAreaInsets()
  const { user } = useAuthStore()
  const unread   = useMessagingStore(s => s.unreadTotal)
  const setNavBarH = useUIStore(s => s.setNavBarH)

  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [avatarOpen,  setAvatarOpen]  = useState(false)
  const [notifOpen,   setNotifOpen]   = useState(false)
  const [menuTop,     setMenuTop]     = useState(60)
  const [avatarRight, setAvatarRight] = useState(12)
  const barRef = useRef<View>(null)

  const initials = user ? (user.first_name ?? '').slice(0, 2).toUpperCase() || '?' : '?'

  function measureBar(cb: (top: number) => void) {
    barRef.current?.measure((_x, _y, _w, h, _px, py) => cb(py + h + 2))
  }

  function openAvatarMenu() {
    measureBar(top => { setMenuTop(top); setAvatarRight(12) })
    setAvatarOpen(true)
  }

  function openNotifDropdown() {
    measureBar(top => setMenuTop(top))
    setNotifOpen(true)
  }

  const bar = (
    <View
      ref={barRef}
      style={[styles.inner, { backgroundColor: c.bgPrimary, borderBottomColor: c.border }]}
      onLayout={e => {
        const h = e.nativeEvent.layout.height
        setNavBarH(h)
        onHeightMeasured?.(h)
      }}
    >
      <Pressable
        onPress={() => setDrawerOpen(true)}
        style={[styles.iconBtn, { backgroundColor: c.bgTertiary }]}
        hitSlop={8}
      >
        <Menu size={18} color={c.textSecondary} />
      </Pressable>

      <Pressable
        onPress={() => router.push('/(screens)/search' as any)}
        style={[styles.searchBar, { backgroundColor: c.bgTertiary }]}
      >
        <Search size={14} color={c.textMuted} />
        <Text
          style={[styles.placeholder, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}
          numberOfLines={1}
        >
          Odamlar, kurslar, ishlarni...
        </Text>
      </Pressable>

      <Pressable
        onPress={openNotifDropdown}
        style={[styles.iconBtn, { backgroundColor: c.bgTertiary }]}
        hitSlop={8}
      >
        <Bell size={18} color={c.textSecondary} />
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </Pressable>

      <Pressable onPress={openAvatarMenu} hitSlop={8}>
        {user?.photo_url ? (
          <Image source={{ uri: user.photo_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: c.brandSubtle, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: c.brand, fontSize: 13, fontFamily: typography.fontFamily.bold }}>
              {initials}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  )

  return (
    <>
      {translateY ? (
        <Animated.View
          style={[
            styles.overlay,
            { top: insets.top, transform: [{ translateY }] },
          ]}
        >
          {bar}
        </Animated.View>
      ) : (
        <View style={[styles.overlay, { top: insets.top }]}>
          {bar}
        </View>
      )}

      <DrawerMenu visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <AvatarMenu
        visible={avatarOpen}
        onClose={() => setAvatarOpen(false)}
        anchorTop={menuTop}
        anchorRight={avatarRight}
      />
      <NotificationsDropdown
        visible={notifOpen}
        onClose={() => setNotifOpen(false)}
        anchorTop={menuTop}
      />
    </>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left:     0,
    right:    0,
    zIndex:   10,
  },
  inner: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    gap:               spacing.sm,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width:          36,
    height:         36,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
    height:            36,
    borderRadius:      18,
    paddingHorizontal: 12,
  },
  placeholder: {
    flex:     1,
    fontSize: typography.size.sm,
  },
  badge: {
    position:          'absolute',
    top:               -2,
    right:             -2,
    minWidth:          16,
    height:            16,
    borderRadius:      8,
    backgroundColor:   '#e8792f',
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color:      '#fff',
    fontSize:   9,
    fontWeight: '700',
    lineHeight: 12,
  },
  avatar: {
    width:        36,
    height:       36,
    borderRadius: 18,
  },
})

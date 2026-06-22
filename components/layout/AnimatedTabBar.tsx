import React, { useEffect, useRef } from 'react'
import { View, Text, Pressable, StyleSheet, Animated, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { House, Timer, GraduationCap, Bell, UserCircle } from 'phosphor-react-native'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../hooks/useTheme'
import { useNotificationStore } from '../../stores/notificationStore'
import { typography } from '../../lib/constants'

const TAB_BAR_HEIGHT = 56
const DOT_WIDTH      = 4

type PhosphorIcon = React.ComponentType<{ size: number; color: string; weight: 'regular' | 'fill' }>

const TAB_CONFIG: Array<{ name: string; label: string; Icon: PhosphorIcon }> = [
  { name: 'index',         label: 'Bosh sahifa',  Icon: House         as PhosphorIcon },
  { name: 'study',         label: "O'qish",        Icon: Timer         as PhosphorIcon },
  { name: 'courses',       label: 'Kurslar',       Icon: GraduationCap as PhosphorIcon },
  { name: 'notifications', label: 'Bildirishnoma', Icon: Bell          as PhosphorIcon },
  { name: 'profile',       label: 'Profil',        Icon: UserCircle    as PhosphorIcon },
]

const TAB_COUNT = TAB_CONFIG.length

export function AnimatedTabBar({ state, navigation }: BottomTabBarProps) {
  const { c }       = useTheme()
  const insets      = useSafeAreaInsets()
  const unreadCount = useNotificationStore(s => s.unreadCount)

  const screenWidth = Dimensions.get('window').width
  const tabWidth    = screenWidth / TAB_COUNT

  const dotX = useRef(
    new Animated.Value(state.index * tabWidth + tabWidth / 2 - DOT_WIDTH / 2)
  ).current

  useEffect(() => {
    Animated.timing(dotX, {
      toValue:         state.index * tabWidth + tabWidth / 2 - DOT_WIDTH / 2,
      duration:        250,
      useNativeDriver: true,
    }).start()
  }, [state.index, tabWidth])

  return (
    <View
      style={[
        styles.bar,
        {
          height:          TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom:   insets.bottom,
          backgroundColor: c.bgSecondary,
          borderTopColor:  c.borderSubtle,
        },
      ]}
    >
      {/* Sliding active-tab dot */}
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: c.accentPrimary, transform: [{ translateX: dotX }] },
        ]}
      />

      {state.routes.map((route, index) => {
        const cfg = TAB_CONFIG.find(t => t.name === route.name)
        if (!cfg) return null

        const isFocused = state.index === index
        const color     = isFocused ? c.accentPrimary : c.textDisabled

        return (
          <Pressable
            key={route.key}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              const event = navigation.emit({
                type: 'tabPress', target: route.key, canPreventDefault: true,
              })
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name)
            }}
            style={styles.tab}
            accessibilityRole="button"
            accessibilityLabel={cfg.label}
          >
            <View style={{ position: 'relative' }}>
              <cfg.Icon size={24} color={color} weight={isFocused ? 'fill' : 'regular'} />
              {cfg.name === 'notifications' && unreadCount > 0 && (
                <View style={[tabBadge.badge, { backgroundColor: '#FF453A' }]}>
                  <Text style={tabBadge.text}>{unreadCount >= 10 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.label,
                {
                  color,
                  fontFamily: isFocused
                    ? typography.fontFamily.medium
                    : typography.fontFamily.regular,
                },
              ]}
              numberOfLines={1}
            >
              {cfg.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const tabBadge = StyleSheet.create({
  badge: {
    position:        'absolute',
    top:             -5,
    right:           -5,
    minWidth:        16,
    height:          16,
    borderRadius:    8,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 3,
  },
  text: {
    color:      '#fff',
    fontSize:   9,
    fontWeight: '700',
    lineHeight: 11,
  },
})

const styles = StyleSheet.create({
  bar: {
    flexDirection:  'row',
    borderTopWidth: 1,
  },
  dot: {
    position:     'absolute',
    top:          0,
    width:        DOT_WIDTH,
    height:       DOT_WIDTH,
    borderRadius: DOT_WIDTH / 2,
  },
  tab: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingTop:     10,
    gap:            2,
  },
  label: {
    fontSize: 11,
  },
})

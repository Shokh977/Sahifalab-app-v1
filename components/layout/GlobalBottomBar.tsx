import React, { useEffect, useRef } from 'react'
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { usePathname, useRouter } from 'expo-router'
import { Home, Users, Plus, MessageSquare, User } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { useMessagingStore } from '../../stores/messagingStore'
import { useFeedStore } from '../../stores/feedStore'
import { useUIStore } from '../../stores/uiStore'
import { typography, radius } from '../../lib/constants'

const TAB_ICON_H      = 56
const CREATE_OVERHANG = 32

const TABS = [
  { name: 'index',    route: '/(tabs)/',          Icon: Home,          label: 'Bosh sahifa' },
  { name: 'network',  route: '/(tabs)/network',   Icon: Users,         label: 'Tarmoq'      },
  { name: 'create',   route: '/(tabs)/create',    Icon: Plus,          label: '',            isCreate: true },
  { name: 'messages', route: '/(tabs)/messages',  Icon: MessageSquare, label: 'Xabar'       },
  { name: 'profile',  route: '/(tabs)/profile',   Icon: User,          label: 'Profil'      },
]

function getActiveTab(pathname: string): string {
  if (pathname === '/' || pathname === '') return 'index'
  if (pathname.includes('/network'))    return 'network'
  if (pathname.includes('/messages') || pathname.includes('/conversation')) return 'messages'
  if (
    pathname.includes('/profile')    ||
    pathname.includes('/settings')   ||
    pathname.includes('/edit-profile')
  ) return 'profile'
  if (pathname.includes('/create')) return 'create'
  return 'index'
}

export function GlobalBottomBar() {
  const { c }         = useTheme()
  const insets        = useSafeAreaInsets()
  const router        = useRouter()
  const pathname      = usePathname()
  const openComposer  = useFeedStore(s => s.openComposer)
  const unreadTotal   = useMessagingStore(s => s.unreadTotal)
  const tabBarVisible = useUIStore(s => s.tabBarVisible)

  const visualH  = TAB_ICON_H + insets.bottom
  const slideOut = visualH + CREATE_OVERHANG

  const translateY = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(translateY, {
      toValue:         tabBarVisible ? 0 : slideOut,
      duration:        200,
      useNativeDriver: true,
    }).start()
  }, [tabBarVisible, slideOut])

  const activeTab = getActiveTab(pathname)

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          height:          visualH,
          paddingBottom:   insets.bottom,
          backgroundColor: c.bgSecondary,
          borderTopColor:  c.border,
          transform:       [{ translateY }],
        },
      ]}
    >
      {TABS.map(tab => {
        if (tab.isCreate) {
          return (
            <View key={tab.name} style={styles.createWrap}>
              <Pressable
                onPress={openComposer}
                style={({ pressed }) => [
                  styles.createBtn,
                  { backgroundColor: c.brand, opacity: pressed ? 0.82 : 1 },
                ]}
              >
                <Plus size={26} color="#fff" strokeWidth={2.5} />
              </Pressable>
            </View>
          )
        }

        const isFocused = activeTab === tab.name
        const color     = isFocused ? c.brand : c.textMuted
        const { Icon }  = tab
        const hasBadge  = tab.name === 'messages' && unreadTotal > 0

        return (
          <Pressable
            key={tab.name}
            onPress={() => router.push(tab.route as any)}
            style={styles.tabBtn}
          >
            <View style={{ position: 'relative' }}>
              <Icon size={isFocused ? 22 : 20} color={color} />
              {hasBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadTotal > 9 ? '9+' : unreadTotal}</Text>
                </View>
              )}
            </View>
            {tab.label ? (
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
                {tab.label}
              </Text>
            ) : null}
          </Pressable>
        )
      })}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  bar: {
    position:       'absolute',
    bottom:         0,
    left:           0,
    right:          0,
    flexDirection:  'row',
    borderTopWidth: 1,
  },
  tabBtn: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            2,
    paddingTop:     10,
  },
  label: {
    fontSize: 9,
  },
  createWrap: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    marginTop:      -(CREATE_OVERHANG),
  },
  createBtn: {
    width:          52,
    height:         52,
    borderRadius:   radius.full,
    alignItems:     'center',
    justifyContent: 'center',
    shadowColor:    '#e8792f',
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.45,
    shadowRadius:   16,
    elevation:      10,
  },
  badge: {
    position:          'absolute',
    top:               -4,
    right:             -6,
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
})

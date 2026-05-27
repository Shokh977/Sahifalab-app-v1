import React, { useEffect, useRef, useState } from 'react'
import { Animated, Text, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { WifiOff, Wifi } from 'lucide-react-native'
import { useOnline } from '../../hooks/useOnline'
import { typography } from '../../lib/constants'

const BANNER_H = 40

export function OfflineBanner() {
  const isOnline    = useOnline()
  const insets      = useSafeAreaInsets()
  const slideAnim   = useRef(new Animated.Value(-BANNER_H)).current
  const [visible,   setVisible]   = useState(false)
  const [reconnect, setReconnect] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setVisible(true)
      setReconnect(false)
      Animated.spring(slideAnim, {
        toValue:   0,
        useNativeDriver: true,
        tension:   80,
        friction:  10,
      }).start()
    } else if (visible) {
      // Was offline, now back — show "Ulandi" then slide away
      setReconnect(true)
      const timer = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue:   -BANNER_H,
          duration:  350,
          useNativeDriver: true,
        }).start(() => {
          setVisible(false)
          setReconnect(false)
        })
      }, 1800)
      return () => clearTimeout(timer)
    }
  }, [isOnline])

  if (!visible) return null

  const bg = reconnect ? '#22c55e' : '#ef4444'

  return (
    <Animated.View
      style={[
        styles.banner,
        { top: insets.top, backgroundColor: bg, transform: [{ translateY: slideAnim }] },
      ]}
      pointerEvents="none"
    >
      {reconnect
        ? <Wifi size={13} color="#fff" />
        : <WifiOff size={13} color="#fff" />
      }
      <Text style={styles.text}>
        {reconnect ? "Ulandi ✓" : "Internetga ulanish yo'q"}
      </Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  banner: {
    position:       'absolute',
    left:            0,
    right:           0,
    height:          BANNER_H,
    zIndex:          9999,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             6,
    paddingHorizontal: 16,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.25,
    shadowRadius:    4,
    elevation:       8,
  },
  text: {
    color:      '#fff',
    fontSize:   13,
    fontFamily: typography.fontFamily.medium,
  },
})

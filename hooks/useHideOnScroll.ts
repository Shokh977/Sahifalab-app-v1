import { useRef, useCallback } from 'react'
import { Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native'
import { useUIStore } from '../stores/uiStore'

export function useHideOnScroll() {
  const { setTabBarVisible } = useUIStore()
  const translateY  = useRef(new Animated.Value(0)).current
  const headerHRef  = useRef(52)
  const hiddenRef   = useRef(false)
  const lastYRef    = useRef(0)

  const reveal = useCallback(() => {
    if (!hiddenRef.current) return
    hiddenRef.current = false
    Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }).start()
    setTabBarVisible(true)
  }, [translateY, setTabBarVisible])

  const hide = useCallback(() => {
    if (hiddenRef.current) return
    hiddenRef.current = true
    Animated.timing(translateY, { toValue: -(headerHRef.current + 4), duration: 200, useNativeDriver: true }).start()
    setTabBarVisible(false)
  }, [translateY, setTabBarVisible])

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y    = e.nativeEvent.contentOffset.y
    const diff = y - lastYRef.current
    lastYRef.current = y
    if (y <= 8)        reveal()
    else if (diff > 5)  hide()
    else if (diff < -5) reveal()
  }, [reveal, hide])

  const onHeightMeasured = useCallback((h: number) => {
    headerHRef.current = h
  }, [])

  return { translateY, onScroll, onHeightMeasured, reveal }
}

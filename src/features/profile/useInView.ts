/**
 * Whether a block inside a ScrollView is (partly) on screen, so a costly
 * animation (the profile's tree) only runs while it can be seen. Spread
 * `onScroll` into the ScrollView's handler, put `onContainerLayout` on the
 * view that holds the block (if it isn't the ScrollView's content itself)
 * and `onLayout` on the block.
 */
import { useCallback, useRef, useState } from 'react'
import { useWindowDimensions, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'

export function useInView() {
  const { height } = useWindowDimensions()
  const [visible, setVisible] = useState(false)
  const last = useRef(false)
  const containerY = useRef(0)
  const box = useRef<{ y: number; h: number } | null>(null)
  const offset = useRef(0)

  const update = useCallback(() => {
    if (!box.current) return
    const top = containerY.current + box.current.y
    const next = top < offset.current + height && top + box.current.h > offset.current
    if (next !== last.current) { last.current = next; setVisible(next) }
  }, [height])

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    containerY.current = e.nativeEvent.layout.y
    update()
  }, [update])
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    box.current = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height }
    update()
  }, [update])
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.y
    update()
  }, [update])

  return { visible, onLayout, onContainerLayout, onScroll }
}

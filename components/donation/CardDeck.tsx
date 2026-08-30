import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, StyleSheet, AccessibilityInfo, useWindowDimensions } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedScrollHandler,
  interpolate, Extrapolation, FadeInUp, ReduceMotion, type SharedValue,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useFocusEffect } from 'expo-router'
import type { PaymentMethod } from '../../lib/api'
import PaymentCard from './PaymentCard'
import { CARD_WIDTH, CARD_GAP } from './donationTheme'

const ITEM_WIDTH = CARD_WIDTH + CARD_GAP

interface Props {
  methods: PaymentMethod[]
  activeIndex: number
  onActiveChange: (index: number) => void
  disabled?: boolean   // dims the whole deck while the copy row is in its "copied" state
  sheenTrigger?: SharedValue<number>   // bumped on a successful copy — plays on the active card only
}

export default function CardDeck({ methods, activeIndex, onActiveChange, disabled = false, sheenTrigger }: Props) {
  const { width: screenWidth } = useWindowDimensions()
  const scrollX = useSharedValue(0)
  const [entranceKey, setEntranceKey] = useState(0)

  // Entrance plays once per screen focus, not on every re-render.
  useFocusEffect(useCallback(() => {
    setEntranceKey(k => k + 1)
  }, []))

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => { scrollX.value = e.contentOffset.x },
  })

  const lastSettledIndex = useRef(activeIndex)
  function handleMomentumEnd(offsetX: number) {
    const idx = Math.round(offsetX / ITEM_WIDTH)
    const clamped = Math.max(0, Math.min(methods.length - 1, idx))
    if (clamped !== lastSettledIndex.current) {
      lastSettledIndex.current = clamped
      onActiveChange(clamped)
      Haptics.selectionAsync().catch(() => {})
      AccessibilityInfo.announceForAccessibility(`${clamped + 1}-dan ${methods.length}`)
    }
  }

  if (methods.length === 1) {
    // Spec: 1 method -> centered, no peeks, not scrollable, no indicator.
    return (
      <View style={[styles.singleWrap, { opacity: disabled ? 0.5 : 1 }]}>
        <Animated.View entering={FadeInUp.duration(500).withInitialValues({ transform: [{ translateY: 22 }, { scale: 0.94 }], opacity: 0 })}>
          <PaymentCard method={methods[0]} sheenTrigger={sheenTrigger} />
        </Animated.View>
      </View>
    )
  }

  const sidePadding = Math.max(18, (screenWidth - CARD_WIDTH) / 2 - CARD_GAP)

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="To'lov usullari to'plami"
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment' && activeIndex < methods.length - 1) {
          onActiveChange(activeIndex + 1)
        } else if (event.nativeEvent.actionName === 'decrement' && activeIndex > 0) {
          onActiveChange(activeIndex - 1)
        }
      }}
      style={{ opacity: disabled ? 0.5 : 1 }}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      <Animated.FlatList
        key={entranceKey}
        data={methods}
        keyExtractor={(item: PaymentMethod) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={ITEM_WIDTH}
        snapToAlignment="start"
        contentContainerStyle={{ paddingHorizontal: sidePadding, gap: CARD_GAP }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => handleMomentumEnd(e.nativeEvent.contentOffset.x)}
        renderItem={({ item, index }) => (
          <DeckCard
            item={item} index={index} scrollX={scrollX} entranceDelay={index * 60}
            sheenTrigger={index === activeIndex ? sheenTrigger : undefined}
          />
        )}
      />
    </View>
  )
}

function DeckCard({ item, index, scrollX, entranceDelay, sheenTrigger }: {
  item: PaymentMethod; index: number; scrollX: SharedValue<number>; entranceDelay: number
  sheenTrigger?: SharedValue<number>
}) {
  const center = index * ITEM_WIDTH
  const inputRange = [center - ITEM_WIDTH, center, center + ITEM_WIDTH]

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollX.value, inputRange, [0.94, 1, 0.94], Extrapolation.CLAMP)
    const opacity = interpolate(scrollX.value, inputRange, [0.5, 1, 0.5], Extrapolation.CLAMP)
    const rotateZ = interpolate(scrollX.value, inputRange, [-1.4, 0, 1.4], Extrapolation.CLAMP)
    return { transform: [{ scale }, { rotateZ: `${rotateZ}deg` }], opacity }
  })

  return (
    <Animated.View
      style={animatedStyle}
      entering={FadeInUp
        .duration(500)
        .delay(entranceDelay)
        .withInitialValues({ transform: [{ translateY: 22 }, { scale: 0.94 }], opacity: 0 })
        .reduceMotion(ReduceMotion.System)}
    >
      <PaymentCard method={item} sheenTrigger={sheenTrigger} />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  singleWrap: { alignItems: 'center', justifyContent: 'center' },
})

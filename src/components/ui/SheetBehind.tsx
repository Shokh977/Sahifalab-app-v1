/**
 * The root-level wrapper behind iOS-style sheets (the "sheet preset" in
 * spec section 5): while a Sheet with `scaleBehind` is open, the app
 * behind it scales to 0.93 with 22 px corners over black, following the
 * sheet's own position (so it tracks drags too). Off under reduce motion.
 */
import React, { createContext, useContext } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { interpolate, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated'
import { sheetBehind } from '../../design/motion'
import { behindSheet } from '../../design/tokens'

const BehindContext = createContext<SharedValue<number> | null>(null)

/** 0 = no sheet, 1 = a scaleBehind sheet fully open. */
export function useSheetBehind(): SharedValue<number> | null {
  return useContext(BehindContext)
}

export function SheetBehindProvider({ children }: { children: React.ReactNode }) {
  const progress = useSharedValue(0)
  const style = useAnimatedStyle(() => {
    const p = progress.get()
    return {
      transform: [{ scale: interpolate(p, [0, 1], [1, sheetBehind.scale]) }],
      borderRadius: interpolate(p, [0, 1], [0, sheetBehind.radius]),
    }
  })
  return (
    <BehindContext.Provider value={progress}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.app, style]}>{children}</Animated.View>
      </View>
    </BehindContext.Provider>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: behindSheet },
  app: { flex: 1, overflow: 'hidden' },
})

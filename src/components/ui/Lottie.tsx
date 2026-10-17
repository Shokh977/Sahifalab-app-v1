/**
 * The one place the app imports lottie-react-native (native only). The web
 * build gets Lottie.web.tsx instead: lottie-react-native's web entry needs
 * @lottiefiles/dotlottie-react, which the app doesn't ship.
 */
import React from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import LottieView from 'lottie-react-native'

export interface LottieProps {
  source: object
  autoPlay?: boolean
  loop?: boolean
  /** 0–1; set to show a fixed frame (e.g. 1 under reduce motion). */
  progress?: number
  style?: StyleProp<ViewStyle>
}

export function Lottie({ source, autoPlay, loop, progress, style }: LottieProps) {
  return <LottieView source={source as any} autoPlay={autoPlay} loop={loop} progress={progress} style={style} />
}

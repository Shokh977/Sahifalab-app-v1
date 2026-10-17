/**
 * Web stand-in for Lottie.tsx: renders nothing (the animation is
 * decorative; the content around it stays). See Lottie.tsx.
 */
import React from 'react'
import { View } from 'react-native'
import type { LottieProps } from './Lottie'

export type { LottieProps }

export function Lottie({ style }: LottieProps) {
  return <View style={style} />
}

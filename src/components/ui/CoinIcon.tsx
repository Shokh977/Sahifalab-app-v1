/** The v2 gold coin (22 px by default): gradient face, inner ring, "T" mark. */
import React, { useId } from 'react'
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg'
import { coinIcon } from '../../design/tokens'

export const COIN_ICON = 22

export function CoinIcon({ size = COIN_ICON }: { size?: number }) {
  const id = `coin${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={coinIcon.face[0]} />
          <Stop offset="1" stopColor={coinIcon.face[1]} />
        </LinearGradient>
      </Defs>
      <Circle cx="11" cy="11" r="10" fill={`url(#${id})`} />
      <Circle cx="11" cy="11" r="6.5" fill="none" stroke={coinIcon.ring} strokeWidth={1.6} />
      {/* "T" for tanga: the bar, then the stem. */}
      <Path d="M8.3 8.3h5.4M11 8.3v5.6" stroke={coinIcon.mark} strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </Svg>
  )
}

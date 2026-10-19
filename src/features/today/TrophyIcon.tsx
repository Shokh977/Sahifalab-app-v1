/** The gradient trophy from the v2 Bugun board (rival ladder footer). */
import React, { useId } from 'react'
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg'
import { trophy } from '../../design/tokens'

export function TrophyIcon({ size = 30 }: { size?: number }) {
  const id = `trophy${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={trophy.cup[0]} />
          <Stop offset="1" stopColor={trophy.cup[1]} />
        </LinearGradient>
      </Defs>
      <Path d="M7 3h10v6a5 5 0 0 1-10 0z" fill={`url(#${id})`} />
      <Path d="M17 4.5h3v2.2a3.2 3.2 0 0 1-3.2 3.2M7 4.5H4v2.2a3.2 3.2 0 0 0 3.2 3.2" fill="none" stroke={trophy.handle} strokeWidth={1.6} />
      <Path d="M12 14v4M8 21h8" stroke={trophy.handle} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

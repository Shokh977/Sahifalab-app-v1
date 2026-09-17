import React from 'react'
import Svg, { Path, Rect } from 'react-native-svg'

/** Empty-book placeholder mark — used for both "no results" and "no
 * favorites" states. Drawn, not emoji. */
export function EmptyCourseMark({ size = 56, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path
        d="M8 14c6-3 13-3 18 1v34c-5-4-12-4-18-1V14Z"
        stroke={color} strokeWidth={2.2} strokeLinejoin="round"
      />
      <Path
        d="M56 14c-6-3-13-3-18 1v34c5-4 12-4 18-1V14Z"
        stroke={color} strokeWidth={2.2} strokeLinejoin="round"
      />
    </Svg>
  )
}

/** Muted image glyph for a loading/failed thumbnail — replaces a raw
 * BookOpen/photo emoji fallback. */
export function ImagePlaceholderMark({ size = 24, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="16" rx="3" stroke={color} strokeWidth={1.8} />
      <Path d="M3 16.5l5-5 4 4 3-3 6 6" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M9 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" fill={color} />
    </Svg>
  )
}

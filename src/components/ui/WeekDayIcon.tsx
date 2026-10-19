/**
 * WeekDayIcon (Phase 7.5 B5) — one day of the streak week as a v3 3D tile
 * (docs/design/v2/week-icons.dc.html, its 40 px versions):
 *   done    — orange tile with depth and a white flame with a gold core
 *   frozen  — an isometric ice cube with a snowflake
 *   missed  — a grey tile with ash and smoke (theme greys)
 *   today   — a dashed orange tile with an outline flame (not done yet)
 *   future  — a thin rounded-square outline in `border`
 * Gradient ids are unique per instance (useId) so lists never mix them up.
 */
import React, { useId } from 'react'
import { View } from 'react-native'
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg'
import { useTheme } from '../../design/ThemeProvider'
import { weekIcon } from '../../design/tokens'

export type WeekDayState = 'done' | 'frozen' | 'missed' | 'today' | 'future'

const STATE_LABEL: Record<WeekDayState, string> = {
  done: 'bajarildi',
  frozen: 'muzlatildi',
  missed: 'oʻtkazildi',
  today: 'bugun',
  future: 'kelgusi kun',
}

export const WEEK_ICON_SIZE = 38

const FLAME = 'M32 12.5c2.2 7.5 12.5 11.5 12.5 22.8a12.5 12.5 0 0 1-25 0c0-5.4 2.6-8.6 5.2-10.4 0 4.3 2.1 6.8 4.7 6.8C27 25 28.2 19 32 12.5z'
const CORE = 'M32 29.5c1.3 3.2 5.4 5 5.4 9.8a5.4 5.4 0 0 1-10.8 0c0-2.8 1.4-4.3 2.8-5.1.2 2.1 1.1 3 2.2 3C30.4 34.6 30.6 32 32 29.5z'
const GLOSS = 'M14 12c4-4 10-5 18-5s14 1 18 5c-5-1-11-1.6-18-1.6S19 11 14 12z'
const TODAY_FLAME = 'M32 17c1.8 6 10 9.2 10 18.2a10 10 0 0 1-20 0c0-4.3 2-6.9 4.2-8.3 0 3.4 1.7 5.4 3.7 5.4C28 26.8 29 22 32 17z'

function V({ id, stops, horizontal }: { id: string; stops: readonly string[]; horizontal?: boolean }) {
  return (
    <LinearGradient id={id} x1="0" y1="0" x2={horizontal ? '1' : '0'} y2="1">
      {stops.map((c, i) => (
        <Stop key={i} offset={stops.length === 3 && i === 1 ? '0.55' : String(i / (stops.length - 1))} stopColor={c} />
      ))}
    </LinearGradient>
  )
}

export function WeekDayIcon({ state, day, size = WEEK_ICON_SIZE }: {
  state: WeekDayState
  /** Day name for screen readers: "Du", "Dushanba". */
  day: string
  size?: number
}) {
  const { colors, scheme } = useTheme()
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const id = (name: string) => `${name}${uid}`
  const label = `${day}: ${STATE_LABEL[state]}`

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {state === 'done' && (
        <>
          <Defs>
            <V id={id('face')} stops={weekIcon.flame.face} />
            <V id={id('depth')} stops={weekIcon.flame.depth} />
            <V id={id('flame')} stops={weekIcon.flame.flame} />
            <V id={id('core')} stops={weekIcon.flame.core} />
          </Defs>
          <Rect x="5" y="7" width="54" height="52" rx="17" fill={`url(#${id('depth')})`} />
          <Rect x="5" y="4" width="54" height="51" rx="17" fill={`url(#${id('face')})`} />
          <Path d={GLOSS} fill={weekIcon.flame.gloss} fillOpacity={0.45} />
          <Path d={FLAME} fill={`url(#${id('flame')})`} />
          <Path d={CORE} fill={`url(#${id('core')})`} />
        </>
      )}

      {state === 'frozen' && (
        <>
          <Defs>
            <V id={id('top')} stops={weekIcon.ice.top} horizontal />
            <V id={id('left')} stops={weekIcon.ice.left} />
            <V id={id('right')} stops={weekIcon.ice.right} />
          </Defs>
          <Path d="M32 6 55 18.5 32 31 9 18.5z" fill={`url(#${id('top')})`} />
          <Path d="M9 18.5 32 31v25L9 43.5z" fill={`url(#${id('left')})`} />
          <Path d="M55 18.5 32 31v25l23-12.5z" fill={`url(#${id('right')})`} />
          <Path d="M9 18.5 32 6l23 12.5" fill="none" stroke={weekIcon.ice.edge} strokeWidth={1.6} strokeLinejoin="round" />
          <G transform="translate(32 18.5) scale(1 0.54)" stroke={weekIcon.ice.snow} strokeWidth={2.6} strokeLinecap="round">
            <Path d="M0-12V12M-10.4-6 10.4 6M-10.4 6 10.4-6" />
          </G>
          <Path d="M14 46.2 17.5 48l-1.6 6z" fill={weekIcon.ice.shard1} />
          <Path d="M44 49.6 47.6 47.8 46.8 53.4z" fill={weekIcon.ice.shard2} />
        </>
      )}

      {state === 'missed' && (() => {
        const m = weekIcon.missed[scheme]
        return (
          <>
            <Defs>
              <V id={id('mface')} stops={m.face} />
              <V id={id('mdepth')} stops={m.depth} />
            </Defs>
            <Rect x="5" y="7" width="54" height="52" rx="17" fill={`url(#${id('mdepth')})`} />
            <Rect x="5" y="4" width="54" height="51" rx="17" fill={`url(#${id('mface')})`} />
            <Ellipse cx="32" cy="44" rx="11" ry="3.6" fill={m.ash} />
            <Path d="M24.5 43.2c2-3.2 5-4.6 7.5-4.6s5.5 1.4 7.5 4.6" fill={m.ash2} />
            <Path d="M32 37c-4-3.4-4-7.4 0-10.4s4-7 0-10.6" fill="none" stroke={m.smoke} strokeWidth={3.6} strokeLinecap="round" />
          </>
        )
      })()}

      {state === 'today' && (
        <>
          <Rect x="6" y="5" width="52" height="52" rx="17" fill={colors.surface} stroke={weekIcon.today} strokeWidth={3} strokeDasharray="6 5" />
          <Path d={TODAY_FLAME} fill={weekIcon.today} fillOpacity={0.14} stroke={weekIcon.today} strokeWidth={2.6} strokeLinejoin="round" />
        </>
      )}

      {state === 'future' && (
        <Rect x="6" y="5" width="52" height="52" rx="17" fill="none" stroke={colors.border} strokeWidth={2.4} />
      )}
    </Svg>
    </View>
  )
}

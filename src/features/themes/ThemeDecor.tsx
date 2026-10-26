/**
 * A theme's one decorative layer (Mavzu §4): static, never animated, never
 * over text or controls, hidden from screen readers. Place it as the first
 * child of a positioned view: it fills the parent, measures itself and
 * takes no touches. `radius` clips it to the parent's corners.
 *   tile   — inside the Bugun tree tile
 *   podium — the top of the Reyting podium card
 *   border — Navro'z only: the 7 px patterned top edge of the hero card
 * Standart draws nothing.
 */
import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Pattern, Rect, Stop } from 'react-native-svg'
import { THEMES } from '../../design/themes'
import { useTheme } from '../../design/ThemeProvider'

type Variant = 'tile' | 'podium' | 'border'

/** A four-point sparkle centred on (x, y). */
const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`

// Star / petal spots as fractions of the box (top area for the podium).
const STARS = [[0.12, 0.14, 1.2], [0.3, 0.08, 0.9], [0.52, 0.18, 1.1], [0.7, 0.07, 1.4], [0.88, 0.2, 1], [0.2, 0.32, 0.9], [0.62, 0.34, 1.2], [0.94, 0.42, 0.9]] as const
const PETALS = [[0.1, 0.16, 25], [0.28, 0.36, -30], [0.46, 0.1, 60], [0.68, 0.28, 10], [0.84, 0.12, -45], [0.92, 0.44, 35]] as const

function Tulip({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Path d="M0 0 L0 -14" stroke="#2F9A55" strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M0 -6 Q-5 -9 -6 -14 Q-2 -11 0 -8" fill="#2F9A55" />
      <Path d="M-4 -14 Q-4.5 -21 0 -22 Q4.5 -21 4 -14 Q2 -12 0 -13 Q-2 -12 -4 -14 Z" fill="#D6453D" />
    </G>
  )
}

export function ThemeDecor({ variant, radius = 0 }: { variant: Variant; radius?: number }) {
  const { themeId } = useTheme()
  const [size, setSize] = useState({ width: 0, height: 0 })
  if (themeId === 'standart') return null
  if (variant === 'border' && themeId !== 'navroz') return null
  return (
    <View
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      onLayout={e => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
    >
      {size.width > 0 && <DecorArt themeId={themeId} variant={variant} width={size.width} height={size.height} />}
    </View>
  )
}

function DecorArt({ themeId, variant, width, height }: { themeId: string; variant: Variant; width: number; height: number }) {
  // The podium layer stays in the top band, above the avatars' labels.
  const h = variant === 'podium' ? Math.min(height, 70) : height
  const w = width

  let art: React.ReactNode = null
  if (variant === 'border') {
    art = (
      <>
        <Defs>
          <Pattern id="nvBorder" width={14} height={7} patternUnits="userSpaceOnUse">
            <Path d="M0 0 L7 7 L14 0 Z" fill="#D6453D" />
            <Circle cx={7} cy={2} r={1.2} fill="#C98A2E" />
          </Pattern>
        </Defs>
        <Rect width={w} height={7} fill="url(#nvBorder)" />
      </>
    )
  } else if (themeId === 'tun') {
    art = (
      <G fill="#F5E6A8">
        {STARS.map(([x, y, r], i) => <Circle key={i} cx={x * w} cy={y * h} r={r} opacity={0.75} />)}
        <Path d={sparkle(0.82 * w, 0.3 * h, 4)} opacity={0.85} />
        <Path d={sparkle(0.16 * w, 0.52 * h, 3)} opacity={0.7} />
      </G>
    )
  } else if (themeId === 'zumrad') {
    art = (
      <>
        <Defs>
          <Pattern id="zmLattice" width={20} height={20} patternUnits="userSpaceOnUse">
            <Line x1={0} y1={10} x2={10} y2={0} stroke="#D9B45A" strokeWidth={0.8} />
            <Line x1={10} y1={0} x2={20} y2={10} stroke="#D9B45A" strokeWidth={0.8} />
            <Line x1={20} y1={10} x2={10} y2={20} stroke="#D9B45A" strokeWidth={0.8} />
            <Line x1={10} y1={20} x2={0} y2={10} stroke="#D9B45A" strokeWidth={0.8} />
          </Pattern>
          {/* Over the podium the lattice fades into the card. */}
          <LinearGradient id="zmFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.35" stopColor={THEMES.zumrad.colors!.surface} stopOpacity={0} />
            <Stop offset="1" stopColor={THEMES.zumrad.colors!.surface} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width={w} height={h} fill="url(#zmLattice)" opacity={0.3} />
        {variant === 'podium' && <Rect width={w} height={h} fill="url(#zmFade)" />}
      </>
    )
  } else if (themeId === 'sakura') {
    art = (
      <G>
        {PETALS.map(([x, y, rot], i) => (
          <Ellipse
            key={i} cx={x * w} cy={y * h} rx={3.4 + (i % 3) * 0.5} ry={2 + (i % 2) * 0.6}
            fill={i % 2 ? '#F4B3C8' : '#EE8FB0'} transform={`rotate(${rot} ${x * w} ${y * h})`} opacity={0.85}
          />
        ))}
      </G>
    )
  } else if (themeId === 'ramazon') {
    const cx = w - 18, cy = 16
    art = (
      <G>
        <Path d={`M${cx} ${cy - 9} A9 9 0 0 0 ${cx} ${cy + 9} A5 9 0 0 1 ${cx} ${cy - 9} Z`} fill="#F6C55E" />
        <G transform={`translate(${variant === 'podium' ? 22 : 14} 4)`}>
          <Line x1={4} y1={0} x2={4} y2={5} stroke="#F2B544" strokeWidth={0.8} />
          <Rect x={0.5} y={5} width={7} height={10} rx={2.5} fill="#F2B544" />
          <Rect x={2.2} y={7} width={3.6} height={6} rx={1.4} fill="#FFE7A6" />
        </G>
        <Circle cx={w * 0.34} cy={12} r={1} fill="#F6C55E" opacity={0.8} />
        <Circle cx={w * 0.56} cy={22} r={1.2} fill="#F6C55E" opacity={0.7} />
        <Circle cx={w * 0.74} cy={10} r={0.9} fill="#F6C55E" opacity={0.8} />
      </G>
    )
  } else if (themeId === 'navroz' && variant === 'tile') {
    art = (
      <>
        <Tulip x={10} y={h - 6} s={0.9} />
        <Tulip x={w - 10} y={h - 6} s={0.8} />
      </>
    )
  }
  if (!art) return null
  return <Svg width={w} height={variant === 'border' ? 7 : h}>{art}</Svg>
}

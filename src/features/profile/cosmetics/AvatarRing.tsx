/**
 * AvatarRing — the avatar with its ring (Skia), viewBox 100: an optional
 * glow, a disc in the page colour (so the ring cuts cleanly into the
 * banner), the ring at r46, and the avatar (photo or initials, the shared
 * Avatar) at r40.5 on top. The canvas reaches 10 units past the box so
 * glow and particles aren't clipped.
 */
import React, { memo, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useDerivedValue } from 'react-native-reanimated'
import { Canvas, Circle, Group, LinearGradient, Path, Skia, SweepGradient, vec } from '@shopify/react-native-skia'
import { useTheme } from '../../../design/ThemeProvider'
import { Avatar } from '../../../components/ui'
import { RINGS, RARITY_LABEL, type RingKind } from './cosmetics'
import { TAU, WithClock, breathe, secs, sweep, type Clock } from './motion'

const PAD = 10
const C = 50
const R = 46

function arc(r: number, start: number, sweepDeg: number) {
  const p = Skia.Path.Make()
  p.addArc({ x: C - r, y: C - r, width: r * 2, height: r * 2 }, start, sweepDeg)
  return p
}

export const AvatarRing = memo(function AvatarRing({ kind, size, name, id, uri, bg, animated = true }: {
  kind: RingKind
  size: number
  name: string
  id?: number | null
  uri?: string | null
  /** The page colour behind the avatar. */
  bg?: string
  animated?: boolean
}) {
  const { colors } = useTheme()
  const canvas = size * (1 + (PAD * 2) / 100)
  const ring = RINGS[kind]
  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Avatar halqasi: ${ring.name}, ${RARITY_LABEL[ring.rarity]}`}
    >
      <WithClock
        animated={animated && kind !== 'oddiy'}
        render={(clock, still) => (
          <Canvas style={[styles.canvas, { width: canvas, height: canvas, left: -size * PAD / 100, top: -size * PAD / 100 }]}>
            <Group transform={[{ scale: size / 100 }, { translateX: PAD }, { translateY: PAD }]}>
              <Ring kind={kind} size={size} accent={colors.accent} bg={bg ?? colors.bg} clock={clock} still={still} />
            </Group>
          </Canvas>
        )}
      />
      <View style={styles.center} pointerEvents="none">
        <Avatar name={name || '?'} id={id} uri={uri} diameter={size * 0.81} />
      </View>
    </View>
  )
})

function Ring({ kind, size, accent, bg, clock, still }: {
  kind: RingKind; size: number; accent: string; bg: string; clock: Clock; still: boolean
}) {
  return (
    <Group>
      {kind === 'shabnam' && <Glow color="#8EC2FF" width={6} lo={0.35} hi={0.8} period={6} clock={clock} still={still} />}
      {kind === 'olov' && <Glow color="#FF8A3A" width={6} lo={0.4} hi={0.85} period={5} clock={clock} still={still} />}
      {kind === 'lola' && <Glow color="#F06A6A" width={5} lo={0.3} hi={0.6} period={7} clock={clock} still={still} />}
      {kind === 'oltin' && <Glow color="#F2C25A" width={7} lo={0.35} hi={0.75} period={6} clock={clock} still={still} />}
      <Circle cx={C} cy={C} r={R} color={bg} />

      {kind === 'oddiy' && <Circle cx={C} cy={C} r={R} color={accent} style="stroke" strokeWidth={3.2} />}
      {kind === 'shabnam' && (
        <Group>
          <Circle cx={C} cy={C} r={R} color="#B9D6FA" style="stroke" strokeWidth={5} />
          <Circle cx={C} cy={C} r={R} style="stroke" strokeWidth={4}>
            <LinearGradient start={vec(4, 4)} end={vec(96, 96)} colors={['rgba(255,255,255,0.95)', 'rgba(214,232,255,0.55)', 'rgba(255,255,255,0.85)']} />
          </Circle>
          <Circle cx={C} cy={C} r={48.2} color="rgba(255,255,255,0.7)" style="stroke" strokeWidth={0.6} />
        </Group>
      )}
      {kind === 'olov' && (
        <Circle cx={C} cy={C} r={R} style="stroke" strokeWidth={4.4}>
          <LinearGradient start={vec(10, 90)} end={vec(90, 10)} colors={['#E5481B', '#F7952E', '#FFD57A']} />
        </Circle>
      )}
      {kind === 'kometa' && <Comet accent={accent} clock={clock} still={still} />}
      {kind === 'lola' && <Tulip clock={clock} still={still} />}
      {kind === 'oltin' && <Gold size={size} clock={clock} still={still} />}
    </Group>
  )
}

/**
 * A soft glow around the ring: three widening translucent strokes. No blur —
 * the canvas redraws every frame while animating, and a blur is the costly
 * part of a redraw.
 */
function Glow({ color, width, lo, hi, period, clock, still }: {
  color: string; width: number; lo: number; hi: number; period: number; clock: Clock; still: boolean
}) {
  const opacity = useDerivedValue(() => breathe(clock, period, lo, hi, still))
  return (
    <Group opacity={opacity}>
      <Circle cx={C} cy={C} r={R} color={color} opacity={0.18} style="stroke" strokeWidth={width * 1.9} />
      <Circle cx={C} cy={C} r={R} color={color} opacity={0.28} style="stroke" strokeWidth={width * 1.3} />
      <Circle cx={C} cy={C} r={R} color={color} opacity={0.4} style="stroke" strokeWidth={width * 0.8} />
    </Group>
  )
}

const COMET_SWEEP = (70 / (TAU * R)) * 360
const HEAD_SWEEP = (14 / (TAU * R)) * 360

function Comet({ accent, clock, still }: { accent: string; clock: Clock; still: boolean }) {
  // The head sits at the top (−90°) at rest; the group turns 360° in 8 s.
  const paths = useMemo(() => ({
    tail: arc(R, -90 - COMET_SWEEP, COMET_SWEEP),
    head: arc(R, -90 - HEAD_SWEEP, HEAD_SWEEP),
  }), [])
  const transform = useDerivedValue(() => [{ rotate: still ? 0 : ((secs(clock) % 8) / 8) * TAU }])
  return (
    <Group>
      <Circle cx={C} cy={C} r={R} color={accent} opacity={0.35} style="stroke" strokeWidth={2.4} />
      <Group transform={transform} origin={vec(C, C)}>
        <Path path={paths.tail} color={accent} opacity={0.22} style="stroke" strokeWidth={8} strokeCap="round" />
        <Path path={paths.tail} color={accent} opacity={0.35} style="stroke" strokeWidth={5.5} strokeCap="round" />
        <Path path={paths.tail} color={accent} style="stroke" strokeWidth={3} strokeCap="round" />
        <Path path={paths.head} color="#FFFFFF" style="stroke" strokeWidth={3} strokeCap="round" />
      </Group>
    </Group>
  )
}

function Tulip({ clock, still }: { clock: Clock; still: boolean }) {
  const transform = useDerivedValue(() => [{ rotate: still ? 0 : ((secs(clock) % 10) / 10) * TAU }])
  return (
    <Group transform={transform} origin={vec(C, C)}>
      <Circle cx={C} cy={C} r={R} style="stroke" strokeWidth={4.4}>
        <SweepGradient c={vec(C, C)} colors={['#7BCB6A', '#2E9A57', '#E5484D', '#FF8A7A', '#7BCB6A']} />
      </Circle>
    </Group>
  )
}

const GOLD = ['#FFF1C4', '#E6B657', '#9C6A1E', '#F3CF78', '#B9842C', '#FCE7A8', '#FFF1C4']
const SHEEN_SWEEP = (16 / (TAU * R)) * 360

function Gold({ size, clock, still }: { size: number; clock: Clock; still: boolean }) {
  const sheenPath = useMemo(() => arc(R, -90 - SHEEN_SWEEP / 2, SHEEN_SWEEP), [])
  // Sheen sweeps 360° in 2.7 s, then rests 3.3 s.
  const sheen = useDerivedValue(() => (still ? -1 : sweep(clock, 6, 2.7, [0.45, 0, 0.25, 1])))
  const sheenTransform = useDerivedValue(() => [{ rotate: Math.max(0, sheen.value) * TAU }])
  const sheenOpacity = useDerivedValue(() => (sheen.value < 0 ? 0 : 0.85))
  const sparks = size >= 72
  return (
    <Group>
      <Circle cx={C} cy={C} r={R} style="stroke" strokeWidth={5}>
        <SweepGradient c={vec(C, C)} colors={GOLD} />
      </Circle>
      <Circle cx={C} cy={C} r={48.6} color="#FFF3CF" opacity={0.8} style="stroke" strokeWidth={0.6} />
      <Group transform={sheenTransform} origin={vec(C, C)} opacity={sheenOpacity}>
        <Path path={sheenPath} color="#FFFFFF" opacity={0.45} style="stroke" strokeWidth={5} strokeCap="round" />
        <Path path={sheenPath} color="#FFFFFF" style="stroke" strokeWidth={2.6} strokeCap="round" />
      </Group>
      {sparks && Array.from({ length: 6 }, (_, i) => <Spark key={i} i={i} clock={clock} still={still} />)}
    </Group>
  )
}

function Spark({ i, clock, still }: { i: number; clock: Clock; still: boolean }) {
  const r = 0.8 + (i % 3) * 0.15
  const dist = 51.5 + (i % 2) * 1.5
  const transform = useDerivedValue(() => {
    const a = (i / 6) * TAU + (still ? 0 : ((secs(clock) % 24) / 24) * TAU) - Math.PI / 2
    return [{ translateX: C + dist * Math.cos(a) }, { translateY: C + dist * Math.sin(a) }]
  })
  const opacity = useDerivedValue(() => breathe(clock, 3 + (i % 3), 0.3, 1, still))
  return (
    <Group transform={transform} opacity={opacity}>
      <Circle cx={0} cy={0} r={r * 2.4} color="rgba(242,194,90,0.35)" />
      <Circle cx={0} cy={0} r={r} color="#FFF3CF" />
    </Group>
  )
}

const styles = StyleSheet.create({
  canvas: { position: 'absolute' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
})

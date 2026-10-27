/**
 * The Seriya (streak) hero card's background in an app theme: a sky in the
 * theme's colours, a soft glow behind the tree, and one living element per
 * theme (Skia, slow loops, pauses when the screen isn't focused, still under
 * Reduce Motion):
 *   Tun     — twinkling stars and a shooting star every ~9 s
 *   Zumrad  — a gold lattice with a slow light sweep and rising gold motes
 *   Sakura  — pink petals drifting down and turning
 *   Ramazon — a large glowing crescent and two lanterns swinging gently
 *   Navroʻz — a breathing spring sun, tulips swaying, pollen drifting up
 * Standart keeps the original aurora / meadow background.
 */
import React, { memo, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useIsFocused } from 'expo-router'
import { useDerivedValue } from 'react-native-reanimated'
import {
  Canvas, Circle, Group, Line, LinearGradient, Oval, Path, PathOp, RadialGradient, Rect, RoundedRect, Skia, vec,
} from '@shopify/react-native-skia'
import type { ThemeId } from '../../design/themes'
import { TAU, WithClock, breathe, lifeProgress, secs, type Clock } from '../profile/cosmetics/motion'

type SceneTheme = Exclude<ThemeId, 'standart'>

const SKY: Record<SceneTheme, { colors: [string, string, string]; glow: string }> = {
  tun: { colors: ['#0A1024', '#142048', '#22396E'], glow: '#8EC5FF' },
  zumrad: { colors: ['#06140F', '#0D2A20', '#174A39'], glow: '#9FE3C0' },
  sakura: { colors: ['#FFF7F9', '#FCE8EF', '#FBE1EA'], glow: '#FFD2E2' },
  ramazon: { colors: ['#0D0A24', '#1F1A49', '#2F2675'], glow: '#F6D58A' },
  navroz: { colors: ['#F7FBF0', '#EEF6E4', '#DDF0CC'], glow: '#CFF0B8' },
}

function seeded(seed: number) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

export const ThemeHeroScene = memo(function ThemeHeroScene({ themeId }: { themeId: SceneTheme }) {
  const focused = useIsFocused()
  const [size, setSize] = useState({ w: 0, h: 0 })
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={e => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {size.w > 0 && (
        <WithClock
          animated
          paused={!focused}
          render={(clock, still) => (
            <Canvas style={{ width: size.w, height: size.h }}>
              <Scene themeId={themeId} w={size.w} h={size.h} clock={clock} still={still} />
            </Canvas>
          )}
        />
      )}
    </View>
  )
})

function Scene({ themeId, w, h, clock, still }: { themeId: SceneTheme; w: number; h: number; clock: Clock; still: boolean }) {
  const sky = SKY[themeId]
  const glow = useDerivedValue(() => breathe(clock, 6, 0.55, 0.85, still))
  const gx = w / 2, gy = h * 0.46, gr = Math.max(w, h) * 0.42
  return (
    <Group>
      <Rect x={0} y={0} width={w} height={h}>
        <LinearGradient start={vec(0, 0)} end={vec(0, h)} colors={sky.colors} positions={[0, 0.55, 1]} />
      </Rect>
      <Circle cx={gx} cy={gy} r={gr} opacity={glow}>
        <RadialGradient c={vec(gx, gy)} r={gr} colors={[sky.glow + 'AA', sky.glow + '00']} />
      </Circle>
      {themeId === 'tun' && <Night w={w} h={h} clock={clock} still={still} />}
      {themeId === 'zumrad' && <Emerald w={w} h={h} clock={clock} still={still} />}
      {themeId === 'sakura' && <Petals w={w} h={h} clock={clock} still={still} />}
      {themeId === 'ramazon' && <Ramadan w={w} h={h} clock={clock} still={still} />}
      {themeId === 'navroz' && <Spring w={w} h={h} clock={clock} still={still} />}
    </Group>
  )
}

type P = { w: number; h: number; clock: Clock; still: boolean }

// ── Tun ──────────────────────────────────────────────────────────────────────
function Stars({ w, h, count, color, seed, clock, still }: P & { count: number; color: string; seed: number }) {
  const stars = useMemo(() => {
    const r = seeded(seed)
    return Array.from({ length: count }, (_, i) => ({ x: r() * w, y: r() * h * 0.55, r: 0.7 + r() * 1.1, g: i % 2 }))
  }, [w, h, count, seed])
  const a = useDerivedValue(() => breathe(clock, 4.5, 0.3, 0.95, still))
  const b = useDerivedValue(() => (still ? 0.95 : 1.25 - breathe(clock, 6.5, 0.3, 0.95, false)))
  return (
    <Group>
      <Group opacity={a}>{stars.filter(s => s.g === 0).map((s, i) => <Circle key={i} cx={s.x} cy={s.y} r={s.r} color={color} />)}</Group>
      <Group opacity={b}>{stars.filter(s => s.g === 1).map((s, i) => <Circle key={i} cx={s.x} cy={s.y} r={s.r} color={color} />)}</Group>
    </Group>
  )
}

function Night(p: P) {
  const { w, clock, still } = p
  // A shooting star crosses the top in 0.9 s, every 9 s.
  const shoot = useDerivedValue(() => {
    if (still) return [{ translateX: -400 }]
    const t = secs(clock) % 9
    const u = Math.min(1, t / 0.9)
    return [{ translateX: w * 0.15 + u * w * 0.6 }, { translateY: 20 + u * 60 }]
  })
  const shootOpacity = useDerivedValue(() => {
    if (still) return 0
    const t = secs(clock) % 9
    return t > 0.9 ? 0 : Math.sin((t / 0.9) * Math.PI)
  })
  return (
    <Group>
      <Stars {...p} count={26} color="#F5E6A8" seed={11} />
      <Group transform={shoot} opacity={shootOpacity}>
        <Line p1={vec(-46, -18)} p2={vec(0, 0)} strokeWidth={2} strokeCap="round">
          <LinearGradient start={vec(-46, -18)} end={vec(0, 0)} colors={['#FFFFFF00', '#FFFFFF']} />
        </Line>
        <Circle cx={0} cy={0} r={2} color="#FFFFFF" />
      </Group>
    </Group>
  )
}

// ── Zumrad ───────────────────────────────────────────────────────────────────
function Emerald(p: P) {
  const { w, h, clock, still } = p
  const lattice = useMemo(() => {
    const path = Skia.Path.Make()
    const step = 26
    for (let x = -h; x < w + h; x += step) {
      path.moveTo(x, 0); path.lineTo(x + h, h)
      path.moveTo(x, h); path.lineTo(x + h, 0)
    }
    return path
  }, [w, h])
  const sweep = useDerivedValue(() => {
    const x = still ? -w : -w * 0.6 + ((secs(clock) % 10) / 10) * w * 2.2
    return [{ translateX: x }, { rotate: 0.35 }]
  })
  return (
    <Group>
      <Path path={lattice} color="#D9B45A" opacity={0.1} style="stroke" strokeWidth={0.8} />
      <Group transform={sweep}>
        <Rect x={-60} y={-h} width={120} height={h * 3}>
          <LinearGradient start={vec(-60, 0)} end={vec(60, 0)} colors={['#E5C36E00', '#E5C36E22', '#E5C36E00']} />
        </Rect>
      </Group>
      <Motes {...p} count={10} color="#F2D78A" seed={23} />
    </Group>
  )
}

function Motes({ w, h, count, color, seed, clock, still }: P & { count: number; color: string; seed: number }) {
  const list = useMemo(() => {
    const r = seeded(seed)
    return Array.from({ length: count }, (_, i) => ({
      x: w * (0.1 + r() * 0.8), y: h * (0.55 + r() * 0.4), size: 1.4 + r() * 1.4,
      life: 6 + (i % 3) * 1.5, delay: -1.1 * i, rise: 60 + r() * 50, drift: (r() * 2 - 1) * 10,
    }))
  }, [w, h, count, seed])
  return <Group>{list.map((m, i) => <Mote key={i} m={m} color={color} clock={clock} still={still} />)}</Group>
}

function Mote({ m, color, clock, still }: { m: { x: number; y: number; size: number; life: number; delay: number; rise: number; drift: number }; color: string; clock: Clock; still: boolean }) {
  const { life, delay, rise, drift } = m
  const transform = useDerivedValue(() => {
    const u = still ? 0.4 : lifeProgress(clock, life, delay)
    return [{ translateX: drift * Math.sin(u * Math.PI) }, { translateY: -rise * u }]
  })
  const opacity = useDerivedValue(() => {
    if (still) return 0.7
    const u = lifeProgress(clock, life, delay)
    return u < 0.2 ? u / 0.2 : u > 0.75 ? (1 - u) / 0.25 : 1
  })
  return (
    <Group transform={transform} opacity={opacity}>
      <Circle cx={m.x} cy={m.y} r={m.size * 2.2}>
        <RadialGradient c={vec(m.x, m.y)} r={m.size * 2.2} colors={['#FFFFFF', color, color + '00']} positions={[0, 0.35, 1]} />
      </Circle>
    </Group>
  )
}

// ── Sakura ───────────────────────────────────────────────────────────────────
const PETAL = (() => {
  const p = Skia.Path.Make()
  p.moveTo(0, -5); p.cubicTo(4, -4, 4.5, 2, 0, 5); p.cubicTo(-4.5, 2, -4, -4, 0, -5); p.close()
  return p
})()

function Petals({ w, h, clock, still }: P) {
  const list = useMemo(() => {
    const r = seeded(37)
    return Array.from({ length: 14 }, (_, i) => ({
      x: r() * w * 1.1 - w * 0.05, fall: h + 30, drift: 30 + r() * 50, life: 7 + r() * 5,
      delay: -0.8 * i - r() * 2, spin: 1 + r() * 2, scale: 0.8 + r() * 0.7, color: i % 3 === 0 ? '#F4B3C8' : '#EE8FB0',
    }))
  }, [w, h])
  return <Group>{list.map((p, i) => <Petal key={i} p={p} clock={clock} still={still} />)}</Group>
}

function Petal({ p, clock, still }: { p: { x: number; fall: number; drift: number; life: number; delay: number; spin: number; scale: number; color: string }; clock: Clock; still: boolean }) {
  const { x, fall, drift, life, delay, spin, scale } = p
  const transform = useDerivedValue(() => {
    const u = still ? 0.35 + (x % 7) / 20 : lifeProgress(clock, life, delay)
    return [
      { translateX: x + drift * u + 10 * Math.sin(u * TAU * 1.5) },
      { translateY: -16 + fall * u },
      { rotate: u * TAU * spin },
      { scale },
    ]
  })
  const opacity = useDerivedValue(() => {
    if (still) return 0.85
    const u = lifeProgress(clock, life, delay)
    return u < 0.08 ? u / 0.08 : u > 0.85 ? (1 - u) / 0.15 : 0.9
  })
  return <Group transform={transform} opacity={opacity}><Path path={PETAL} color={p.color} /></Group>
}

// ── Ramazon ──────────────────────────────────────────────────────────────────
function Ramadan(p: P) {
  const { w, clock, still } = p
  const moonX = w - 62, moonY = 70
  const crescent = useMemo(() => {
    const outer = Skia.Path.Make(); outer.addCircle(moonX, moonY, 30)
    const inner = Skia.Path.Make(); inner.addCircle(moonX + 12, moonY - 8, 26)
    return Skia.Path.MakeFromOp(outer, inner, PathOp.Difference) ?? outer
  }, [moonX, moonY])
  const halo = useDerivedValue(() => breathe(clock, 5, 0.18, 0.38, still))
  return (
    <Group>
      <Stars {...p} count={18} color="#F6D58A" seed={5} />
      <Circle cx={moonX} cy={moonY} r={70} opacity={halo}>
        <RadialGradient c={vec(moonX, moonY)} r={70} colors={['#F6C55E', '#F6C55E00']} />
      </Circle>
      <Path path={crescent}>
        <LinearGradient start={vec(moonX - 30, moonY - 30)} end={vec(moonX + 20, moonY + 30)} colors={['#FFF3CC', '#F6C55E']} />
      </Path>
      <Lantern x={44} length={56} size={1.15} period={4.6} phase={0} clock={clock} still={still} />
      <Lantern x={96} length={30} size={0.85} period={5.4} phase={1.3} clock={clock} still={still} />
    </Group>
  )
}

function Lantern({ x, length, size, period, phase, clock, still }: {
  x: number; length: number; size: number; period: number; phase: number; clock: Clock; still: boolean
}) {
  // Hangs from the top edge and swings ±7° around its string's top.
  const swing = useDerivedValue(() => [{ rotate: still ? 0 : (7 * Math.PI / 180) * Math.sin(((secs(clock) + phase) / period) * TAU) }])
  const light = useDerivedValue(() => breathe(clock, 3.2, 0.55, 1, still))
  const bw = 20 * size, bh = 30 * size
  return (
    <Group transform={swing} origin={vec(x, 0)}>
      <Line p1={vec(x, 0)} p2={vec(x, length)} color="#F2B544" strokeWidth={1.2} />
      <Group transform={[{ translateX: x - bw / 2 }, { translateY: length }]}>
        <Circle cx={bw / 2} cy={bh / 2 + 4} r={bw * 1.6} opacity={light}>
          <RadialGradient c={vec(bw / 2, bh / 2 + 4)} r={bw * 1.6} colors={['#FFE7A6AA', '#FFE7A600']} />
        </Circle>
        <RoundedRect x={bw * 0.2} y={0} width={bw * 0.6} height={4} r={2} color="#C98A2E" />
        <RoundedRect x={0} y={4} width={bw} height={bh} r={bw * 0.45} color="#F2B544" />
        <RoundedRect x={bw * 0.24} y={8} width={bw * 0.52} height={bh - 8} r={bw * 0.25} color="#FFE7A6" opacity={light} />
        <RoundedRect x={bw * 0.3} y={bh + 4} width={bw * 0.4} height={4} r={2} color="#C98A2E" />
      </Group>
    </Group>
  )
}

// ── Navroʻz ──────────────────────────────────────────────────────────────────
function Spring(p: P) {
  const { w, h, clock, still } = p
  const sun = useDerivedValue(() => breathe(clock, 6, 0.6, 1, still))
  return (
    <Group>
      <Circle cx={60} cy={60} r={110} opacity={sun}>
        <RadialGradient c={vec(60, 60)} r={110} colors={['#FFF6D8', '#FFF6D800']} />
      </Circle>
      <Oval x={-40} y={h - 34} width={w + 80} height={70} color="#BFE3A8" opacity={0.7} />
      <Tulip x={26} base={h - 8} height={54} color="#D6453D" phase={0} clock={clock} still={still} />
      <Tulip x={52} base={h - 4} height={40} color="#E9784A" phase={0.9} clock={clock} still={still} />
      <Tulip x={w - 30} base={h - 6} height={50} color="#D6453D" phase={1.7} clock={clock} still={still} />
      <Tulip x={w - 58} base={h - 2} height={36} color="#F0A93B" phase={2.4} clock={clock} still={still} />
      <Motes {...p} count={8} color="#F7E38A" seed={41} />
    </Group>
  )
}

function Tulip({ x, base, height, color, phase, clock, still }: {
  x: number; base: number; height: number; color: string; phase: number; clock: Clock; still: boolean
}) {
  const sway = useDerivedValue(() => [{ rotate: still ? 0 : (4 * Math.PI / 180) * Math.sin(((secs(clock) + phase) / 4.2) * TAU) }])
  const path = useMemo(() => {
    const top = base - height
    const stem = Skia.Path.Make()
    stem.moveTo(x, base); stem.quadTo(x - 2, base - height * 0.5, x, top + 10)
    const leaf = Skia.Path.Make()
    leaf.moveTo(x, base - height * 0.25); leaf.quadTo(x - 14, base - height * 0.45, x - 12, base - height * 0.7)
    leaf.quadTo(x - 4, base - height * 0.45, x, base - height * 0.3)
    const cup = Skia.Path.Make()
    cup.moveTo(x - 8, top + 10); cup.quadTo(x - 9, top - 4, x - 4, top - 6); cup.lineTo(x, top + 1)
    cup.lineTo(x + 4, top - 6); cup.quadTo(x + 9, top - 4, x + 8, top + 10); cup.quadTo(x, top + 15, x - 8, top + 10); cup.close()
    return { stem, leaf, cup }
  }, [x, base, height])
  return (
    <Group transform={sway} origin={vec(x, base)}>
      <Path path={path.stem} color="#2F9A55" style="stroke" strokeWidth={2} strokeCap="round" />
      <Path path={path.leaf} color="#3FAF63" />
      <Path path={path.cup} color={color} />
    </Group>
  )
}

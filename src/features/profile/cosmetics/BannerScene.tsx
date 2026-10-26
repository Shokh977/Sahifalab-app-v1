/**
 * BannerScene — the profile banner as a quiet living scene (Skia).
 * viewBox 411 × 180, cover-fit. Layers back → front: sky → light source
 * → three landscape layers with two haze bands between them → moving
 * light → particles; film grain sits in a second, static canvas on top.
 *
 * Performance: the animated canvas redraws whole on every frame, so it has
 * no blur (soft light is radial gradients). The grain's noise is rendered
 * once per app run into a small tile image and repeated; the per-pixel
 * noise shader never runs while drawing.
 */
import React, { memo, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useDerivedValue } from 'react-native-reanimated'
import {
  Canvas, Circle, Group, ImageShader, LinearGradient, Path, PathOp,
  RadialGradient, Rect, Skia, vec, type SkImage,
} from '@shopify/react-native-skia'
import { useTheme } from '../../../design/ThemeProvider'
import type { Scheme } from '../../../design/tokens'
import type { BannerKind } from './cosmetics'
import { TAU, WithClock, breathe, lifeProgress, secs, sweep, type Clock } from './motion'

const W = 411
const H = 180

/** Plain banner: the theme gradient (light / dark). */
const PLAIN: Record<Scheme, [string, string]> = {
  light: ['#FCE3CF', '#F4C7A0'],
  dark: ['#2B1D16', '#4A2C1C'],
}

interface Layer { y: number; amp: number; ph: number; colors: [string, string] }
interface SceneDef { sky: [string, string, string]; layers: Layer[]; haze: string }

const SCENES: Record<Exclude<BannerKind, 'plain'>, SceneDef> = {
  tong: {
    sky: ['#F8E8D2', '#F3C7A2', '#EBA383'], haze: '#FBE7D8',
    layers: [
      { y: 128, amp: 8, ph: 0.4, colors: ['#EDB394', '#E39A80'] },
      { y: 146, amp: 7, ph: 2.1, colors: ['#D98A70', '#C77464'] },
      { y: 162, amp: 5, ph: 4.0, colors: ['#B5625A', '#8E4A4A'] },
    ],
  },
  tun: {
    sky: ['#0A1330', '#18285A', '#2E4482'], haze: '#3B5598',
    layers: [
      { y: 112, amp: 14, ph: 1.2, colors: ['#24396E', '#1C2E5C'] },
      { y: 132, amp: 10, ph: 3.3, colors: ['#18284E', '#121E3E'] },
      { y: 152, amp: 7, ph: 5.1, colors: ['#0D1630', '#080E20'] },
    ],
  },
  oltin: {
    sky: ['#1E1610', '#5A3418', '#E09A48'], haze: '#E8A24A',
    layers: [
      { y: 120, amp: 9, ph: 0.8, colors: ['#5A3418', '#3E2412'] },
      { y: 140, amp: 8, ph: 2.6, colors: ['#33200F', '#22150A'] },
      { y: 158, amp: 6, ph: 4.4, colors: ['#1A0F07', '#0E0804'] },
    ],
  },
  bahor: {
    sky: ['#E4F1EA', '#F1F0E2', '#FBEFE6'], haze: '#F4F6EC',
    layers: [
      { y: 118, amp: 10, ph: 1.6, colors: ['#D3E8CA', '#C2DFB8'] },
      { y: 138, amp: 8, ph: 3.0, colors: ['#AFD6AA', '#95C796'] },
      { y: 156, amp: 6, ph: 4.8, colors: ['#80BC8A', '#62A472'] },
    ],
  },
  hilol: {
    sky: ['#0C0A24', '#1F1A52', '#3A2E78'], haze: '#4A3C8C',
    layers: [
      { y: 124, amp: 8, ph: 0.6, colors: ['#2A2366', '#221C55'] },
      { y: 144, amp: 7, ph: 2.4, colors: ['#1A1544', '#141033'] },
      { y: 160, amp: 5, ph: 4.2, colors: ['#0F0B2A', '#090720'] },
    ],
  },
}

// ── geometry (built once) ────────────────────────────────────────────────────
const n2 = (v: number) => Math.round(v * 100) / 100

/** A smooth ridge across the banner, closed to the bottom edge. */
function ridge({ y, amp, ph }: Layer) {
  const pts: [number, number][] = []
  for (let x = -20; x <= W + 20; x += 34) {
    pts.push([x, y + amp * Math.sin(x / 71 + ph) * 0.7 + amp * Math.sin(x / 29 + ph * 1.7) * 0.3])
  }
  let d = `M${pts[0][0]} ${H + 2}L${pts[0][0]} ${n2(pts[0][1])}`
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2
    d += `Q${n2(pts[i][0])} ${n2(pts[i][1])} ${n2(mx)} ${n2(my)}`
  }
  const last = pts[pts.length - 1]
  return `${d}L${last[0]} ${n2(last[1])}L${last[0]} ${H + 2}Z`
}

function seeded(seed: number) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

/** 14 stars in two twinkle groups, kept clear of the moon and the nav. */
function stars(seed: number) {
  const r = seeded(seed)
  const out: { x: number; y: number; r: number; g: 0 | 1 }[] = []
  while (out.length < 14) {
    const x = 8 + r() * (W - 16), y = 6 + r() * 92
    if (Math.hypot(x - 236, y - 50) < 34) continue
    out.push({ x: n2(x), y: n2(y), r: n2(0.6 + r() * 0.4), g: (out.length % 2) as 0 | 1 })
  }
  return out
}

function particles(seed: number, x0: number, x1: number, y0: number, y1: number) {
  const r = seeded(seed)
  return Array.from({ length: 8 }, (_, i) => ({
    x: n2(x0 + r() * (x1 - x0)), y: n2(y0 + r() * (y1 - y0)),
    size: n2(1.4 + r() * 1), dx: n2(r()), dy: n2(r()),
    life: [8, 10, 12][i % 3], delay: -1.3 * i,
  }))
}

function crescent() {
  const outer = Skia.Path.Make(); outer.addCircle(236, 52, 13)
  const inner = Skia.Path.Make(); inner.addCircle(241, 48, 11.5)
  return Skia.Path.MakeFromOp(outer, inner, PathOp.Difference) ?? outer
}

// ── component ────────────────────────────────────────────────────────────────
export const BannerScene = memo(function BannerScene({ kind, width, height, animated = true }: {
  kind: BannerKind
  width: number
  height: number
  animated?: boolean
}) {
  const { scheme } = useTheme()
  const s = Math.max(width / W, height / H)
  const fit = [{ translateX: (width - W * s) / 2 }, { translateY: (height - H * s) / 2 }, { scale: s }]
  return (
    <View style={{ width, height, overflow: 'hidden' }} pointerEvents="none">
      <WithClock
        animated={animated && kind !== 'plain'}
        render={(clock, still) => (
          <Canvas style={{ width, height }}>
            <Group transform={fit}>
              {kind === 'plain'
                ? <Plain colors={PLAIN[scheme]} />
                : <Scene kind={kind} clock={clock} still={still} />}
            </Group>
          </Canvas>
        )}
      />
      <Grain width={width} height={height} alpha={kind === 'plain' ? 0.05 : 0.07} />
    </View>
  )
})

const TILE = 128
const grainTiles = new Map<number, SkImage | null>()

/**
 * A 128 px tile of grey noise at a fixed alpha, rendered once and cached.
 * The alpha lives in the colour matrix: a colour filter runs after paint
 * opacity, so paint opacity would be overwritten (the grain drew opaque).
 */
function grainTile(alpha: number): SkImage | null {
  if (grainTiles.has(alpha)) return grainTiles.get(alpha)!
  let image: SkImage | null = null
  try {
    const surface = Skia.Surface.Make(TILE, TILE)
    if (surface) {
      const paint = Skia.Paint()
      paint.setShader(Skia.Shader.MakeFractalNoise(0.9, 0.9, 2, 3, TILE, TILE))
      paint.setColorFilter(Skia.ColorFilter.MakeMatrix([
        0.33, 0.33, 0.33, 0, 0,
        0.33, 0.33, 0.33, 0, 0,
        0.33, 0.33, 0.33, 0, 0,
        0, 0, 0, 0, alpha,
      ]))
      surface.getCanvas().drawRect(Skia.XYWHRect(0, 0, TILE, TILE), paint)
      surface.flush()
      image = surface.makeImageSnapshot()
    }
  } catch {
    image = null
  }
  grainTiles.set(alpha, image)
  return image
}

function Grain({ width, height, alpha }: { width: number; height: number; alpha: number }) {
  const image = grainTile(alpha)
  if (!image) return null
  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Rect x={0} y={0} width={width} height={height}>
        <ImageShader image={image} tx="repeat" ty="repeat" fit="none" rect={{ x: 0, y: 0, width: TILE, height: TILE }} />
      </Rect>
    </Canvas>
  )
}

function Plain({ colors }: { colors: [string, string] }) {
  return (
    <Group>
      <Rect x={0} y={0} width={W} height={H}>
        <LinearGradient start={vec(0, 0)} end={vec(W, H)} colors={colors} />
      </Rect>
      <Circle cx={W} cy={0} r={240}>
        <RadialGradient c={vec(W, 0)} r={240} colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']} />
      </Circle>
      <Circle cx={0} cy={H} r={160}>
        <RadialGradient c={vec(0, H)} r={160} colors={['rgba(255,255,255,0.27)', 'rgba(255,255,255,0)']} />
      </Circle>
    </Group>
  )
}

function Scene({ kind, clock, still }: { kind: Exclude<BannerKind, 'plain'>; clock: Clock; still: boolean }) {
  const def = SCENES[kind]
  const geo = useMemo(() => ({
    ridges: def.layers.map(ridge),
    stars: kind === 'tun' || kind === 'hilol' ? stars(kind === 'tun' ? 11 : 29) : [],
    motes: kind === 'oltin' ? particles(7, 20, 390, 112, 172) : [],
    petals: kind === 'bahor' ? particles(19, -30, 300, -10, 70) : [],
    crescent: kind === 'hilol' ? crescent() : null,
  }), [def, kind])

  return (
    <Group>
      <Rect x={0} y={0} width={W} height={H}>
        <LinearGradient start={vec(0, 0)} end={vec(0, H)} colors={def.sky} positions={[0, 0.55, 1]} />
      </Rect>

      {kind === 'tong' && <Sun clock={clock} still={still} />}
      {(kind === 'tun' || kind === 'hilol') && <Stars stars={geo.stars} clock={clock} still={still} />}
      {kind === 'tun' && <Moon />}
      {kind === 'hilol' && geo.crescent && <Crescent path={geo.crescent} />}
      {kind === 'hilol' && <HorizonGlow clock={clock} still={still} />}
      {kind === 'oltin' && <GoldSun clock={clock} still={still} />}
      {kind === 'bahor' && <SoftSun clock={clock} still={still} />}

      {geo.ridges.map((d, i) => (
        <Group key={i}>
          {i > 0 && (
            <Rect x={0} y={def.layers[i].y - 34} width={W} height={40}>
              <LinearGradient
                start={vec(0, def.layers[i].y - 34)} end={vec(0, def.layers[i].y + 6)}
                colors={[def.haze + '00', def.haze + '66']}
              />
            </Rect>
          )}
          <Path path={d}>
            <LinearGradient
              start={vec(0, def.layers[i].y - def.layers[i].amp)} end={vec(0, H)}
              colors={def.layers[i].colors}
            />
          </Path>
        </Group>
      ))}

      {kind === 'tun' && !still && <LightBand clock={clock} />}
      {geo.motes.map((m, i) => <Mote key={i} m={m} clock={clock} still={still} />)}
      {geo.petals.map((p, i) => <Petal key={i} p={p} clock={clock} still={still} />)}
    </Group>
  )
}

function Sun({ clock, still }: { clock: Clock; still: boolean }) {
  const opacity = useDerivedValue(() => breathe(clock, 6, 0.75, 1, still))
  return (
    <Circle cx={300} cy={112} r={90} opacity={opacity}>
      <RadialGradient c={vec(300, 112)} r={90} colors={['#FFFDF4', '#FFE2C0', '#FFE2C000']} positions={[0, 0.45, 1]} />
    </Circle>
  )
}

function SoftSun({ clock, still }: { clock: Clock; still: boolean }) {
  const opacity = useDerivedValue(() => breathe(clock, 6, 0.8, 1, still))
  return (
    <Circle cx={74} cy={34} r={90} opacity={opacity}>
      <RadialGradient c={vec(74, 34)} r={90} colors={['#FFFFFF', '#FFF8E8AA', '#FFF8E800']} positions={[0, 0.35, 1]} />
    </Circle>
  )
}

function Stars({ stars: list, clock, still }: { stars: ReturnType<typeof stars>; clock: Clock; still: boolean }) {
  const a = useDerivedValue(() => breathe(clock, 5, 0.35, 0.9, still))
  const b = useDerivedValue(() => (still ? 0.9 : 0.35 + 0.9 - breathe(clock, 7, 0.35, 0.9, false)))
  return (
    <Group>
      <Group opacity={a}>{list.filter(s => s.g === 0).map((s, i) => <Circle key={i} cx={s.x} cy={s.y} r={s.r} color="#FFFFFF" />)}</Group>
      <Group opacity={b}>{list.filter(s => s.g === 1).map((s, i) => <Circle key={i} cx={s.x} cy={s.y} r={s.r} color="#FFFFFF" />)}</Group>
    </Group>
  )
}

function Moon() {
  return (
    <Group>
      <Circle cx={236} cy={50} r={34}>
        <RadialGradient c={vec(236, 50)} r={34} colors={['rgba(244,241,230,0.35)', 'rgba(244,241,230,0)']} />
      </Circle>
      <Circle cx={236} cy={50} r={11}>
        <RadialGradient c={vec(232, 46)} r={13} colors={['#FFFFFF', '#F4F1E6', '#D9D4C4']} />
      </Circle>
    </Group>
  )
}

function Crescent({ path }: { path: ReturnType<typeof crescent> }) {
  return (
    <Group>
      <Circle cx={236} cy={52} r={40}>
        <RadialGradient c={vec(236, 52)} r={40} colors={['rgba(255,243,204,0.22)', 'rgba(255,243,204,0)']} />
      </Circle>
      <Path path={path}>
        <LinearGradient start={vec(224, 40)} end={vec(246, 66)} colors={['#FFF3CC', '#E9B14C']} />
      </Path>
    </Group>
  )
}

function HorizonGlow({ clock, still }: { clock: Clock; still: boolean }) {
  const opacity = useDerivedValue(() => breathe(clock, 6, 0.25, 0.45, still))
  return (
    <Circle cx={W / 2} cy={150} r={230} opacity={opacity}>
      <RadialGradient c={vec(W / 2, 150)} r={230} colors={['#F2B544', '#F2B54400']} />
    </Circle>
  )
}

function GoldSun({ clock, still }: { clock: Clock; still: boolean }) {
  const glow = useDerivedValue(() => breathe(clock, 6, 0.45, 0.7, still))
  const halo = useDerivedValue(() => breathe(clock, 6, 0.2, 0.42, still))
  // Sheen: a 16 px bar tilted 24°, crosses the disc in 1.2 s, rests 4.8 s.
  const sheen = useDerivedValue(() => {
    const p = still ? -1 : sweep(clock, 6, 1.2, [0.4, 0, 0.2, 1])
    return [{ translateX: p < 0 ? -200 : 300 - 40 + 80 * p }, { translateY: 104 }, { rotate: (24 * Math.PI) / 180 }]
  })
  const disc = useMemo(() => { const p = Skia.Path.Make(); p.addCircle(300, 104, 26); return p }, [])
  return (
    <Group>
      <Circle cx={300} cy={104} r={120} opacity={glow}>
        <RadialGradient c={vec(300, 104)} r={120} colors={['#FFF4D6', '#F2B85A', '#F2B85A00']} positions={[0, 0.3, 1]} />
      </Circle>
      <Circle cx={300} cy={104} r={60} opacity={halo}>
        <RadialGradient c={vec(300, 104)} r={60} colors={['#F2B85A', '#F2B85A00']} positions={[0.35, 1]} />
      </Circle>
      <Path path={disc}>
        <LinearGradient start={vec(282, 84)} end={vec(318, 126)} colors={['#FFF6D6', '#F2C25A', '#A86C1C']} positions={[0, 0.45, 1]} />
      </Path>
      <Group clip={disc}>
        <Rect x={-8} y={-40} width={16} height={80} color="rgba(255,255,255,0.55)" transform={sheen} />
      </Group>
    </Group>
  )
}

function LightBand({ clock }: { clock: Clock }) {
  // A 140 px white band at 12 %, rotated 18°, sweeping left → right → left over 14 s.
  const transform = useDerivedValue(() => {
    const x = -150 + (W + 300) * (0.5 - 0.5 * Math.cos((secs(clock) / 14) * TAU))
    return [{ translateX: x }, { rotate: (18 * Math.PI) / 180 }]
  })
  return (
    <Group transform={transform}>
      <Rect x={-70} y={-60} width={140} height={H + 120}>
        <LinearGradient start={vec(-70, 0)} end={vec(70, 0)} colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']} />
      </Rect>
    </Group>
  )
}

type Particle = ReturnType<typeof particles>[number]

function fade(u: number) {
  'worklet'
  return u < 0.25 ? (u / 0.25) * 0.9 : u < 0.75 ? 0.9 : 0.9 * (1 - (u - 0.75) / 0.25)
}

function Mote({ m, clock, still }: { m: Particle; clock: Clock; still: boolean }) {
  const { life, delay, dx, dy } = m
  const rise = 50 + dy * 24
  const transform = useDerivedValue(() => {
    const u = still ? 0.4 : lifeProgress(clock, life, delay)
    return [{ translateX: (dx * 2 - 1) * 6 * Math.sin(u * Math.PI) }, { translateY: -rise * u }]
  })
  const opacity = useDerivedValue(() => (still ? 0.7 : fade(lifeProgress(clock, life, delay))))
  return (
    <Group transform={transform} opacity={opacity}>
      <Circle cx={m.x} cy={m.y} r={m.size * 2}>
        <RadialGradient c={vec(m.x, m.y)} r={m.size * 2} colors={['#FFFFFF', '#FFD27A', '#FFD27A00']} positions={[0, 0.4, 1]} />
      </Circle>
    </Group>
  )
}

function Petal({ p, clock, still }: { p: Particle; clock: Clock; still: boolean }) {
  const { life, delay, dx, dy } = p
  const tx = 40 + dx * 20, ty = 90 + dy * 20
  const transform = useDerivedValue(() => {
    const u = still ? 0.4 : lifeProgress(clock, life, delay)
    return [{ translateX: tx * u }, { translateY: ty * u }]
  })
  const opacity = useDerivedValue(() => (still ? 0.7 : fade(lifeProgress(clock, life, delay))))
  return (
    <Group transform={transform} opacity={opacity}>
      <Circle cx={p.x} cy={p.y} r={3}>
        <RadialGradient c={vec(p.x - 0.8, p.y - 0.8)} r={3.4} colors={['#FFE3EC', '#EE9DB6']} />
      </Circle>
    </Group>
  )
}

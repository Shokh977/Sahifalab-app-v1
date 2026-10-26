/* ============================================================
   Sahifalab — "Eman" (oak) streak tree, drawn with Skia.
   Geometry comes from oakGeometry.ts (built once per stage/state/
   size); per frame only clump rotations, opacities and particle
   positions change. Draw order: god rays → aura → island → seed/
   sprout → back clumps → wood → mid + front clumps → orbs →
   butterflies → motes → falling leaf / snow.
   Reduce Motion or animate={false}: a still frame, no particles.
   ============================================================ */
import React, { memo, useMemo } from 'react'
import { useDerivedValue, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated'
import {
  BlurMask, Canvas, Circle, Group, LinearGradient, Oval, Path, RadialGradient, useClock, vec,
} from '@shopify/react-native-skia'
import {
  BUTTERFLY, OAK_H, OAK_ORIGIN, OAK_W, buildOakScene,
  type OakClump, type OakMote, type OakScene, type OakStage, type OakState,
} from './oakGeometry'

type Clock = SharedValue<number>
const TAU = Math.PI * 2

/** 0.5 ± 0.5 breathing wave with the given period (s). */
function wave(clock: Clock, period: number) {
  'worklet'
  return 0.5 + 0.5 * Math.sin((clock.value / 1000 / period) * TAU)
}

export interface OakTreeProps {
  stage: OakStage
  state?: OakState
  /** Width in px; height is width × 1.25. */
  size?: number
  animate?: boolean
}

export const OakTree = memo(function OakTree({ stage, state = 'alive', size = 320, animate = true }: OakTreeProps) {
  const reduceMotion = useReducedMotion()
  const scene = useMemo(() => buildOakScene(stage, state, size), [stage, state, size])
  return animate && !reduceMotion
    ? <LiveOak scene={scene} size={size} />
    : <StillOak scene={scene} size={size} />
})

function LiveOak({ scene, size }: { scene: OakScene; size: number }) {
  const clock = useClock()
  return <OakCanvas scene={scene} size={size} clock={clock} moving />
}

function StillOak({ scene, size }: { scene: OakScene; size: number }) {
  const clock = useSharedValue(0)
  return <OakCanvas scene={scene} size={size} clock={clock} moving={false} />
}

function OakCanvas({ scene, size, clock, moving }: { scene: OakScene; size: number; clock: Clock; moving: boolean }) {
  const s = scene
  const twinkle0 = useDerivedValue(() => 0.55 + 0.45 * wave(clock, 3))
  const twinkle1 = useDerivedValue(() => 0.55 + 0.45 * wave(clock, 4))
  const twinkle2 = useDerivedValue(() => 0.55 + 0.45 * wave(clock, 5))
  const twinkles = [twinkle0, twinkle1, twinkle2]
  const glow = useDerivedValue(() => 0.6 + 0.4 * wave(clock, 4))
  const runeGlow = useDerivedValue(() => 0.4 + 0.55 * wave(clock, 4))
  const auraI = s.aura?.intensity ?? 0
  const aura = useDerivedValue(() => auraI * (0.6 + 0.4 * wave(clock, 4)))
  const rays = useDerivedValue(() => 0.35 + 0.35 * wave(clock, 7))
  const sprout = useDerivedValue(() => [{ rotate: (2 * Math.PI / 180) * Math.sin((clock.value / 1000 / 4.6) * TAU) }])

  const back = s.clumps.filter(c => c.layer === 0)
  const front = s.clumps.filter(c => c.layer > 0)
  const w = s.wood
  const isl = s.island

  return (
    <Canvas style={{ width: size, height: (size * OAK_H) / OAK_W }}>
      <Group transform={[{ scale: size / OAK_W }]}>
        {s.rays && (
          <Group opacity={rays}>
            {s.rays.map((r, i) => (
              <Path key={i} path={r.d}>
                <LinearGradient start={vec(r.x0, r.y0)} end={vec(r.x1, r.y1)} colors={['rgba(255,244,200,0.55)', 'rgba(255,244,200,0)']} />
              </Path>
            ))}
          </Group>
        )}
        {s.aura && (
          <Circle cx={s.aura.cx} cy={s.aura.cy} r={s.aura.r} opacity={aura}>
            <RadialGradient c={vec(s.aura.cx, s.aura.cy)} r={s.aura.r} colors={[s.aura.color + 'CC', s.aura.color + '00']} />
          </Circle>
        )}

        <Group transform={[{ translateX: OAK_ORIGIN.x }, { translateY: OAK_ORIGIN.y }]}>
          <Group transform={[{ scale: s.islandScale }]}>
            <Path path={isl.side} color={isl.colors.side} />
            <Path path={isl.side} color={s.outline} style="stroke" strokeWidth={isl.stroke} />
            <Path path={isl.top} color={isl.colors.top} />
            <Path path={isl.top} color={s.outline} style="stroke" strokeWidth={isl.stroke} />
            <Path path={isl.rim} color={isl.colors.rim} style="stroke" strokeWidth={isl.rimWidth} strokeCap="round" />
            {!!isl.tufts && <Path path={isl.tufts} color={isl.colors.tuft} />}
            {!!isl.tufts && <Path path={isl.tufts} color={s.outline} style="stroke" strokeWidth={isl.stroke * 0.8} strokeJoin="round" />}
            {isl.dryLeaves && <Path path={isl.dryLeaves} color="#9B6B3A" />}
            {isl.dryLeaves && <Path path={isl.dryLeaves} color={s.outline} style="stroke" strokeWidth={isl.stroke * 0.7} />}
          </Group>

          <Group transform={[{ scale: s.treeScale }]}>
            {w && (
              <Oval x={w.ao.cx - w.ao.rx} y={w.ao.cy - w.ao.ry} width={w.ao.rx * 2} height={w.ao.ry * 2} color="rgba(0,0,0,0.2)" />
            )}
            {w?.rootGlow && (
              <Oval
                x={w.rootGlow.cx - w.rootGlow.rx} y={w.rootGlow.cy - w.rootGlow.ry}
                width={w.rootGlow.rx * 2} height={w.rootGlow.ry * 2} color="#E8FF8A" opacity={glow}
              >
                <BlurMask blur={6} style="normal" />
              </Oval>
            )}

            {s.seed && (
              <Group>
                <Circle cx={s.seed.glow.cx} cy={s.seed.glow.cy} r={s.seed.glow.r} color="#E8FF8A" opacity={glow}>
                  <BlurMask blur={8} style="normal" />
                </Circle>
                <Path path={s.seed.stalk} color={s.outline} style="stroke" strokeWidth={s.seed.stroke * 1.6} strokeCap="round" />
                <Path path={s.seed.nut} color={s.seed.colors.nut} />
                <Path path={s.seed.nut} color={s.outline} style="stroke" strokeWidth={s.seed.stroke} />
                <Path path={s.seed.nutLight} color={s.seed.colors.nutLight} />
                <Path path={s.seed.cap} color={s.seed.colors.cap} />
                <Path path={s.seed.cap} color={s.outline} style="stroke" strokeWidth={s.seed.stroke} />
                <Path path={s.seed.capMarks} color="#4A2810" style="stroke" strokeWidth={s.seed.stroke * 0.5} strokeCap="round" />
                <Path path={s.seed.lip} color={isl.colors.top} />
                <Group opacity={twinkle0}>
                  {s.seed.sparkles.map((d, i) => <Path key={i} path={d} color="#FFF7C2" />)}
                </Group>
              </Group>
            )}

            {s.sprout && (
              <Group transform={sprout} origin={vec(0, 0)}>
                <Path path={s.sprout.stem} color="#5DA83A" />
                <Path path={s.sprout.stem} color={s.outline} style="stroke" strokeWidth={s.sprout.stroke} />
                <Path path={s.sprout.leaves} color="#61B13B" />
                <Path path={s.sprout.light} color="#9DD551" />
                <Path path={s.sprout.leaves} color={s.outline} style="stroke" strokeWidth={s.sprout.stroke} strokeJoin="round" />
                <Path path={s.sprout.ribs} color="#3A8030" style="stroke" strokeWidth={s.sprout.ribWidth} strokeCap="round" />
              </Group>
            )}

            {s.edgeGlow && (
              <Path path={s.edgeGlow.d} color={s.edgeGlow.color} style="stroke" strokeWidth={s.edgeGlow.width} opacity={glow}>
                <BlurMask blur={s.edgeGlow.blur} style="normal" />
              </Path>
            )}
            {back.map((c, i) => <Clump key={`b${i}`} c={c} clock={clock} twinkle={twinkles[c.twinkle]} outline={s.outline} />)}

            {w && !!w.pieces && (
              <Group>
                <Path path={w.pieces} color={s.outline} style="stroke" strokeWidth={w.stroke * 2} strokeJoin="round" />
                <Path path={w.pieces}>
                  <LinearGradient
                    start={vec(w.gradX[0], 0)} end={vec(w.gradX[1], 0)}
                    colors={[w.colors.hl, w.colors.hl, w.colors.base, w.colors.base, w.colors.sh, w.colors.sh]}
                    positions={[0, 0.25, 0.32, 0.62, 0.7, 1]}
                  />
                </Path>
                {w.grooves && <Path path={w.grooves} color={w.colors.groove} style="stroke" strokeWidth={w.grooveWidth} strokeCap="round" />}
                {w.knot && <Path path={w.knot.outer} color={w.colors.sh} />}
                {w.knot && <Path path={w.knot.outer} color={s.outline} style="stroke" strokeWidth={w.stroke * 0.7} />}
                {w.knot && <Path path={w.knot.inner} color={w.colors.groove} />}
                {w.runes && (
                  <Group opacity={runeGlow}>
                    <Path path={w.runes} color="#FFC85A" style="stroke" strokeWidth={w.runeWidth * 2.5}>
                      <BlurMask blur={2} style="normal" />
                    </Path>
                    <Path path={w.runes} color="#FFE3A0" style="stroke" strokeWidth={w.runeWidth} strokeCap="round" />
                  </Group>
                )}
              </Group>
            )}

            {front.map((c, i) => <Clump key={`f${i}`} c={c} clock={clock} twinkle={twinkles[c.twinkle]} outline={s.outline} />)}
            {w?.icicles && (
              <Group>
                <Path path={w.icicles} color="#DDF1FF" />
                <Path path={w.icicles} color={s.outline} style="stroke" strokeWidth={w.stroke * 0.6} />
              </Group>
            )}
          </Group>
        </Group>

        {s.orbs && Array.from({ length: s.orbs.count }, (_, i) => <Orb key={i} i={i} o={s.orbs!} clock={clock} />)}
        {s.butterflies?.map((b, i) => <Butterfly key={i} b={b} clock={clock} outline={s.outline} />)}
        {moving && s.motes?.list.map((m, i) => <Mote key={i} m={m} color={s.motes!.color} clock={clock} />)}
        {moving && s.leaf && <FallingLeaf leaf={s.leaf} outline={s.outline} clock={clock} />}
        {moving && s.snow?.map((f, i) => <Snowflake key={i} f={f} clock={clock} />)}
      </Group>
    </Canvas>
  )
}

function Clump({ c, clock, twinkle, outline }: { c: OakClump; clock: Clock; twinkle: SharedValue<number>; outline: string }) {
  const { amp, period, phase } = c
  const transform = useDerivedValue(() => [{ rotate: amp * Math.sin(((clock.value / 1000 + phase) / period) * TAU) }])
  return (
    <Group transform={transform} origin={vec(c.cx, c.cy + 0.8 * c.r)}>
      <Path path={c.shadow} color={c.tones.sh} />
      <Path path={c.base} color={c.tones.base} />
      <Path path={c.highlight} color={c.tones.hl} />
      {c.speckles.length > 0 && (
        <Group opacity={twinkle}>
          {c.speckles.map((k, i) => <Circle key={i} cx={k.x} cy={k.y} r={k.r} color={k.color} />)}
        </Group>
      )}
      {c.snow && <Path path={c.snow} color="#F4FAFF" />}
      {c.snow && <Path path={c.snow} color={outline} style="stroke" strokeWidth={c.stroke * 0.6} />}
      {c.petalsWhite && <Path path={c.petalsWhite} color="#FFFFFF" />}
      {c.petalsPink && <Path path={c.petalsPink} color="#F7A8C4" />}
      {c.centers && <Path path={c.centers} color="#F6C945" />}
      <Path path={c.shadow} color={outline} style="stroke" strokeWidth={c.stroke} strokeJoin="round" />
    </Group>
  )
}

function Orb({ i, o, clock }: { i: number; o: NonNullable<OakScene['orbs']>; clock: Clock }) {
  const { cx, cy, rx, ry } = o
  // 10 s loop around the crown; orbs sit 1 s apart. The far side is dimmer and smaller.
  const transform = useDerivedValue(() => {
    const a = (clock.value / 1000 / 10 + i / 10) * TAU
    const depth = 0.85 + 0.15 * Math.sin(a)
    return [{ translateX: cx + rx * Math.cos(a) }, { translateY: cy + ry * Math.sin(a) }, { scale: depth }]
  })
  const opacity = useDerivedValue(() => 0.7 + 0.3 * Math.sin((clock.value / 1000 / 10 + i / 10) * TAU))
  return (
    <Group transform={transform} opacity={opacity}>
      <Circle cx={0} cy={0} r={o.r * 2.2} color="rgba(255,243,192,0.35)" />
      <Circle cx={0} cy={0} r={o.r} color="#FFFBE6" />
    </Group>
  )
}

function Butterfly({ b, clock, outline }: { b: NonNullable<OakScene['butterflies']>[number]; clock: Clock; outline: string }) {
  const { cx, cy, ax, ay, period, flap, size } = b
  const position = useDerivedValue(() => {
    const u = clock.value / 1000 / period
    return [{ translateX: cx + ax * Math.sin(u * TAU) }, { translateY: cy + ay * Math.sin(u * 2 * TAU) }, { scale: size }]
  })
  const wings = useDerivedValue(() => [{ scaleX: 1 - 0.65 * (0.5 - 0.5 * Math.cos((clock.value / 1000 / flap) * TAU)) }])
  return (
    <Group transform={position}>
      <Group transform={wings}>
        <Path path={BUTTERFLY.wings} color={b.color} />
        <Path path={BUTTERFLY.wings} color={outline} style="stroke" strokeWidth={1} />
      </Group>
      <Path path={BUTTERFLY.body} color={outline} />
    </Group>
  )
}

function Mote({ m, color, clock }: { m: OakMote; color: string; clock: Clock }) {
  const { life, delay, rise, drift } = m
  const progress = useDerivedValue(() => {
    const t = clock.value / 1000 - delay
    return (((t % life) + life) % life) / life
  })
  const transform = useDerivedValue(() => [
    { translateX: drift * Math.sin(progress.value * Math.PI * 1.5) },
    { translateY: -rise * progress.value },
  ])
  const opacity = useDerivedValue(() => {
    const u = progress.value
    return u < 0.2 ? (u / 0.2) * 0.9 : u < 0.7 ? 0.9 : 0.9 * (1 - (u - 0.7) / 0.3)
  })
  return (
    <Group transform={transform} opacity={opacity}>
      <Circle cx={m.x} cy={m.y} r={m.r * 2} color={color} opacity={0.3} />
      <Circle cx={m.x} cy={m.y} r={m.r * 0.6} color="#FFFFFF" />
    </Group>
  )
}

function FallingLeaf({ leaf, outline, clock }: { leaf: NonNullable<OakScene['leaf']>; outline: string; clock: Clock }) {
  const { x, y } = leaf
  // One leaf every 8 s: falls 120 px in 3.6 s, zigzagging −12 / +8 / −6 px.
  const progress = useDerivedValue(() => ((clock.value / 1000) % 8) / 3.6)
  const transform = useDerivedValue(() => {
    const u = Math.min(progress.value, 1)
    const keys = [0, -12, 8, -6]
    const seg = Math.min(Math.floor(u * 3), 2)
    const f = u * 3 - seg
    const ease = 0.5 - 0.5 * Math.cos(f * Math.PI)
    const dx = keys[seg] + (keys[seg + 1] - keys[seg]) * ease
    return [{ translateX: x + dx }, { translateY: y + 120 * u }, { rotate: ((-20 + 50 * u) * Math.PI) / 180 }]
  })
  const opacity = useDerivedValue(() => {
    const u = progress.value
    if (u >= 1) return 0
    return u < 0.12 ? u / 0.12 : u > 0.8 ? (1 - u) / 0.2 : 1
  })
  return (
    <Group transform={transform} opacity={opacity}>
      <Path path={leaf.d} color={leaf.color} />
      <Path path={leaf.d} color={outline} style="stroke" strokeWidth={leaf.stroke} />
    </Group>
  )
}

function Snowflake({ f, clock }: { f: NonNullable<OakScene['snow']>[number]; clock: Clock }) {
  const { life, delay, fall, drift } = f
  const progress = useDerivedValue(() => {
    const t = clock.value / 1000 - delay
    return (((t % life) + life) % life) / life
  })
  const transform = useDerivedValue(() => [
    { translateX: drift * Math.sin(progress.value * TAU) },
    { translateY: fall * progress.value },
  ])
  const opacity = useDerivedValue(() => {
    const u = progress.value
    return u < 0.1 ? u / 0.1 : u > 0.85 ? (1 - u) / 0.15 : 1
  })
  return (
    <Group transform={transform} opacity={opacity}>
      <Circle cx={f.x} cy={f.y} r={f.r} color="#FFFFFF" />
      <Circle cx={f.x} cy={f.y} r={f.r} color="#9CC3E0" style="stroke" strokeWidth={0.6} />
    </Group>
  )
}

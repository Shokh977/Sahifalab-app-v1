/* ============================================================
   Sahifalab — MagicTree (react-native-svg + Reanimated)
   Layers (back → front):
     0 Aura glow   1 Wind streaks   2 Trunk+branches
     3 Canopy      4 Decorations    5 Leaves+particles
     6 State overlay (frost / wither)
   ============================================================ */
import React, { useEffect, useMemo, useState } from 'react'
import { AppState } from 'react-native'
import Svg, {
  G, Circle, Ellipse, Path,
  Defs, RadialGradient, LinearGradient, Stop,
  Filter, FeColorMatrix,
} from 'react-native-svg'
import Animated, {
  useSharedValue, useAnimatedProps,
  withRepeat, withTiming,
  cancelAnimation, Easing, useReducedMotion,
} from 'react-native-reanimated'
import { stagePalettes } from '../../lib/treeTheme'
import type { StageNumber, TreeState, SkyMood, TreeSize, StagePalette } from '../../lib/treeTheme'

// ── Animated SVG primitives ────────────────────────────────────────────────────
const AnimatedG      = Animated.createAnimatedComponent(G)
const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const AnimatedPath   = Animated.createAnimatedComponent(Path)

// ── Canvas constants ──────────────────────────────────────────────────────────
const CX = 160
const GY = 360

// ── Helpers ───────────────────────────────────────────────────────────────────
const f = (n: number) => Math.round(n * 10) / 10

function rng(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Lobe  { x: number; y: number; r: number }
type Branch     = [number, number, number, number, number, number, (number | undefined)?]
interface Geom  {
  trunk: { x: number; by: number; h: number; w: number; branches: Branch[] }
  lobes: Lobe[]
  swayDur: number
  swayAmt: number
}

// ── Stage geometry ────────────────────────────────────────────────────────────
function getGeom(id: StageNumber): Geom | null {
  const cx = CX, by = GY
  switch (id) {
    case 1: return null
    case 2: return {
      trunk: { x:cx, by:by-2, h:30, w:3.2, branches:[] },
      lobes: [{x:cx-7,y:by-34,r:11},{x:cx+8,y:by-38,r:12},{x:cx,y:by-44,r:10}],
      swayDur:4.4, swayAmt:2.4,
    }
    case 3: return {
      trunk: { x:cx, by, h:62, w:5, branches:[[cx,by-44,cx-14,by-54,cx-26,by-50,4],[cx,by-52,cx+14,by-62,cx+24,by-60,4]] },
      lobes: [{x:cx,y:by-78,r:20},{x:cx-20,y:by-66,r:15},{x:cx+22,y:by-70,r:16},{x:cx+4,y:by-92,r:14}],
      swayDur:5, swayAmt:2,
    }
    case 4: return {
      trunk: { x:cx, by, h:92, w:8, branches:[[cx,by-58,cx-22,by-74,cx-40,by-72,6],[cx,by-72,cx+24,by-90,cx+44,by-86,6],[cx,by-86,cx-10,by-104,cx-18,by-110,5]] },
      lobes: [{x:cx,y:by-112,r:28},{x:cx-30,y:by-96,r:22},{x:cx+32,y:by-100,r:23},{x:cx-6,y:by-128,r:20},{x:cx+18,y:by-122,r:18}],
      swayDur:5.4, swayAmt:1.8,
    }
    case 5: return {
      trunk: { x:cx, by, h:104, w:10, branches:[[cx,by-62,cx-28,by-82,cx-50,by-82,7],[cx,by-78,cx+30,by-100,cx+54,by-98,7],[cx,by-96,cx-14,by-118,cx-24,by-126,6]] },
      lobes: [{x:cx,y:by-126,r:32},{x:cx-38,y:by-106,r:26},{x:cx+40,y:by-110,r:27},{x:cx-12,y:by-148,r:24},{x:cx+22,y:by-140,r:23},{x:cx+2,y:by-120,r:24}],
      swayDur:5.6, swayAmt:1.6,
    }
    case 6: return {
      trunk: { x:cx, by, h:112, w:11, branches:[[cx,by-66,cx-30,by-88,cx-54,by-88,7],[cx,by-84,cx+32,by-106,cx+58,by-104,7],[cx,by-100,cx-16,by-124,cx-26,by-134,6]] },
      lobes: [{x:cx,y:by-132,r:34},{x:cx-40,y:by-112,r:27},{x:cx+42,y:by-116,r:28},{x:cx-14,y:by-156,r:25},{x:cx+24,y:by-148,r:24},{x:cx+2,y:by-126,r:25}],
      swayDur:5.8, swayAmt:1.5,
    }
    case 7: return {
      trunk: { x:cx, by, h:116, w:11, branches:[[cx,by-68,cx-32,by-90,cx-58,by-90,7],[cx,by-86,cx+34,by-108,cx+62,by-106,7],[cx,by-104,cx-16,by-128,cx-26,by-138,6]] },
      lobes: [{x:cx,y:by-136,r:35},{x:cx-42,y:by-114,r:28},{x:cx+44,y:by-118,r:29},{x:cx-14,y:by-160,r:26},{x:cx+26,y:by-152,r:25},{x:cx+2,y:by-130,r:26}],
      swayDur:6, swayAmt:1.4,
    }
    case 8: return {
      trunk: { x:cx, by, h:128, w:17, branches:[[cx-6,by-70,cx-40,by-92,cx-72,by-96,9],[cx+6,by-90,cx+42,by-112,cx+76,by-110,9],[cx,by-110,cx-18,by-136,cx-30,by-150,7],[cx+4,by-114,cx+24,by-140,cx+38,by-152,7]] },
      lobes: [{x:cx,y:by-150,r:40},{x:cx-50,y:by-122,r:32},{x:cx+52,y:by-126,r:33},{x:cx-18,y:by-178,r:30},{x:cx+30,y:by-168,r:29},{x:cx+4,y:by-140,r:30},{x:cx-72,y:by-104,r:22},{x:cx+74,y:by-108,r:22}],
      swayDur:6.6, swayAmt:1.1,
    }
    case 9: return {
      trunk: { x:cx, by, h:134, w:16, branches:[[cx-6,by-72,cx-42,by-96,cx-74,by-100,9],[cx+6,by-92,cx+44,by-116,cx+78,by-114,9],[cx,by-114,cx-20,by-142,cx-32,by-158,7],[cx+4,by-118,cx+26,by-146,cx+42,by-160,7]] },
      lobes: [{x:cx,y:by-156,r:42},{x:cx-52,y:by-126,r:33},{x:cx+54,y:by-130,r:34},{x:cx-18,y:by-186,r:31},{x:cx+32,y:by-176,r:30},{x:cx+4,y:by-146,r:31},{x:cx-74,y:by-108,r:23},{x:cx+76,y:by-112,r:23}],
      swayDur:7, swayAmt:0.9,
    }
    case 10: return {
      trunk: { x:cx, by, h:150, w:22, branches:[[cx-8,by-74,cx-48,by-100,cx-86,by-104,11],[cx+8,by-96,cx+50,by-122,cx+90,by-120,11],[cx-2,by-120,cx-24,by-150,cx-40,by-168,9],[cx+6,by-124,cx+30,by-152,cx+50,by-170,9],[cx,by-150,cx-6,by-176,cx-10,by-190,7]] },
      lobes: [{x:cx,y:by-176,r:48},{x:cx-60,y:by-140,r:38},{x:cx+62,y:by-144,r:39},{x:cx-22,y:by-212,r:34},{x:cx+34,y:by-200,r:34},{x:cx+6,y:by-164,r:36},{x:cx-86,y:by-116,r:26},{x:cx+88,y:by-120,r:26},{x:cx-2,y:by-232,r:26}],
      swayDur:7.6, swayAmt:0.7,
    }
    default: return null
  }
}

// ── Path builders ─────────────────────────────────────────────────────────────
function mkTrunk(x: number, by: number, h: number, w: number) {
  const t = by - h
  return `M${f(x-w)} ${f(by)} C${f(x-w*.7)} ${f(by-h*.45)} ${f(x-w*.35)} ${f(by-h*.7)} ${f(x-w*.28)} ${f(t)} L${f(x+w*.28)} ${f(t)} C${f(x+w*.35)} ${f(by-h*.7)} ${f(x+w*.7)} ${f(by-h*.45)} ${f(x+w)} ${f(by)} Z`
}
function mkShade(x: number, by: number, h: number, w: number) {
  const t = by - h
  return `M${f(x+w*.05)} ${f(by)} C${f(x+w*.1)} ${f(by-h*.5)} ${f(x+w*.12)} ${f(by-h*.7)} ${f(x+w*.1)} ${f(t)} L${f(x+w*.28)} ${f(t)} C${f(x+w*.35)} ${f(by-h*.7)} ${f(x+w*.7)} ${f(by-h*.45)} ${f(x+w)} ${f(by)} Z`
}
function mkLeaf(x: number, y: number, s: number) {
  return `M${f(x)} ${f(y)} q${f(s)} -${f(s*1.6)} ${f(s*2)} 0 q-${f(s)} ${f(s*1.6)} -${f(s*2)} 0 Z`
}
function mkStar(x: number, y: number, s: number) {
  return `M${f(x)} ${f(y-s)} Q${f(x+s*.18)} ${f(y-s*.18)} ${f(x+s)} ${f(y)} Q${f(x+s*.18)} ${f(y+s*.18)} ${f(x)} ${f(y+s)} Q${f(x-s*.18)} ${f(y+s*.18)} ${f(x-s)} ${f(y)} Q${f(x-s*.18)} ${f(y-s*.18)} ${f(x)} ${f(y-s)} Z`
}

function pickPts(lobes: Lobe[], R: () => number, n: number) {
  return Array.from({ length: n }, () => {
    const L = lobes[Math.floor(R() * lobes.length)]
    const a = R() * 6.28, rr = R() * L.r * 0.8
    return { x: L.x + Math.cos(a)*rr, y: L.y + Math.sin(a)*rr*0.9 }
  })
}

// ── Static sub-components ─────────────────────────────────────────────────────

function Gdefs({ uid, pal }: { uid: string; pal: StagePalette }) {
  return (
    <Defs>
      <RadialGradient id={`sfAura${uid}`} cx="50%" cy="45%" r="55%">
        <Stop offset="0%"   stopColor={pal.glow} stopOpacity={0.9} />
        <Stop offset="55%"  stopColor={pal.glow} stopOpacity={0.28} />
        <Stop offset="100%" stopColor={pal.glow} stopOpacity={0} />
      </RadialGradient>
      <LinearGradient id={`sfBark${uid}`} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%"   stopColor="#9a7250" />
        <Stop offset="55%"  stopColor="#6f4f36" />
        <Stop offset="100%" stopColor="#533a27" />
      </LinearGradient>
      <RadialGradient id={`sfSoil${uid}`} cx="50%" cy="35%" r="65%">
        <Stop offset="0%"   stopColor="#5a4632" />
        <Stop offset="100%" stopColor="#2f2419" />
      </RadialGradient>
      <RadialGradient id={`sfSeedAura${uid}`} cx="50%" cy="45%" r="55%">
        <Stop offset="0%"   stopColor="#ffcf7a" stopOpacity={0.9} />
        <Stop offset="55%"  stopColor="#ffcf7a" stopOpacity={0.28} />
        <Stop offset="100%" stopColor="#ffcf7a" stopOpacity={0} />
      </RadialGradient>

      {/* State filters — explicit userSpaceOnUse region avoids bitmap-rect artifacts on Android */}
      <Filter id={`sfFrozen${uid}`} x="0" y="0" width="320" height="400" filterUnits="userSpaceOnUse">
        <FeColorMatrix type="saturate" values="0.5" />
      </Filter>
      <Filter id={`sfDead${uid}`} x="0" y="0" width="320" height="400" filterUnits="userSpaceOnUse">
        <FeColorMatrix
          type="matrix"
          values="0.354 0.387 0.082 0 0  0.181 0.515 0.075 0 0  0.154 0.303 0.221 0 0  0 0 0 1 0"
        />
      </Filter>
    </Defs>
  )
}

function Ground({ uid, glowy }: { uid: string; glowy: boolean }) {
  return (
    <G>
      {glowy && (
        <Ellipse cx={CX} cy={GY-4} rx={58} ry={22} fill={`url(#sfAura${uid})`} opacity={0.65} />
      )}
      <Ellipse cx={CX} cy={GY+10} rx={86} ry={18} fill="#000" opacity={0.18} />
      <Path
        d={`M74 ${GY} Q160 ${GY-22} 246 ${GY} Q230 ${GY+16} 160 ${GY+18} Q90 ${GY+16} 74 ${GY} Z`}
        fill={`url(#sfSoil${uid})`}
      />
    </G>
  )
}

function Trunk({ uid, t }: { uid: string; t: Geom['trunk'] }) {
  return (
    <G>
      {t.branches.map((b, i) => (
        <Path
          key={i}
          d={`M${f(b[0])} ${f(b[1])} Q${f(b[2])} ${f(b[3])} ${f(b[4])} ${f(b[5])}`}
          stroke="#7a5535"
          strokeWidth={f(b[6] ?? 7)}
          fill="none"
          strokeLinecap="round"
        />
      ))}
      <Path d={mkTrunk(t.x, t.by, t.h, t.w)} fill={`url(#sfBark${uid})`} />
      <Path d={mkShade(t.x, t.by, t.h, t.w)} fill="#000" opacity={0.12} />
    </G>
  )
}

function Canopy({ lobes, pal, opacity: op = 1 }: { lobes: Lobe[]; pal: StagePalette; opacity?: number }) {
  return (
    <G opacity={op}>
      {lobes.map((L, i) => <Circle key={`b${i}`} cx={f(L.x)} cy={f(L.y+2)} r={f(L.r)} fill={pal.base} />)}
      {lobes.map((L, i) => <Circle key={`m${i}`} cx={f(L.x-L.r*.12)} cy={f(L.y-L.r*.14)} r={f(L.r*.84)} fill={pal.mid} />)}
      {lobes.map((L, i) => (
        <G key={`h${i}`}>
          <Circle cx={f(L.x-L.r*.30)} cy={f(L.y-L.r*.36)} r={f(L.r*.34)} fill={pal.hi} opacity={0.85} />
          <Circle cx={f(L.x-L.r*.42)} cy={f(L.y-L.r*.44)} r={f(L.r*.15)} fill={pal.rim} opacity={0.85} />
        </G>
      ))}
    </G>
  )
}

function Sparkles({ seed, n, opts }: {
  seed: number; n: number
  opts?: { x0?:number; y0?:number; w?:number; h?:number; s?:number; fill?:string }
}) {
  const R = rng(seed * 53 + 7)
  const { x0=80, y0=120, w=160, h=180, s=3, fill='#fff4cf' } = opts ?? {}
  return (
    <G>
      {Array.from({ length: n }, (_, i) => {
        const sx = x0 + R()*w, sy = y0 + R()*h
        const ss = s + R()*3
        R(); R()
        return <Path key={i} d={mkStar(sx, sy, ss)} fill={fill} opacity={0.45} />
      })}
    </G>
  )
}

function Runes({ x, by, h }: { x: number; by: number; h: number }) {
  const pat = [
    'M-4 0 L4 0 M0 -5 L0 5',
    'M-4 -5 L4 5 M4 -5 L-4 5',
    'M0 -5 L0 5 M-4 0 A4 4 0 0 1 4 0',
  ]
  const ys = [by - h*.32, by - h*.55, by - h*.78]
  return (
    <G>
      {pat.map((d, i) => (
        <G key={i} transform={`translate(${x} ${f(ys[i])})`} opacity={0.9}>
          <Path d={d} stroke="#ffe6a0" strokeWidth={1.4} fill="none" strokeLinecap="round" />
        </G>
      ))}
    </G>
  )
}

function Dots({ seed, lobes, fill, n }: { seed: number; lobes: Lobe[]; fill: string; n: number }) {
  const R = rng(seed * 61 + 3)
  const pts = pickPts(lobes, R, n)
  return (
    <G>
      {pts.map((p, i) => (
        <Circle key={i} cx={f(p.x)} cy={f(p.y)} r={f(2 + R()*1.6)} fill={fill} opacity={0.65} />
      ))}
    </G>
  )
}

function Blossoms({ seed, lobes, n }: { seed: number; lobes: Lobe[]; n: number }) {
  const R = rng(seed * 71 + 9)
  return (
    <G>
      {pickPts(lobes, R, n).map((p, i) => {
        const s = 2.4 + R()*1.4
        return (
          <G key={i} transform={`translate(${f(p.x)} ${f(p.y)})`} opacity={0.85}>
            {[0,1,2,3,4].map(k => {
              const a = k * 1.256
              const px = f(Math.cos(a)*s), py = f(Math.sin(a)*s)
              return (
                <Ellipse key={k} cx={px} cy={py} rx={f(s*.7)} ry={f(s*1.1)} fill="#ff9ecb"
                  transform={`rotate(${f(a*57)} ${px} ${py})`} />
              )
            })}
            <Circle r={f(s*.6)} fill="#fff0f6" />
          </G>
        )
      })}
    </G>
  )
}

function GoldLeaves({ seed, lobes, n }: { seed: number; lobes: Lobe[]; n: number }) {
  const R = rng(seed * 83 + 11)
  return (
    <G>
      {pickPts(lobes, R, n).map((p, i) => {
        const s = 3 + R()*2
        return <Path key={i} d={mkLeaf(p.x, p.y, s)} fill="#ffd86a" opacity={0.95} />
      })}
    </G>
  )
}

// Static particles used only in FrostOverlay (frozen = no motion)
function Particles({ seed, n, opts }: {
  seed: number; n: number
  opts?: { x0?:number; y0?:number; w?:number; h?:number; r?:number; fill?:string; op?:number }
}) {
  const R = rng(seed * 97 + 13)
  const { x0=90, y0=330, w=140, h=40, r=1.4, fill='#fff7d6', op=0.85 } = opts ?? {}
  return (
    <G>
      {Array.from({ length: n }, (_, i) => {
        const px = x0 + R()*w, py = y0 - R()*h
        const pr = r + R()*1.6
        R(); R()
        return <Circle key={i} cx={f(px)} cy={f(py)} r={f(pr)} fill={fill} opacity={op * 0.55} />
      })}
    </G>
  )
}

function Seed({ uid, simplified }: { uid: string; simplified?: boolean }) {
  return (
    <G>
      <Ground uid={uid} glowy={!simplified} />
      {!simplified && <Ellipse cx={CX} cy={346} rx={30} ry={14} fill={`url(#sfAura${uid})`} opacity={0.72} />}
      <Ellipse cx={CX} cy={344} rx={11} ry={14} fill="#7a5a3c" />
      <Ellipse cx={156.5} cy={340} rx={5} ry={7} fill="#a9825a" opacity={0.85} />
      <Path d="M160 332 q3 4 0 8 q-3 -4 0 -8 Z" fill="#9fe89a" />
      {!simplified && <Sparkles seed={1} n={7} opts={{ x0:130, y0:300, w:60, h:54, s:2.6, fill:'#ffe6a0' }} />}
    </G>
  )
}

function FrostOverlay({ id }: { id: number }) {
  const R = rng(id * 101 + 1)
  return (
    <G>
      {Array.from({ length: 8 }, (_, i) => {
        const x = f(90 + R()*140), y = f(150 + R()*150)
        const s = f(4 + R()*5)
        return (
          <G key={i} transform={`translate(${x} ${y})`} opacity={0.88}>
            <Path
              d={`M0 -${s} L0 ${s} M-${s} 0 L${s} 0 M-${f(+s*.7)} -${f(+s*.7)} L${f(+s*.7)} ${f(+s*.7)} M-${f(+s*.7)} ${f(+s*.7)} L${f(+s*.7)} -${f(+s*.7)}`}
              stroke="#eaf6ff" strokeWidth={1.3} strokeLinecap="round" fill="none"
            />
          </G>
        )
      })}
      <Particles seed={id + 5} n={10} opts={{ x0:90, y0:160, w:140, h:20, r:1.2, fill:'#eaf6ff', op:0.75 }} />
    </G>
  )
}

function WitherOverlay({ uid }: { uid: string }) {
  return (
    <G>
      {/* Glowing seed at base — the one hopeful element */}
      <Circle cx={CX} cy={352} r={28} fill={`url(#sfSeedAura${uid})`} opacity={0.9} />
      <Circle cx={CX} cy={352} r={3.8} fill="#ffd98a" opacity={0.95} />
      {/* A few fallen leaves scattered below canopy */}
      <Path d={mkLeaf(138, 218, 4.5)} fill="#9a7a4a" opacity={0.7} />
      <Path d={mkLeaf(192, 196, 4)}   fill="#8a6a3a" opacity={0.6} />
      <Path d={mkLeaf(172, 240, 3.5)} fill="#7a5a30" opacity={0.5} />
    </G>
  )
}

// ── Animated sub-components ───────────────────────────────────────────────────

// Wraps trunk+canopy+decorations; rotates whole tree around ground pivot
function SwayGroup({ dur, amt, enabled, children }: {
  dur: number; amt: number; enabled: boolean; children: React.ReactNode
}) {
  const angle = useSharedValue(0)

  useEffect(() => {
    cancelAnimation(angle)
    if (!enabled) { angle.value = 0; return }
    angle.value = -amt
    angle.value = withRepeat(
      withTiming(amt, { duration: dur * 1000, easing: Easing.inOut(Easing.sin) }),
      -1, true
    )
    return () => cancelAnimation(angle)
  }, [enabled, amt, dur])

  const aProps = useAnimatedProps(() => ({
    transform: [
      { translateX: CX },
      { translateY: GY },
      { rotate: angle.value + 'deg' },
      { translateX: -CX },
      { translateY: -GY },
    ],
  }))

  return <AnimatedG animatedProps={aProps}>{children}</AnimatedG>
}

// Pulsing glow aura — scale + opacity breathe
function BreathingAura({ cx, cy, r, fill, glowMin, glowMax, enabled }: {
  cx: number; cy: number; r: number; fill: string
  glowMin: number; glowMax: number; enabled: boolean
}) {
  const animR   = useSharedValue(r * 0.96)
  const opacity = useSharedValue(glowMin)

  useEffect(() => {
    cancelAnimation(animR); cancelAnimation(opacity)
    if (!enabled) {
      animR.value   = r
      opacity.value = (glowMin + glowMax) / 2
      return
    }
    animR.value   = withRepeat(withTiming(r * 1.06, { duration: 5000, easing: Easing.inOut(Easing.ease) }), -1, true)
    opacity.value = withRepeat(withTiming(glowMax,   { duration: 5000, easing: Easing.inOut(Easing.ease) }), -1, true)
    return () => { cancelAnimation(animR); cancelAnimation(opacity) }
  }, [enabled, r, glowMin, glowMax])

  const aProps = useAnimatedProps(() => ({
    r:       animR.value,
    opacity: opacity.value,
  }))

  return <AnimatedCircle animatedProps={aProps} cx={cx} cy={cy} fill={fill} />
}

// Single rising particle (hooks per instance — always mounted)
function AnimatedParticle({ x, y, r, fill, maxOp, dur, delay, dy, enabled }: {
  x: number; y: number; r: number; fill: string; maxOp: number
  dur: number; delay: number; dy: number; enabled: boolean
}) {
  const startPhase = (delay / dur) % 1
  const phase = useSharedValue(startPhase)

  useEffect(() => {
    cancelAnimation(phase)
    if (!enabled) { phase.value = 0.5; return }
    phase.value = startPhase
    phase.value = withRepeat(
      withTiming(startPhase + 1, { duration: dur * 1000, easing: Easing.linear }),
      -1, false
    )
    return () => cancelAnimation(phase)
  }, [enabled, dur, startPhase])

  const aProps = useAnimatedProps(() => {
    const p  = (phase.value % 1 + 1) % 1
    const op = p < 0.15 ? (p / 0.15) * maxOp
             : p < 0.80 ? maxOp
             : Math.max(0, (1 - p) / 0.20) * maxOp
    return {
      transform: [{ translateY: -p * dy }],
      opacity:    op,
    }
  })

  return <AnimatedCircle animatedProps={aProps} cx={f(x)} cy={f(y)} r={f(r)} fill={fill} />
}

function AnimatedParticles({ seed, n, opts, enabled }: {
  seed: number; n: number
  opts?: { x0?:number; y0?:number; w?:number; h?:number; r?:number; fill?:string; op?:number }
  enabled: boolean
}) {
  const { x0=90, y0=330, w=140, h=40, r=1.4, fill='#fff7d6', op=0.85 } = opts ?? {}

  const params = useMemo(() => {
    const R = rng(seed * 97 + 13)
    return Array.from({ length: n }, () => {
      const px  = x0 + R()*w
      const py  = y0 - R()*h
      const pr  = r + R()*1.6
      const dur = 6 + R()*4
      const del = R() * dur
      R()
      const dy  = 80 + R()*40
      return { x: px, y: py, r: pr, dur, delay: del, dy }
    })
  }, [seed, n, x0, y0, w, h, r])

  return (
    <G>
      {params.map((p, i) => (
        <AnimatedParticle key={i} {...p} fill={fill} maxOp={op} enabled={enabled} />
      ))}
    </G>
  )
}

// Single drifting leaf
function AnimatedLeaf({ x, y, s, lDur, lDel, ldx, ldy, lrot, fill, enabled }: {
  x: number; y: number; s: number
  lDur: number; lDel: number; ldx: number; ldy: number; lrot: number
  fill: string; enabled: boolean
}) {
  const startPhase = (lDel / lDur) % 1
  const phase = useSharedValue(startPhase)

  useEffect(() => {
    cancelAnimation(phase)
    if (!enabled) { phase.value = 0.5; return }
    phase.value = startPhase
    phase.value = withRepeat(
      withTiming(startPhase + 1, { duration: lDur * 1000, easing: Easing.linear }),
      -1, false
    )
    return () => cancelAnimation(phase)
  }, [enabled, lDur, startPhase])

  const aProps = useAnimatedProps(() => {
    const p  = (phase.value % 1 + 1) % 1
    const op = p < 0.10 ? p / 0.10 : p < 0.90 ? 1 : Math.max(0, (1 - p) / 0.10)
    return {
      transform: [
        { translateX: ldx * p + x },
        { translateY: ldy * p + y },
        { rotate: lrot * p + 'deg' },
        { translateX: -x },
        { translateY: -y },
      ],
      opacity:    op,
    }
  })

  return <AnimatedPath animatedProps={aProps} d={mkLeaf(x, y, s)} fill={fill} />
}

function AnimatedLeaves({ seed, n, fill, enabled }: {
  seed: number; n: number; fill: string; enabled: boolean
}) {
  const params = useMemo(() => {
    const R = rng(seed * 31 + 5)
    return Array.from({ length: n }, () => {
      const x    = 96 + R()*128
      const y    = 150 + R()*120
      const s    = 3 + R()*2.5
      const lDur = 7 + R()*3
      const lDel = R() * lDur
      const ldx  = (R() - 0.5) * 40
      const ldy  = 40 + R()*40
      const lrot = 180 + R()*100
      return { x, y, s, lDur, lDel, ldx, ldy, lrot }
    })
  }, [seed, n])

  return (
    <G>
      {params.map((p, i) => (
        <AnimatedLeaf key={i} {...p} fill={fill} enabled={enabled} />
      ))}
    </G>
  )
}

// Butterfly following a Lissajous flutter path
function AnimatedButterfly({ x, y, fill, delay, dur, enabled }: {
  x: number; y: number; fill: string; delay: number; dur: number; enabled: boolean
}) {
  const startPhase = (delay / dur) % 1
  const phase = useSharedValue(startPhase)

  useEffect(() => {
    cancelAnimation(phase)
    if (!enabled) { phase.value = 0; return }
    phase.value = startPhase
    phase.value = withRepeat(
      withTiming(startPhase + 1, { duration: dur * 1000, easing: Easing.inOut(Easing.ease) }),
      -1, false
    )
    return () => cancelAnimation(phase)
  }, [enabled, dur, startPhase])

  const aProps = useAnimatedProps(() => {
    const p = (phase.value % 1 + 1) % 1
    const t = p * Math.PI * 2
    const tx = 13 * (1 - Math.cos(t))
    const ty = -9 * Math.sin(t)
    return {
      transform: [{ translateX: tx }, { translateY: ty }],
    }
  })

  return (
    <G transform={`translate(${x} ${y})`}>
      <AnimatedG animatedProps={aProps}>
        <Path d="M0 0 Q-9 -7 -7 2 Q-9 8 0 4 Z" fill={fill} opacity={0.88} />
        <Path d="M0 0 Q9 -7 7 2 Q9 8 0 4 Z"  fill={fill} opacity={0.88} />
        <Ellipse cx={0} cy={2} rx={1.1} ry={3.4} fill="#4a3a55" />
      </AnimatedG>
    </G>
  )
}

// Slow-spinning sparkle halo for stages 9-10
function SpinHalo({ id, enabled, children }: {
  id: number; enabled: boolean; children: React.ReactNode
}) {
  const angle = useSharedValue(0)
  const dur   = id === 10 ? 38000 : 48000

  useEffect(() => {
    cancelAnimation(angle)
    if (!enabled) return
    angle.value = withRepeat(
      withTiming(360, { duration: dur, easing: Easing.linear }),
      -1, false
    )
    return () => cancelAnimation(angle)
  }, [enabled, dur])

  const originY = id === 10 ? GY - 200 : GY - 170

  const aProps = useAnimatedProps(() => ({
    rotation: angle.value,
    originX:  CX,
    originY:  originY,
  }))

  return <AnimatedG animatedProps={aProps}>{children}</AnimatedG>
}

// ── Size map ──────────────────────────────────────────────────────────────────
const SIZES: Record<TreeSize, { w: number; h: number }> = {
  hero:  { w: 280, h: 350 },
  card:  { w: 160, h: 200 },
  thumb: { w: 80,  h: 100 },
  badge: { w: 40,  h: 50 },   // Trofey Xonasi badge tiles (step-24)
  micro: { w: 16,  h: 20 },   // top-badge indicator next to names (step-24)
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface MagicTreeProps {
  stage:      StageNumber
  state?:     TreeState
  mood?:      SkyMood
  size?:      TreeSize | 'auto'  // 'auto' scales with stage
  uid?:       string
  animate?:   boolean
  /**
   * Badge-mode rendering (step-24 amendment) — silhouette + palette only,
   * with every particle/glow/decoration layer dropped. Naively shrinking
   * the full illustration to ~40px mushes the fine detail; recognizability
   * at that size comes from shape + color, not sparkles. Always implies
   * animate=false (a badge is a static keepsake, not a live scene).
   */
  simplified?: boolean
}

// stage 1 → 90×112, stage 10 → 240×300  (viewBox 4:5 ratio maintained)
function autoSize(stage: number): { w: number; h: number } {
  const w = Math.round(90 + (stage - 1) * (240 - 90) / 9)
  return { w, h: Math.round(w * 1.25) }
}

export const MagicTree = React.memo(function MagicTree({ stage, state = 'alive', size = 'card', uid: uidProp, animate = true, simplified = false }: MagicTreeProps) {
  const uid     = uidProp ?? `${stage}_${state}`
  const id      = Math.max(1, Math.min(10, stage)) as StageNumber
  const pal     = stagePalettes[id]
  const geom    = getGeom(id)
  const dims    = size === 'auto' ? autoSize(id) : SIZES[size]
  const dead    = !simplified && state === 'dead'
  const frozen  = !simplified && state === 'frozen'
  const reduced = useReducedMotion()
  const lfCount = id <= 3 ? 3 : id <= 6 ? 5 : 7

  const [appActive, setAppActive] = useState(true)
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => setAppActive(s === 'active'))
    return () => sub.remove()
  }, [])

  const animEnabled = animate && !simplified && !frozen && !dead && !reduced && appActive

  const stateFilter = frozen ? `url(#sfFrozen${uid})` : dead ? `url(#sfDead${uid})` : undefined

  return (
    <Svg width={dims.w} height={dims.h} viewBox="0 0 320 400" preserveAspectRatio="xMidYMax meet">
      <Gdefs uid={uid} pal={pal} />

      {/* All tree content wrapped in state filter; overlays rendered above without filter */}
      <G filter={stateFilter}>

      {/* Layer 0: breathing aura (stage 6+) — dropped in badge mode */}
      {id >= 6 && !simplified && (
        <BreathingAura
          cx={CX}
          cy={f(GY - id*9 - 40)}
          r={f(70 + id*7)}
          fill={`url(#sfAura${uid})`}
          glowMin={f(0.18 + id*0.03)}
          glowMax={f(0.5  + id*0.04)}
          enabled={animEnabled}
        />
      )}

      {/* Celestial halo sparkle ring (stages 9-10) — dropped in badge mode */}
      {id >= 9 && !simplified && (
        <SpinHalo id={id} enabled={animEnabled}>
          <G transform={`translate(${CX} ${id === 10 ? 160 : 190})`} opacity={0.45}>
            <Sparkles
              seed={id + 40} n={10}
              opts={{ x0:-70, y0:-70, w:140, h:140, s:2.4, fill: id === 10 ? '#ffe6a0' : '#cbb6ff' }}
            />
          </G>
        </SpinHalo>
      )}

      {/* Stage 1: seed */}
      {id === 1 ? <Seed uid={uid} simplified={simplified} /> : geom && (
        <>
          <Ground uid={uid} glowy={id <= 3 && !simplified} />

          {id <= 7 && !simplified && (
            <G>
              <G transform={`translate(0 ${300 - id*8})`}>
                <Path d="M40 0 q40 -8 80 0" stroke={pal.rim} strokeWidth={2} fill="none" opacity={0.38} />
              </G>
              <G transform={`translate(120 ${250 - id*6})`}>
                <Path d="M0 0 q40 8 80 0" stroke={pal.hi} strokeWidth={1.6} fill="none" opacity={0.28} />
              </G>
            </G>
          )}

          {/* Layer 3: sway group — trunk + canopy (+ canopy decorations, dropped in badge mode) */}
          <SwayGroup dur={geom.swayDur} amt={geom.swayAmt} enabled={animEnabled}>
            {id === 8 && !simplified && <Runes x={CX} by={geom.trunk.by} h={geom.trunk.h} />}
            <Trunk uid={uid} t={geom.trunk} />
            <Canopy lobes={geom.lobes} pal={pal} opacity={dead ? 0.55 : 1} />

            {!dead && !simplified && id === 5 && (
              <>
                <Dots seed={id}   lobes={geom.lobes} fill="#ffe39a" n={8} />
                <Dots seed={id+1} lobes={geom.lobes} fill="#ffd0e6" n={5} />
              </>
            )}
            {!dead && !simplified && id === 6  && <Dots seed={id} lobes={geom.lobes} fill="#bff0ff" n={12} />}
            {!dead && !simplified && id === 7  && <Blossoms seed={id} lobes={geom.lobes} n={14} />}
            {!dead && !simplified && id === 8  && <GoldLeaves seed={id} lobes={geom.lobes} n={16} />}
            {!dead && !simplified && id === 9  && (
              <>
                <Dots seed={id}   lobes={geom.lobes} fill="#d7c6ff" n={14} />
                <Dots seed={id+2} lobes={geom.lobes} fill="#bfe6ff" n={8} />
              </>
            )}
            {!dead && !simplified && id === 10 && (
              <>
                <GoldLeaves seed={id} lobes={geom.lobes} n={18} />
                <Dots seed={id} lobes={geom.lobes} fill="#bfe6ff" n={14} />
              </>
            )}
          </SwayGroup>

          {/* Layer 5a: floating leaves — dropped in badge mode */}
          {!simplified && <AnimatedLeaves seed={id} n={lfCount} fill={pal.mid} enabled={animEnabled} />}

          {/* Stage 7: butterflies — dropped in badge mode */}
          {id === 7 && !dead && !simplified && (
            <>
              <AnimatedButterfly x={118} y={200} fill="#ff9ecb" delay={0}   dur={8.5} enabled={animEnabled} />
              <AnimatedButterfly x={210} y={168} fill="#ffc6e4" delay={3.2} dur={9.0} enabled={animEnabled} />
              <AnimatedButterfly x={180} y={150} fill="#ff8fc0" delay={1.6} dur={8.2} enabled={animEnabled} />
            </>
          )}

          {/* Layer 5b: rising particles — dropped entirely in badge mode */}
          {simplified ? null : !dead && id >= 9 ? (
            <>
              <AnimatedParticles
                seed={id}
                n={id === 10 ? 22 : 16}
                opts={{ x0:80, y0:300, w:160, h:160, r:1.6, fill: id===10 ? '#ffe6a0' : '#cbb6ff', op:0.9 }}
                enabled={animEnabled}
              />
              <Sparkles
                seed={id} n={id===10 ? 14 : 10}
                opts={{ x0:70, y0:100, w:180, h:200, s:3, fill: id===10 ? '#fff0c0' : '#d7c6ff' }}
              />
            </>
          ) : !dead && id >= 4 ? (
            <AnimatedParticles
              seed={id}
              n={id === 6 ? 12 : 8}
              opts={{ x0:110, y0:320, w:100, h:40, fill: pal.glow, op:0.7 }}
              enabled={animEnabled}
            />
          ) : null}
        </>
      )}

      </G>{/* end state filter group */}

      {/* Layer 6: state overlays — rendered above filter, unaffected */}
      {frozen && <FrostOverlay id={id} />}
      {dead   && <WitherOverlay uid={uid} />}
    </Svg>
  )
})

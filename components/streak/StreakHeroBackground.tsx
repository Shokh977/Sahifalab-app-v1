/* ============================================================
   Sahifalab — StreakHeroBackground (step-16)
   Replaces the flat hero-card background with 4 living variants,
   resolved from (theme × health). Guarantees status-bar contrast
   by keeping the darkest gradient stop at the very top edge.
   ============================================================ */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, StyleSheet, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import Svg, { Defs, RadialGradient, Stop, Ellipse, Circle, Path, Rect } from 'react-native-svg'
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps,
  withRepeat, withTiming, withSequence, withDelay,
  cancelAnimation, Easing, useReducedMotion, runOnJS,
} from 'react-native-reanimated'

const SCREEN_W = Dimensions.get('window').width

export type HeroTheme  = 'dark' | 'light'
export type HeroHealth = 'healthy' | 'frozen'
type HeroVariant = 'auroraNight' | 'auroraFrost' | 'airyMeadow' | 'meadowFrost'

interface HeroContentColors {
  isDark:    boolean   // true = card is dark → content renders light/white
  primary:   string
  secondary: string
  faint:     string
}

interface Props {
  theme:     HeroTheme
  health:    HeroHealth
  topInset:  number
  minHeight?: number
  children:  (colors: HeroContentColors) => React.ReactNode
}

const AnimatedCircle  = Animated.createAnimatedComponent(Circle)
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse)

// ── Variant resolution ──────────────────────────────────────────────────────

function resolveVariant(theme: HeroTheme, health: HeroHealth): HeroVariant {
  if (theme === 'dark')  return health === 'frozen' ? 'auroraFrost' : 'auroraNight'
  return health === 'frozen' ? 'meadowFrost' : 'airyMeadow'
}

const STATUS_BAR_STYLE: Record<HeroVariant, 'light' | 'dark'> = {
  auroraNight: 'light',
  auroraFrost: 'light',
  airyMeadow:  'dark',
  meadowFrost: 'light',
}

const DARK_CONTENT: HeroContentColors = {
  isDark: true, primary: '#F5F7FA', secondary: 'rgba(245,247,250,0.72)', faint: 'rgba(245,247,250,0.45)',
}
const LIGHT_CONTENT: HeroContentColors = {
  isDark: false, primary: '#16321F', secondary: 'rgba(22,50,31,0.68)', faint: 'rgba(22,50,31,0.42)',
}

const CONTENT_COLORS: Record<HeroVariant, HeroContentColors> = {
  auroraNight: DARK_CONTENT,
  auroraFrost: DARK_CONTENT,
  airyMeadow:  LIGHT_CONTENT,
  meadowFrost: DARK_CONTENT,
}

// ── Static per-variant config ────────────────────────────────────────────────

const GRADIENT_STOPS: Record<HeroVariant, [string, string, string]> = {
  auroraNight: ['#0A1A14', '#123026', '#1A4030'],
  auroraFrost: ['#0A1420', '#13283A', '#1A3A4A'],
  airyMeadow:  ['#EAF4EA', '#D6ECD9', '#C2E3C8'],
  meadowFrost: ['#0B1622', '#102536', '#16344A'],
}

const GLOW_COLOR: Record<HeroVariant, string> = {
  auroraNight: 'rgba(52,199,120,0.30)',
  auroraFrost: 'rgba(90,180,220,0.35)',
  airyMeadow:  'rgba(120,200,140,0.45)',
  meadowFrost: 'rgba(96,170,210,0.28)',
}

const GROUND_GLOW_COLOR: Record<'auroraNight' | 'auroraFrost', string> = {
  auroraNight: 'rgba(52,199,120,0.30)',
  auroraFrost: 'rgba(90,180,220,0.30)',
}

// ── Breathing glow (aurora / sun / cold orb) ─────────────────────────────────

function BreathingGlow({ variant, reducedMotion, height }: { variant: HeroVariant; reducedMotion: boolean; height: number }) {
  const progress = useSharedValue(0)

  useEffect(() => {
    if (reducedMotion) { progress.value = 0.5; return }
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    )
    return () => cancelAnimation(progress)
  }, [reducedMotion])

  const animatedProps = useAnimatedProps(() => {
    const scale = 1.0 + progress.value * 0.08
    const rx = (210 * scale)
    const ry = (160 * scale)
    return { rx, ry, opacity: 0.25 + progress.value * 0.1 }
  })

  const w = Math.min(SCREEN_W, 480)
  const cx = w / 2
  const cy = height * 0.42
  const id = `glow-${variant}`

  return (
    <Svg width={w} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0%"  stopColor={GLOW_COLOR[variant]} stopOpacity={1} />
          <Stop offset="65%" stopColor={GLOW_COLOR[variant]} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <AnimatedEllipse cx={cx} cy={cy} fill={`url(#${id})`} animatedProps={animatedProps} />
    </Svg>
  )
}

// ── Stars (Aurora variants) ──────────────────────────────────────────────────

const STAR_COUNT   = 14
const TWINKLE_COUNT = 5

function Star({ index, w, topH, twinkle, reducedMotion }: { index: number; w: number; topH: number; twinkle: boolean; reducedMotion: boolean }) {
  // Deterministic pseudo-random placement per index so it doesn't reshuffle on re-render.
  const seed = (index * 137.5) % 100
  const cx = (seed / 100) * w
  const cy = ((index * 53) % 100) / 100 * topH
  const baseOpacity = 0.2 + ((index * 29) % 100) / 100 * 0.4

  const t = useSharedValue(0)
  useEffect(() => {
    if (!twinkle || reducedMotion) return
    t.value = withDelay(
      index * 300,
      withRepeat(withSequence(
        withTiming(1, { duration: 1400 + (index % 3) * 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1400 + (index % 3) * 300, easing: Easing.inOut(Easing.ease) }),
      ), -1),
    )
    return () => cancelAnimation(t)
  }, [twinkle, reducedMotion])

  const animatedProps = useAnimatedProps(() => ({
    opacity: twinkle ? baseOpacity + t.value * (0.6 - baseOpacity) : baseOpacity,
  }))

  return <AnimatedCircle cx={cx} cy={cy} r={1.4} fill="#fff" animatedProps={animatedProps} />
}

function StarsLayer({ reducedMotion, cardHeight }: { reducedMotion: boolean; cardHeight: number }) {
  const w = Math.min(SCREEN_W, 480)
  const topH = cardHeight * 0.35
  // Anchored top-only (no `bottom`) so the SVG's own height prop — not a
  // stretched absoluteFill box — defines the coordinate space stars live in.
  return (
    <Svg width={w} height={topH} style={styles.topLayer} pointerEvents="none">
      {Array.from({ length: STAR_COUNT }).map((_, i) => (
        <Star key={i} index={i} w={w} topH={topH} twinkle={i < TWINKLE_COUNT} reducedMotion={reducedMotion} />
      ))}
    </Svg>
  )
}

// ── Snowfall (frost variants) ────────────────────────────────────────────────

const SNOW_COUNT = 7

function Snowflake({ index, w, h, reducedMotion }: { index: number; w: number; h: number; reducedMotion: boolean }) {
  const cx = ((index * 83) % 100) / 100 * w
  const drift = ((index * 41) % 20) - 10
  const color = index % 2 === 0 ? '#fff' : '#cfeaf5'
  const r = index % 3 === 0 ? 2 : 1.2
  const duration = 3500 + (index % 5) * 250

  const t = useSharedValue(0)
  useEffect(() => {
    if (reducedMotion) return
    t.value = withDelay(
      index * 420,
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1),
    )
    return () => cancelAnimation(t)
  }, [reducedMotion])

  const animatedProps = useAnimatedProps(() => {
    const progress = reducedMotion ? 0.5 : t.value
    const cy = progress * h
    // fades in briefly, holds, fades out as it nears the bottom
    const opacity = progress < 0.1 ? progress * 6 : progress > 0.8 ? (1 - progress) * 3 : 0.6
    return { cy, cx: cx + drift * progress, opacity: Math.max(0, Math.min(0.6, opacity)) }
  })

  return <AnimatedCircle r={r} fill={color} animatedProps={animatedProps} />
}

function SnowfallLayer({ reducedMotion, cardHeight }: { reducedMotion: boolean; cardHeight: number }) {
  const w = Math.min(SCREEN_W, 480)
  return (
    <Svg width={w} height={cardHeight} style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: SNOW_COUNT }).map((_, i) => (
        <Snowflake key={i} index={i} w={w} h={cardHeight} reducedMotion={reducedMotion} />
      ))}
    </Svg>
  )
}

// ── Golden sparkle motes (Airy Meadow) ──────────────────────────────────────

function SparkleMote({ index, w, h, reducedMotion }: { index: number; w: number; h: number; reducedMotion: boolean }) {
  const cx = w * (0.35 + index * 0.3)
  const baseCy = h * 0.55
  const duration = 4200 + index * 600

  const t = useSharedValue(0)
  useEffect(() => {
    if (reducedMotion) return
    t.value = withDelay(
      index * 800,
      withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }), -1),
    )
    return () => cancelAnimation(t)
  }, [reducedMotion])

  const animatedProps = useAnimatedProps(() => {
    const progress = reducedMotion ? 0.5 : t.value
    const cy = baseCy - progress * 70
    const opacity = progress < 0.5 ? progress * 0.7 : (1 - progress) * 0.7
    return { cy, opacity }
  })

  return <AnimatedCircle cx={cx} r={2} fill="#ffe27a" animatedProps={animatedProps} />
}

function SparkleLayer({ reducedMotion, cardHeight }: { reducedMotion: boolean; cardHeight: number }) {
  const w = Math.min(SCREEN_W, 480)
  return (
    <Svg width={w} height={cardHeight} style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: 2 }).map((_, i) => (
        <SparkleMote key={i} index={i} w={w} h={cardHeight} reducedMotion={reducedMotion} />
      ))}
    </Svg>
  )
}

// ── Grass hill (Airy Meadow) ─────────────────────────────────────────────────

function GrassHill() {
  const w = Math.min(SCREEN_W, 480)
  return (
    <Svg width={w} height={70} style={[StyleSheet.absoluteFill, { top: undefined, bottom: 0 }]} pointerEvents="none">
      <Path
        d={`M0,38 Q${w * 0.3},18 ${w * 0.6},28 T${w},25 L${w},70 L0,70 Z`}
        fill="#A8D8B0"
        opacity={0.7}
      />
    </Svg>
  )
}

// ── Secondary depth orb + vignette (Meadow Frost) ───────────────────────────

function SecondaryOrb() {
  const w = Math.min(SCREEN_W, 480)
  return (
    <Svg width={w} height={220} style={styles.topLayer} pointerEvents="none">
      <Defs>
        <RadialGradient id="secOrb" cx="50%" cy="50%" r="50%">
          <Stop offset="0%"   stopColor="rgba(96,170,210,0.12)" stopOpacity={1} />
          <Stop offset="100%" stopColor="rgba(96,170,210,0.12)" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={w - 60} cy={60} r={100} fill="url(#secOrb)" />
    </Svg>
  )
}

function Vignette({ height }: { height: number }) {
  const w = Math.min(SCREEN_W, 480)
  return (
    <Svg width={w} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="vignette" cx="50%" cy="45%" r="65%">
          <Stop offset="40%"  stopColor="#000" stopOpacity={0} />
          <Stop offset="100%" stopColor="#000" stopOpacity={0.35} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={height} fill="url(#vignette)" />
    </Svg>
  )
}

// ── Composed background for one variant ─────────────────────────────────────

function BackgroundLayer({ variant, reducedMotion, height }: { variant: HeroVariant; reducedMotion: boolean; height: number }) {
  const stops = GRADIENT_STOPS[variant]

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={stops}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <BreathingGlow variant={variant} reducedMotion={reducedMotion} height={height} />

      {(variant === 'auroraNight' || variant === 'auroraFrost') && (
        <>
          <StarsLayer reducedMotion={reducedMotion} cardHeight={height} />
          <LinearGradient
            colors={['transparent', GROUND_GLOW_COLOR[variant]]}
            style={[StyleSheet.absoluteFill, { top: undefined, bottom: 0, height: 120, opacity: 0.5 }]}
          />
        </>
      )}

      {variant === 'auroraFrost' && !reducedMotion && <SnowfallLayer reducedMotion={reducedMotion} cardHeight={height} />}

      {variant === 'airyMeadow' && (
        <>
          <LinearGradient
            colors={['rgba(255,255,255,0.4)', 'transparent']}
            style={[StyleSheet.absoluteFill, { bottom: undefined, height: 60 }]}
          />
          <GrassHill />
          {!reducedMotion && <SparkleLayer reducedMotion={reducedMotion} cardHeight={height} />}
        </>
      )}

      {variant === 'meadowFrost' && (
        <>
          <SecondaryOrb />
          <Vignette height={height} />
          {!reducedMotion && <SnowfallLayer reducedMotion={reducedMotion} cardHeight={height} />}
        </>
      )}
    </View>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function StreakHeroBackground({ theme, health, topInset, minHeight = 380, children }: Props) {
  const reducedMotion = useReducedMotion()
  const variant = resolveVariant(theme, health)

  const [renderVariant, setRenderVariant]     = useState<HeroVariant>(variant)
  const [incomingVariant, setIncomingVariant] = useState<HeroVariant | null>(null)
  const fade = useSharedValue(0)
  const prevThemeRef = useRef(theme)

  useEffect(() => {
    if (variant === renderVariant) return
    const themeChanged = theme !== prevThemeRef.current
    prevThemeRef.current = theme
    const duration = themeChanged ? 350 : 600

    setIncomingVariant(variant)
    fade.value = 0
    fade.value = withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }, finished => {
      if (finished) {
        runOnJS(setRenderVariant)(variant)
        runOnJS(setIncomingVariant)(null)
      }
    })
  }, [variant])

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }))

  const colors = CONTENT_COLORS[variant]
  const cardHeight = minHeight

  return (
    <View style={[styles.card, { minHeight: cardHeight }]}>
      <StatusBar style={STATUS_BAR_STYLE[variant]} />

      <BackgroundLayer variant={renderVariant} reducedMotion={reducedMotion} height={cardHeight} />
      {incomingVariant && (
        <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]}>
          <BackgroundLayer variant={incomingVariant} reducedMotion={reducedMotion} height={cardHeight} />
        </Animated.View>
      )}

      <View style={{ paddingTop: topInset + 8, flex: 1 }}>
        {children(colors)}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width:    '100%',
    overflow: 'hidden',
  },
  topLayer: { position: 'absolute', top: 0, left: 0, right: 0 },
})

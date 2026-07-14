/* ============================================================
   EvolutionModal — 4-beat stage-up celebration
   Beat 1  0–800ms   Anticipation: tree dims, "a new form awakens"
   Beat 2  800–1400ms Burst: particles explode + haptic
   Beat 3  1400–2400ms Reveal: new tree springs in, badge slides up
   Beat 4  2400ms+    Keepsake: stage name, blurb, action buttons
   ============================================================ */
import React, { useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, withDelay, withSequence,
  Easing,
  type SharedValue,
} from 'react-native-reanimated'
import { MagicTree } from './MagicTree'
import { TREE_STAGES } from '../../lib/treeTheme'
import type { StageNumber } from '../../lib/treeTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { shareTreeEvolution } from '../../lib/share'

let Haptics: any = null
try { Haptics = require('expo-haptics') } catch {}

function triggerHaptic() {
  try { Haptics?.notificationAsync?.(Haptics?.NotificationFeedbackType?.Success) } catch {}
}

// ── Burst particle ────────────────────────────────────────────────────────────
// Receives the shared burstProgress (0→1) and derives its own position from it
const BURST_CONFIG = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2
  const r     = 68 + (i % 3) * 22
  const size  = 5 + (i % 4) * 2
  const color = i % 2 === 0 ? '#ffe9b8' : '#8fd4ff'
  return { angle, r, size, color, dx: Math.cos(angle) * r, dy: Math.sin(angle) * r }
})

function BurstParticle({ dx, dy, color, size, prog }: {
  dx: number; dy: number; color: string; size: number
  prog: SharedValue<number>
}) {
  const style = useAnimatedStyle(() => {
    const p  = prog.value
    const op = p < 0.15 ? p / 0.15 : p < 0.65 ? 1 : Math.max(0, (1 - p) / 0.35)
    return {
      opacity:    op,
      transform: [
        { translateX: dx * Math.min(p * 1.4, 1) },
        { translateY: dy * Math.min(p * 1.4, 1) },
        { scale: p < 0.25 ? p / 0.25 * 1.3 : 1 },
      ],
    }
  })
  return (
    <Animated.View style={[
      styles.particle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color,
        shadowColor: color, shadowOpacity: 0.9, shadowRadius: 6, elevation: 4 },
      style,
    ]} />
  )
}

// ── Animated text helper ──────────────────────────────────────────────────────
function FadeUp({ opacity, translateY, style, children }: {
  opacity: SharedValue<number>; translateY: SharedValue<number>
  style?: any; children: React.ReactNode
}) {
  const aStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: translateY.value }],
  }))
  return <Animated.View style={[aStyle, style]}>{children}</Animated.View>
}

// ── Main component ────────────────────────────────────────────────────────────
export interface EvolutionModalProps {
  visible:  boolean
  toStage:  StageNumber
  bonusXp?: number
  onClose:  () => void
  onShare?: () => void
}

export function EvolutionModal({ visible, toStage, bonusXp = 0, onClose, onShare }: EvolutionModalProps) {
  const insets  = useSafeAreaInsets()
  const stageMeta   = TREE_STAGES[toStage - 1]
  const nextMeta    = TREE_STAGES[toStage] ?? null   // may be null at stage 10

  // ── Shared values ─────────────────────────────────────────────────────────
  const bgDim          = useSharedValue(0)
  const awakenOp       = useSharedValue(0)
  const oldTreeOp      = useSharedValue(1)
  const burstProg      = useSharedValue(0)
  const newTreeScale   = useSharedValue(0.08)
  const newTreeOp      = useSharedValue(0)
  const badgeOp        = useSharedValue(0)
  const badgeY         = useSharedValue(18)
  const nameOp         = useSharedValue(0)
  const nameY          = useSharedValue(22)
  const blurbOp        = useSharedValue(0)
  const blurbY         = useSharedValue(16)
  const buttonsOp      = useSharedValue(0)
  const buttonsY       = useSharedValue(20)

  const reset = useCallback(() => {
    bgDim.value        = 0
    awakenOp.value     = 0
    oldTreeOp.value    = 1
    burstProg.value    = 0
    newTreeScale.value = 0.08
    newTreeOp.value    = 0
    badgeOp.value      = 0
    badgeY.value       = 18
    nameOp.value       = 0
    nameY.value        = 22
    blurbOp.value      = 0
    blurbY.value       = 16
    buttonsOp.value    = 0
    buttonsY.value     = 20
  }, [])

  useEffect(() => {
    if (!visible) { reset(); return }

    // Beat 1 — Anticipation (0–800ms)
    bgDim.value = withSequence(
      withTiming(0.45, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      withTiming(0.45, { duration: 100 }),
      withTiming(0.7,  { duration: 120 }),
      withTiming(0.45, { duration: 400 }),
    )
    awakenOp.value  = withDelay(200, withTiming(1, { duration: 500 }))
    oldTreeOp.value = withTiming(0.28, { duration: 800, easing: Easing.inOut(Easing.ease) })

    // Beat 2 — Burst (800ms)
    burstProg.value = withDelay(800, withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }))
    const hapticTimer = setTimeout(triggerHaptic, 800)

    // Beat 3 — Reveal (1200ms)
    newTreeOp.value    = withDelay(1200, withTiming(1, { duration: 500 }))
    newTreeScale.value = withDelay(1200,
      withSpring(1, { damping: 11, stiffness: 140, mass: 0.9 })
    )
    badgeOp.value = withDelay(1050, withTiming(1, { duration: 400 }))
    badgeY.value  = withDelay(1050, withSpring(0, { damping: 14, stiffness: 180 }))

    // Beat 4 — Keepsake (1900ms+)
    nameOp.value  = withDelay(1900, withTiming(1, { duration: 500 }))
    nameY.value   = withDelay(1900, withSpring(0, { damping: 16, stiffness: 200 }))
    blurbOp.value = withDelay(2300, withTiming(1, { duration: 400 }))
    blurbY.value  = withDelay(2300, withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) }))
    buttonsOp.value = withDelay(2700, withTiming(1, { duration: 400 }))
    buttonsY.value  = withDelay(2700, withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) }))

    return () => clearTimeout(hapticTimer)
  }, [visible])

  // ── Animated styles ───────────────────────────────────────────────────────
  const bgDimStyle    = useAnimatedStyle(() => ({ opacity: bgDim.value }))
  const awakenStyle   = useAnimatedStyle(() => ({ opacity: awakenOp.value }))
  const oldTreeStyle  = useAnimatedStyle(() => ({ opacity: oldTreeOp.value }))
  const newTreeStyle  = useAnimatedStyle(() => ({
    opacity:   newTreeOp.value,
    transform: [{ scale: newTreeScale.value }],
  }))

  async function handleShare() {
    if (onShare) { onShare(); return }
    shareTreeEvolution({
      stageName:  stageMeta.name,
      streakDays: stageMeta.days,
    })
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Dark sky background */}
      <LinearGradient
        colors={['#070e1c', '#0f1b30', '#1b3056']}
        style={styles.root}
      >
        {/* Atmosphere dim pulse */}
        <Animated.View style={[StyleSheet.absoluteFillObject, styles.dimOverlay, bgDimStyle]} />

        {/* ── Tree area (top ~55%) ───────────────────────────────────────── */}
        <View style={styles.treeArea}>

          {/* "a new form awakens" — anticipation subtext */}
          <Animated.Text style={[styles.awakenText, awakenStyle]}>
            a new form awakens
          </Animated.Text>

          {/* Old tree (fades during anticipation) */}
          <Animated.View style={[StyleSheet.absoluteFill, styles.treeCentered, oldTreeStyle]}>
            <MagicTree stage={Math.max(1, toStage - 1) as StageNumber} state="alive" size="card" uid="evo_old" />
          </Animated.View>

          {/* Burst particles (positioned at center of tree area) */}
          <View style={styles.burstOrigin} pointerEvents="none">
            {BURST_CONFIG.map((p, i) => (
              <BurstParticle key={i} dx={p.dx} dy={p.dy} color={p.color} size={p.size} prog={burstProg} />
            ))}
          </View>

          {/* New tree (springs in during reveal) */}
          <Animated.View style={[StyleSheet.absoluteFill, styles.treeCentered, newTreeStyle]}>
            <MagicTree stage={toStage} state="alive" size="card" uid="evo_new" />
          </Animated.View>

          {/* "STAGE X UNLOCKED" badge */}
          <FadeUp opacity={badgeOp} translateY={badgeY} style={styles.badgeWrap}>
            <View style={styles.badge}>
              <Text style={[styles.badgeText, { fontFamily: typography.fontFamily.extrabold }]}>
                BOSQICH {toStage} OCHILDI
              </Text>
            </View>
          </FadeUp>
        </View>

        {/* ── Keepsake area (bottom ~45%) ───────────────────────────────── */}
        <View style={[styles.keepsake, { paddingBottom: insets.bottom + 20 }]}>

          {/* Stage name — serif italic large */}
          <FadeUp opacity={nameOp} translateY={nameY}>
            <Text style={styles.stageName}>{stageMeta.name}</Text>
          </FadeUp>

          {/* Blurb */}
          <FadeUp opacity={blurbOp} translateY={blurbY}>
            <Text style={[styles.blurb, { fontFamily: typography.fontFamily.regular }]}>
              {stageMeta.blurb}
            </Text>
          </FadeUp>

          {/* XP earned — the tree evolving IS the reward moment, show both together */}
          {bonusXp > 0 && (
            <FadeUp opacity={blurbOp} translateY={blurbY} style={styles.xpWrap}>
              <Text style={styles.xpEmoji}>⚡</Text>
              <Text style={[styles.xpText, { fontFamily: typography.fontFamily.bold }]}>
                +{bonusXp} XP
              </Text>
            </FadeUp>
          )}

          {/* Next milestone preview */}
          {nextMeta && (
            <FadeUp opacity={blurbOp} translateY={blurbY} style={styles.nextWrap}>
              <Text style={[styles.nextLabel, { fontFamily: typography.fontFamily.regular }]}>
                Keyingi bosqich:{' '}
                <Text style={{ fontFamily: typography.fontFamily.semibold, color: '#6fd6a8' }}>
                  {nextMeta.name}
                </Text>
                {'  ·  '}{nextMeta.days}dan
              </Text>
            </FadeUp>
          )}

          {/* Action buttons */}
          <FadeUp opacity={buttonsOp} translateY={buttonsY} style={styles.btnRow}>
            {/* Skip / close */}
            <Pressable
              style={({ pressed }) => [styles.btnSecondary, { opacity: pressed ? 0.7 : 1 }]}
              onPress={onClose}
            >
              <Text style={[styles.btnSecondaryText, { fontFamily: typography.fontFamily.semibold }]}>
                ↗ Ulashish
              </Text>
            </Pressable>
            {/* Share */}
            <Pressable
              style={({ pressed }) => [styles.btnPrimary, { opacity: pressed ? 0.85 : 1 }]}
              onPress={handleShare}
            >
              <Text style={[styles.btnPrimaryText, { fontFamily: typography.fontFamily.extrabold }]}>
                Daraxtimni ulash
              </Text>
            </Pressable>
          </FadeUp>

          {/* Dismiss hint */}
          <FadeUp opacity={buttonsOp} translateY={buttonsY}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={[styles.dismissText, { fontFamily: typography.fontFamily.regular }]}>
                Yopish
              </Text>
            </Pressable>
          </FadeUp>
        </View>
      </LinearGradient>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  dimOverlay: { backgroundColor: '#000' },

  // Tree area — fills top 58%
  treeArea: {
    flex:           0.58,
    alignItems:     'center',
    justifyContent: 'center',
    position:       'relative',
    overflow:       'hidden',
  },
  treeCentered: {
    alignItems:     'center',
    justifyContent: 'center',
  },

  awakenText: {
    position:    'absolute',
    top:         '14%',
    alignSelf:   'center',
    fontSize:    13,
    fontStyle:   'italic',
    color:       '#adc4e6',
    letterSpacing: 0.5,
    zIndex:      10,
  },

  // Burst particles — anchored at center of tree area
  burstOrigin: {
    position:       'absolute',
    alignSelf:      'center',
    alignItems:     'center',
    justifyContent: 'center',
    width:          1,
    height:         1,
    top:            '50%',
    zIndex:         20,
  },
  particle: {
    position:  'absolute',
  },

  // "STAGE X UNLOCKED" badge
  badgeWrap: {
    position: 'absolute',
    bottom:   '8%',
    alignSelf: 'center',
    zIndex:   30,
  },
  badge: {
    backgroundColor: 'rgba(255,143,192,0.18)',
    borderColor:     '#ff8fc0',
    borderWidth:     1,
    borderRadius:    radius.full,
    paddingHorizontal: 14,
    paddingVertical:   5,
  },
  badgeText: {
    fontSize:      11,
    letterSpacing: 0.9,
    color:         '#ff8fc0',
  },

  // Keepsake area — bottom 42%
  keepsake: {
    flex:            0.42,
    alignItems:      'center',
    justifyContent:  'flex-start',
    paddingTop:      spacing.lg,
    paddingHorizontal: spacing.xl,
    gap:             spacing.sm,
  },

  stageName: {
    fontSize:      34,
    fontStyle:     'italic',
    fontFamily:    'serif',
    color:         '#eaf3ff',
    textAlign:     'center',
    letterSpacing: 0.3,
  },

  blurb: {
    fontSize:   13,
    color:      '#adc4e6',
    textAlign:  'center',
    lineHeight: 19,
    maxWidth:   280,
  },

  xpWrap: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    marginTop:         spacing.xs,
    paddingHorizontal: spacing.base,
    paddingVertical:   6,
    borderRadius:      radius.full,
    backgroundColor:   'rgba(255,214,10,0.14)',
  },
  xpEmoji: { fontSize: 15 },
  xpText:  { fontSize: 15, color: '#ffd60a' },

  nextWrap: { marginTop: spacing.xs },
  nextLabel: {
    fontSize:  12,
    color:     '#6b8aad',
    textAlign: 'center',
  },

  btnRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginTop:     spacing.sm,
    width:         '100%',
  },
  btnSecondary: {
    width:          52,
    borderRadius:   radius.lg,
    borderWidth:    1,
    borderColor:    'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  btnSecondaryText: {
    fontSize: 13,
    color:    '#adc4e6',
  },
  btnPrimary: {
    flex:            1,
    borderRadius:    radius.lg,
    backgroundColor: '#46c08a',
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: 14,
  },
  btnPrimaryText: {
    fontSize: 15,
    color:    '#06231a',
  },

  dismissText: {
    fontSize:   12,
    color:      '#3a5070',
    marginTop:  spacing.xs,
  },
})

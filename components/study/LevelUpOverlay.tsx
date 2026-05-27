/**
 * Full-screen level-up celebration overlay.
 * Badge scales in with spring, 12 particles burst outward.
 * Auto-dismisses after 3 seconds or on tap.
 */
import React, { useEffect, useRef } from 'react'
import { View, Text, Modal, StyleSheet, Pressable } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withDelay, Easing,
} from 'react-native-reanimated'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, getLevelTier } from '../../lib/constants'

const PARTICLE_COUNT = 12
const PARTICLE_COLORS = ['#F5A623', '#FFD700', '#FF8A00', '#FF5E00', '#FFB830']

interface Props {
  visible:  boolean
  newLevel: number
  onDismiss: () => void
}

function Particle({ index, trigger }: { index: number; trigger: boolean }) {
  const angle = (index / PARTICLE_COUNT) * Math.PI * 2
  const dx = Math.cos(angle) * 90
  const dy = Math.sin(angle) * 90
  const color = PARTICLE_COLORS[index % PARTICLE_COLORS.length]

  const x       = useSharedValue(0)
  const y       = useSharedValue(0)
  const opacity = useSharedValue(0)
  const scale   = useSharedValue(0)

  useEffect(() => {
    if (trigger) {
      x.value       = 0
      y.value       = 0
      opacity.value = 0
      scale.value   = 0

      const delay = index * 30
      x.value       = withDelay(delay, withTiming(dx, { duration: 800, easing: Easing.out(Easing.cubic) }))
      y.value       = withDelay(delay, withTiming(dy, { duration: 800, easing: Easing.out(Easing.cubic) }))
      scale.value   = withDelay(delay, withSpring(1, { damping: 6, stiffness: 300 }))
      opacity.value = withDelay(delay, withTiming(0, { duration: 800, easing: Easing.in(Easing.cubic) }))
    }
  }, [trigger])

  const style = useAnimatedStyle(() => ({
    transform:  [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
    opacity:    opacity.value,
  }))

  return (
    <Animated.View style={[styles.particle, { backgroundColor: color }, style]} />
  )
}

export function LevelUpOverlay({ visible, newLevel, onDismiss }: Props) {
  const { c }   = useTheme()
  const tier    = getLevelTier(newLevel)
  const trigger = useRef(false)

  const badgeScale  = useSharedValue(0)
  const textOpacity = useSharedValue(0)
  const particleTrig = useRef(false)

  // Re-trigger on each open
  const [particleKey, setParticleKey] = React.useState(0)

  useEffect(() => {
    if (visible) {
      particleTrig.current = true
      setParticleKey(k => k + 1)

      badgeScale.value  = 0
      textOpacity.value = 0

      badgeScale.value = withSpring(1, { damping: 8, stiffness: 160, overshootClamping: false }, () => {
        badgeScale.value = withSpring(1, { damping: 14, stiffness: 200 })
      })
      textOpacity.value = withDelay(400, withTiming(1, { duration: 300 }))

      // Auto-dismiss after 3 seconds
      const t = setTimeout(onDismiss, 3000)
      return () => clearTimeout(t)
    }
  }, [visible])

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }))
  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }))

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <Pressable style={[styles.overlay, { backgroundColor: c.overlay }]} onPress={onDismiss}>
        <View style={styles.center}>
          {/* Particles */}
          <View style={styles.particleOrigin} pointerEvents="none">
            {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
              <Particle key={`${particleKey}-${i}`} index={i} trigger={visible} />
            ))}
          </View>

          {/* Badge */}
          <Animated.View
            style={[
              styles.badge,
              { borderColor: tier.border, backgroundColor: tier.bg },
              badgeStyle,
            ]}
          >
            <Text style={[styles.levelNum, { color: tier.border, fontFamily: typography.fontFamily.extrabold }]}>
              {newLevel}
            </Text>
          </Animated.View>

          {/* Text */}
          <Animated.View style={[textStyle, { alignItems: 'center', gap: 8, marginTop: spacing.base }]}>
            <Text style={[styles.tierLabel, { color: tier.border, fontFamily: typography.fontFamily.extrabold }]}>
              {tier.label}
            </Text>
            <Text style={[styles.levelText, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              {newLevel}-daraja
            </Text>
            <Text style={[styles.congrats, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              Tabriklaymiz! 🎉
            </Text>
          </Animated.View>
        </View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center:  { alignItems: 'center' },

  particleOrigin: {
    position:  'absolute',
    width:     0,
    height:    0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position:     'absolute',
    width:        8,
    height:       8,
    borderRadius: 4,
  },

  badge: {
    width:        100,
    height:       100,
    borderRadius: 50,
    borderWidth:  3,
    alignItems:   'center',
    justifyContent: 'center',
  },
  levelNum:   { fontSize: 36 },
  tierLabel:  { fontSize: typography.size.xl },
  levelText:  { fontSize: typography.size['2xl'] },
  congrats:   { fontSize: typography.size.base },
})

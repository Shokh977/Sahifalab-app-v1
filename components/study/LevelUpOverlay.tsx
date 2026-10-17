/**
 * Level-up moment (redesign Phase 5) — the app's one Lottie: a ring burst
 * and sparkles (assets/animations/level-up.json) behind the new level
 * number and its title. Heavy haptic; tap or 3 s to dismiss. Under reduce
 * motion the animation shows its final frame and the badge appears at
 * once. Props unchanged, so callers (FocusTimer) are untouched.
 */
import React, { useEffect } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Lottie } from '../../src/components/ui/Lottie'
import Animated, {
  useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming,
} from 'react-native-reanimated'
import { getLevelInfo } from '../../lib/levelTitles'
import { useTheme } from '../../src/design/ThemeProvider'
import { durations, springs } from '../../src/design/motion'
import { avatarSize, radius, space } from '../../src/design/spacing'
import { tabular, type as typeScale } from '../../src/design/typography'
import { haptics } from '../../src/lib/haptics'
import { uzText } from '../../src/features/today/today'

const LEVEL_UP = require('../../assets/animations/level-up.json')
const AUTO_DISMISS_MS = 3000
const BURST = avatarSize.xl * 4
const BADGE = avatarSize.xl + space.lg

interface Props {
  visible:   boolean
  newLevel:  number
  onDismiss: () => void
}

export function LevelUpOverlay({ visible, newLevel, onDismiss }: Props) {
  const { colors } = useTheme()
  const reduceMotion = useReducedMotion()
  const info = getLevelInfo(newLevel)
  const badge = useSharedValue(reduceMotion ? 1 : 0)
  const text = useSharedValue(reduceMotion ? 1 : 0)

  useEffect(() => {
    if (!visible) return
    haptics.heavy()
    if (reduceMotion) {
      badge.set(1)
      text.set(1)
    } else {
      badge.set(0)
      text.set(0)
      badge.set(withSpring(1, springs.pop))
      text.set(withDelay(durations.slow, withTiming(1, { duration: durations.fade })))
    }
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(t)
  }, [visible, reduceMotion, badge, text, onDismiss])

  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: badge.get() }] }))
  const textStyle = useAnimatedStyle(() => ({ opacity: text.get() }))

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent onRequestClose={onDismiss}>
      <Pressable
        style={[styles.overlay, { backgroundColor: colors.scrim }]}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={`Yangi daraja: ${newLevel}, ${uzText(info.title)}. Yopish`}
      >
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.stage}>
            <Lottie
              source={LEVEL_UP}
              autoPlay={!reduceMotion}
              loop={false}
              progress={reduceMotion ? 1 : undefined}
              style={styles.burst}
            />
            <Animated.View style={[styles.badge, { backgroundColor: colors.accent }, badgeStyle]}>
              <Text style={[typeScale.display, tabular, { color: colors.onAccent }]}>{newLevel}</Text>
            </Animated.View>
          </View>
          <Animated.View style={[styles.text, textStyle]}>
            <Text style={[typeScale.overline, { color: colors.accentText }]}>Yangi daraja</Text>
            <Text style={[typeScale.title1, styles.center, { color: colors.text }]}>{uzText(info.title)}</Text>
            <Text style={[typeScale.body, styles.center, { color: colors.textMuted }]}>{uzText(info.description)}</Text>
          </Animated.View>
        </View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  card: { width: '100%', borderRadius: radius.sheet, alignItems: 'center', paddingBottom: space.xl, overflow: 'hidden' },
  stage: { width: BURST, height: BURST * 0.8, alignItems: 'center', justifyContent: 'center' },
  burst: { position: 'absolute', width: BURST, height: BURST },
  badge: { width: BADGE, height: BADGE, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  text: { alignItems: 'center', gap: space.xs, paddingHorizontal: space.xl },
  center: { textAlign: 'center' },
})

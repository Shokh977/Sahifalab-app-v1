/**
 * Achievement unlock overlay — queues multiple achievements sequentially
 * with 500ms gap between them.
 */
import React, { useEffect } from 'react'
import { View, Text, Modal, StyleSheet, Pressable } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay,
} from 'react-native-reanimated'
import { Trophy } from 'phosphor-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'

export interface Achievement {
  id:          string
  name:        string
  description: string
  xp:          number
}

interface Props {
  visible:    boolean
  item:       Achievement | null
  onDismiss:  () => void
}

export function AchievementOverlay({ visible, item, onDismiss }: Props) {
  const { c } = useTheme()

  const scale   = useSharedValue(0)
  const opacity = useSharedValue(0)

  useEffect(() => {
    if (visible && item) {
      scale.value   = 0
      opacity.value = 0

      scale.value   = withSpring(1, { damping: 8, stiffness: 160 })
      opacity.value = withDelay(300, withTiming(1, { duration: 300 }))

      const t = setTimeout(onDismiss, 3000)
      return () => clearTimeout(t)
    }
  }, [visible, item?.id])

  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const textStyle  = useAnimatedStyle(() => ({ opacity: opacity.value }))

  if (!item) return null

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <Pressable style={[styles.overlay, { backgroundColor: c.overlay }]} onPress={onDismiss}>
        <View style={styles.center}>
          {/* Icon */}
          <Animated.View
            style={[
              styles.iconWrap,
              { backgroundColor: c.accentPrimaryMuted, borderColor: c.accentPrimary },
              badgeStyle,
            ]}
          >
            <Trophy size={52} color={c.accentPrimary} weight="fill" />
          </Animated.View>

          {/* Text */}
          <Animated.View style={[styles.textBlock, textStyle]}>
            <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              {item.name}
            </Text>
            <Text style={[styles.desc, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              {item.description}
            </Text>
            {item.xp > 0 && (
              <Text style={[styles.xp, { color: c.accentPrimary, fontFamily: typography.fontFamily.semibold }]}>
                +{item.xp} XP
              </Text>
            )}
          </Animated.View>

          {/* Dismiss hint */}
          <Text style={[styles.hint, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
            Davom etish uchun bosing
          </Text>
        </View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  center:  { alignItems: 'center', gap: spacing.base },

  iconWrap: {
    width:        100,
    height:       100,
    borderRadius: 50,
    borderWidth:  2,
    alignItems:   'center',
    justifyContent: 'center',
  },

  textBlock: { alignItems: 'center', gap: 6 },
  title:  { fontSize: typography.size.xl, textAlign: 'center' },
  desc:   { fontSize: typography.size.base, textAlign: 'center', maxWidth: 280 },
  xp:     { fontSize: typography.size.lg },

  hint:   { fontSize: typography.size.xs, marginTop: spacing.sm },
})

import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../hooks/useTheme'
import { typography, radius } from '../../lib/constants'

interface Props {
  label:     string
  selected:  boolean
  onPress:   () => void
  icon?:     React.ReactNode
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export function AppChip({ label, selected, onPress, icon }: Props) {
  const { c } = useTheme()
  const scale = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const handlePress = async () => {
    scale.value = withSpring(0.92, { damping: 6, stiffness: 300 }, () => {
      scale.value = withSpring(1.0, { damping: 8, stiffness: 200 })
    })
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }

  return (
    <AnimatedPressable onPress={handlePress} style={animStyle}>
      <View
        style={[
          styles.chip,
          {
            backgroundColor: selected ? c.accentPrimaryMuted : c.bgTertiary,
            borderColor:     selected ? c.accentPrimary      : c.border,
          },
        ]}
      >
        {icon && <View style={styles.icon}>{icon}</View>}
        <Text
          style={[
            styles.label,
            {
              color:      selected ? c.accentPrimary : c.textSecondary,
              fontFamily: selected
                ? typography.fontFamily.medium
                : typography.fontFamily.regular,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    flexDirection:     'row',
    alignItems:        'center',
    borderWidth:       1,
    borderRadius:      radius.chip,
    paddingVertical:   10,
    paddingHorizontal: 16,
    gap:               6,
  },
  icon:  {},
  label: { fontSize: typography.size.base },
})

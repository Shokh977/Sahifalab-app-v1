import { Stack } from 'expo-router'
import { useReducedMotion } from 'react-native-reanimated'
import { useTheme } from '../../hooks/useTheme'
import { pushAnimation } from '../../src/design/motion'

export default function ScreensLayout() {
  const { c } = useTheme()
  const reduceMotion = useReducedMotion()
  return (
    <Stack
      screenOptions={{
        headerShown:  false,
        // Matches the root stack: iOS-style push on Android too, a fade under reduce motion.
        animation:    pushAnimation(reduceMotion),
        contentStyle: { backgroundColor: c.bgPrimary },
      }}
    />
  )
}

import { Stack } from 'expo-router'
import { useTheme } from '../../hooks/useTheme'

export default function OnboardingLayout() {
  const { c } = useTheme()
  return (
    <Stack
      screenOptions={{
        headerShown:    false,
        contentStyle:   { backgroundColor: c.bgPrimary },
        animation:      'slide_from_right',
        gestureEnabled: false,   // no swipe-back out of onboarding
      }}
    />
  )
}

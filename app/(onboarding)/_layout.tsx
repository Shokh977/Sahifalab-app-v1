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
        // Swipe-back is allowed between onboarding steps so a user can fix an
        // earlier answer. The first screen (interests.tsx) was entered via
        // router.replace(), so there's nothing behind it to swipe back to.
        gestureEnabled: true,
      }}
    />
  )
}

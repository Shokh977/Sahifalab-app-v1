import { Platform } from 'react-native'
import { Stack } from 'expo-router'
import { useTheme } from '../../hooks/useTheme'

export default function ScreensLayout() {
  const { c } = useTheme()
  return (
    <Stack
      screenOptions={{
        headerShown:  false,
        // Matches the root stack: iOS-style push on Android too.
        animation:    Platform.OS === 'android' ? 'ios_from_right' : 'default',
        contentStyle: { backgroundColor: c.bgPrimary },
      }}
    />
  )
}

import { Stack } from 'expo-router'
import { useTheme } from '../../hooks/useTheme'

export default function ScreensLayout() {
  const { c } = useTheme()
  return (
    <Stack
      screenOptions={{
        headerShown:  false,
        contentStyle: { backgroundColor: c.bgPrimary },
      }}
    />
  )
}

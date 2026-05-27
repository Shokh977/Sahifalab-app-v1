import { Stack } from 'expo-router'
import { useTheme } from '../../hooks/useTheme'

export default function AuthLayout() {
  const { c } = useTheme()
  return (
    <Stack
      screenOptions={{
        headerShown:  false,
        contentStyle: { backgroundColor: c.bgPrimary },
        animation:    'slide_from_right',
      }}
    >
      <Stack.Screen name="login"      options={{ gestureEnabled: false }} />
      <Stack.Screen name="email-auth" options={{ gestureEnabled: true }} />
      <Stack.Screen name="forgot-password" options={{ gestureEnabled: true }} />
      <Stack.Screen name="verify-email"    options={{ gestureEnabled: true }} />
    </Stack>
  )
}

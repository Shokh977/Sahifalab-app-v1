/**
 * telegram-callback.tsx
 *
 * This screen is never rendered directly — it only exists so that Expo Router
 * registers the deep-link path `sahifalab://auth/telegram-callback`.
 * The actual handling is done in login.tsx via WebBrowser.openAuthSessionAsync
 * which captures the redirect URL and parses the query params.
 *
 * If for some reason the user lands here (e.g. manual link), redirect to login.
 */
import { Redirect } from 'expo-router'

export default function TelegramCallback() {
  return <Redirect href="/(auth)/login" />
}

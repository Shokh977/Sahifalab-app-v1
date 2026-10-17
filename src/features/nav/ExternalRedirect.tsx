/**
 * A route whose content now lives on sahifalab.uz (books left the app in
 * redesign Phase 4a). Opens the page in the browser and steps back; if the
 * browser can't be opened, the screen stays with a button to try again.
 * The route itself is kept so old links and notifications never break.
 */
import React, { useEffect, useState } from 'react'
import { Linking, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { BookOpen } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { EmptyState, ScreenHeader } from '../../components/ui'

export function ExternalRedirect({ url, title, body }: { url: string; title: string; body?: string }) {
  const { colors } = useTheme()
  const router = useRouter()
  const [failed, setFailed] = useState(false)

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))

  const open = () => {
    Linking.openURL(url).then(leave).catch(() => setFailed(true))
  }

  useEffect(() => { open() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScreenHeader onBack={leave} />
      <EmptyState
        icon={BookOpen}
        title={title}
        body={failed ? 'Brauzer ochilmadi. Qayta urinib koʻring.' : body}
        action={{ label: 'Saytni ochish', onPress: open }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})

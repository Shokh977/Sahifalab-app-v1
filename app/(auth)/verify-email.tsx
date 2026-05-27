/**
 * verify-email.tsx
 *
 * Landing screen when the user taps the verification link from their email.
 * The link format from the web is:
 *   https://sahifalab-hub-bot.vercel.app/auth/verify-email?token=XXX
 *
 * On mobile the deep link is:
 *   sahifalab://auth/verify-email?token=XXX
 *
 * This screen calls GET /api/auth/verify-email?token=XXX and on success
 * shows a confirmation, then redirects to login.
 */
import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { useTheme } from '../../hooks/useTheme'
import { Button } from '../../components/ui/Button'
import { API_URL, typography, spacing } from '../../lib/constants'

type Status = 'verifying' | 'success' | 'error'

export default function VerifyEmailScreen() {
  const { c }   = useTheme()
  const router  = useRouter()
  const { token } = useLocalSearchParams<{ token?: string }>()

  const [status,  setStatus]  = useState<Status>('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage("Havola noto'g'ri yoki eskirgan")
      return
    }
    fetch(`${API_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(data => {
        if (data?.ok || data?.message?.includes('tasdiqlandi')) {
          setStatus('success')
          setMessage("Email muvaffaqiyatli tasdiqlandi! Endi tizimga kirishingiz mumkin.")
        } else {
          setStatus('error')
          setMessage(data?.detail ?? "Tasdiqlashda xatolik yuz berdi")
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage("Server bilan bog'lanishda xatolik")
      })
  }, [token])

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bgPrimary }]}>
      <View style={styles.center}>
        {status === 'verifying' && (
          <>
            <ActivityIndicator size="large" color={c.brand} />
            <Text style={[styles.msg, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              Email tasdiqlanmoqda…
            </Text>
          </>
        )}

        {status === 'success' && (
          <>
            <Text style={styles.icon}>✅</Text>
            <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              Tasdiqlandi!
            </Text>
            <Text style={[styles.msg, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              {message}
            </Text>
            <Button
              label="Kirish"
              onPress={() => router.replace('/(auth)/login')}
              style={{ marginTop: spacing.xl }}
            />
          </>
        )}

        {status === 'error' && (
          <>
            <Text style={styles.icon}>❌</Text>
            <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              Xatolik
            </Text>
            <Text style={[styles.msg, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              {message}
            </Text>
            <Button
              label="Kirish sahifasiga"
              onPress={() => router.replace('/(auth)/login')}
              style={{ marginTop: spacing.xl }}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.base },
  icon:   { fontSize: 56, marginBottom: spacing.lg },
  title:  { fontSize: typography.size.xl, marginBottom: spacing.sm },
  msg:    { fontSize: typography.size.base, textAlign: 'center', lineHeight: 22, marginTop: spacing.sm },
})

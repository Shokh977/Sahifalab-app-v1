import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'

import { auth as authApi } from '../../lib/api'
import { useTheme } from '../../hooks/useTheme'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { validateEmail } from '../../lib/validators'
import { typography, spacing, radius } from '../../lib/constants'

export default function ForgotPasswordScreen() {
  const { c }  = useTheme()
  const router = useRouter()

  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [sent,    setSent]    = useState(false)

  const handleSubmit = async () => {
    setError(null)
    if (!validateEmail(email)) { setError("To'g'ri email kiriting"); return }
    setLoading(true)
    try {
      await authApi.forgotPassword(email.trim().toLowerCase())
      setSent(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bgPrimary }]}>
        <View style={styles.center}>
          <Text style={styles.icon}>📧</Text>
          <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            Havola yuborildi
          </Text>
          <Text style={[styles.body, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {email} manziliga parolni tiklash havolasi yuborildi. Pochta qutingizni tekshiring.
          </Text>
          <Button
            label="Kirish sahifasiga"
            onPress={() => router.replace('/(auth)/login')}
            style={{ marginTop: spacing.xl }}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bgPrimary }]}>
      <View style={styles.content}>

        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.xl }}>
          <ChevronLeft size={20} color={c.brand} />
          <Text style={{ color: c.brand, fontFamily: typography.fontFamily.medium, fontSize: typography.size.base }}>
            Orqaga
          </Text>
        </Pressable>

        <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
          Parolni tiklash
        </Text>
        <Text style={[styles.body, { color: c.textMuted, fontFamily: typography.fontFamily.regular, marginBottom: spacing.xl }]}>
          Emailingizni kiriting — parolni tiklash havolasi yuboramiz.
        </Text>

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: c.error }]}>
            <Text style={{ color: c.error, fontSize: typography.size.sm, fontFamily: typography.fontFamily.regular }}>{error}</Text>
          </View>
        )}

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="email@example.com"
          onSubmitEditing={handleSubmit}
          returnKeyType="send"
        />

        <Button
          label="Havolani yuborish"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  content:     { flex: 1, padding: spacing.base, paddingTop: spacing.lg },
  center:      { flex: 1, padding: spacing.base, alignItems: 'center', justifyContent: 'center' },
  icon:        { fontSize: 56, marginBottom: spacing.lg },
  title:       { fontSize: typography.size.xl, marginBottom: spacing.sm },
  body:        { fontSize: typography.size.base, lineHeight: 22, textAlign: 'center' },
  errorBanner: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
})

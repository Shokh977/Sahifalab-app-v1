/**
 * Signup screen — card design matching the website.
 * Methods: Google (quick) or Email + password registration.
 */
import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Link, useRouter } from 'expo-router'
import { ChevronLeft, Globe, Eye, EyeOff, CircleAlert, CircleCheck } from 'lucide-react-native'
import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'

import { useAuthStore } from '../../stores/authStore'
import { useTheme } from '../../hooks/useTheme'
import { auth as authApi } from '../../lib/api'
import { PasswordStrengthBar } from '../../components/ui/PasswordStrengthBar'
import { checkPassword, validateEmail } from '../../lib/validators'
import { GOOGLE_CLIENT_ID, typography, spacing, radius } from '../../lib/constants'

WebBrowser.maybeCompleteAuthSession()

export default function SignupScreen() {
  const { c }   = useTheme()
  const router  = useRouter()
  const insets  = useSafeAreaInsets()
  const { loginGoogle } = useAuthStore()

  const [firstName, setFirstName] = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [loading,   setLoading]   = useState<'email' | 'google' | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const [sent,      setSent]      = useState(false)

  const pwCheck = checkPassword(password)

  // ── Google OAuth ────────────────────────────────────────────────────────────
  const [, googleResponse, promptGoogle] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    scopes:   ['openid', 'profile', 'email'],
  })

  React.useEffect(() => {
    if (googleResponse?.type !== 'success') return
    const idToken = googleResponse.authentication?.idToken
    if (!idToken) { setError('Google tokenini olishda xatolik'); return }
    setLoading('google')
    loginGoogle(idToken)
      .then(() => router.replace('/(tabs)'))
      .catch(e => setError(e.message))
      .finally(() => setLoading(null))
  }, [googleResponse])

  // ── Email registration ──────────────────────────────────────────────────────
  const handleRegister = async () => {
    setError(null)
    if (!firstName.trim())         { setError('Ismingizni kiriting'); return }
    if (!validateEmail(email))     { setError("To'g'ri email kiriting"); return }
    if (pwCheck.errors.length > 0) { setError(pwCheck.errors[0]); return }

    setLoading('email')
    try {
      await authApi.emailRegister({
        first_name: firstName.trim(),
        email:      email.trim().toLowerCase(),
        password,
      })
      setSent(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(null)
    }
  }

  const inputStyle = [
    styles.input,
    {
      backgroundColor: c.bgTertiary,
      borderColor:     c.borderStrong,
      color:           c.textPrimary,
      fontFamily:      typography.fontFamily.regular,
    },
  ]

  // ── Success state ───────────────────────────────────────────────────────────
  if (sent) {
    return (
      <KeyboardAvoidingView style={[styles.root, { backgroundColor: c.bgPrimary }]}>
        <View style={[styles.successWrap, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <CircleCheck size={60} color={c.success} />
          <Text style={[styles.successTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            Emailni tasdiqlang
          </Text>
          <Text style={[styles.successBody, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {email} manziliga tasdiqlash havolasi yuborildi.
          </Text>
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            style={[styles.submitBtn, { backgroundColor: c.brand }]}
          >
            <Text style={[styles.submitBtnText, { fontFamily: typography.fontFamily.semibold }]}>
              Kirish sahifasiga
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: c.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Decorative glow */}
      <View style={styles.glowWrap} pointerEvents="none">
        <View style={[styles.glow, { backgroundColor: c.brand }]} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: c.bgTertiary }]}
          hitSlop={8}
        >
          <ChevronLeft size={18} color={c.textSecondary} />
        </Pressable>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: c.bgSecondary, borderColor: c.borderStrong }]}>

          {/* Header */}
          <View style={styles.logoWrap}>
            <Text style={[styles.logo, { color: c.brand, fontFamily: typography.fontFamily.extrabold }]}>
              SAHIFALAB
            </Text>
            <Text style={[styles.heading, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              Ro'yxatdan o'tish
            </Text>
            <Text style={[styles.tagline, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              SAHIFALAB jamoasiga qo'shiling
            </Text>
          </View>

          {/* Google quick sign-up */}
          {GOOGLE_CLIENT_ID && (
            <>
              <Pressable
                onPress={() => { setError(null); promptGoogle() }}
                disabled={!!loading}
                style={({ pressed }) => [
                  styles.googleBtn,
                  { backgroundColor: c.bgTertiary, borderColor: c.borderStrong, opacity: pressed || !!loading ? 0.75 : 1 },
                ]}
              >
                {loading === 'google' ? (
                  <ActivityIndicator color={c.brand} size="small" />
                ) : (
                  <>
                    <Globe size={20} color="#4285f4" />
                    <Text style={[styles.googleBtnText, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
                      Google bilan davom etish
                    </Text>
                  </>
                )}
              </Pressable>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={[styles.divLine, { backgroundColor: c.border }]} />
                <Text style={[styles.divText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>yoki</Text>
                <View style={[styles.divLine, { backgroundColor: c.border }]} />
              </View>
            </>
          )}

          {/* Error */}
          {error && (
            <View style={[styles.errorBanner, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: c.error }]}>
              <CircleAlert size={14} color={c.error} />
              <Text style={[styles.errorText, { color: c.error, fontFamily: typography.fontFamily.regular }]}>{error}</Text>
            </View>
          )}

          {/* Form fields */}
          <TextInput
            style={[inputStyle, { marginBottom: spacing.sm }]}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Ismingiz"
            placeholderTextColor={c.textMuted}
            autoCapitalize="words"
          />
          <TextInput
            style={[inputStyle, { marginBottom: spacing.sm }]}
            value={email}
            onChangeText={setEmail}
            placeholder="Email manzilingiz"
            placeholderTextColor={c.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Password with strength bar */}
          <View style={{ marginBottom: spacing.sm }}>
            <TextInput
              style={inputStyle}
              value={password}
              onChangeText={setPassword}
              placeholder="Parol"
              placeholderTextColor={c.textMuted}
              secureTextEntry={!showPw}
            />
            <Pressable onPress={() => setShowPw(v => !v)} style={styles.eyeBtn} hitSlop={8}>
              {showPw
                ? <EyeOff size={16} color={c.textMuted} />
                : <Eye    size={16} color={c.textMuted} />
              }
            </Pressable>
            {password.length > 0 && <PasswordStrengthBar password={password} />}
          </View>

          <Pressable
            onPress={handleRegister}
            disabled={!!loading}
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: c.brand, opacity: pressed || !!loading ? 0.8 : 1 },
            ]}
          >
            {loading === 'email' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={[styles.submitBtnText, { fontFamily: typography.fontFamily.semibold }]}>
                Ro'yxatdan o'tish
              </Text>
            )}
          </Pressable>

        </View>

        {/* Login link */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            Akkountingiz bormi?{' '}
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={[styles.footerLink, { color: c.brand, fontFamily: typography.fontFamily.semibold }]}>
                Kirish
              </Text>
            </Pressable>
          </Link>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  glowWrap: {
    position: 'absolute', top: -80, alignSelf: 'center', width: '100%', alignItems: 'center',
  },
  glow: {
    width: 260, height: 260, borderRadius: 130, opacity: 0.07,
  },
  scroll: {
    flexGrow: 1, paddingHorizontal: spacing.base, alignItems: 'center', gap: spacing.base,
  },
  backBtn: {
    alignSelf:      'flex-start',
    width:          36,
    height:         36,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
  },
  card: {
    width:         '100%',
    maxWidth:      400,
    borderRadius:  28,
    borderWidth:   1,
    padding:       spacing.xl,
    gap:           spacing.base,
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius:  24,
    elevation:     12,
  },
  logoWrap:   { alignItems: 'center', gap: 4 },
  logo:       { fontSize: 26, letterSpacing: 1 },
  heading:    { fontSize: typography.size.xl, marginTop: 2 },
  tagline:    { fontSize: 12 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 50, borderRadius: radius.xl, borderWidth: 1, gap: spacing.sm,
  },
  googleBtnText: { fontSize: typography.size.base },
  divider:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  divLine:    { flex: 1, height: 1 },
  divText:    { fontSize: typography.size.sm },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    borderWidth: 1, borderRadius: radius.md, padding: spacing.sm,
  },
  errorText: { fontSize: typography.size.xs, flex: 1 },
  input: {
    height: 50, borderRadius: radius.xl, borderWidth: 1,
    paddingHorizontal: spacing.base, fontSize: typography.size.base,
  },
  eyeBtn: { position: 'absolute', right: spacing.base, top: 16 },
  submitBtn: {
    height: 50, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.xs,
    shadowColor: '#e8792f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35,
    shadowRadius: 8, elevation: 6,
  },
  submitBtnText: { color: '#fff', fontSize: typography.size.base },
  footer:     { flexDirection: 'row', justifyContent: 'center' },
  footerText: { fontSize: typography.size.sm },
  footerLink: { fontSize: typography.size.sm },
  successWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['2xl'], gap: spacing.base,
  },
  successTitle: { fontSize: typography.size.xl },
  successBody:  { fontSize: typography.size.base, textAlign: 'center', lineHeight: 22 },
})

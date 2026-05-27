/**
 * Email authentication screen — two-step flow:
 * Step 1: Enter email address
 * Step 2: Enter password (login) or name + password (register)
 */
import React, { useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ArrowLeft, EnvelopeSimple, LockSimple, User, Eye, EyeSlash } from 'phosphor-react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
  withSequence, withSpring, Easing,
} from 'react-native-reanimated'

import { useAuthStore } from '../../stores/authStore'
import { auth } from '../../lib/api'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing } from '../../lib/constants'

type Step = 'email' | 'password' | 'register'

export default function EmailAuthScreen() {
  const { c }         = useTheme()
  const insets        = useSafeAreaInsets()
  const router        = useRouter()
  const { loginEmail } = useAuthStore()

  const [step,      setStep]      = useState<Step>('email')
  const [email,     setEmail]     = useState('')
  const [name,      setName]      = useState('')
  const [password,  setPassword]  = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const pwRef   = useRef<TextInput>(null)
  const nameRef = useRef<TextInput>(null)

  // Shake animation for error
  const shakeX = useSharedValue(0)
  const shake  = () => {
    shakeX.value = withSequence(
      withTiming(-8,  { duration: 60 }),
      withTiming(8,   { duration: 60 }),
      withTiming(-6,  { duration: 50 }),
      withTiming(6,   { duration: 50 }),
      withTiming(-4,  { duration: 40 }),
      withTiming(0,   { duration: 40 }),
    )
  }
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }))

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  // ── Step 1: email submit ──────────────────────────────────────────────────
  const handleEmailNext = () => {
    setError(null)
    if (!validateEmail(email.trim())) {
      setError('To\'g\'ri email manzil kiriting')
      shake()
      return
    }
    setStep('password')
    setTimeout(() => pwRef.current?.focus(), 200)
  }

  // ── Step 2: password login attempt ───────────────────────────────────────
  const handleLogin = async () => {
    setError(null)
    if (password.length < 4) {
      setError('Parol juda qisqa')
      shake()
      return
    }
    setLoading(true)
    try {
      await loginEmail(email.trim(), password)
      // Auth guard in _layout.tsx handles navigation
    } catch (e: any) {
      const msg: string = e.message ?? ''
      // If user doesn't exist, offer registration
      if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('invalid')) {
        setStep('register')
        setPassword('')
        setError("Bu email topilmadi. Ro'yxatdan o'tmoqchimisiz?")
        setTimeout(() => nameRef.current?.focus(), 200)
      } else {
        setError(msg || 'Kirish muvaffaqiyatsiz. Qayta urinib ko\'ring.')
        shake()
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: register new account ─────────────────────────────────────────
  const handleRegister = async () => {
    setError(null)
    if (name.trim().length < 2) {
      setError('Ismingizni kiriting')
      shake()
      return
    }
    if (password.length < 6) {
      setError('Parol kamida 6 ta belgidan iborat bo\'lishi kerak')
      shake()
      return
    }
    setLoading(true)
    try {
      await auth.emailRegister({ first_name: name.trim(), email: email.trim(), password })
      // Immediately log in with the new credentials
      await loginEmail(email.trim(), password)
    } catch (e: any) {
      setError(e.message || 'Ro\'yxatdan o\'tishda xatolik')
      shake()
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (step === 'password' || step === 'register') {
      setStep('email')
      setPassword('')
      setName('')
      setError(null)
    } else {
      router.back()
    }
  }

  const stepTitle: Record<Step, string> = {
    email:    'Email bilan kirish',
    password: 'Parolni kiriting',
    register: "Ro'yxatdan o'tish",
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bgPrimary }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={[styles.backBtn, { backgroundColor: c.bgSecondary }]}>
            <ArrowLeft size={20} color={c.textPrimary} weight="regular" />
          </Pressable>
          <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            {stepTitle[step]}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Email display on step 2/3 */}
        {step !== 'email' && (
          <View style={[styles.emailPill, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <EnvelopeSimple size={16} color={c.textSecondary} weight="regular" />
            <Text style={[styles.emailPillText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              {email}
            </Text>
          </View>
        )}

        {/* Inputs */}
        <Animated.View style={[styles.form, shakeStyle]}>

          {/* Email input — step 1 only */}
          {step === 'email' && (
            <View style={[styles.inputWrap, { backgroundColor: c.bgInput, borderColor: c.border }]}>
              <EnvelopeSimple size={20} color={c.textDisabled} weight="regular" />
              <TextInput
                value={email}
                onChangeText={t => { setEmail(t); setError(null) }}
                placeholder="Email manzilingiz"
                placeholderTextColor={c.textDisabled}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={handleEmailNext}
                style={[styles.input, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}
              />
            </View>
          )}

          {/* Name input — register only */}
          {step === 'register' && (
            <View style={[styles.inputWrap, { backgroundColor: c.bgInput, borderColor: c.border }]}>
              <User size={20} color={c.textDisabled} weight="regular" />
              <TextInput
                ref={nameRef}
                value={name}
                onChangeText={t => { setName(t); setError(null) }}
                placeholder="Ismingiz"
                placeholderTextColor={c.textDisabled}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => pwRef.current?.focus()}
                style={[styles.input, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}
              />
            </View>
          )}

          {/* Password input — steps 2 and 3 */}
          {(step === 'password' || step === 'register') && (
            <View style={[styles.inputWrap, { backgroundColor: c.bgInput, borderColor: c.border }]}>
              <LockSimple size={20} color={c.textDisabled} weight="regular" />
              <TextInput
                ref={pwRef}
                value={password}
                onChangeText={t => { setPassword(t); setError(null) }}
                placeholder={step === 'register' ? 'Parol yarating (6+ belgi)' : 'Parolingiz'}
                placeholderTextColor={c.textDisabled}
                secureTextEntry={!showPw}
                returnKeyType="done"
                onSubmitEditing={step === 'password' ? handleLogin : handleRegister}
                style={[styles.input, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}
              />
              <Pressable onPress={() => setShowPw(v => !v)} hitSlop={10}>
                {showPw
                  ? <EyeSlash size={20} color={c.textDisabled} weight="regular" />
                  : <Eye size={20} color={c.textDisabled} weight="regular" />
                }
              </Pressable>
            </View>
          )}

          {/* Error */}
          {error && (
            <Text style={[styles.error, { color: c.error, fontFamily: typography.fontFamily.regular }]}>
              {error}
            </Text>
          )}
        </Animated.View>

        {/* CTA button */}
        <Pressable
          onPress={
            step === 'email'    ? handleEmailNext :
            step === 'password' ? handleLogin     : handleRegister
          }
          disabled={loading}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: c.accentPrimary, opacity: pressed || loading ? 0.85 : 1 },
          ]}
        >
          {loading
            ? <ActivityIndicator color={c.textInverse} size="small" />
            : <Text style={[styles.ctaLabel, { color: c.textInverse, fontFamily: typography.fontFamily.semibold }]}>
                {step === 'email' ? 'Davom etish' : step === 'password' ? 'Kirish' : "Ro'yxatdan o'tish"}
              </Text>
          }
        </Pressable>

        {/* Forgot password hint */}
        {step === 'password' && (
          <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgot}>
            <Text style={[styles.forgotText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              Parolni unutdingizmi?
            </Text>
          </Pressable>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg },

  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
    marginBottom:    spacing.xl,
  },
  backBtn: {
    width:        40,
    height:       40,
    borderRadius: 20,
    alignItems:   'center',
    justifyContent: 'center',
  },
  title: { fontSize: typography.size.lg, flex: 1, textAlign: 'center' },

  emailPill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
    alignSelf:         'center',
    paddingVertical:   8,
    paddingHorizontal: 16,
    borderRadius:      20,
    borderWidth:       1,
    marginBottom:      spacing.base,
  },
  emailPillText: { fontSize: typography.size.sm },

  form:     { gap: 12, marginBottom: spacing.base },

  inputWrap: {
    flexDirection:  'row',
    alignItems:     'center',
    height:         56,
    borderRadius:   12,
    borderWidth:    1,
    paddingHorizontal: 16,
    gap:            10,
  },
  input: {
    flex:     1,
    fontSize: typography.size.base,
    height:   '100%',
  },

  error: { fontSize: typography.size.sm, textAlign: 'center' },

  cta: {
    height:         56,
    borderRadius:   14,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   spacing.base,
  },
  ctaLabel: { fontSize: typography.size.lg },

  forgot: { alignItems: 'center', paddingVertical: spacing.sm },
  forgotText: { fontSize: typography.size.sm },
})

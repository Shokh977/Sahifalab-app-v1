/**
 * Welcome screen — first screen shown to unauthenticated users.
 * Two auth paths: Telegram bot-code flow and Email+Password.
 */
import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Linking,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  BookOpen, Flame, PaperPlaneTilt, EnvelopeSimple, X,
} from 'phosphor-react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withDelay, withTiming,
} from 'react-native-reanimated'

import { useAuthStore } from '../../stores/authStore'
import { useTheme } from '../../hooks/useTheme'
import { auth as authApi } from '../../lib/api'
import { typography, spacing } from '../../lib/constants'

export default function WelcomeScreen() {
  const { c }             = useTheme()
  const insets            = useSafeAreaInsets()
  const router            = useRouter()
  const { loginWithToken } = useAuthStore()

  const [phase, setPhase] = useState<'idle' | 'loading' | 'waiting' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [botLink, setBotLink]   = useState<string | null>(null)

  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const codeRef  = useRef<string | null>(null)

  // ── Entrance animations ────────────────────────────────────────────────────
  const logoOpacity  = useSharedValue(0)
  const logoY        = useSharedValue(30)
  const textOpacity  = useSharedValue(0)
  const textY        = useSharedValue(20)
  const btnsOpacity  = useSharedValue(0)
  const btnsY        = useSharedValue(20)

  useEffect(() => {
    logoOpacity.value  = withDelay(100, withTiming(1, { duration: 500 }))
    logoY.value        = withDelay(100, withSpring(0, { damping: 14, stiffness: 100 }))
    textOpacity.value  = withDelay(300, withTiming(1, { duration: 400 }))
    textY.value        = withDelay(300, withSpring(0, { damping: 14, stiffness: 100 }))
    btnsOpacity.value  = withDelay(500, withTiming(1, { duration: 400 }))
    btnsY.value        = withDelay(500, withSpring(0, { damping: 14, stiffness: 100 }))
  }, [])

  const logoStyle  = useAnimatedStyle(() => ({ opacity: logoOpacity.value, transform: [{ translateY: logoY.value }] }))
  const textStyle  = useAnimatedStyle(() => ({ opacity: textOpacity.value, transform: [{ translateY: textY.value }] }))
  const btnsStyle  = useAnimatedStyle(() => ({ opacity: btnsOpacity.value, transform: [{ translateY: btnsY.value }] }))

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => () => stopPolling(), [])

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  // ── Telegram bot-code flow ─────────────────────────────────────────────────
  const handleTelegram = async () => {
    setPhase('loading')
    setErrorMsg(null)

    try {
      const res = await authApi.requestCode()
      codeRef.current = res.code
      setBotLink(res.bot_link)
      setPhase('waiting')

      // Open Telegram bot directly
      Linking.openURL(res.bot_link).catch(() => {})

      // Poll every 2 seconds until the bot claims the code
      pollRef.current = setInterval(async () => {
        try {
          const data = await authApi.verifyCode(codeRef.current!)
          if ('access_token' in data) {
            stopPolling()
            await loginWithToken((data as any).access_token)
            // auth guard in _layout.tsx navigates to tabs automatically
          }
        } catch (e: any) {
          if (e.message?.includes('expired') || e.message?.includes('410')) {
            stopPolling()
            setPhase('error')
            setErrorMsg("Kod muddati tugadi. Qaytadan urinib ko'ring.")
          }
          // 202 "pending" is expected — keep polling
        }
      }, 2000)
    } catch (e: any) {
      setPhase('error')
      setErrorMsg(e.message ?? 'Xatolik yuz berdi')
    }
  }

  const handleCancel = () => {
    stopPolling()
    setPhase('idle')
    setErrorMsg(null)
    setBotLink(null)
  }

  const tgLoading = phase === 'loading'
  const tgWaiting = phase === 'waiting'

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>

      {/* ── Centered content ─────────────────────────────────────────────── */}
      <View style={styles.center}>
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <View style={[styles.logoCircle, { backgroundColor: c.accentPrimaryMuted, borderColor: c.accentPrimaryGlow }]}>
            <BookOpen size={52} color={c.accentPrimary} weight="fill" />
            <View style={[styles.flameBadge, { backgroundColor: c.bgSecondary }]}>
              <Flame size={22} color={c.accentPrimary} weight="fill" />
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.textWrap, textStyle]}>
          <Text style={[styles.tagline, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            Kitob bilan o's. Har kuni.
          </Text>
          <Text style={[styles.subtitle, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Kurslar, testlar, sertifikatlar — barchasi bir joyda
          </Text>
        </Animated.View>
      </View>

      {/* ── Fixed bottom buttons ──────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.buttons,
          btnsStyle,
          { paddingBottom: insets.bottom + spacing.lg },
        ]}
      >
        {/* Error message */}
        {phase === 'error' && errorMsg && (
          <Text style={[styles.errorText, { color: c.error, fontFamily: typography.fontFamily.regular }]}>
            {errorMsg}
          </Text>
        )}

        {/* Waiting state info */}
        {tgWaiting && (
          <View style={[styles.waitingCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <Text style={[styles.waitingTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
              Telegram botda tasdiqlang
            </Text>
            <Text style={[styles.waitingHint, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              Bot ochildimi? Unda "Start" tugmasini bosing — kirish avtomatik bo'ladi.
            </Text>
            <Pressable
              onPress={() => botLink && Linking.openURL(botLink).catch(() => {})}
              style={[styles.openBotBtn, { borderColor: c.accentPrimary }]}
            >
              <PaperPlaneTilt size={16} color={c.accentPrimary} weight="fill" />
              <Text style={[styles.openBotLabel, { color: c.accentPrimary, fontFamily: typography.fontFamily.medium }]}>
                Botni qaytadan ochish
              </Text>
            </Pressable>
          </View>
        )}

        {/* Telegram button */}
        <Pressable
          onPress={tgWaiting ? undefined : handleTelegram}
          disabled={tgLoading || tgWaiting}
          style={({ pressed }) => [
            styles.btnPrimary,
            { backgroundColor: c.accentPrimary, opacity: pressed || tgLoading ? 0.85 : 1 },
          ]}
        >
          {tgLoading ? (
            <ActivityIndicator color={c.textInverse} size="small" />
          ) : tgWaiting ? (
            <>
              <ActivityIndicator color={c.textInverse} size="small" />
              <Text style={[styles.btnPrimaryLabel, { color: c.textInverse, fontFamily: typography.fontFamily.semibold }]}>
                Kutilmoqda...
              </Text>
            </>
          ) : (
            <>
              <PaperPlaneTilt size={20} color={c.textInverse} weight="fill" />
              <Text style={[styles.btnPrimaryLabel, { color: c.textInverse, fontFamily: typography.fontFamily.semibold }]}>
                Telegram orqali kirish
              </Text>
            </>
          )}
        </Pressable>

        {/* Cancel polling */}
        {tgWaiting && (
          <Pressable onPress={handleCancel} style={styles.cancelRow}>
            <X size={14} color={c.textDisabled} />
            <Text style={[styles.cancelLabel, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
              Bekor qilish
            </Text>
          </Pressable>
        )}

        {/* Email button */}
        {!tgWaiting && (
          <Pressable
            onPress={() => router.push('/(auth)/email-auth' as any)}
            disabled={tgLoading}
            style={({ pressed }) => [
              styles.btnSecondary,
              { borderColor: c.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <EnvelopeSimple size={20} color={c.textPrimary} weight="regular" />
            <Text style={[styles.btnSecondaryLabel, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
              Email bilan kirish
            </Text>
          </Pressable>
        )}

        {/* Register link */}
        {!tgWaiting && (
          <View style={styles.registerRow}>
            <Text style={[styles.registerHint, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              Hisobingiz yo'qmi?{' '}
            </Text>
            <Pressable onPress={() => router.push('/(auth)/signup' as any)} hitSlop={8}>
              <Text style={[styles.registerLink, { color: c.accentPrimary, fontFamily: typography.fontFamily.semibold }]}>
                Ro'yxatdan o'ting
              </Text>
            </Pressable>
          </View>
        )}
      </Animated.View>

    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  center: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  logoWrap: { marginBottom: 32, alignItems: 'center' },
  logoCircle: {
    width:        120,
    height:       120,
    borderRadius: 60,
    borderWidth:  1,
    alignItems:   'center',
    justifyContent: 'center',
  },
  flameBadge: {
    position:     'absolute',
    bottom:       4,
    right:        4,
    width:        34,
    height:       34,
    borderRadius: 17,
    alignItems:   'center',
    justifyContent: 'center',
  },

  textWrap: { alignItems: 'center', gap: 12 },
  tagline: {
    fontSize:    24,
    lineHeight:  30,
    textAlign:   'center',
  },
  subtitle: {
    fontSize:  15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth:  300,
  },

  buttons: {
    paddingHorizontal: spacing.lg,
    gap:               12,
  },

  errorText: {
    fontSize:  13,
    textAlign: 'center',
    marginBottom: 4,
  },

  waitingCard: {
    borderRadius: 14,
    borderWidth:  1,
    padding:      spacing.base,
    gap:          8,
  },
  waitingTitle: { fontSize: 14 },
  waitingHint:  { fontSize: 13, lineHeight: 18 },
  openBotBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            6,
    marginTop:      4,
    paddingVertical: 8,
    borderRadius:   8,
    borderWidth:    1,
  },
  openBotLabel: { fontSize: 13 },

  btnPrimary: {
    height:         56,
    borderRadius:   14,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
  },
  btnPrimaryLabel: { fontSize: 17 },

  btnSecondary: {
    height:         52,
    borderRadius:   12,
    borderWidth:    1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
  },
  btnSecondaryLabel: { fontSize: 15 },

  cancelRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            4,
    marginTop:      -4,
  },
  cancelLabel: { fontSize: 13 },

  registerRow: {
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
    paddingTop:     4,
  },
  registerHint: { fontSize: 14 },
  registerLink: { fontSize: 14 },
})

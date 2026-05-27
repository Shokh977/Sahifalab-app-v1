/**
 * Onboarding Step 3: Enable Notifications
 * Requests OS push permission, saves FCM token, then completes onboarding.
 */
import React, { useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, Pressable, BackHandler, Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

import { onboarding as onboardingApi } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import { StreakFlame } from '../../components/ui/StreakFlame'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, EXPO_PROJECT_ID } from '../../lib/constants'

let Notifications: typeof import('expo-notifications') | null = null
try { Notifications = require('expo-notifications') } catch {}

export default function NotificationsScreen() {
  const { c }              = useTheme()
  const insets             = useSafeAreaInsets()
  const router             = useRouter()
  const { completeOnboarding } = useAuthStore()

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => sub.remove()
  }, [])

  const finish = async () => {
    await completeOnboarding()
    // Auth guard in _layout.tsx will detect needsOnboarding=false → navigate to /(tabs)
  }

  const handleAllow = async () => {
    try {
      if (Notifications) {
        const { status } = await Notifications.requestPermissionsAsync()
        if (status === 'granted') {
          try {
            // Get the device push token (FCM on Android, APNs on iOS)
            const tokenObj = Platform.OS === 'android' || Platform.OS === 'ios'
              ? await Notifications.getExpoPushTokenAsync({
                  projectId: EXPO_PROJECT_ID || undefined,
                })
              : null
            if (tokenObj?.data) {
              await onboardingApi.savePushToken(tokenObj.data)
            }
          } catch {
            // Non-fatal — proceed even if token registration fails
          }
        }
      }
    } catch {}
    await finish()
  }

  const handleSkip = async () => {
    await finish()
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      {/* Centered content */}
      <View style={styles.center}>
        <StreakFlame streakDays={7} size={150} />

        <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Streak'ingizni yo'qotmang!
        </Text>
        <Text style={[styles.subtitle, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          Har kuni eslatma oling va o'qish odatini shakllantiring
        </Text>
      </View>

      {/* Bottom buttons */}
      <View style={[styles.buttons, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable
          onPress={handleAllow}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: c.accentPrimary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.ctaLabel, { color: c.textInverse, fontFamily: typography.fontFamily.semibold }]}>
            Ruxsat berish
          </Text>
        </Pressable>

        <Pressable onPress={handleSkip} style={styles.skip}>
          <Text style={[styles.skipLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Keyinroq
          </Text>
        </Pressable>
      </View>
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
    gap:            24,
  },
  title: {
    fontSize:  20,
    lineHeight: 26,
    textAlign: 'center',
  },
  subtitle: {
    fontSize:  typography.size.base,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth:  280,
  },

  buttons: {
    paddingHorizontal: spacing.lg,
    gap:               16,
  },
  cta: {
    height:         56,
    borderRadius:   14,
    alignItems:     'center',
    justifyContent: 'center',
  },
  ctaLabel: { fontSize: typography.size.lg },
  skip:     { alignItems: 'center', paddingVertical: spacing.sm },
  skipLabel: { fontSize: typography.size.sm },
})

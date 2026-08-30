/**
 * Route for Qo'llab-quvvatlash (donation, 095). Defensively re-checks the
 * donation_screen_enabled remote flag itself (not just at the menu-entry
 * level in settings.tsx) — a direct deep link must not reach the screen
 * while the flag is off, since the whole point of the gate is "no flag, no
 * screen," not just "no menu entry."
 */
import React, { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { config } from '../../lib/api'
import DonationScreen from '../../components/donation/DonationScreen'

export default function QollabQuvvatlashRoute() {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    config.flags().then(({ donationScreenEnabled }) => {
      if (cancelled) return
      if (!donationScreenEnabled) {
        router.replace('/(tabs)' as any)
      } else {
        setAllowed(true)
      }
    })
    return () => { cancelled = true }
  }, [router])

  if (!allowed) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF7F2' }}>
        <ActivityIndicator color="#E8722D" />
      </View>
    )
  }

  return <DonationScreen />
}

import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, AccessibilityInfo } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated'
import { Copy, Check } from 'phosphor-react-native'
import { typography } from '../../lib/constants'
import type { PaymentMethod } from '../../lib/api'
import { formatAccountNumber, numberDisplayMode, copyLabelFor } from './formatAccountNumber'
import { donationColors as dc } from './donationTheme'

const COPIED_DURATION_MS = 2500

export default function CopyRow({
  method, swiping = false, onCopied,
}: {
  method: PaymentMethod
  /** True while the deck is mid-gesture — copied state is cancelled
   * immediately and the row dims, so the wrong number can never be
   * copied mid-swipe. */
  swiping?: boolean
  onCopied?: () => void
}) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapped = numberDisplayMode(method.accountNumber) === 'wrapped'

  const pop = useSharedValue(1)
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }))

  useEffect(() => {
    if (swiping && copied) {
      setCopied(false)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [swiping, copied])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  async function handleCopy() {
    const raw = (method.accountNumber || '').replace(/\s+/g, '')
    await Clipboard.setStringAsync(raw)
    setCopied(true)
    onCopied?.()
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    pop.value = withSequence(
      withTiming(0.97, { duration: 80 }),
      withTiming(1.015, { duration: 140 }),
      withTiming(1, { duration: 100 }),
    )
    AccessibilityInfo.announceForAccessibility(
      `Nusxa olindi: ${formatAccountNumber(raw, method.numberType)}`,
    )
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), COPIED_DURATION_MS)
  }

  return (
    <View style={{ opacity: swiping ? 0.5 : 1 }}>
      <Animated.View style={popStyle}>
        <Pressable
          onPress={handleCopy}
          disabled={swiping}
          accessibilityRole="button"
          accessibilityLabel={`${copied ? 'Nusxa olindi' : 'Karta raqamidan nusxa oling'}, ${formatAccountNumber(method.accountNumber, method.numberType)}`}
          style={[s.row, copied ? s.rowCopied : s.rowIdle]}
        >
          <View style={s.textCol}>
            <Text style={[s.label, { color: copied ? dc.successOnNavy : dc.accentLabel }]} allowFontScaling={false}>
              {copied ? 'NUSXA OLINDI ✓' : copyLabelFor(method.numberType)}
            </Text>
            <Text
              style={[wrapped ? s.numberWrapped : s.numberSingle, { color: copied ? '#fff' : dc.navy }]}
              numberOfLines={wrapped ? 2 : 1}
            >
              {formatAccountNumber(method.accountNumber, method.numberType)}
            </Text>
          </View>
          <View style={[s.button, { backgroundColor: copied ? dc.success : dc.accent }]}>
            {copied ? <Check size={22} color="#fff" weight="bold" /> : <Copy size={22} color="#fff" weight="bold" />}
          </View>
        </Pressable>
      </Animated.View>

      <Text style={s.hint}>
        {copied
          ? "Raqam vaqtinchalik xotiraga olindi — bank ilovasini ochib qo'yishingiz mumkin."
          : 'Bank ilovasida "O\'tkazma" bo\'limiga qo\'ying'}
      </Text>

      {method.swift && (
        <View style={s.swiftChip}>
          <Text style={s.swiftLabel}>SWIFT/BIC:</Text>
          <Text style={s.swiftValue}>{method.swift}</Text>
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 22, paddingVertical: 15, paddingHorizontal: 16,
    minHeight: 56, borderWidth: 1.5,
  },
  rowIdle: {
    backgroundColor: '#fff', borderColor: 'rgba(232,114,45,.35)',
    shadowColor: '#2B3B4D', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 18, elevation: 2,
  },
  rowCopied: {
    backgroundColor: dc.navy, borderColor: dc.navy,
    shadowColor: dc.navy, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.26, shadowRadius: 22, elevation: 4,
  },
  textCol: { flex: 1, minWidth: 0 },
  label: { fontSize: 9.5, fontFamily: typography.fontFamily.bold, letterSpacing: 0.14 * 9.5, marginBottom: 3 },
  numberSingle: { fontSize: 17.5, fontFamily: typography.fontFamily.mono, fontWeight: '700', letterSpacing: 0.08 * 17.5, fontVariant: ['tabular-nums'] },
  numberWrapped: { fontSize: 15, lineHeight: 15 * 1.45, fontFamily: typography.fontFamily.mono, fontWeight: '700', letterSpacing: 0.08 * 15, fontVariant: ['tabular-nums'] },
  button: {
    width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    shadowColor: dc.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.34, shadowRadius: 16, elevation: 3,
  },
  hint: { marginTop: 8, textAlign: 'center', fontSize: 11.5, fontFamily: typography.fontFamily.semibold, color: dc.textMuted },
  swiftChip: { marginTop: 6, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  swiftLabel: { fontSize: 11, fontFamily: typography.fontFamily.semibold, color: dc.textMuted },
  swiftValue: { fontSize: 11, fontFamily: typography.fontFamily.mono, color: dc.textMuted },
})

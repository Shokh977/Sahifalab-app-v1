import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Defs, Pattern, Line, Rect } from 'react-native-svg'
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedReaction, withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import { typography } from '../../lib/constants'
import type { PaymentMethod } from '../../lib/api'
import { cardThemeFor, GRADIENT_ANGLE, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS } from './donationTheme'
import { formatAccountNumber, numberDisplayMode, fieldLabelFor } from './formatAccountNumber'

/**
 * PaymentCard — fixed 296x187 box in EVERY state (idle, peeking, preview,
 * empty-state silhouette). Never `width: '100%'` with a fixed height —
 * that decouples the ratio from the frame. Peek/dim states scale+dim this
 * SAME box via the `dimmed` prop; they never render a smaller authored box.
 */
export default function PaymentCard({
  method, dimmed = false, sheenTrigger,
}: {
  method: PaymentMethod; dimmed?: boolean
  /** Bumped (any changing number) by the copy row on a successful copy —
   * plays a one-shot 70pt white wedge sweep across THIS card, once, per
   * the spec. Only meaningful on the currently-active card. */
  sheenTrigger?: SharedValue<number>
}) {
  const theme = cardThemeFor(method.region)
  const wrapped = numberDisplayMode(method.accountNumber) === 'wrapped'
  const label = fieldLabelFor(method.numberType)

  const sheenX = useSharedValue(-140)
  useAnimatedReaction(
    () => sheenTrigger?.value,
    (curr, prev) => {
      if (curr !== undefined && prev !== undefined && curr !== prev) {
        sheenX.value = -140
        sheenX.value = withTiming(CARD_WIDTH + 140, { duration: 1100 })
      }
    },
  )
  const sheenStyle = useAnimatedStyle(() => ({ transform: [{ translateX: sheenX.value }] }))

  return (
    <View
      style={[
        s.card,
        { opacity: dimmed ? 0.5 : 1, transform: [{ scale: dimmed ? 0.94 : 1 }] },
      ]}
      accessible
      accessibilityLabel={`${method.bankName}, ${method.currency}, karta egasi ${method.holderName}`}
    >
      <LinearGradient
        colors={theme.gradientColors}
        locations={theme.gradientLocations}
        start={GRADIENT_ANGLE.start}
        end={GRADIENT_ANGLE.end}
        style={StyleSheet.absoluteFill}
      />

      {/* Watermark */}
      <Text style={s.watermark} allowFontScaling={false}>S</Text>

      {/* Fine texture — repeating hairlines via SVG pattern, not a gradient hack */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <Pattern id="hairlines" patternUnits="userSpaceOnUse" width={13} height={13} patternTransform="rotate(120)">
            <Rect width={13} height={13} fill="transparent" />
            <Line x1={0} y1={0} x2={0} y2={13} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#hairlines)" />
      </Svg>

      {/* Gloss */}
      <LinearGradient
        colors={['rgba(255,255,255,.24)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.gloss}
      />

      {/* One-shot copy sheen — driven externally by sheenTrigger */}
      {sheenTrigger != null && (
        <Animated.View style={[s.sheen, sheenStyle]} pointerEvents="none">
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,.35)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      {/* Content */}
      <View style={s.content}>
        <View style={s.topRow}>
          <View style={s.bankBlock}>
            <Text style={s.microLabel} allowFontScaling={false}>BANK</Text>
            <Text style={s.bankName} numberOfLines={1} maxFontSizeMultiplier={1.15}>{method.bankName}</Text>
          </View>
          <View style={s.currencyBadge}>
            <Text style={s.currencyText} allowFontScaling={false}>{method.currency}</Text>
          </View>
        </View>

        <View style={{ marginTop: wrapped ? 15 : 26 }}>
          <Text style={s.microLabel} allowFontScaling={false}>{label}</Text>
          <Text
            style={wrapped ? s.numberWrapped : s.numberSingle}
            numberOfLines={wrapped ? 2 : 1}
            maxFontSizeMultiplier={1.15}
          >
            {formatAccountNumber(method.accountNumber, method.numberType)}
          </Text>
        </View>

        <View style={[s.bottomRow, { marginTop: wrapped ? 11 : 0 }]}>
          <View style={s.holderBlock}>
            <Text style={s.microLabel} allowFontScaling={false}>KARTA EGASI</Text>
            <Text style={s.holderName} numberOfLines={1} maxFontSizeMultiplier={1.15}>{method.holderName}</Text>
          </View>
          <View style={s.sBadge}>
            <Text style={s.sBadgeText} allowFontScaling={false}>S</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    width: CARD_WIDTH, height: CARD_HEIGHT,
    borderRadius: CARD_RADIUS, overflow: 'hidden',
  },
  watermark: {
    position: 'absolute', right: -38, bottom: -64,
    fontSize: 210, lineHeight: 210, letterSpacing: -0.06 * 210,
    color: 'rgba(255,255,255,.11)', fontFamily: typography.fontFamily.extrabold,
  },
  gloss: {
    position: 'absolute', top: -40, left: -40, width: 220, height: 140,
    transform: [{ rotate: '22deg' }],
  },
  sheen: {
    position: 'absolute', top: 0, bottom: 0, width: 70,
  },
  content: {
    flex: 1, paddingVertical: 19, paddingHorizontal: 20, justifyContent: 'space-between',
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  bankBlock: { flex: 1, minWidth: 0 },
  microLabel: {
    fontSize: 8.5, fontFamily: typography.fontFamily.bold, letterSpacing: 0.18 * 8.5,
    color: 'rgba(255,255,255,.62)', marginBottom: 3, textTransform: 'uppercase',
  },
  bankName: { fontSize: 14.5, fontFamily: typography.fontFamily.bold, color: '#fff' },
  currencyBadge: {
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,.28)',
  },
  currencyText: { fontSize: 10, fontFamily: typography.fontFamily.mono, fontWeight: '700', color: '#fff' },
  numberSingle: {
    fontSize: 17, fontFamily: typography.fontFamily.mono, fontWeight: '700',
    letterSpacing: 0.09 * 17, color: '#fff', fontVariant: ['tabular-nums'],
  },
  numberWrapped: {
    fontSize: 14, lineHeight: 14 * 1.42, fontFamily: typography.fontFamily.mono, fontWeight: '700',
    letterSpacing: 0.09 * 14, color: '#fff', maxWidth: 236, fontVariant: ['tabular-nums'],
  },
  bottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  holderBlock: { flex: 1, minWidth: 0 },
  holderName: {
    fontSize: 13, fontFamily: typography.fontFamily.bold, letterSpacing: 0.03 * 13,
    color: '#fff', textTransform: 'uppercase',
  },
  sBadge: {
    width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,.3)',
  },
  sBadgeText: { color: '#fff', fontFamily: typography.fontFamily.extrabold, fontSize: 14 },
})

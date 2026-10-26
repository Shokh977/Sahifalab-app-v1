/**
 * A Sahifalab Pro section of the weekly review, locked for a free user: the
 * section title stays readable, the content underneath is a blurred
 * stand-in (drawn once with Skia — no real numbers reach the free client),
 * and "Pro bilan oching" opens the upgrade sheet.
 */
import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { BlurMask, Canvas, Group, RoundedRect } from '@shopify/react-native-skia'
import { Lock } from 'lucide-react-native'
import { typography, spacing, radius } from '../../lib/constants'

const GRID_TINTS = ['#F59E0B', '#FF4500', '#4DA6FF', '#A855F7', '#22C55E', '#F5A623']
const TEXT_LINES = [0.92, 0.78, 0.86, 0.55]

function BlurredGrid({ width, c }: { width: number; c: any }) {
  const gap = 10
  const cellW = (width - gap) / 2
  const cellH = 78
  return (
    <Canvas style={{ width, height: cellH * 3 + gap * 2 }}>
      <Group>
        <BlurMask blur={7} style="normal" />
        {GRID_TINTS.map((tint, i) => {
          const x = (i % 2) * (cellW + gap)
          const y = Math.floor(i / 2) * (cellH + gap)
          return (
            <Group key={tint + i}>
              <RoundedRect x={x} y={y} width={cellW} height={cellH} r={14} color={c.bgTertiary} />
              <RoundedRect x={x + 12} y={y + 12} width={26} height={26} r={8} color={tint + '55'} />
              <RoundedRect x={x + 12} y={y + 46} width={cellW * 0.5} height={12} r={6} color={c.textMuted + '66'} />
            </Group>
          )
        })}
      </Group>
    </Canvas>
  )
}

function BlurredText({ width, c }: { width: number; c: any }) {
  return (
    <Canvas style={{ width, height: TEXT_LINES.length * 20 }}>
      <Group>
        <BlurMask blur={5} style="normal" />
        {TEXT_LINES.map((w, i) => (
          <RoundedRect key={i} x={0} y={i * 20 + 4} width={width * w} height={11} r={5.5} color={c.textMuted + '77'} />
        ))}
      </Group>
    </Canvas>
  )
}

export function ProLocked({ title, subtitle, kind, c, onUnlock }: {
  title: string
  subtitle: string
  kind: 'grid' | 'text'
  c: any
  onUnlock: () => void
}) {
  const [width, setWidth] = useState(0)
  return (
    <View style={[s.root, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
      <View style={s.head}>
        <Text style={[s.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>{title}</Text>
        <View style={s.proPill}><Text style={[s.proText, { fontFamily: typography.fontFamily.extrabold }]}>PRO</Text></View>
      </View>
      <View onLayout={e => setWidth(e.nativeEvent.layout.width)} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {width > 0 && (kind === 'grid' ? <BlurredGrid width={width} c={c} /> : <BlurredText width={width} c={c} />)}
      </View>
      <View style={s.overlay} pointerEvents="box-none">
        <Pressable
          onPress={onUnlock}
          accessibilityRole="button"
          accessibilityLabel={`${title}: Pro bilan oching`}
          style={[s.cta, { backgroundColor: c.bgPrimary + 'EE', borderColor: c.border }]}
        >
          <Lock size={15} color={c.accentPrimary} />
          <View>
            <Text style={[s.ctaTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>Pro bilan oching</Text>
            <Text style={[s.ctaSub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>{subtitle}</Text>
          </View>
        </Pressable>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  root: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.sm, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 15 },
  proPill: { backgroundColor: '#E4BE68', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
  proText: { color: '#3A2A00', fontSize: 10, letterSpacing: 0.8 },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 40, alignItems: 'center', justifyContent: 'center' },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.full, borderWidth: 1,
    paddingVertical: 10, paddingHorizontal: 16, minHeight: 44,
  },
  ctaTitle: { fontSize: 14 },
  ctaSub: { fontSize: 12 },
})

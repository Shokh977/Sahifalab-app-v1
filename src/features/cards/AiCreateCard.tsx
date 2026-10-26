/**
 * "AI bilan karta yaratish · Matn yoki rasmdan · bugun 3 ta bepul".
 * The PRO footer ("Pro bilan cheksiz") shows only when Pro is enabled; until
 * then, running out of the free quota keeps today's behaviour (handled on
 * the AI screen).
 */
import React, { useCallback, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Sparkles } from 'lucide-react-native'
import { ai, type AiLimits } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { avatarSize, iconSize, iconStroke, radius, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Badge, Card, Pressable } from '../../components/ui'
import { PRO_UPGRADE_ENABLED } from '../pro/flags'

export function AiCreateCard({ onOpen, onPro }: { onOpen: () => void; onPro: () => void }) {
  const { colors } = useTheme()
  const [limits, setLimits] = useState<AiLimits | null>(null)

  useFocusEffect(useCallback(() => {
    let alive = true
    ai.limits().then(l => { if (alive) setLimits(l) }).catch(() => {})
    return () => { alive = false }
  }, []))

  const free = limits?.free_remaining_today
  const sub = free == null ? 'Matn yoki rasmdan'
    : limits?.is_pro ? `Matn yoki rasmdan · Pro · bugun ${free} ta`
    : `Matn yoki rasmdan · bugun ${free} ta bepul`

  return (
    <Card variant="pressable" onPress={onOpen} accessibilityLabel={`AI bilan karta yaratish. ${sub}`}>
      <View style={styles.row}>
        <View style={[styles.tile, { backgroundColor: colors.accentSoft }]}>
          <Sparkles size={iconSize.md} color={colors.accentText} strokeWidth={iconStroke} />
        </View>
        <View style={styles.flex}>
          <Text numberOfLines={2} style={[typeScale.headline, { color: colors.text }]}>AI bilan karta yaratish</Text>
          <Text style={[typeScale.callout, { color: colors.textMuted }]}>{sub}</Text>
        </View>
      </View>
      {PRO_UPGRADE_ENABLED && !limits?.is_pro && (
        <Pressable noFeedback onPress={onPro} accessibilityLabel="Pro bilan cheksiz" style={[styles.footer, { borderTopColor: colors.border }]}>
          <Badge kind="pro" />
          <Text style={[typeScale.callout, { color: colors.accentText }]}>Pro bilan cheksiz</Text>
        </Pressable>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  tile: { width: avatarSize.md + space.xs, height: avatarSize.md + space.xs, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space.xs, borderTopWidth: StyleSheet.hairlineWidth, marginTop: space.md, paddingTop: space.sm },
})

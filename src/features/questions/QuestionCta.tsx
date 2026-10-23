/**
 * "Siz ham savol yuboring →" on the 5 Savol results — right after someone
 * enjoyed five questions, the one moment they might think "I know a good
 * one". Louder (the deep orange fill) on a strong round or when one of
 * today's questions came from another user (seeing a name credited is the
 * strongest prompt); a plain row otherwise. Reads the reward and the on/off
 * switch from the server; hidden while the feature is off.
 */
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronRight, Lightbulb } from 'lucide-react-native'
import { questions as questionsApi } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { iconSize, iconStroke, radius, space } from '../../design/spacing'
import { onAccentTile } from '../../design/tokens'
import { type as typeScale } from '../../design/typography'
import { AccentFill, Card, Pressable } from '../../components/ui'
import { CTA, DEFAULT_REWARD } from './questionForm'

const TILE = 40

export function QuestionCta({ prominent, contributors }: { prominent: boolean; contributors?: readonly string[] }) {
  const { colors, accentShadow } = useTheme()
  const router = useRouter()
  const [reward, setReward] = useState(DEFAULT_REWARD)
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    let cancelled = false
    questionsApi.limits()
      .then(l => { if (!cancelled) { setReward(l.reward_tanga); setEnabled(l.enabled) } })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!enabled) return null
  const open = () => router.push('/(screens)/submit-question' as any)
  const credited = contributors && contributors.length > 0 ? CTA.credited(contributors[0]) : null

  if (prominent) {
    return (
      <View style={styles.wrap}>
        {credited && <Text style={[typeScale.callout, styles.center, { color: colors.textMuted }]}>{credited}</Text>}
        <Pressable onPress={open} accessibilityLabel={`${CTA.title}. ${CTA.body(reward)}`} style={[styles.hero, accentShadow]}>
          <AccentFill radius={radius.xl} deep />
          <View style={[styles.tile, { backgroundColor: onAccentTile }]}>
            <Lightbulb size={iconSize.sm} color={colors.onAccent} strokeWidth={iconStroke} />
          </View>
          <View style={styles.flex}>
            <Text style={[typeScale.tileTitle, { color: colors.onAccent }]}>{CTA.title} →</Text>
            <Text style={[typeScale.callout, { color: colors.onAccent }]}>{CTA.body(reward)}</Text>
          </View>
        </Pressable>
      </View>
    )
  }
  return (
    <Card variant="pressable" onPress={open} accessibilityLabel={`${CTA.title}. ${CTA.body(reward)}`} style={styles.row}>
      <View style={[styles.tile, { backgroundColor: colors.accentSoft }]}>
        <Lightbulb size={iconSize.sm} color={colors.accentText} strokeWidth={iconStroke} />
      </View>
      <View style={styles.flex}>
        <Text style={[typeScale.tileTitle, { color: colors.text }]}>{CTA.title}</Text>
        <Text style={[typeScale.callout, { color: colors.textMuted }]}>{CTA.body(reward)}</Text>
      </View>
      <ChevronRight size={iconSize.sm - 2} color={colors.textMuted} strokeWidth={iconStroke} />
    </Card>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  center: { textAlign: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, borderRadius: radius.xl, padding: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2 },
  tile: { width: TILE, height: TILE, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0, gap: 2 },
})

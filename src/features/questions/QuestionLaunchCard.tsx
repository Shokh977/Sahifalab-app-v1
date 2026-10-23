/**
 * One-time launch announcement for "Siz ham savol yuboring" on Bugun: shown
 * until the user opens the form or dismisses it, then never again (per
 * device). Hidden while the feature is switched off server-side.
 */
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { Lightbulb, X } from 'lucide-react-native'
import { questions as questionsApi } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { iconSize, iconStroke, radius, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Card, IconButton } from '../../components/ui'
import { CTA } from './questionForm'

const SEEN_KEY = 'sahifalab_question_launch_seen'
const TILE = 40

export function QuestionLaunchCard() {
  const { colors } = useTheme()
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let cancelled = false
    AsyncStorage.getItem(SEEN_KEY)
      .then(async seen => {
        if (seen || cancelled) return
        const limits = await questionsApi.limits()
        if (!cancelled && limits.enabled) setVisible(true)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!visible) return null
  const close = () => {
    AsyncStorage.setItem(SEEN_KEY, '1').catch(() => {})
    setVisible(false)
  }
  const open = () => {
    close()
    router.push('/(screens)/submit-question' as any)
  }

  return (
    <Card variant="pressable" onPress={open} accessibilityLabel={`${CTA.launchTitle}. ${CTA.launchBody}`} style={styles.row}>
      <View style={[styles.tile, { backgroundColor: colors.accentSoft }]}>
        <Lightbulb size={iconSize.sm} color={colors.accentText} strokeWidth={iconStroke} />
      </View>
      <View style={styles.flex}>
        <Text style={[typeScale.tileTitle, { color: colors.text }]}>{CTA.launchTitle}</Text>
        <Text style={[typeScale.callout, { color: colors.textMuted }]}>{CTA.launchBody}</Text>
      </View>
      <IconButton icon={X} accessibilityLabel="Yopish" onPress={close} />
    </Card>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2 },
  tile: { width: TILE, height: TILE, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0, gap: 2 },
})

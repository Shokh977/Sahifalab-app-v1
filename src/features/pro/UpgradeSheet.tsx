/**
 * Pro upgrade sheet — built, but only reachable when PRO_UPGRADE_ENABLED
 * (off until Pro launches; AGENT.md Phase 6). Logs pro_sheet_open.
 */
import React, { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Brain, Infinity as InfinityIcon, Sparkles, type LucideIcon } from 'lucide-react-native'
import { track } from '../../../lib/analytics'
import { useTheme } from '../../design/ThemeProvider'
import { iconSize, iconStroke, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Badge, Button, Sheet } from '../../components/ui'
import { PRO_UPGRADE_ENABLED } from './flags'

const BENEFITS: { icon: LucideIcon; text: string }[] = [
  { icon: InfinityIcon, text: 'AI bilan cheksiz karta yaratish' },
  { icon: Sparkles, text: 'Haftalik shaxsiy AI tahlil' },
  { icon: Brain, text: 'AI testlar va tushuntirishlar' },
]

export function UpgradeSheet({ visible, source, onClose, onUpgrade }: {
  visible: boolean
  /** Where it was opened from (analytics). */
  source: string
  onClose: () => void
  onUpgrade: () => void
}) {
  const { colors } = useTheme()
  const open = PRO_UPGRADE_ENABLED && visible

  useEffect(() => {
    if (open) track('pro_sheet_open', { source })
  }, [open, source])

  return (
    <Sheet visible={open} onClose={onClose} title="Sahifalab Pro">
      <View style={styles.body}>
        <Badge kind="pro" />
        {BENEFITS.map(b => (
          <View key={b.text} style={styles.row}>
            <b.icon size={iconSize.sm} color={colors.accentText} strokeWidth={iconStroke} />
            <Text style={[typeScale.body, styles.flex, { color: colors.text }]}>{b.text}</Text>
          </View>
        ))}
        <Button label="Proʼga oʻtish" size="lg" fullWidth onPress={onUpgrade} style={styles.cta} />
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  body: { gap: space.sm, paddingBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  cta: { marginTop: space.sm },
})

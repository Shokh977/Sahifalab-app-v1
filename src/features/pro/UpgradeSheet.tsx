/**
 * Pro upgrade sheet — opens when a free user runs out of AI decks or taps
 * "Pro bilan cheksiz"; "Proʼga oʻtish" leads to the Pro screen. Only shown
 * when PRO_UPGRADE_ENABLED. Logs pro_sheet_open.
 */
import React, { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { ChartColumn, Infinity as InfinityIcon, Palette, type LucideIcon } from 'lucide-react-native'
import { track } from '../../../lib/analytics'
import { useTheme } from '../../design/ThemeProvider'
import { iconSize, iconStroke, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Badge, Button, Sheet } from '../../components/ui'
import { PRO_UPGRADE_ENABLED } from './flags'

const BENEFITS: { icon: LucideIcon; text: string }[] = [
  { icon: InfinityIcon, text: 'AI bilan karta yaratish — kuniga 20 tagacha, Tangasiz' },
  { icon: ChartColumn, text: 'Haftalik sharh: AI tavsiyalari va toʻliq statistika' },
  { icon: Palette, text: 'Mavzular, jonli bannerlar va avatar halqalari' },
]

export function UpgradeSheet({ visible, source, onClose, onUpgrade, title }: {
  visible: boolean
  /** Where it was opened from (analytics). */
  source: string
  onClose: () => void
  /** Defaults to opening the Pro screen. */
  onUpgrade?: () => void
  /** A line above the benefits, e.g. why the sheet opened. */
  title?: string
}) {
  const { colors } = useTheme()
  const router = useRouter()
  const upgrade = onUpgrade ?? (() => { onClose(); router.push('/(screens)/pro' as any) })
  const open = PRO_UPGRADE_ENABLED && visible

  useEffect(() => {
    if (open) track('pro_sheet_open', { source })
  }, [open, source])

  return (
    <Sheet visible={open} onClose={onClose} title="Sahifalab Pro">
      <View style={styles.body}>
        <Badge kind="pro" />
        {title ? <Text style={[typeScale.headline, { color: colors.text }]}>{title}</Text> : null}
        {BENEFITS.map(b => (
          <View key={b.text} style={styles.row}>
            <b.icon size={iconSize.sm} color={colors.accentText} strokeWidth={iconStroke} />
            <Text style={[typeScale.body, styles.flex, { color: colors.text }]}>{b.text}</Text>
          </View>
        ))}
        <Button label="Proʼga oʻtish" size="lg" fullWidth onPress={upgrade} style={styles.cta} />
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

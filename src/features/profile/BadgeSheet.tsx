/**
 * Badge details in the kit Sheet: the art, category, description and how
 * it was (or can be) earned. Works for every category, titles included.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../design/ThemeProvider'
import { avatarSize, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Badge, Sheet } from '../../components/ui'
import { uzText } from '../today/today'
import { BadgeArt } from './BadgeCell'
import { CATEGORY_LABEL, type ProfileBadge } from './badges'

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

function statusText(b: ProfileBadge): string {
  if (b.category === 'unvon') {
    return b.earned ? `${b.level}-darajada ochildi` : `${b.level}-darajaga yeting`
  }
  if (b.earned) return b.earnedAt ? `Olingan: ${fmtDate(b.earnedAt)}` : 'Olingan'
  return 'Hali olinmagan'
}

export function BadgeSheet({ badge, onClose }: { badge: ProfileBadge | null; onClose: () => void }) {
  const { colors } = useTheme()
  return (
    <Sheet visible={!!badge} onClose={onClose}>
      {badge && (
        <View style={styles.body}>
          <BadgeArt badge={badge} size={avatarSize.xl + space.lg} />
          <Badge kind="status" status={badge.earned ? 'success' : 'neutral'} label={CATEGORY_LABEL[badge.category]} style={styles.center} />
          <Text style={[typeScale.title2, styles.text, { color: colors.text }]} accessibilityRole="header">{uzText(badge.name)}</Text>
          {badge.description ? (
            <Text style={[typeScale.body, styles.text, { color: colors.textMuted }]}>{uzText(badge.description)}</Text>
          ) : null}
          <Text style={[typeScale.callout, styles.text, { color: badge.earned ? colors.successText : colors.textMuted }]}>
            {statusText(badge)}
          </Text>
        </View>
      )}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: space.sm, paddingVertical: space.md },
  center: { alignSelf: 'center' },
  text: { textAlign: 'center' },
})

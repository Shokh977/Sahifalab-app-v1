/**
 * SectionTitle (Phase 7.5 B4) — a section's sentence-case title: 20 px extra
 * bold, with an optional meta on the right (muted 13) or a link (accentText
 * 14/700, 48 px target). Overlines stay only inside cards.
 */
import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../../design/ThemeProvider'
import { layout, space } from '../../design/spacing'
import { fonts, tabular, type as typeScale } from '../../design/typography'
import { Pressable } from './Pressable'

export interface SectionTitleProps {
  title: string
  /** Right side, muted: "2 / 4", "XP boʻyicha · 2 kun qoldi". */
  meta?: string
  /** Right side, a link: "Hammasi". Wins over meta. */
  link?: { label: string; onPress: () => void }
  /** Anything else on the right (a mini progress, a button). */
  right?: React.ReactNode
  style?: StyleProp<ViewStyle>
}

export function SectionTitle({ title, meta, link, right, style }: SectionTitleProps) {
  const { colors } = useTheme()
  return (
    <View style={[styles.row, style]}>
      <Text style={[typeScale.section, styles.title, { color: colors.text }]} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      {right}
      {link ? (
        <Pressable onPress={link.onPress} hitSlop={space.xs} accessibilityRole="link" accessibilityLabel={link.label} style={styles.link}>
          <Text style={[typeScale.link, { color: colors.accentText }]}>{link.label}</Text>
        </Pressable>
      ) : meta ? (
        <Text style={[typeScale.callout, tabular, styles.meta, { color: colors.textMuted }]} numberOfLines={1}>{meta}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: layout.minTouch - space.xs },
  title: { flex: 1 },
  meta: { fontFamily: fonts.regular, flexShrink: 1 },
  link: { minHeight: layout.minTouch, justifyContent: 'center', paddingLeft: space.xs },
})

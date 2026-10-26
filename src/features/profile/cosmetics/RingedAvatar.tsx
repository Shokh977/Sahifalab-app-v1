/**
 * An avatar that shows its owner's ring (Pro, earned or seasonal) wherever
 * it appears — Reyting rows, the podium, the "Siz" bar, Bugun's ranking and
 * header. A plain or unknown ring is the ordinary Avatar, so layouts don't
 * change for everyone else. Rings in lists are still (no animation): many
 * at once would cost a redraw per frame each. `level` adds the same level
 * badge Avatar draws.
 */
import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../../../design/ThemeProvider'
import { radius, space } from '../../../design/spacing'
import { tabular, type as typeScale } from '../../../design/typography'
import { Avatar } from '../../../components/ui'
import { AvatarRing } from './AvatarRing'
import { ringKind } from './cosmetics'

export function RingedAvatar({ ring, diameter, name, id, uri, level, animated = false, style }: {
  ring?: string | null
  diameter: number
  name: string
  id?: number | null
  uri?: string | null
  /** Level badge, as on Avatar. */
  level?: number
  animated?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const { colors } = useTheme()
  const kind = ringKind(ring ?? undefined)
  if (kind === 'oddiy') {
    return <Avatar name={name || '?'} id={id} uri={uri} diameter={diameter} level={level} style={style} />
  }
  return (
    <View style={[{ width: diameter, height: diameter }, style]}>
      <AvatarRing kind={kind} size={diameter} name={name} id={id} uri={uri} bg="transparent" animated={animated} />
      {level != null && (
        <View style={[styles.level, { backgroundColor: colors.accent, borderColor: colors.bg }]}>
          <Text style={[typeScale.levelBadge, tabular, { color: colors.onAccent }]} maxFontSizeMultiplier={1}>{level}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  level: {
    position: 'absolute', right: -space.xxs, bottom: -space.xxs, minWidth: space.lg, minHeight: space.lg,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.xxs, borderRadius: radius.full, borderWidth: 2,
  },
})

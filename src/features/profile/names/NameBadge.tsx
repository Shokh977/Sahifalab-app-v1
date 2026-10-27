/**
 * The small animated badge after a Pro user's name (9-qadam §2). Each badge
 * is an animated WebP from the server catalog, played natively by
 * expo-image — decoding runs off the JS and UI threads and the same file is
 * shared by every row that shows it, so a long Reyting list costs about as
 * much as one image. Reduce Motion, or `animated={false}`, shows the still
 * frame. Hidden from screen readers unless `announce` (the profile header:
 * "Belgi: Toj").
 */
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { useReducedMotion } from 'react-native-reanimated'
import type { Scheme } from '../../../design/tokens'
import { useBadgeDef } from './badgeCatalog'

export function NameBadge({ id, size, surface, animated = true, announce = false }: {
  id: string | null | undefined
  size: number
  surface: Scheme
  animated?: boolean
  announce?: boolean
}) {
  const def = useBadgeDef(id)
  const reduce = useReducedMotion()
  if (!def) return null
  const uri = !animated || reduce ? def.static : surface === 'dark' ? def.dark : def.light
  return (
    <View
      style={[styles.box, { width: size, height: size }]}
      accessible={announce}
      accessibilityLabel={announce ? `Belgi: ${def.title}` : undefined}
      importantForAccessibility={announce ? 'yes' : 'no-hide-descendants'}
      accessibilityElementsHidden={!announce}
    >
      <Image source={{ uri }} style={styles.fill} contentFit="contain" recyclingKey={uri} transition={0} />
    </View>
  )
}

const styles = StyleSheet.create({
  box: { flexShrink: 0 },
  fill: { width: '100%', height: '100%' },
})

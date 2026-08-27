/**
 * SubjectTile — the 44/46px subject glyph tile used by DeckRow and
 * PublicSetRow (Kartalar redesign). Pure presentational: color/glyph come
 * from subjectTheme.subjectStyle(), computed once by the caller.
 */
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { typography, radius } from '../../lib/constants'

export function SubjectTile({ color, tint, glyph, size = 44 }: {
  color: string
  tint:  string
  glyph: string
  size?: number
}) {
  // IELTS/MED/DEV are 3 letters wide — shrink the font a touch so they never
  // clip against the tile's own radius at the smaller row size.
  const fontSize = glyph.length > 2 ? size * 0.28 : size * 0.34

  return (
    <View style={[styles.tile, { width: size, height: size, backgroundColor: tint, borderRadius: radius['2xl'] }]}>
      <Text
        style={[styles.glyph, { color, fontSize, fontFamily: typography.fontFamily.extrabold }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {glyph}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  tile:  { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  glyph: { letterSpacing: -0.2 },
})

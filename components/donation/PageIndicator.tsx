import React from 'react'
import { View, StyleSheet } from 'react-native'
import { donationColors as dc } from './donationTheme'

/** 1 method -> no indicator at all. 2-5 -> bare dots. >=6 -> the same dots
 * wrapped in a surface-2 pill (the {i}/{n} counter lives in the section
 * label row, not here). */
export default function PageIndicator({ count, active }: { count: number; active: number }) {
  if (count <= 1) return null

  const dots = (
    <View style={s.row}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[s.dot, i === active ? s.dotActive : s.dotInactive]} />
      ))}
    </View>
  )

  if (count < 6) return dots
  return <View style={s.pill}>{dots}</View>
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 22, backgroundColor: dc.accent },
  dotInactive: { width: 6, backgroundColor: 'rgba(43,59,77,.18)' },
  pill: {
    alignSelf: 'center', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10,
    backgroundColor: dc.surface2,
  },
})

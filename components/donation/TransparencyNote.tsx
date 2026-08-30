import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { typography } from '../../lib/constants'
import { donationColors as dc } from './donationTheme'

const BULLETS = [
  'Server va AI xarajatlari',
  'Yangi kurs va kartalar tayyorlash',
  'Ilova barcha uchun bepul qolishi',
]

export default function TransparencyNote() {
  return (
    <View style={s.card}>
      <Text style={s.label} allowFontScaling={false}>XAYRIYA NIMAGA KETADI</Text>
      <View style={s.list}>
        {BULLETS.map((b, i) => (
          <View key={i} style={s.bulletRow}>
            <Text style={s.bulletDot}>•</Text>
            <Text style={s.bulletText}>{b}</Text>
          </View>
        ))}
      </View>
      <View style={s.divider} />
      <Text style={s.note}>
        Choraklik hisobotlar ochiq e'lon qilinadi. Xayriya qilish ixtiyoriy.
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  card: { backgroundColor: dc.surface2, borderRadius: 22, padding: 16 },
  label: { fontSize: 9.5, fontFamily: typography.fontFamily.bold, letterSpacing: 0.16 * 9.5, color: dc.textFaint, marginBottom: 10 },
  list: { gap: 6 },
  bulletRow: { flexDirection: 'row', gap: 6 },
  bulletDot: { color: dc.textBody, fontSize: 13 },
  bulletText: { flex: 1, fontSize: 13, lineHeight: 13 * 1.5, color: dc.textBody, fontFamily: typography.fontFamily.medium },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: dc.hairline, marginVertical: 10 },
  note: { fontSize: 11, lineHeight: 11 * 1.5, color: dc.textFaint, fontFamily: typography.fontFamily.medium },
})

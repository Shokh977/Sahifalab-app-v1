import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Lightbulb } from 'lucide-react-native'
import { typography, spacing, radius } from '../../lib/constants'
import type { WeeklyReviewSpotlight } from '../../lib/api'

// Always rendered when present — a study method is picked deterministically
// every week (weekly_review_service._pick_study_method), so this only ever
// disappears alongside the rest of the AI narrative on a genuinely
// zero-activity week (no narrative generated at all that week).
export function StudyMethodCard({ tip, c }: { tip: WeeklyReviewSpotlight; c: any }) {
  return (
    <View style={[s.root, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
      <View style={s.header}>
        <View style={[s.iconChip, { backgroundColor: c.accentSecondary + '1a' }]}>
          <Lightbulb size={15} color={c.accentSecondary} />
        </View>
        <Text style={[s.label, { color: c.textMuted, fontFamily: typography.fontFamily.bold }]}>
          USUL
        </Text>
      </View>
      <Text style={[s.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
        {tip.title}
      </Text>
      <Text style={[s.body, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {tip.body}
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  root: { borderRadius: radius.cardLg, borderWidth: 1, padding: spacing.lg, gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconChip: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, letterSpacing: 0.5 },
  title: { fontSize: 14.5, marginTop: 2 },
  body: { fontSize: 13.5, lineHeight: 20 },
})

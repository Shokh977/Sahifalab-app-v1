import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Compass } from 'lucide-react-native'
import { typography, spacing, radius } from '../../lib/constants'
import type { WeeklyReviewSpotlight } from '../../lib/api'

// Only rendered when the user declared an interest at onboarding
// (weekly_review_service._pick_category_context returns null otherwise) —
// the screen omits this card entirely rather than showing a generic
// placeholder, matching this app's "a real absent state, not a blank."
export function CategoryInsightCard({ insight, c }: { insight: WeeklyReviewSpotlight; c: any }) {
  return (
    <View style={[s.root, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
      <View style={[s.iconChip, { backgroundColor: '#22C55E1a' }]}>
        <Compass size={16} color="#22C55E" />
      </View>
      <View style={s.body}>
        <Text numberOfLines={1} style={[s.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          {insight.title}
        </Text>
        <Text style={[s.text, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          {insight.body}
        </Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  root: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    borderRadius: radius.cardLg, borderWidth: 1, padding: spacing.lg,
  },
  iconChip: { width: 32, height: 32, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  body: { flex: 1, gap: 3 },
  title: { fontSize: 14 },
  text: { fontSize: 12.5, lineHeight: 18 },
})

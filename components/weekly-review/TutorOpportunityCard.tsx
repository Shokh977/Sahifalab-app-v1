import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { GraduationCap, ChevronRight } from 'lucide-react-native'
import { typography, spacing, radius } from '../../lib/constants'
import type { WeeklyReviewSpotlight } from '../../lib/api'

// Only rendered when the backend actually computed a hint
// (weekly_review_service._check_tutor_opportunity — real engagement in a
// declared interest, and not already a teacher/admin). Routes to the app's
// OWN existing become-teacher flow, never an invented external program.
export function TutorOpportunityCard({ suggestion, c }: { suggestion: WeeklyReviewSpotlight; c: any }) {
  const router = useRouter()

  return (
    <Pressable
      style={[s.root, { backgroundColor: c.bgSecondary, borderColor: c.border }]}
      onPress={() => router.push('/(screens)/become-teacher' as any)}
      accessibilityRole="button"
      hitSlop={4}
    >
      <View style={[s.chip, { backgroundColor: c.accentPrimaryMuted }]}>
        <GraduationCap size={18} color={c.accentPrimary} />
      </View>
      <View style={s.body}>
        <Text numberOfLines={1} style={[s.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          {suggestion.title}
        </Text>
        <Text numberOfLines={2} style={[s.text, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          {suggestion.body}
        </Text>
      </View>
      <ChevronRight size={18} color={c.textMuted} />
    </Pressable>
  )
}

const s = StyleSheet.create({
  root: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: radius.cardLg, borderWidth: 1, padding: spacing.lg, minHeight: 44,
  },
  chip: { width: 40, height: 40, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 14.5 },
  text: { fontSize: 12.5, lineHeight: 17 },
})

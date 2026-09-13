import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { typography, spacing, radius } from '../../lib/constants'
import type { WeeklyReviewVM } from '../../hooks/useWeeklyReview'

// Deterministic fallback for when the backend has no cached AI narrative
// yet (the zero-activity case — current_week_progress_v1.py skips the AI
// call entirely rather than narrate silence). Computed purely from the
// gap to last week's pace, never a hardcoded sentence about a specific number.
function fallbackTavsiya(vm: WeeklyReviewVM): string {
  if (vm.focusMinutes === 0) return "Hali bu hafta o'qishni boshlamadingiz — bugun bir necha daqiqadan boshlang."
  if (vm.vsLastWeekPct === null) return "Shu sur'atda davom eting — barqarorlik eng muhimi."
  if (vm.vsLastWeekPct < 0) return "O'tgan haftaga qaraganda sekinroq ketyapsiz — qolgan kunlarda biroz ko'proq vaqt ajrating."
  return "O'tgan haftadan yaxshiroq ketyapsiz — shu sur'atni saqlang."
}

export function TavsiyaCard({ vm, c }: { vm: WeeklyReviewVM; c: any }) {
  return (
    <View style={[s.root, { backgroundColor: c.accentPrimaryMuted, borderColor: c.accentPrimary + '33' }]}>
      <Text style={[s.label, { color: c.accentPrimary, fontFamily: typography.fontFamily.bold }]}>
        TAVSIYA
      </Text>
      <Text style={[s.body, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}>
        {vm.recommendation ?? fallbackTavsiya(vm)}
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  root: { borderRadius: radius.cardLg, borderWidth: 1, padding: spacing.lg, gap: 6 },
  label: { fontSize: 11, letterSpacing: 0.5 },
  body: { fontSize: 14, lineHeight: 21 },
})

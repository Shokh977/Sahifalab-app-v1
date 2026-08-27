/**
 * ReviewDueCard — "Bugun takrorlash kerak", the Kartalar screen's primary
 * action card. Replaces the old passive 3-column stats bar: the due count is
 * now the thing with a button attached to it, not a number sitting inert.
 *
 * Purely presentational — MyDecksTab computes every number from
 * useFlashcardStore()'s decks/stats and passes them in.
 */
import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { typography, spacing, radius } from '../../lib/constants'
import { kartalarColorsFor, kartalarCardShadow } from './subjectTheme'
import { useTheme } from '../../hooks/useTheme'
import { ProgressRing } from './ProgressRing'

export function ReviewDueCard({
  totalDue, dueDeckCount, totalCards, masteredCount, onStartReview,
}: {
  totalDue:      number
  dueDeckCount:  number
  totalCards:    number
  masteredCount: number
  onStartReview: () => void
}) {
  const { theme } = useTheme()
  const kc = kartalarColorsFor(theme)
  const shadow = kartalarCardShadow(theme)

  const allDone = totalDue === 0
  const masteryPct = totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0
  const ringProgress = allDone
    ? (totalCards > 0 ? masteredCount / totalCards : 0)
    : (totalCards > 0 ? Math.min(1, totalDue / totalCards) : 0)

  // ~4s per card, rounded to whole minutes (minimum 1 when there's anything due).
  const estimatedMinutes = totalDue > 0 ? Math.max(1, Math.round((totalDue * 4) / 60)) : 0

  const Container = theme === 'dark' ? LinearGradient : View
  // Only the gradient-specific props go here — background/border/shadow all
  // live in the single `style` array below so neither branch can shadow the
  // other's styling (a spread-then-explicit-style ordering bug once did).
  const gradientProps = theme === 'dark'
    ? { colors: ['#2A2118', '#191C22'] as const, start: { x: 0, y: 0 }, end: { x: 0.87, y: 1 } }
    : {}

  return (
    <Container
      {...(gradientProps as any)}
      style={[
        styles.card,
        theme === 'dark'
          ? { borderWidth: 1, borderColor: 'rgba(240,163,43,.28)' }
          : { backgroundColor: kc.surface, borderWidth: 1, borderColor: '#F3DBA4', ...shadow },
      ]}
    >
      <View style={styles.topRow}>
        <ProgressRing progress={ringProgress} color={kc.accent} track={theme === 'dark' ? '#2B2F36' : '#EFEAE0'} size={56} stroke={6}>
          <Text style={[styles.ringValue, { color: kc.accent, fontFamily: typography.fontFamily.extrabold }]}>
            {allDone ? `${masteryPct}%` : totalDue}
          </Text>
        </ProgressRing>

        <View style={styles.topText}>
          <Text style={[styles.title, { color: kc.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
            {allDone ? 'Hammasi takrorlangan' : 'Bugun takrorlash kerak'}
          </Text>
          {!allDone && (
            <Text style={[styles.subtitle, { color: kc.textMuted, fontFamily: typography.fontFamily.medium }]}>
              {dueDeckCount} to'plamdan · ~{estimatedMinutes} daqiqa
            </Text>
          )}
        </View>
      </View>

      <Pressable
        onPress={onStartReview}
        accessibilityRole="button"
        accessibilityHint={allDone ? "Erkin mashq qilish uchun bosing" : "Takrorlashni boshlash uchun bosing"}
        style={({ pressed }) => [
          allDone ? styles.secondaryBtn : styles.primaryBtn,
          allDone
            ? { backgroundColor: kc.surface, borderWidth: 1, borderColor: kc.hairline }
            : {
                backgroundColor: kc.accent,
                shadowColor: kc.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: theme === 'dark' ? 0 : 0.28, shadowRadius: 16,
                elevation: theme === 'dark' ? 0 : 3,
              },
          pressed && { opacity: 0.88 },
        ]}
      >
        <Text style={[styles.btnLabel, { color: allDone ? kc.textPrimary : kc.onAccent, fontFamily: typography.fontFamily.bold }]}>
          {allDone ? 'Erkin mashq qilish' : 'Takrorlashni boshlash'}
        </Text>
      </Pressable>

      <View style={[styles.footer, { borderTopColor: kc.hairline }]}>
        <Text style={[styles.footerText, { color: kc.textMuted, fontFamily: typography.fontFamily.semibold }]}>
          <Text style={{ color: kc.textPrimary, fontFamily: typography.fontFamily.bold }}>{totalCards}</Text> jami karta · {' '}
          <Text style={{ color: kc.green, fontFamily: typography.fontFamily.bold }}>{masteredCount}</Text> o'zlashtirilgan · {' '}
          <Text style={{ color: kc.textPrimary, fontFamily: typography.fontFamily.bold }}>{masteryPct}%</Text> progress
        </Text>
      </View>
    </Container>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius['4xl'],
    padding:      spacing.base,
    gap:          spacing.base,
  },
  topRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
  },
  ringValue: { fontSize: 17 },
  topText: { flex: 1, gap: 3 },
  title:    { fontSize: 15 },
  subtitle: { fontSize: 11.5 },

  primaryBtn: {
    width:           '100%',
    borderRadius:    radius.xl + 2,
    paddingVertical: 13,
    alignItems:      'center',
    justifyContent:  'center',
  },
  secondaryBtn: {
    width:           '100%',
    borderRadius:    radius.xl + 2,
    paddingVertical: 13,
    alignItems:      'center',
    justifyContent:  'center',
  },
  btnLabel: { fontSize: 13.5 },

  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop:     spacing.sm,
  },
  footerText: { fontSize: 11, lineHeight: 16 },
})

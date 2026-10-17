/**
 * After an answer: the feedback line ("Toʻgʻri! +1 tanga" / "Notoʻgʻri.
 * Toʻgʻri javob: …"), a 1–2 line explanation and the next button. Slides up
 * with springs.ui; a plain fade under reduce motion.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInDown, ReduceMotion } from 'react-native-reanimated'
import { CircleAlert, CircleCheck } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { durations, springs } from '../../design/motion'
import { iconSize, iconStroke, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Button, Card } from '../../components/ui'

// Rises a short distance (not from the screen edge) on springs.ui.
const enter = FadeInDown.springify().duration(springs.ui.duration).dampingRatio(springs.ui.dampingRatio)
  .reduceMotion(ReduceMotion.Never)
const enterReduced = FadeIn.duration(durations.fast)

export function ExplanationCard({ correct, title, explanation, nextLabel, onNext, loading, reduceMotion }: {
  /** null when the backend gave no verdict (older deploy): neutral card. */
  correct: boolean | null
  title: string | null
  explanation: string | null
  nextLabel: string
  onNext: () => void
  loading?: boolean
  reduceMotion: boolean
}) {
  const { colors } = useTheme()
  const Icon = correct === false ? CircleAlert : CircleCheck
  const tint = correct === true ? colors.successText : correct === false ? colors.dangerText : colors.text

  return (
    <Animated.View entering={reduceMotion ? enterReduced : enter}>
      <Card style={styles.card}>
        {title ? (
          <View style={styles.titleRow} accessibilityLiveRegion="polite">
            <Icon size={iconSize.sm} color={tint} strokeWidth={iconStroke} />
            <Text style={[typeScale.headline, styles.flex, { color: tint }]}>{title}</Text>
          </View>
        ) : null}
        {explanation ? (
          <Text style={[typeScale.callout, { color: colors.textMuted }]} numberOfLines={3}>{explanation}</Text>
        ) : null}
        <Button label={nextLabel} size="lg" fullWidth onPress={onNext} loading={loading} />
      </Card>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  flex: { flex: 1 },
})

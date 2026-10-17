import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import Animated, {
  FadeIn, ReduceMotion, useAnimatedProps, useReducedMotion, useSharedValue, withTiming,
} from 'react-native-reanimated'
import { useTheme } from '../../hooks/useTheme'
import { typography, radius } from '../../lib/constants'
import { durations, easing, stagger } from '../../src/design/motion'
import { useCountUp } from '../../src/components/ui/StatTile'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

const WORDMARK = '#F5F1EA'
const MUTED = '#7D766C'
const GREEN = '#37B457'
const ORANGE = '#F0A32B'

const RING_SIZE = 88
const RING_STROKE = 8
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const RING_CIRC = 2 * Math.PI * RING_RADIUS

export type AnswerMark = 'correct' | 'wrong' | 'skipped'

export interface ResultTicketProps {
  round: number
  score: number
  total: number
  answers: AnswerMark[]
  streak: number
  rank: number | null
  level: number
  date: string        // ISO date
  referralCode: string
  scale?: number
  /** On-screen result reveal (ring fills, dots appear one by one, rank
   *  counts up). The off-screen share capture leaves it off: static. */
  reveal?: boolean
  hideStats?: boolean // privacy: opted out of public stats (no such setting
                       // exists in this app yet — always false today, but
                       // the component honors it if a caller ever sets it)
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${d.getFullYear()}`
}

function variantFor(score: number, total: number) {
  if (score === total) return { headline: `${score}/${total} — benuqson`, accent: GREEN, gold: true }
  if (score >= 3) return { headline: `${score} toʻgʻri javob`, accent: ORANGE, gold: false }
  if (score >= 1) return { headline: `${score} toʻgʻri javob`, accent: ORANGE, gold: false }
  return { headline: "Birinchi urinish", accent: MUTED, gold: false }
}

function ProgressRing({ score, total, accent, animate }: { score: number; total: number; accent: string; animate: boolean }) {
  const fraction = total > 0 ? score / total : 0
  const targetOffset = RING_CIRC * (1 - fraction)
  // Result reveal: the ring fills from empty to the score on the UI thread.
  const offset = useSharedValue(animate ? RING_CIRC : targetOffset)

  useEffect(() => {
    if (!animate) { offset.set(targetOffset); return }
    offset.set(withTiming(targetOffset, { duration: durations.celebrate, easing: easing.standard }))
  }, [animate, targetOffset, offset])

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: offset.get() }))

  return (
    <View style={{ width: RING_SIZE, height: RING_SIZE }}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
          stroke="rgba(255,255,255,0.09)" strokeWidth={RING_STROKE} fill="none"
        />
        <AnimatedCircle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
          stroke={accent} strokeWidth={RING_STROKE} fill="none"
          strokeDasharray={`${RING_CIRC}, ${RING_CIRC}`}
          animatedProps={ringProps}
          strokeLinecap="round"
          rotation={-90}
          originX={RING_SIZE / 2} originY={RING_SIZE / 2}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text allowFontScaling maxFontSizeMultiplier={1.2} style={styles.ringScore}>
          <Text style={{ color: '#fff', fontFamily: typography.fontFamily.extrabold, fontSize: 26 }}>{score}</Text>
          <Text style={{ color: MUTED, fontFamily: typography.fontFamily.semibold, fontSize: 15 }}>/{total}</Text>
        </Text>
        <Text
          maxFontSizeMultiplier={1.2}
          style={{ color: accent, fontFamily: typography.fontFamily.bold, fontSize: 8, letterSpacing: 1 }}
        >
          {total > 0 ? Math.round((score / total) * 100) : 0}%
        </Text>
      </View>
    </View>
  )
}

function QuestionStrip({ answers, animate }: { answers: AnswerMark[]; animate: boolean }) {
  return (
    <View style={styles.qStrip}>
      {answers.map((a, i) => {
        const bg = a === 'correct' ? '#2C7E45' : a === 'wrong' ? '#3A2320' : 'rgba(255,255,255,0.06)'
        const glyph = a === 'correct' ? '✓' : a === 'wrong' ? '✕' : '–'
        const glyphColor = a === 'correct' ? '#DFF6E6' : a === 'wrong' ? '#E39B92' : MUTED
        return (
          <Animated.View
            key={i}
            // Result reveal: answer dots appear one by one (stagger.step apart).
            entering={animate
              ? FadeIn.duration(durations.fade).delay(i * stagger.step).reduceMotion(ReduceMotion.System)
              : undefined}
            style={[styles.qSquare, { backgroundColor: bg }]}
          >
            <Text maxFontSizeMultiplier={1.2} style={{ color: glyphColor, fontSize: 13, fontFamily: typography.fontFamily.bold }}>
              {glyph}
            </Text>
          </Animated.View>
        )
      })}
    </View>
  )
}

/**
 * The share ticket — always dark in both app themes (only surface/border
 * tokens shift slightly), pure presentational, identical markup whether
 * rendered on screen or off-screen for capture (see useShareTicket).
 */
export function ResultTicket({
  round, score, total, answers, streak, rank, level, date, referralCode: _referralCode, scale = 1, reveal = false, hideStats = false,
}: ResultTicketProps) {
  // referralCode is accepted (kept for a future QR code) but not rendered.
  const { theme } = useTheme()
  const reduceMotion = useReducedMotion()
  const animate = reveal && !reduceMotion
  const variant = variantFor(score, total)
  const shownRank = useCountUp(rank ?? 0, animate)

  const surface = theme === 'dark' ? '#191C22' : '#1A1815'
  const border = theme === 'dark' ? 'rgba(255,255,255,0.08)' : undefined
  const cellBg = theme === 'dark' ? '#20242B' : '#201D19'

  const statCells = hideStats ? [] : [
    { value: String(streak), label: 'SERIYA', accent: undefined as string | undefined },
    ...(rank != null ? [{ value: `#${animate ? shownRank : rank}`, label: 'REYTING', accent: ORANGE }] : []),
    { value: `Lv.${level}`, label: 'DARAJA', accent: undefined },
  ]

  const a11yLabel =
    `5 savol, tur ${round}, ${score} dan ${total} toʻgʻri, seriya ${streak}` +
    (rank != null ? `, reyting ${rank}` : '')

  return (
    <View
      accessible accessibilityLabel={a11yLabel}
      style={[
        styles.ticket,
        {
          backgroundColor: surface,
          borderColor: border,
          borderWidth: border ? 1 : 0,
          transform: [{ scale }],
        },
      ]}
    >
      <View style={styles.decorativeCircle} />

      {/* Brand row */}
      <View style={styles.brandRow}>
        <Text maxFontSizeMultiplier={1.2} style={[styles.wordmark, { fontFamily: typography.fontFamily.extrabold }]}>
          SAHIFALAB
        </Text>
        <Text maxFontSizeMultiplier={1.2} style={styles.dateText}>{fmtDate(date)}</Text>
      </View>

      {/* Score row */}
      <View style={styles.scoreRow}>
        <ProgressRing score={score} total={total} accent={variant.accent} animate={animate} />
        <View style={styles.scoreRight}>
          <Text maxFontSizeMultiplier={1.2} style={styles.overline}>{`KUNLIK TUR #${round}`}</Text>
          <Text maxFontSizeMultiplier={1.2} style={styles.headline} numberOfLines={2}>{variant.headline}</Text>
          <QuestionStrip answers={answers} animate={animate} />
        </View>
      </View>

      {/* Stats strip */}
      {statCells.length > 0 && (
        <View style={styles.statsStrip}>
          {statCells.map((cell, i) => (
            <View key={i} style={[styles.statCell, { backgroundColor: cellBg }]}>
              <Text
                maxFontSizeMultiplier={1.2}
                style={[styles.statValue, { color: cell.accent ?? '#fff', fontFamily: typography.fontFamily.extrabold }]}
              >
                {cell.value}
              </Text>
              <Text maxFontSizeMultiplier={1.2} style={styles.statLabel}>{cell.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View>
          <Text maxFontSizeMultiplier={1.2} style={[styles.footerTitle, { fontFamily: typography.fontFamily.bold }]}>
            Sen ham sinab koʻr
          </Text>
          <Text maxFontSizeMultiplier={1.2} style={styles.footerDomain}>sahifalab.uz</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  ticket: {
    borderRadius: radius.cardXl,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  decorativeCircle: {
    position: 'absolute', top: -40, right: -40, width: 150, height: 150,
    borderRadius: 75, backgroundColor: 'rgba(240,163,43,0.09)',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordmark: { color: WORDMARK, fontSize: 11, letterSpacing: 1.5 },
  dateText: { color: MUTED, fontSize: 10, fontWeight: '600' },

  scoreRow: { flexDirection: 'row', gap: 18, marginTop: 20, alignItems: 'center' },
  ringCenter: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  ringScore: { textAlign: 'center' },

  scoreRight: { flex: 1, gap: 4 },
  overline: { color: MUTED, fontSize: 9, fontWeight: '700', letterSpacing: 1.3 },
  headline: { color: '#fff', fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },

  qStrip: { flexDirection: 'row', gap: 5, marginTop: 4 },
  qSquare: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  statsStrip: {
    flexDirection: 'row', gap: 1, marginTop: 20, borderRadius: 14,
    overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statCell: { flex: 1, paddingVertical: 11, paddingHorizontal: 10, alignItems: 'center' },
  statValue: { fontSize: 15 },
  statLabel: { color: MUTED, fontSize: 9, fontWeight: '600', letterSpacing: 0.6, marginTop: 2 },

  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)',
    borderStyle: 'dashed',
  },
  footerTitle: { color: WORDMARK, fontSize: 11 },
  footerDomain: { color: MUTED, fontSize: 10, fontWeight: '600', marginTop: 2 },
})

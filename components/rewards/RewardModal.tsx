/**
 * RewardModal — the one reusable modal for every Tanga reward (tanga-
 * economy-rework Part 5). Server-driven: it renders exactly what
 * GET /api/rewards/pending returned, computing nothing itself beyond
 * display copy/icons per `reason`.
 *
 * Multiple pending rewards show as ONE modal with an itemised list and a
 * combined total — never one modal per reward in a row. A single
 * "milestone-class" reason (challenge_complete / opening_balance — one-off,
 * not part of the daily routine) gets a larger, more celebratory treatment;
 * everything else (the daily-capped recurring events) renders compact.
 */
import React, { useEffect, useRef, useState } from 'react'
import { Modal, View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import type { RewardItem, RewardReason } from '../../lib/api'

const COPY: Record<string, { title: string; icon: string }> = {
  daily_goal_met:            { title: 'Kunlik maqsad bajarildi',        icon: '🎯' },
  threshold_60min:           { title: '1 soat o\'qidingiz',             icon: '⏱️' },
  threshold_120min:          { title: '2 soat o\'qidingiz',             icon: '🔥' },
  daily_quiz:                { title: '5 Savol yakunlandi',             icon: '🧠' },
  challenge_complete:        { title: 'Bellashuv yakunlandi',           icon: '🏆' },
  opening_balance:           { title: 'Tanga hamyoningiz tayyor',       icon: '🎁' },
  welcome_bonus:             { title: 'Xush kelibsiz sovg\'asi',        icon: '🎁' },
  study_activity_reconciled: { title: 'O\'qish uchun mukofot',          icon: '📚' },
}

// One-off, not-part-of-the-daily-routine reasons get the bigger treatment.
const MILESTONE_REASONS = new Set<string>(['challenge_complete', 'opening_balance', 'welcome_bonus'])

function copyFor(reason: RewardReason): { title: string; icon: string } {
  return COPY[reason] ?? { title: 'Yangi mukofot', icon: '🪙' }
}

function CountUp({ to, color }: { to: number; color: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const from = 0
    const duration = 700
    const start = Date.now()
    let raf: ReturnType<typeof setTimeout>
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3) // ease-out cubic
      setDisplay(Math.round(from + (to - from) * eased))
      if (p < 1) raf = setTimeout(tick, 16)
    }
    tick()
    return () => clearTimeout(raf)
  }, [to])
  return (
    <Text style={[styles.balanceNum, { color, fontFamily: typography.fontFamily.extrabold }]}>
      {display}
    </Text>
  )
}

export function RewardModal({ visible, rewards, onClose }: {
  visible: boolean
  rewards: RewardItem[]
  onClose: () => void
}) {
  const { c } = useTheme()
  const scaleAnim   = useRef(new Animated.Value(0.85)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 13, stiffness: 180 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      ]).start()
    } else {
      scaleAnim.setValue(0.85)
      opacityAnim.setValue(0)
    }
  }, [visible])

  if (rewards.length === 0) return null

  const total = rewards.reduce((s, r) => s + r.amount, 0)
  const finalBalance = rewards[rewards.length - 1].balance_after
  const isMilestone = rewards.length === 1 && MILESTONE_REASONS.has(rewards[0].reason)
  const single = rewards.length === 1 ? copyFor(rewards[0].reason) : null

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]} pointerEvents="box-none">
        <Animated.View style={[
          styles.card,
          { backgroundColor: c.bgSecondary, borderColor: c.border, transform: [{ scale: scaleAnim }] },
          isMilestone && styles.cardMilestone,
        ]}>
          <Text style={styles.bigIcon}>{isMilestone ? copyFor(rewards[0].reason).icon : '🪙'}</Text>

          <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            {single ? single.title : `${rewards.length} ta yangi mukofot`}
          </Text>

          {/* Itemised list — only shown when there's more than one, or the
              single reward isn't a milestone (milestone already has its own
              big title above and doesn't need a redundant one-line repeat). */}
          {(rewards.length > 1) && (
            <View style={[styles.list, { borderColor: c.border }]}>
              {rewards.map((r, i) => {
                const { title, icon } = copyFor(r.reason)
                return (
                  <View key={r.id} style={[styles.row, i > 0 && { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                    <Text style={styles.rowIcon}>{icon}</Text>
                    <Text style={[styles.rowTitle, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]} numberOfLines={1}>
                      {title}
                    </Text>
                    <Text style={[styles.rowAmount, { color: '#F5A623', fontFamily: typography.fontFamily.semibold }]}>
                      +{r.amount}
                    </Text>
                  </View>
                )
              })}
            </View>
          )}

          {/* Combined total + animated count-up to the new balance */}
          <View style={[styles.totalWrap, { backgroundColor: '#F5A62318' }]}>
            <Text style={[styles.totalLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              +{total} Tanga · Balans
            </Text>
            <CountUp to={finalBalance} color="#F5A623" />
          </View>

          <Pressable style={[styles.btn, { backgroundColor: c.brand }]} onPress={onClose}>
            <Text style={[styles.btnText, { color: '#fff', fontFamily: typography.fontFamily.bold }]}>
              Ajoyib!
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  overlay: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  card: {
    width:             '100%',
    maxWidth:          360,
    borderRadius:      radius.xl,
    borderWidth:       StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.xl,
    alignItems:        'center',
    gap:               spacing.md,
  },
  cardMilestone: {
    borderColor: '#F5A623',
    borderWidth: 1.5,
  },
  bigIcon: { fontSize: 44 },
  title: {
    fontSize:  typography.size.xl,
    textAlign: 'center',
  },
  list: {
    width:        '100%',
    borderWidth:  StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    overflow:     'hidden',
  },
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
  },
  rowIcon:   { fontSize: 16 },
  rowTitle:  { flex: 1, fontSize: typography.size.sm },
  rowAmount: { fontSize: typography.size.sm },
  totalWrap: {
    width:             '100%',
    borderRadius:      radius.lg,
    paddingVertical:   spacing.md,
    alignItems:        'center',
    gap:               2,
  },
  totalLabel: { fontSize: typography.size.xs },
  balanceNum: { fontSize: 28 },
  btn: {
    width:          '100%',
    paddingVertical: spacing.md,
    borderRadius:   radius.lg,
    alignItems:     'center',
    marginTop:      spacing.xs,
  },
  btnText: { fontSize: typography.size.base },
})

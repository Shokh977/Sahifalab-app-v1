/**
 * GoalCompleteModal — shown when the user first meets the daily focus goal.
 * Displays a celebratory tree, streak count, XP earned, and a motivational quote.
 */
import React, { useEffect, useRef } from 'react'
import {
  Modal, View, Text, Pressable, StyleSheet,
  Animated, Easing,
} from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { MagicTree } from './MagicTree'
import { stageFromStreak } from '../../lib/treeTheme'

interface Props {
  visible:    boolean
  streakDays: number
  xpEarned:   number
  onClose:    () => void
}

const QUOTES = [
  "Har bir kun yangi qadam — ulkan muvaffaqiyatga erishish yo'li.",
  "Izchillik — g'alaba siri. Sen bugun ham o'z ustingda ishlading!",
  "Kichik harakat katta natija beradi. Davom et!",
  "Har qadaming seni maqsadingga yaqinlashtiradi.",
  "Sen bugun ham o'z so'zingda turdingiz!",
  "Muvaffaqiyat — har kuni bir oz yaxshilanishdan iborat.",
]

export function GoalCompleteModal({ visible, streakDays, xpEarned, onClose }: Props) {
  const { c } = useTheme()
  const scaleAnim = useRef(new Animated.Value(0.7)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const quote = QUOTES[streakDays % QUOTES.length]
  const stage = stageFromStreak(streakDays)

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 180 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      ]).start()
    } else {
      scaleAnim.setValue(0.7)
      opacityAnim.setValue(0)
    }
  }, [visible])

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]} pointerEvents="box-none">
        <Animated.View style={[
          styles.card,
          { backgroundColor: c.bgSecondary, borderColor: c.border, transform: [{ scale: scaleAnim }] },
        ]}>
          {/* Tree — same MagicTree used everywhere else (streak-detail, tree-stages,
              StagesPath), not the separate lower-fidelity ui/TreeStage illustration
              this modal used to render, which visibly broke "this is my tree"
              continuity at exactly this celebratory moment. */}
          <MagicTree stage={stage} state="alive" size="card" animate={false} />

          {/* Title */}
          <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            Kunlik maqsad bajarildi!
          </Text>

          {/* Streak row */}
          <View style={[styles.streakRow, { backgroundColor: c.brandSubtle }]}>
            <Text style={styles.fireEmoji}>🔥</Text>
            <Text style={[styles.streakText, { color: c.brand, fontFamily: typography.fontFamily.bold }]}>
              {streakDays} kunlik seriya
            </Text>
          </View>

          {/* XP badge */}
          {xpEarned > 0 && (
            <View style={[styles.xpBadge, { backgroundColor: c.bgTertiary, borderColor: c.border }]}>
              <Text style={[styles.xpText, { color: c.accentSecondary, fontFamily: typography.fontFamily.semibold }]}>
                +{xpEarned} XP
              </Text>
            </View>
          )}

          {/* Quote */}
          <Text style={[styles.quote, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            "{quote}"
          </Text>

          {/* Close button */}
          <Pressable
            style={[styles.btn, { backgroundColor: c.brand }]}
            onPress={onClose}
          >
            <Text style={[styles.btnText, { color: '#fff', fontFamily: typography.fontFamily.bold }]}>
              Davom etish
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
  title: {
    fontSize:  typography.size.xl,
    textAlign: 'center',
  },
  streakRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.xs,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.xs,
    borderRadius:      radius.full,
  },
  fireEmoji: {
    fontSize: 18,
  },
  streakText: {
    fontSize: typography.size.base,
  },
  xpBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xs,
    borderRadius:      radius.md,
    borderWidth:       StyleSheet.hairlineWidth,
  },
  xpText: {
    fontSize: typography.size.sm,
  },
  quote: {
    fontSize:   typography.size.sm,
    textAlign:  'center',
    lineHeight: 20,
    fontStyle:  'italic',
  },
  btn: {
    width:          '100%',
    paddingVertical: spacing.md,
    borderRadius:   radius.lg,
    alignItems:     'center',
    marginTop:      spacing.xs,
  },
  btnText: {
    fontSize: typography.size.base,
  },
})

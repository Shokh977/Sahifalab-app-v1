/**
 * MilestoneModal — shown when the user hits a streak milestone (3/7/14/30/60/100/200/365 days).
 * Displays a large milestone number, a trophy, and bonus XP awarded.
 */
import React, { useEffect, useRef } from 'react'
import {
  Modal, View, Text, Pressable, StyleSheet,
  Animated, Easing,
} from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'

interface Props {
  visible:    boolean
  days:       number
  bonusXp:    number
  onClose:    () => void
}

// Matches the 10 canonical tree stages (streak_stages table / lib/treeTheme.ts
// TREE_STAGES) — keep in sync if the stage day-thresholds ever change.
const MILESTONE_META: Record<number, { emoji: string; title: string; color: string }> = {
  1:   { emoji: '🌰', title: 'Boshlandi!',         color: '#cd7f32' },
  3:   { emoji: '🌱', title: 'Birinchi qadam',     color: '#8fbf5f' },
  7:   { emoji: '🥈', title: 'Bir hafta!',         color: '#c0c0c0' },
  14:  { emoji: '🥇', title: 'Ikki hafta!',        color: '#FFD700' },
  30:  { emoji: '🏆', title: 'Bir oy!',            color: '#F5A623' },
  50:  { emoji: '✨', title: 'Sehrli daraxt!',     color: '#60a5fa' },
  75:  { emoji: '🦋', title: 'Gullab-yashnadi!',   color: '#f472b6' },
  120: { emoji: '📜', title: 'Qadimiy bilim!',     color: '#a78bfa' },
  200: { emoji: '☁️', title: 'Samoviy daraxt!',    color: '#38bdf8' },
  365: { emoji: '🌟', title: 'Bir yil! Efsona!',   color: '#34d399' },
}

function getMeta(days: number) {
  return MILESTONE_META[days] ?? { emoji: '🏅', title: `${days} kun!`, color: '#F5A623' }
}

export function MilestoneModal({ visible, days, bonusXp, onClose }: Props) {
  const { c } = useTheme()
  const scaleAnim   = useRef(new Animated.Value(0.6)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const meta = getMeta(days)

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 200 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 220, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      ]).start()
    } else {
      scaleAnim.setValue(0.6)
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
          { backgroundColor: c.bgSecondary, borderColor: meta.color, transform: [{ scale: scaleAnim }] },
        ]}>
          {/* Trophy emoji */}
          <Text style={styles.trophy}>{meta.emoji}</Text>

          {/* Days badge */}
          <View style={[styles.daysBadge, { backgroundColor: meta.color + '22', borderColor: meta.color + '55' }]}>
            <Text style={[styles.daysNum, { color: meta.color, fontFamily: typography.fontFamily.bold }]}>
              {days}
            </Text>
            <Text style={[styles.daysLabel, { color: meta.color, fontFamily: typography.fontFamily.medium }]}>
              KUN
            </Text>
          </View>

          <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            {meta.title}
          </Text>

          <Text style={[styles.subtitle, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Siz {days} kunlik seriyaga erishdingiz!{'\n'}Bunga ko'p odamlar erisha olmaydi.
          </Text>

          {bonusXp > 0 && (
            <View style={[styles.xpRow, { backgroundColor: c.bgTertiary, borderColor: c.border }]}>
              <Text style={styles.xpEmoji}>⚡</Text>
              <Text style={[styles.xpText, { color: c.accentPrimary, fontFamily: typography.fontFamily.bold }]}>
                +{bonusXp} bonus XP
              </Text>
            </View>
          )}

          <Pressable
            style={[styles.btn, { backgroundColor: meta.color }]}
            onPress={onClose}
          >
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
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: spacing.base,
  },
  card: {
    width:             '100%',
    maxWidth:          360,
    borderRadius:      radius.xl,
    borderWidth:       2,
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.xl,
    alignItems:        'center',
    gap:               spacing.md,
  },
  trophy: {
    fontSize: 64,
  },
  daysBadge: {
    alignItems:        'center',
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.sm,
    borderRadius:      radius.xl,
    borderWidth:       1,
  },
  daysNum: {
    fontSize:   56,
    lineHeight: 60,
  },
  daysLabel: {
    fontSize:    typography.size.sm,
    letterSpacing: 2,
  },
  title: {
    fontSize:  typography.size.xl,
    textAlign: 'center',
  },
  subtitle: {
    fontSize:   typography.size.sm,
    textAlign:  'center',
    lineHeight: 20,
  },
  xpRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.xs,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.xs,
    borderRadius:      radius.md,
    borderWidth:       StyleSheet.hairlineWidth,
  },
  xpEmoji: {
    fontSize: 16,
  },
  xpText: {
    fontSize: typography.size.sm,
  },
  btn: {
    width:           '100%',
    paddingVertical: spacing.md,
    borderRadius:    radius.lg,
    alignItems:      'center',
    marginTop:       spacing.xs,
  },
  btnText: {
    fontSize: typography.size.base,
  },
})

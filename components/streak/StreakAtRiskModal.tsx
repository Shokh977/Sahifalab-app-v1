/**
 * StreakAtRiskModal — shown when streak_state === 'at_risk': exactly one day
 * was missed and the freeze window is still open (server-side, see
 * app/services/freeze_service.py's compute_streak_state). Distinct from
 * StreakLostModal — the streak is NOT gone, it's still fully recoverable,
 * either automatically (a held freeze gets auto-applied at the user's local
 * midnight) or manually right now. Orange/urgent, not withered — reserving
 * the withered tree exclusively for the genuinely-terminal 'lost' state
 * fixes the old bug where the app declared the streak dead while it was
 * still rescuable (plan doc P2).
 */
import React, { useEffect, useRef, useState } from 'react'
import {
  Modal, View, Text, Pressable, StyleSheet,
  Animated, Easing,
} from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { MagicTree } from './MagicTree'
import { stageFromStreak } from '../../lib/treeTheme'

interface Props {
  visible:        boolean
  streakDays:     number
  freezeCount:    number
  windowClosesAt: string | null
  onClose:        () => void
  onUseFreeze?:   () => void
  onBuyFreeze?:   () => void
  onStudyNow:     () => void
}

function formatCountdown(windowClosesAt: string | null): string | null {
  if (!windowClosesAt) return null
  const remainingMs = new Date(windowClosesAt).getTime() - Date.now()
  if (remainingMs <= 0) return null
  const totalMinutes = Math.floor(remainingMs / 60_000)
  const hh = Math.floor(totalMinutes / 60)
  const mm = totalMinutes % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export function StreakAtRiskModal({
  visible, streakDays, freezeCount, windowClosesAt, onClose, onUseFreeze, onBuyFreeze, onStudyNow,
}: Props) {
  const { c } = useTheme()
  const scaleAnim   = useRef(new Animated.Value(0.8)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const [countdown, setCountdown] = useState(() => formatCountdown(windowClosesAt))

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 160 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 220, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      ]).start()
    } else {
      scaleAnim.setValue(0.8)
      opacityAnim.setValue(0)
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    setCountdown(formatCountdown(windowClosesAt))
    const id = setInterval(() => setCountdown(formatCountdown(windowClosesAt)), 30_000)
    return () => clearInterval(id)
  }, [visible, windowClosesAt])

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]} pointerEvents="box-none">
        <Animated.View style={[
          styles.card,
          { backgroundColor: c.bgSecondary, borderColor: '#f5a62355', transform: [{ scale: scaleAnim }] },
        ]}>
          <MagicTree stage={stageFromStreak(Math.max(1, streakDays))} state="at_risk" size="card" animate />

          <Text style={[styles.title, { color: '#f5a623', fontFamily: typography.fontFamily.bold }]}>
            🔥 Seriya xavf ostida!
          </Text>

          {countdown && (
            <View style={[styles.countdownRow, { backgroundColor: c.bgTertiary, borderColor: '#f5a62355' }]}>
              <Text style={[styles.countdownLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Vaqt qoldi:
              </Text>
              <Text style={[styles.countdownValue, { color: '#f5a623', fontFamily: typography.fontFamily.bold }]}>
                {countdown}
              </Text>
            </View>
          )}

          <Text style={[styles.msg, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {streakDays} kunlik seriyangizni saqlab qolish uchun bugun o'qing yoki freeze ishlating.
          </Text>

          <View style={styles.btnRow}>
            {onUseFreeze && freezeCount > 0 && (
              <Pressable
                style={[styles.freezeBtn, { backgroundColor: c.bgTertiary, borderColor: '#60a5fa55' }]}
                onPress={onUseFreeze}
              >
                <Text style={styles.freezeEmoji}>🧊</Text>
                <Text style={[styles.freezeBtnText, { color: '#60a5fa', fontFamily: typography.fontFamily.semibold }]}>
                  Muzlatish ({freezeCount})
                </Text>
              </Pressable>
            )}
            {onBuyFreeze && freezeCount === 0 && (
              <Pressable
                style={[styles.freezeBtn, { backgroundColor: c.bgTertiary, borderColor: '#60a5fa55' }]}
                onPress={onBuyFreeze}
              >
                <Text style={styles.freezeEmoji}>🧊</Text>
                <Text style={[styles.freezeBtnText, { color: '#60a5fa', fontFamily: typography.fontFamily.semibold }]}>
                  Muzlatish sotib ol
                </Text>
              </Pressable>
            )}
          </View>

          <Pressable style={[styles.studyBtn, { backgroundColor: '#f5a623' }]} onPress={onStudyNow}>
            <Text style={[styles.studyBtnText, { fontFamily: typography.fontFamily.bold }]}>
              Hozir o'qish
            </Text>
          </Pressable>

          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[styles.dismiss, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              Keyinroq
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
    borderWidth:       1.5,
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.xl,
    alignItems:        'center',
    gap:               spacing.md,
  },
  title: {
    fontSize: typography.size.xl,
  },
  countdownRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.xs,
    borderRadius:      radius.md,
    borderWidth:       1,
  },
  countdownLabel: { fontSize: typography.size.sm },
  countdownValue: { fontSize: typography.size.base, fontVariant: ['tabular-nums'] },
  msg: {
    fontSize:   typography.size.sm,
    textAlign:  'center',
    lineHeight: 20,
  },
  btnRow: {
    width:         '100%',
    flexDirection: 'row',
    gap:           spacing.sm,
  },
  freezeBtn: {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             4,
    paddingVertical: spacing.md,
    borderRadius:    radius.lg,
    borderWidth:     1,
  },
  freezeEmoji: { fontSize: 16 },
  freezeBtnText: { fontSize: typography.size.sm },
  studyBtn: {
    width:              '100%',
    paddingVertical:    spacing.md,
    paddingHorizontal:  spacing.lg,
    borderRadius:       radius.lg,
    alignItems:         'center',
  },
  studyBtnText: {
    fontSize: typography.size.base,
    color:    '#fff',
  },
  dismiss: {
    fontSize: typography.size.sm,
  },
})

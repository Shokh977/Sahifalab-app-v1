/**
 * StreakLostModal — shown when the user opens the app and their streak has been broken.
 * Wilted tree, previous streak count, and encouragement to start again.
 */
import React, { useEffect, useRef } from 'react'
import {
  Modal, View, Text, Pressable, StyleSheet,
  Animated, Easing,
} from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { TreeStage, treeStageFromStreak } from '../ui/TreeStage'

interface Props {
  visible:      boolean
  prevStreak:   number
  freezeCount:  number
  onClose:      () => void
  onUseFreeze?: () => void
}

const ENCOURAGEMENTS = [
  "Yiqilish — g'alaba emas, turishni o'rganish.",
  "Bugun yangidan boshla, kecha o'tdi — bugun imkoniyat!",
  "Har yangi kun — yangi boshlash imkoniyati.",
  "Seriya yo'qolishi — hammaga bo'ladi. Muhimi davom etish.",
  "O'tgan kunlar o'rgatdi — bugun yanada kuchliroq bo'lasan.",
]

export function StreakLostModal({ visible, prevStreak, freezeCount, onClose, onUseFreeze }: Props) {
  const { c } = useTheme()
  const scaleAnim   = useRef(new Animated.Value(0.8)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const msg = ENCOURAGEMENTS[prevStreak % ENCOURAGEMENTS.length]

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
          {/* Wilted tree */}
          <TreeStage stage={treeStageFromStreak(Math.max(1, prevStreak))} health="wilting" size={100} />

          <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            Seriya uzildi
          </Text>

          {prevStreak > 0 && (
            <View style={[styles.prevRow, { backgroundColor: c.bgTertiary, borderColor: c.border }]}>
              <Text style={[styles.prevText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Avvalgi seriya:{'  '}
              </Text>
              <Text style={[styles.prevDays, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
                🔥 {prevStreak} kun
              </Text>
            </View>
          )}

          <Text style={[styles.msg, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {msg}
          </Text>

          {/* Action buttons */}
          <View style={styles.btnRow}>
            {onUseFreeze && freezeCount > 0 && (
              <Pressable
                style={[styles.freezeBtn, { backgroundColor: c.bgTertiary, borderColor: '#60a5fa' + '55' }]}
                onPress={onUseFreeze}
              >
                <Text style={styles.freezeEmoji}>🧊</Text>
                <Text style={[styles.freezeBtnText, { color: '#60a5fa', fontFamily: typography.fontFamily.semibold }]}>
                  Muzlatish ({freezeCount})
                </Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.btn, { backgroundColor: c.brand, flex: onUseFreeze && freezeCount > 0 ? 1 : undefined }]}
              onPress={onClose}
            >
              <Text style={[styles.btnText, { color: '#fff', fontFamily: typography.fontFamily.bold }]}>
                Qaytadan boshlash
              </Text>
            </Pressable>
          </View>
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
    borderWidth:       StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.xl,
    alignItems:        'center',
    gap:               spacing.md,
  },
  title: {
    fontSize: typography.size.xl,
  },
  prevRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.xs,
    borderRadius:      radius.md,
    borderWidth:       StyleSheet.hairlineWidth,
  },
  prevText: {
    fontSize: typography.size.sm,
  },
  prevDays: {
    fontSize: typography.size.sm,
  },
  msg: {
    fontSize:   typography.size.sm,
    textAlign:  'center',
    lineHeight: 20,
    fontStyle:  'italic',
  },
  btnRow: {
    width:     '100%',
    flexDirection: 'row',
    gap:       spacing.sm,
    marginTop: spacing.xs,
  },
  freezeBtn: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            4,
    paddingVertical: spacing.md,
    borderRadius:   radius.lg,
    borderWidth:    1,
  },
  freezeEmoji: {
    fontSize: 16,
  },
  freezeBtnText: {
    fontSize: typography.size.sm,
  },
  btn: {
    flex:               1,
    paddingVertical:    spacing.md,
    paddingHorizontal:  spacing.lg,
    borderRadius:       radius.lg,
    alignItems:         'center',
  },
  btnText: {
    fontSize: typography.size.base,
  },
})

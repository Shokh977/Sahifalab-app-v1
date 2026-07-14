import React, { useEffect, useRef } from 'react'
import { Modal, View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { getBadgeEmoji, getTierColor, isStageBadge, stageNum } from '../../lib/badges'
import { MagicTree } from '../streak/MagicTree'
import type { StageNumber } from '../../lib/treeTheme'
import type { Badge } from '../../lib/api'

interface Props {
  badge:   Badge | null
  onClose: () => void
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function BadgeDetailSheet({ badge, onClose }: Props) {
  const { c }  = useTheme()
  const insets = useSafeAreaInsets()
  const slideAnim   = useRef(new Animated.Value(400)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (badge) {
      Animated.parallel([
        Animated.timing(slideAnim,   { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start()
    } else {
      slideAnim.setValue(400)
      opacityAnim.setValue(0)
    }
  }, [badge])

  if (!badge) return null

  const isChallenge = badge.group === 'challenges'
  const isStage = badge.group === 'stages' && isStageBadge(badge.key)
  const color = isChallenge ? (badge.challenge_color || '#F5A623') : getTierColor(badge.tier)

  return (
    <Modal transparent visible={!!badge} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <View style={styles.wrap} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: c.bgSecondary, paddingBottom: insets.bottom + spacing.lg, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.handle} />
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <X size={20} color={c.textSecondary} />
          </Pressable>

          {isStage ? (
            <View style={[styles.treeWrap, { backgroundColor: color + '18', opacity: badge.earned ? 1 : 0.45 }]}>
              {/* Full-detail tree here — plenty of room, no "mushing" concern like the small grid tile */}
              <MagicTree stage={stageNum(badge.key) as StageNumber} state="alive" size="thumb" animate={badge.earned} />
            </View>
          ) : (
            <View style={[styles.artWrap, { backgroundColor: color + '22', borderColor: color, opacity: badge.earned ? 1 : 0.45 }]}>
              <Text style={styles.art}>{getBadgeEmoji(badge.key)}</Text>
            </View>
          )}

          <Text style={[styles.name, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            {badge.name}
          </Text>

          {!badge.earned && (
            <View style={[styles.lockedPill, { backgroundColor: c.bgTertiary }]}>
              <Text style={[styles.lockedPillText, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
                🔒 Hali qo'lga kiritilmagan
              </Text>
            </View>
          )}

          <Text style={[styles.desc, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {badge.description}
          </Text>

          {badge.earned && badge.earned_at && (
            <Text style={[styles.earnedAt, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              {fmtDate(badge.earned_at)} kuni qo'lga kiritildi
            </Text>
          )}

          {isChallenge && badge.reward_xp ? (
            <View style={[styles.xpRow, { backgroundColor: c.bgTertiary }]}>
              <Text style={styles.xpEmoji}>⚡</Text>
              <Text style={[styles.xpText, { color: c.accentPrimary, fontFamily: typography.fontFamily.bold }]}>
                +{badge.reward_xp} XP mukofot
              </Text>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  wrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md,
    alignItems: 'center', gap: spacing.xs,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.4)', marginBottom: spacing.sm },
  closeBtn: { position: 'absolute', top: spacing.md, right: spacing.md },
  artWrap: {
    width: 88, height: 88, borderRadius: 44, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm,
  },
  art: { fontSize: 44 },
  treeWrap: {
    width: 100, height: 116, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'flex-end', marginTop: spacing.sm,
    overflow: 'hidden',
  },
  name: { fontSize: typography.size.lg, textAlign: 'center', marginTop: spacing.sm },
  lockedPill: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.full },
  lockedPillText: { fontSize: 12 },
  desc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: spacing.xs },
  earnedAt: { fontSize: 12, marginTop: 2 },
  xpRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.base, paddingVertical: spacing.xs,
    borderRadius: radius.md, marginTop: spacing.sm,
  },
  xpEmoji: { fontSize: 14 },
  xpText: { fontSize: 13 },
})

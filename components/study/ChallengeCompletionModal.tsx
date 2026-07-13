import React, { useEffect, useRef, useState } from 'react'
import {
  Modal, View, Text, Pressable, StyleSheet,
  Animated, Easing,
} from 'react-native'
import ViewShot from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import { LinearGradient } from 'expo-linear-gradient'
import { Trophy, Medal, Share2 } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { challenges as challengesApi } from '../../lib/api'

export interface CompletedChallenge {
  slug:      string
  title:     string
  reward_xp: number
  badge_key: string | null
}

interface Props {
  visible:   boolean
  challenge: CompletedChallenge | null
  onClose:   () => void
}

/**
 * Shown once per challenge completion (queued alongside level-up/achievement/
 * milestone overlays in study.tsx). Rank is fetched fresh here rather than
 * passed in — challenge_service.py's completion payload doesn't compute it
 * (that would mean an extra ranked query on every session, not just on the
 * rare completion event).
 */
export function ChallengeCompletionModal({ visible, challenge, onClose }: Props) {
  const { c } = useTheme()
  const scaleAnim   = useRef(new Animated.Value(0.6)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const viewShotRef = useRef<ViewShot>(null)
  const [rank, setRank]       = useState<number | null>(null)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    if (visible && challenge) {
      setRank(null)
      challengesApi.get(challenge.slug).then(d => setRank(d.rank ?? null)).catch(() => {})
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 200 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 220, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      ]).start()
    } else {
      scaleAnim.setValue(0.6)
      opacityAnim.setValue(0)
    }
  }, [visible, challenge?.slug])

  if (!challenge) return null

  async function handleShare() {
    if (!viewShotRef.current || sharing) return
    try {
      setSharing(true)
      const uri = await (viewShotRef.current as any).capture()
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Ulashish' })
    } catch {}
    finally { setSharing(false) }
  }

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]} pointerEvents="box-none">
        <Animated.View style={[styles.cardWrap, { transform: [{ scale: scaleAnim }] }]}>
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
            <LinearGradient
              colors={['#F5A623', '#E8871A']}
              style={styles.card}
            >
              <Trophy size={56} color="#fff" />

              <Text style={[styles.title, { fontFamily: typography.fontFamily.bold }]}>
                Musobaqa yakunlandi!
              </Text>
              <Text numberOfLines={2} style={[styles.challengeTitle, { fontFamily: typography.fontFamily.semibold }]}>
                {challenge.title}
              </Text>

              <View style={styles.statsRow}>
                {challenge.reward_xp > 0 && (
                  <View style={styles.statChip}>
                    <Text style={styles.statEmoji}>⚡</Text>
                    <Text style={[styles.statText, { fontFamily: typography.fontFamily.bold }]}>
                      +{challenge.reward_xp} XP
                    </Text>
                  </View>
                )}
                {rank != null && (
                  <View style={styles.statChip}>
                    <Medal size={14} color="#fff" />
                    <Text style={[styles.statText, { fontFamily: typography.fontFamily.bold }]}>
                      #{rank} o'rin
                    </Text>
                  </View>
                )}
              </View>

              {challenge.badge_key && (
                <View style={styles.badgeRow}>
                  <Text style={[styles.badgeText, { fontFamily: typography.fontFamily.medium }]}>
                    🏅 Yangi belgi qo'lga kiritildi
                  </Text>
                </View>
              )}

              <Text style={[styles.brand, { fontFamily: typography.fontFamily.regular }]}>
                SAHIFALAB
              </Text>
            </LinearGradient>
          </ViewShot>

          <View style={[styles.actions, { backgroundColor: c.bgSecondary }]}>
            <Pressable
              style={[styles.actionBtn, styles.shareBtn, { borderColor: c.border, opacity: sharing ? 0.6 : 1 }]}
              onPress={handleShare}
              disabled={sharing}
            >
              <Share2 size={16} color={c.textPrimary} />
              <Text style={[styles.actionText, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                Ulashish
              </Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, { backgroundColor: '#F5A623' }]} onPress={onClose}>
              <Text style={[styles.actionText, { color: '#fff', fontFamily: typography.fontFamily.bold }]}>
                Yopish
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlay: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.base,
  },
  cardWrap: { width: '100%', maxWidth: 360, gap: spacing.sm },
  card: {
    borderRadius:      radius.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.xl,
    alignItems:        'center',
    gap:               spacing.sm,
  },
  title: { fontSize: typography.size.xl, color: '#fff', textAlign: 'center' },
  challengeTitle: { fontSize: typography.size.base, color: '#fff', opacity: 0.95, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: radius.full,
  },
  statEmoji: { fontSize: 13 },
  statText:  { fontSize: 13, color: '#fff' },
  badgeRow: { marginTop: spacing.xs },
  badgeText: { fontSize: 12, color: '#fff', opacity: 0.9 },
  brand: { fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 2, marginTop: spacing.xs },

  actions: { flexDirection: 'row', gap: spacing.sm, borderRadius: radius.lg, padding: spacing.xs },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: spacing.sm + 2, borderRadius: radius.md,
  },
  shareBtn: { borderWidth: 1 },
  actionText: { fontSize: 14 },
})

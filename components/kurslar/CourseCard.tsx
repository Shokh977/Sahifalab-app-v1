import React, { useRef, useState } from 'react'
import { View, Text, Image, Pressable, StyleSheet, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Star, Users, Clock, ChevronRight, Heart } from 'lucide-react-native'
import { typography, radius as radiusTokens } from '../../lib/constants'
import { coursesStrings as s } from '../../lib/coursesStrings'
import { ImagePlaceholderMark } from './icons'
import type { Course } from '../../lib/api'
import type { PremiumTheme } from '../../lib/premiumTheme'

function formatDuration(totalMinutes: number): string | null {
  if (!totalMinutes || totalMinutes <= 0) return null
  const h = Math.floor(totalMinutes / 60)
  if (h >= 1) return s.durationHours(h)
  return s.durationMinutes(totalMinutes)
}

interface Props {
  course:   Course
  t:        PremiumTheme
  isSaved:  boolean
  onPress:  () => void
  onToggleSave: () => void
}

export function CourseCard({ course, t, isSaved, onPress, onToggleSave }: Props) {
  const [pressed, setPressed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const confirmAnim = useRef(new Animated.Value(0)).current
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const duration = formatDuration(course.total_duration_minutes)
  const hasRating = (course.rating ?? 0) > 0

  const handleLongPress = () => {
    onToggleSave()
    setConfirming(true)
    Animated.sequence([
      Animated.timing(confirmAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(confirmAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setConfirming(false))
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={handleLongPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      delayLongPress={420}
      style={[
        styles.card,
        {
          backgroundColor: t.card,
          borderColor: pressed ? 'rgba(232,144,11,.45)' : t.cardBorder,
        },
        t.cardShadow ? t.cardShadow : null,
      ]}
      accessibilityRole="button"
    >
      <View style={styles.thumbWrap}>
        {course.thumbnail_url ? (
          <Image source={{ uri: course.thumbnail_url }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <LinearGradient colors={t.thumbPlaceholder} style={[styles.thumb, styles.thumbCenter]}>
            <ImagePlaceholderMark size={22} color={t.textTertiary} />
          </LinearGradient>
        )}
        {isSaved && (
          <View style={styles.savedMark}>
            <Heart size={11} color="#fff" fill="#fff" strokeWidth={0} />
          </View>
        )}
        {confirming && (
          <Animated.View style={[styles.confirmPill, { opacity: confirmAnim }]}>
            <Text style={styles.confirmText}>{isSaved ? s.savedConfirm : s.removedConfirm}</Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.body}>
        {!!course.categories?.name && (
          <Text numberOfLines={1} style={[styles.categoryEyebrow, { color: t.categoryEyebrow }]}>
            {course.categories.name.toUpperCase()}
          </Text>
        )}
        <Text numberOfLines={2} style={[styles.title, { color: t.textPrimary }]}>
          {course.title}
        </Text>

        <View style={styles.metaRow}>
          {hasRating && (
            <View style={styles.metaItem}>
              <Star size={11} color="#E8900B" fill="#E8900B" strokeWidth={0} />
              <Text style={[styles.metaTextBold, { color: t.textSecondary }]} numberOfLines={1}>
                {course.rating!.toFixed(1)}
              </Text>
            </View>
          )}
          {course.enrolled_count > 0 && (
            <View style={styles.metaItem}>
              <Users size={11} color={t.textTertiary} strokeWidth={2} />
              <Text style={[styles.metaText, { color: t.textSecondary }]} numberOfLines={1}>
                {course.enrolled_count.toLocaleString()}
              </Text>
            </View>
          )}
          {!!duration && (
            <View style={styles.metaItem}>
              <Clock size={11} color={t.textTertiary} strokeWidth={2} />
              <Text style={[styles.metaText, { color: t.textSecondary }]} numberOfLines={1}>
                {duration}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomRow}>
          {course.is_paid ? (
            <Text style={[styles.price, { color: t.accentText }]} numberOfLines={1}>
              {course.price.toLocaleString()} {s.somUnit}
            </Text>
          ) : (
            <Text style={[styles.price, { color: t.free }]} numberOfLines={1}>{s.free}</Text>
          )}
          <View style={[styles.chevronBtn, { backgroundColor: t.accentSoft }]}>
            <ChevronRight size={14} color={t.accentText} strokeWidth={2.4} />
          </View>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    gap: 13,
    minHeight: 44,
  },
  thumbWrap: { flexShrink: 0, position: 'relative' },
  thumb: { width: 88, height: 88, borderRadius: 15 },
  thumbCenter: { alignItems: 'center', justifyContent: 'center' },
  savedMark: {
    position: 'absolute', top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(28,25,23,.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  confirmPill: {
    position: 'absolute', bottom: 6, left: 4, right: 4,
    backgroundColor: 'rgba(28,25,23,.85)',
    borderRadius: 8,
    paddingVertical: 3,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 9.5,
    fontFamily: typography.fontFamily.bold,
    color: '#fff',
  },

  body: { flex: 1, minWidth: 0 },
  categoryEyebrow: {
    fontSize: 10,
    fontFamily: typography.fontFamily.extrabold,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 14.5,
    fontFamily: typography.fontFamily.bold,
    lineHeight: 18.9,
    marginTop: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginTop: 6,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11.5, fontFamily: typography.fontFamily.semibold },
  metaTextBold: { fontSize: 11.5, fontFamily: typography.fontFamily.bold },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 8,
  },
  price: { fontSize: 14, fontFamily: typography.fontFamily.extrabold },
  chevronBtn: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
})

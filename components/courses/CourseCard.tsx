import React from 'react'
import { View, Text, Image, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import type { Course } from '../../lib/api'

const LEVEL_LABEL: Record<string, string> = {
  beginner:     'Boshlang\'ich',
  intermediate: 'O\'rta',
  advanced:     'Murakkab',
}

interface Props {
  course:        Course
  onPress:       () => void
  compact?:      boolean
  delayPressIn?: number
}

export function CourseCard({ course, onPress, compact = false, delayPressIn = 0 }: Props) {
  const { c } = useTheme()

  const durationH = Math.floor((course.total_duration_minutes ?? 0) / 60)
  const durationM = (course.total_duration_minutes ?? 0) % 60
  const durationStr = durationH > 0
    ? `${durationH}s ${durationM}d`
    : `${durationM} daqiqa`

  const ratingStr = course.rating ? course.rating.toFixed(1) : null

  if (compact) {
    return (
      <Pressable onPress={onPress} unstable_pressDelay={delayPressIn} style={[styles.compact, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
        {course.thumbnail_url ? (
          <Image source={{ uri: course.thumbnail_url }} style={styles.compactThumb} />
        ) : (
          <View style={[styles.compactThumb, { backgroundColor: c.brandSubtle, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 28 }}>📚</Text>
          </View>
        )}
        <View style={styles.compactInfo}>
          <Text numberOfLines={2} style={[styles.compactTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            {course.title}
          </Text>
          <Text numberOfLines={1} style={[styles.meta, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {course.total_lessons} dars · {durationStr}
          </Text>
          <View style={styles.priceRow}>
            {course.is_paid ? (
              <Text style={[styles.price, { color: c.brand, fontFamily: typography.fontFamily.bold }]}>
                {course.price.toLocaleString()} so'm
              </Text>
            ) : (
              <Text style={[styles.free, { color: c.success ?? '#4ade80', fontFamily: typography.fontFamily.semibold }]}>
                Bepul
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    )
  }

  return (
    <Pressable onPress={onPress} unstable_pressDelay={delayPressIn} style={[styles.card, { backgroundColor: c.bgSecondary }]}>
      {/* Thumbnail */}
      {course.thumbnail_url ? (
        <Image source={{ uri: course.thumbnail_url }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, { backgroundColor: c.brandSubtle, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 48 }}>📚</Text>
        </View>
      )}

      {/* Price badge */}
      <View style={[styles.priceBadge, { backgroundColor: course.is_paid ? c.brand : c.success ?? '#4ade80' }]}>
        <Text style={[styles.priceBadgeText, { fontFamily: typography.fontFamily.bold }]}>
          {course.is_paid ? `${course.price.toLocaleString()} so'm` : 'Bepul'}
        </Text>
      </View>

      <View style={styles.body}>
        {/* Category + level */}
        {(course.categories || course.level) && (
          <View style={styles.tagsRow}>
            {course.categories && (
              <View style={[styles.tag, { backgroundColor: c.brandSubtle }]}>
                <Text style={[styles.tagText, { color: c.brand, fontFamily: typography.fontFamily.medium }]}>
                  {course.categories.icon} {course.categories.name}
                </Text>
              </View>
            )}
            <View style={[styles.tag, { backgroundColor: c.bgTertiary }]}>
              <Text style={[styles.tagText, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
                {LEVEL_LABEL[course.level] ?? course.level}
              </Text>
            </View>
          </View>
        )}

        <Text numberOfLines={2} style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          {course.title}
        </Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {ratingStr && (
            <Text style={[styles.stat, { color: c.warning ?? '#fbbf24', fontFamily: typography.fontFamily.medium }]}>
              ⭐ {ratingStr}
            </Text>
          )}
          <Text style={[styles.stat, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {course.total_lessons} dars
          </Text>
          <Text style={[styles.stat, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {durationStr}
          </Text>
          <Text style={[styles.stat, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {course.enrolled_count} o'quvchi
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    overflow:     'hidden',
    marginBottom: spacing.sm,
  },
  thumb: {
    width:  '100%',
    height: 180,
  },
  priceBadge: {
    position:          'absolute',
    top:               spacing.sm,
    right:             spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.xs,
    borderRadius:      radius.full,
  },
  priceBadgeText: {
    color:    '#fff',
    fontSize: typography.size.xs,
  },
  body: {
    padding: spacing.sm,
    gap:     spacing.xs,
  },
  tagsRow: {
    flexDirection: 'row',
    gap:           spacing.xs,
    flexWrap:      'wrap',
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical:   4,
    borderRadius:      radius.full,
  },
  tagText: { fontSize: typography.size.xs },
  title: {
    fontSize: typography.size.md,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    flexWrap:      'wrap',
  },
  stat: { fontSize: typography.size.xs },
  // compact variant
  compact: {
    flexDirection: 'row',
    borderRadius:  radius.sm,
    borderWidth:   1,
    overflow:      'hidden',
    marginBottom:  spacing.xs,
  },
  compactThumb: {
    width:  80,
    height: 80,
  },
  compactInfo: {
    flex:    1,
    padding: spacing.sm,
    gap:     spacing.xs,
  },
  compactTitle: { fontSize: typography.size.sm, lineHeight: 18 },
  meta:  { fontSize: typography.size.xs },
  priceRow: { flexDirection: 'row' },
  price: { fontSize: typography.size.sm },
  free:  { fontSize: typography.size.sm },
})

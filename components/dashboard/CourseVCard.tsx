/**
 * Vertical (full-width) course card for the Recommended section.
 */
import React from 'react'
import { View, Text, Image, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { Star, Clock, Users } from 'phosphor-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, radius, spacing } from '../../lib/constants'
import type { Course } from '../../lib/api'

interface Props {
  course: Course
}

export function CourseVCard({ course }: Props) {
  const { c }  = useTheme()
  const router = useRouter()

  return (
    <Pressable
      onPress={() => router.push(`/(screens)/course/${course.id}` as any)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.bgSecondary, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {course.thumbnail_url ? (
        <Image source={{ uri: course.thumbnail_url }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, { backgroundColor: c.bgTertiary }]} />
      )}
      <View style={styles.body}>
        {course.categories && (
          <Text style={[styles.cat, { color: c.accentPrimary, fontFamily: typography.fontFamily.medium }]}>
            {course.categories.icon ? `${course.categories.icon} ` : ''}{course.categories.name}
          </Text>
        )}
        <Text
          style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}
          numberOfLines={2}
        >
          {course.title}
        </Text>
        <View style={styles.meta}>
          {course.rating !== null && (
            <View style={styles.metaItem}>
              <Star size={13} color={c.warning} weight="fill" />
              <Text style={[styles.metaText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                {course.rating.toFixed(1)}
              </Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Clock size={13} color={c.textDisabled} weight="regular" />
            <Text style={[styles.metaText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              {course.total_duration_minutes} daq
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Users size={13} color={c.textDisabled} weight="regular" />
            <Text style={[styles.metaText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              {course.enrolled_count.toLocaleString()}
            </Text>
          </View>
          <View style={styles.priceBadge}>
            <Text style={[styles.priceText, { color: course.is_paid ? c.textPrimary : c.success, fontFamily: typography.fontFamily.semibold }]}>
              {course.is_paid ? `${course.price.toLocaleString()} so'm` : 'Bepul'}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius:  radius.cardLg,
    borderWidth:   1,
    overflow:      'hidden',
    flexDirection: 'row',
  },
  thumb: {
    width:  110,
    height: 110,
  },
  body: {
    flex:    1,
    padding: spacing.sm + 4,
    gap:     4,
    justifyContent: 'center',
  },
  cat:   { fontSize: typography.size.xs },
  title: { fontSize: typography.size.sm, lineHeight: 18 },
  meta:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2, alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: typography.size.xs },
  priceBadge: { marginLeft: 'auto' },
  priceText:  { fontSize: typography.size.xs },
})

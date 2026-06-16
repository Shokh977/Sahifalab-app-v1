import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useTheme } from '../../hooks/useTheme'
import { typography, radius, spacing } from '../../lib/constants'
import type { Course } from '../../lib/api'

interface Props {
  course:   Course
  progress: number // 0-1
}

export const CourseHCard = React.memo(function CourseHCard({ course, progress }: Props) {
  const { c }  = useTheme()
  const router = useRouter()
  const pct    = Math.round(progress * 100)

  return (
    <Pressable
      onPress={() => router.push(`/(screens)/course/${course.id}` as any)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.bgSecondary, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {course.thumbnail_url ? (
        <Image source={{ uri: course.thumbnail_url }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <View style={[styles.thumb, { backgroundColor: c.bgTertiary }]} />
      )}
      <View style={styles.body}>
        <Text
          style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}
          numberOfLines={2}
        >
          {course.title}
        </Text>
        {course.categories && (
          <Text style={[styles.cat, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {course.categories.icon ? `${course.categories.icon} ` : ''}{course.categories.name}
          </Text>
        )}
        <View style={styles.progressWrap}>
          <View style={[styles.track, { backgroundColor: c.bgTertiary }]}>
            <View
              style={[
                styles.fill,
                { width: `${pct}%`, backgroundColor: c.accentPrimary },
              ]}
            />
          </View>
          <Text style={[styles.pct, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
            {pct}%
          </Text>
        </View>
      </View>
    </Pressable>
  )
})

const styles = StyleSheet.create({
  card: {
    width:        200,
    borderRadius: radius.card,
    borderWidth:  1,
    overflow:     'hidden',
  },
  thumb: {
    width:  '100%',
    height: 110,
  },
  body: {
    padding: spacing.sm + 4,
    gap:     4,
  },
  title: { fontSize: typography.size.sm, lineHeight: 18 },
  cat:   { fontSize: typography.size.xs, lineHeight: 14 },

  progressWrap: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    marginTop:     4,
  },
  track: {
    flex:         1,
    height:       4,
    borderRadius: 2,
    overflow:     'hidden',
  },
  fill: {
    height:       4,
    borderRadius: 2,
  },
  pct: { fontSize: typography.size.xs },
})

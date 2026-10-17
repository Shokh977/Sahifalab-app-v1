/**
 * Course detail while its requests are in flight: the header, cover and
 * title paint at once from the list row already in memory
 * (lib/coursePreview), with skeletons for everything still loading.
 * Without a cached row (deep link, cold start) the header shows skeletons.
 */
import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import type { Course } from '../../lib/api'
import { useTheme } from '../../src/design/ThemeProvider'
import { layout, radius, space } from '../../src/design/spacing'
import { type as typeScale } from '../../src/design/typography'
import { ScreenHeader, SkeletonBlock, SkeletonLine, SkeletonRow } from '../../src/components/ui'

const COVER_RATIO = 16 / 9
const LESSON_ROWS = 5

export function CourseDetailSkeleton({ preview, onBack }: { preview: Course | null; onBack: () => void }) {
  const { colors } = useTheme()
  const teacher = preview?.teacher?.first_name

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]} accessibilityLabel="Kurs yuklanmoqda">
      <ScreenHeader onBack={onBack} />
      <ScrollView contentContainerStyle={styles.body} scrollEnabled={false}>
        {preview?.thumbnail_url ? (
          <Image
            source={{ uri: preview.thumbnail_url }}
            style={[styles.cover, { backgroundColor: colors.surfaceRaised }]}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <SkeletonBlock height="auto" borderRadius={radius.lg} style={styles.cover} />
        )}

        <View style={styles.titleBlock}>
          {preview?.title ? (
            <Text style={[typeScale.title2, { color: colors.text }]} numberOfLines={3}>{preview.title}</Text>
          ) : (
            <>
              <SkeletonLine width="85%" />
              <SkeletonLine width="55%" />
            </>
          )}
          {teacher ? (
            <Text style={[typeScale.callout, { color: colors.textMuted }]} numberOfLines={1}>{teacher}</Text>
          ) : (
            <SkeletonLine width="35%" />
          )}
        </View>

        <View>
          {Array.from({ length: LESSON_ROWS }, (_, i) => <SkeletonRow key={i} />)}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: layout.gutter, paddingBottom: space.xxl, gap: layout.sectionGap },
  cover: { width: '100%', aspectRatio: COVER_RATIO, borderRadius: radius.lg },
  titleBlock: { gap: space.xs },
})

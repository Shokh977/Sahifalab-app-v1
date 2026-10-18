/**
 * Course detail while its requests are in flight: the cover and title paint
 * at once from the list row already in memory (lib/coursePreview), in the
 * same layout as the course page (16:9 cover with a circular back button,
 * title below), with skeletons for everything still loading. Without a
 * cached row (deep link, cold start) those show skeletons too.
 */
import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft } from 'lucide-react-native'
import type { Course } from '../../lib/api'
import { useTheme } from '../../src/design/ThemeProvider'
import { iconSize, iconStroke, layout, radius, space } from '../../src/design/spacing'
import { imageChip, onImage } from '../../src/design/tokens'
import { type as typeScale } from '../../src/design/typography'
import { Pressable, SkeletonLine, SkeletonRow } from '../../src/components/ui'
import { uzText } from '../../src/features/today/today'
import { courseMeta } from '../../src/features/courses/courses'

const LESSON_ROWS = 5

export function CourseDetailSkeleton({ preview, onBack }: { preview: Course | null; onBack: () => void }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top }]} accessibilityLabel="Kurs yuklanmoqda">
      <ScrollView scrollEnabled={false}>
        <View style={[styles.cover, { backgroundColor: colors.surfaceRaised }]}>
          {preview?.thumbnail_url ? (
            <Image source={{ uri: preview.thumbnail_url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
          ) : null}
          <Pressable onPress={onBack} hitSlop={space.xxs} accessibilityLabel="Orqaga" style={[styles.back, { backgroundColor: imageChip }]}>
            <ChevronLeft size={iconSize.md} color={onImage} strokeWidth={iconStroke} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.titleBlock}>
            {preview?.title ? (
              <>
                <Text style={[typeScale.title1, { color: colors.text }]} numberOfLines={3}>{uzText(preview.title)}</Text>
                <Text style={[typeScale.callout, { color: colors.textMuted }]} numberOfLines={1}>{courseMeta(preview)}</Text>
              </>
            ) : (
              <>
                <SkeletonLine width="85%" />
                <SkeletonLine width="55%" />
              </>
            )}
          </View>
          <View>
            {Array.from({ length: LESSON_ROWS }, (_, i) => <SkeletonRow key={i} />)}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const CIRCLE = layout.minTouch - space.xs

const styles = StyleSheet.create({
  root: { flex: 1 },
  cover: { width: '100%', aspectRatio: 16 / 9 },
  back: {
    position: 'absolute', top: space.xs, left: space.xs,
    width: CIRCLE, height: CIRCLE, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center',
  },
  body: { paddingHorizontal: layout.gutter, paddingTop: space.lg, gap: layout.sectionGap },
  titleBlock: { gap: space.xs },
})

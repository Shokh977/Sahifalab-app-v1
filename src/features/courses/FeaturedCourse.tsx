/**
 * The one featured course: a 16:9 cover with the title below it (never on
 * the image), the meta line and the price.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import type { Course } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { radius, space } from '../../design/spacing'
import { tabular, type as typeScale } from '../../design/typography'
import { Card } from '../../components/ui'
import { uzText } from '../today/today'
import { courseMeta, isFree, priceLabel } from './courses'

export function FeaturedCourse({ course, onPress }: { course: Course; onPress: () => void }) {
  const { colors } = useTheme()
  const title = uzText(course.title)
  return (
    <Card variant="pressable" onPress={onPress} accessibilityLabel={`${title}, ${priceLabel(course)}`}>
      <View style={styles.body}>
        <Image
          source={{ uri: course.thumbnail_url ?? undefined }}
          style={[styles.cover, { backgroundColor: colors.surfaceRaised }]}
          contentFit="cover"
          cachePolicy="memory-disk"
          accessibilityIgnoresInvertColors
        />
        <View style={styles.text}>
          <Text style={[typeScale.title2, { color: colors.text }]} numberOfLines={2}>{title}</Text>
          <Text style={[typeScale.callout, { color: colors.textMuted }]} numberOfLines={1}>{courseMeta(course)}</Text>
        </View>
        <Text style={[typeScale.headline, tabular, { color: isFree(course) ? colors.successText : colors.text }]}>
          {priceLabel(course)}
        </Text>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  body: { gap: space.sm },
  cover: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.md },
  text: { gap: space.xxs },
})

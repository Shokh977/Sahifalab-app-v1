/**
 * The one extra slot on Bugun: the weekly review on Mondays; otherwise,
 * for a user with no enrolment, one recommended course (a card row with a
 * 16:9 thumbnail, Phase 7.5 C5); otherwise nothing.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { BookOpen, ChevronRight, NotebookPen } from 'lucide-react-native'
import type { Course } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { iconSize, iconStroke, radius, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Card, ListRow, SectionTitle } from '../../components/ui'
import { courseMeta } from '../courses/courses'
import { isMonday, uzText } from './today'

const THUMB_W = 96

export interface ExtraSlotProps {
  now: number
  hasEnrolment: boolean
  recommended: Course | null
  onWeeklyReview: () => void
  onCourse: (id: number) => void
}

export function ExtraSlot({ now, hasEnrolment, recommended, onWeeklyReview, onCourse }: ExtraSlotProps) {
  const { colors } = useTheme()

  if (isMonday(new Date(now))) {
    return (
      <Card style={styles.card}>
        <ListRow
          title="Haftalik sharh"
          subtitle="Oʻtgan hafta tahlili tayyor"
          leading={{ kind: 'icon', icon: NotebookPen }}
          trailing={{ kind: 'chevron' }}
          onPress={onWeeklyReview}
        />
      </Card>
    )
  }

  if (!hasEnrolment && recommended) {
    const teacher = recommended.teacher?.first_name
    return (
      <View style={styles.section}>
        <SectionTitle title="Tavsiya etilgan kurs" />
        <Card variant="pressable" onPress={() => onCourse(recommended.id)} accessibilityLabel={uzText(recommended.title)}>
          <View style={styles.row}>
            <View style={[styles.thumb, { backgroundColor: colors.surfaceRaised }]}>
              {recommended.thumbnail_url ? (
                <Image source={{ uri: recommended.thumbnail_url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
              ) : (
                <BookOpen size={iconSize.md} color={colors.textFaint} strokeWidth={iconStroke} />
              )}
            </View>
            <View style={styles.text}>
              <Text style={[typeScale.tileTitle, { color: colors.text }]} numberOfLines={2}>{uzText(recommended.title)}</Text>
              <Text style={[typeScale.small, { color: colors.textMuted }]} numberOfLines={1}>
                {teacher ? `${uzText(teacher)} · ` : ''}{courseMeta(recommended)}
              </Text>
            </View>
            <ChevronRight size={iconSize.sm - 2} color={colors.textMuted} strokeWidth={iconStroke} />
          </View>
        </Card>
      </View>
    )
  }

  return null
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  card: { paddingVertical: space.xxs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  thumb: { width: THUMB_W, aspectRatio: 16 / 9, borderRadius: radius.sm, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
})

/**
 * The one extra slot on Bugun: for a user with no enrolment, one
 * recommended course (a card row with a 16:9 thumbnail, Phase 7.5 C5);
 * otherwise nothing. (Haftalik sharh is a plan tile since Phase 8.)
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { BookOpen, ChevronRight } from 'lucide-react-native'
import type { Course } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { iconSize, iconStroke, radius, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Card, SectionTitle } from '../../components/ui'
import { courseMeta } from '../courses/courses'
import { uzText } from './today'

const THUMB_W = 96

export interface ExtraSlotProps {
  hasEnrolment: boolean
  recommended: Course | null
  onCourse: (id: number) => void
}

export function ExtraSlot({ hasEnrolment, recommended, onCourse }: ExtraSlotProps) {
  const { colors } = useTheme()

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
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  thumb: { width: THUMB_W, aspectRatio: 16 / 9, borderRadius: radius.sm, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
})

/**
 * The one extra slot on Bugun: the weekly review on Mondays; otherwise,
 * for a user with no enrolment, one recommended course; otherwise nothing.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { NotebookPen } from 'lucide-react-native'
import type { Course } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Card, ListRow } from '../../components/ui'
import { isMonday, uzText } from './today'

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
        <Text style={[typeScale.overline, { color: colors.textMuted }]}>Tavsiya etilgan kurs</Text>
        <Card style={styles.card}>
          <ListRow
            title={uzText(recommended.title)}
            subtitle={teacher ? uzText(teacher) : `${recommended.total_lessons} ta dars`}
            leading={recommended.thumbnail_url
              ? { kind: 'thumbnail', uri: recommended.thumbnail_url }
              : { kind: 'icon', icon: NotebookPen }}
            trailing={{ kind: 'chevron' }}
            onPress={() => onCourse(recommended.id)}
          />
        </Card>
      </View>
    )
  }

  return null
}

const styles = StyleSheet.create({
  section: { gap: space.xs },
  card: { paddingVertical: space.xxs },
})

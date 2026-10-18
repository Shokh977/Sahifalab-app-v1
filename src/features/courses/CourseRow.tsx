/**
 * A course in "BARCHA KURSLAR": thumbnail, title, meta (lessons, length,
 * social proof) and the price, "Bepul" in successText. Long-press saves it.
 */
import React from 'react'
import { BookOpen } from 'lucide-react-native'
import type { Course } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { ListRow } from '../../components/ui'
import { uzText } from '../today/today'
import { courseMeta, isFree, priceLabel } from './courses'

export function CourseRow({ course, onPress, onLongPress }: {
  course: Course
  onPress: () => void
  onLongPress?: () => void
}) {
  const { colors } = useTheme()
  return (
    <ListRow
      title={uzText(course.title)}
      subtitle={courseMeta(course)}
      leading={course.thumbnail_url ? { kind: 'thumbnail', uri: course.thumbnail_url } : { kind: 'icon', icon: BookOpen }}
      trailing={{ kind: 'value', value: priceLabel(course), color: isFree(course) ? colors.successText : colors.text }}
      onPress={onPress}
      onLongPress={onLongPress}
    />
  )
}

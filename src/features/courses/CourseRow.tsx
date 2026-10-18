/**
 * A course in "BARCHA KURSLAR": thumbnail, title, meta (lessons, length,
 * social proof) and the price, "Bepul" in successText — or "Tekshirilmoqda"
 * while a payment for it is being checked. Long-press saves it.
 */
import React from 'react'
import { BookOpen } from 'lucide-react-native'
import type { Course } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { ListRow } from '../../components/ui'
import { uzText } from '../today/today'
import { courseMeta, isFree, priceLabel } from './courses'
import { PENDING_CHIP, usePendingStore } from './purchase'

export function CourseRow({ course, onPress, onLongPress }: {
  course: Course
  onPress: () => void
  onLongPress?: () => void
}) {
  const { colors } = useTheme()
  const pending = usePendingStore(s => course.id in s.byCourse)
  return (
    <ListRow
      title={uzText(course.title)}
      subtitle={courseMeta(course)}
      leading={course.thumbnail_url ? { kind: 'thumbnail', uri: course.thumbnail_url } : { kind: 'icon', icon: BookOpen }}
      trailing={pending
        ? { kind: 'status', status: 'accent', label: PENDING_CHIP }
        : { kind: 'value', value: priceLabel(course), color: isFree(course) ? colors.successText : colors.text }}
      onPress={onPress}
      onLongPress={onLongPress}
    />
  )
}

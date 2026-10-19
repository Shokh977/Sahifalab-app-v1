/**
 * "DAVOM ETISH": the user's unfinished courses (most progress first), each
 * with its progress, opening the course where the next lesson waits.
 * Reads Bugun's enrolled list from the dashboard store.
 */
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { BookOpen } from 'lucide-react-native'
import type { EnrolledCourse } from '../../../stores/dashboardStore'
import { space } from '../../design/spacing'
import { Card, ListRow, ProgressBar, SectionTitle } from '../../components/ui'
import { uzText } from '../today/today'
import { continueCourses, progressLabel } from './courses'

export function ContinueRow({ enrolled, onOpen }: { enrolled: readonly EnrolledCourse[]; onOpen: (courseId: number) => void }) {
  const rows = continueCourses(enrolled)
  if (rows.length === 0) return null

  return (
    <View style={styles.root}>
      <SectionTitle title="Davom etish" />
      <Card style={styles.card}>
        {rows.map(e => {
          const c = e.courses!
          return (
            <View key={e.course_id} style={styles.item}>
              <ListRow
                title={uzText(c.title)}
                subtitle={progressLabel(e.progress)}
                leading={c.thumbnail_url ? { kind: 'thumbnail', uri: c.thumbnail_url } : { kind: 'icon', icon: BookOpen }}
                trailing={{ kind: 'chevron' }}
                onPress={() => onOpen(e.course_id)}
              />
              <ProgressBar value={e.progress} accessibilityLabel={`${uzText(c.title)}: ${progressLabel(e.progress)}`} />
            </View>
          )
        })}
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: space.xs },
  card: { paddingVertical: space.xs, gap: space.xs },
  item: { gap: space.xxs, paddingBottom: space.xs },
})

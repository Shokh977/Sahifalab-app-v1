/**
 * "BUGUNGI REJA · {done} / {total} bajarildi" — one Card of ListRows:
 * Fokus (always), 5 Savol, Kartalar, the current course. Done rows dim and sit last
 * (ordering from buildPlanRows).
 */
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { BookOpen, Layers, Sparkles, Timer, type LucideIcon } from 'lucide-react-native'
import { space } from '../../design/spacing'
import { Card, ListRow, SectionTitle } from '../../components/ui'
import { buildPlanRows, type PlanInput, type PlanRowKey } from './today'

const ICONS: Record<PlanRowKey, LucideIcon> = { focus: Timer, quiz: Sparkles, cards: Layers, course: BookOpen }

export function TodayPlan({ input, onOpen }: { input: PlanInput; onOpen: (key: PlanRowKey) => void }) {
  const { rows, done, total } = buildPlanRows(input)
  if (total === 0) return null

  return (
    <View style={styles.section}>
      <SectionTitle title="Bugungi reja" meta={`${done} / ${total}`} />
      <Card style={styles.card}>
        {rows.map(row => (
          <ListRow
            key={row.key}
            title={row.title}
            subtitle={row.subtitle}
            leading={{ kind: 'icon', icon: ICONS[row.key] }}
            trailing={{ kind: 'chevron' }}
            done={row.done}
            onPress={() => onOpen(row.key)}
          />
        ))}
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: space.xs },
  card: { paddingVertical: space.xxs },
})

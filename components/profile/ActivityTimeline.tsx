import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { formatTime } from '../../lib/utils'
import { typography, spacing, radius } from '../../lib/constants'
import type { ActivityItem } from '../../lib/types'

const ACTIVITY_META: Record<string, { emoji: string; label: string }> = {
  course_completed:     { emoji: '🎓', label: 'Kurs yakunlandi'      },
  certificate_earned:   { emoji: '🏆', label: 'Sertifikat olindi'    },
  level_up:             { emoji: '⭐', label: 'Daraja oshdi'         },
  post_created:         { emoji: '✍️',  label: 'Post yozildi'         },
  connection_made:      { emoji: '🤝', label: 'Bog\'lanish qo\'shildi' },
  focus_completed:      { emoji: '⏱️',  label: 'Fokus sessiyasi'       },
  test_passed:          { emoji: '✅', label: 'Test topshirildi'      },
  skill_endorsed:       { emoji: '👍', label: 'Ko\'nikma tasdiqlandi' },
  badge_earned:         { emoji: '🥇', label: 'Badge olindi'         },
}

function activityMeta(type: string) {
  return ACTIVITY_META[type] ?? { emoji: '📌', label: type.replace(/_/g, ' ') }
}

interface Props {
  activities: ActivityItem[]
}

export function ActivityTimeline({ activities }: Props) {
  const { c } = useTheme()

  if (activities.length === 0) return null

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
        Faollik
      </Text>
      {activities.map((item, idx) => {
        const { emoji, label } = activityMeta(item.activity_type)
        const isLast = idx === activities.length - 1
        return (
          <View key={item.id} style={styles.row}>
            {/* Timeline line */}
            <View style={styles.lineCol}>
              <View style={[styles.dot, { backgroundColor: c.brand }]} />
              {!isLast && <View style={[styles.line, { backgroundColor: c.border }]} />}
            </View>

            {/* Content */}
            <View style={[styles.bubble, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
              <View style={styles.bubbleHeader}>
                <Text style={{ fontSize: 16 }}>{emoji}</Text>
                <Text style={[styles.label, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
                  {label}
                </Text>
                <Text style={[styles.time, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                  {formatTime(item.created_at)}
                </Text>
              </View>
              {item.metadata?.course_title && (
                <Text style={[styles.meta, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                  {item.metadata.course_title}
                </Text>
              )}
              {item.metadata?.level && (
                <Text style={[styles.meta, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                  Daraja {item.metadata.level} — {item.metadata.level_name ?? ''}
                </Text>
              )}
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.base,
  },
  sectionTitle: {
    fontSize:     typography.size.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginBottom:  spacing.xs,
  },
  lineCol: {
    alignItems:  'center',
    width:        16,
    paddingTop:   4,
  },
  dot: {
    width:        10,
    height:       10,
    borderRadius: 5,
  },
  line: {
    width:   2,
    flex:    1,
    marginTop: 4,
  },
  bubble: {
    flex:         1,
    borderRadius: radius.sm,
    borderWidth:  1,
    padding:      spacing.sm,
    marginBottom: spacing.xs,
    gap:          2,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
    flexWrap:      'wrap',
  },
  label: {
    fontSize: typography.size.sm,
    flex:     1,
  },
  time: {
    fontSize: typography.size.xs,
  },
  meta: {
    fontSize:   typography.size.xs,
    lineHeight: 16,
    marginTop:  2,
  },
})

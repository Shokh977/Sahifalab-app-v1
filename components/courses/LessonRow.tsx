import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Download, CheckCircle } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import type { Lesson } from '../../lib/api'

interface Props {
  lesson:          Lesson
  index:           number
  completed:       boolean
  locked:          boolean
  onPress:         () => void
  sectionBreak?:   boolean
  // download
  canDownload?:    boolean
  downloadStatus?: 'idle' | 'downloading' | 'done'
  downloadProgress?: number
  onDownload?:     () => void
}

const TYPE_ICON: Record<string, string> = {
  video:    '▶',
  material: '📄',
  quiz:     '📝',
}

export function LessonRow({
  lesson, index, completed, locked, onPress, sectionBreak,
  canDownload = false, downloadStatus = 'idle', downloadProgress = 0, onDownload,
}: Props) {
  const { c } = useTheme()

  const durationStr = lesson.duration_minutes > 0
    ? lesson.duration_minutes < 60
      ? `${lesson.duration_minutes} d`
      : `${Math.floor(lesson.duration_minutes / 60)}s ${lesson.duration_minutes % 60}d`
    : null

  const showDownload = canDownload && lesson.lesson_type === 'video' && lesson.video_source !== 'youtube'

  return (
    <>
      {sectionBreak && lesson.section_title ? (
        <View style={[styles.sectionHeader, { borderBottomColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary, fontFamily: typography.fontFamily.semibold }]}>
            {lesson.section_title}
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={locked ? undefined : onPress}
        style={[styles.row, { borderBottomColor: c.border, opacity: locked ? 0.5 : 1 }]}
      >
        {/* Completion indicator */}
        <View style={[
          styles.indicator,
          {
            backgroundColor: completed ? c.brand : 'transparent',
            borderColor:      completed ? c.brand : c.borderStrong,
            borderWidth:      completed ? 0 : 1.5,
          },
        ]}>
          {completed && <Text style={styles.checkmark}>✓</Text>}
        </View>

        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={[styles.typeIcon, { color: c.textMuted }]}>
              {locked ? '🔒' : (TYPE_ICON[lesson.lesson_type] ?? '▶')}
            </Text>
            <Text numberOfLines={2} style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
              {lesson.title}
            </Text>
          </View>

          <View style={styles.meta}>
            {lesson.is_free && !locked && (
              <View style={[styles.freeBadge, { backgroundColor: c.brandSubtle }]}>
                <Text style={[styles.freeText, { color: c.brand, fontFamily: typography.fontFamily.semibold }]}>
                  Bepul
                </Text>
              </View>
            )}
            {durationStr && (
              <Text style={[styles.duration, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                {durationStr}
              </Text>
            )}
          </View>

          {/* Download progress bar */}
          {downloadStatus === 'downloading' && (
            <View style={[styles.progressTrack, { backgroundColor: c.bgTertiary }]}>
              <View style={[
                styles.progressFill,
                { width: `${Math.round(downloadProgress * 100)}%`, backgroundColor: c.brand },
              ]} />
            </View>
          )}
        </View>

        {/* Download action */}
        {showDownload && (
          <Pressable
            onPress={downloadStatus === 'idle' ? onDownload : undefined}
            hitSlop={10}
            style={styles.dlBtn}
          >
            {downloadStatus === 'done' ? (
              <CheckCircle size={20} color={c.brand} />
            ) : downloadStatus === 'downloading' ? (
              <View style={[styles.dlSpinner, { borderColor: c.bgTertiary, borderTopColor: c.brand }]} />
            ) : (
              <Download size={20} color={c.textMuted} />
            )}
          </Pressable>
        )}
      </Pressable>
    </>
  )
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.sm,
    paddingBottom:     spacing.xs,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize:      typography.size.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    gap:               spacing.sm,
    borderBottomWidth: 1,
  },
  indicator: {
    width:          22,
    height:         22,
    borderRadius:   11,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  checkmark: {
    color:      '#fff',
    fontSize:   12,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    gap:  4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.xs,
  },
  typeIcon: {
    fontSize:  typography.size.sm,
    marginTop: 1,
  },
  title: {
    flex:       1,
    fontSize:   typography.size.sm,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    paddingLeft:   22 + spacing.xs,
  },
  freeBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical:   1,
    borderRadius:      radius.full,
  },
  freeText:  { fontSize: typography.size.xs },
  duration:  { fontSize: typography.size.xs },
  progressTrack: {
    height:       3,
    borderRadius: 2,
    overflow:     'hidden',
    marginLeft:   22 + spacing.xs,
    marginTop:    2,
  },
  progressFill: {
    height:       '100%',
    borderRadius: 2,
  },
  dlBtn: {
    width:          36,
    height:         36,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  dlSpinner: {
    width:       18,
    height:      18,
    borderRadius: 9,
    borderWidth:  2,
  },
})

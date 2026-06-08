import React, { useEffect, useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, Pressable,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ChevronLeft, Trash2, Download, FolderOpen, Play } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { useDownloadStore } from '../../stores/downloadStore'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { typography, spacing, radius } from '../../lib/constants'
import type { DownloadEntry } from '../../stores/downloadStore'

type GroupedCourse = {
  courseId:    number
  courseTitle: string
  lessons:     DownloadEntry[]
  totalMb:     number
}

function groupByCourse(entries: Record<number, DownloadEntry>): GroupedCourse[] {
  const map: Record<number, GroupedCourse> = {}
  for (const entry of Object.values(entries)) {
    if (!map[entry.courseId]) {
      map[entry.courseId] = { courseId: entry.courseId, courseTitle: entry.courseTitle, lessons: [], totalMb: 0 }
    }
    map[entry.courseId].lessons.push(entry)
    map[entry.courseId].totalMb += entry.sizeMb
  }
  return Object.values(map)
}

export default function DownloadsScreen() {
  const { c }    = useTheme()
  const router   = useRouter()
  const insets   = useSafeAreaInsets()
  const { entries, load, deleteDownload } = useDownloadStore()
  const [confirm, setConfirm] = useState<{ visible: boolean; title: string; message?: string; onConfirm: () => void }>({ visible: false, title: '', onConfirm: () => {} })

  useEffect(() => { load() }, [])

  const groups       = groupByCourse(entries)
  const totalEntries = Object.keys(entries).length

  function confirmDelete(entry: DownloadEntry) {
    setConfirm({
      visible:   true,
      title:     "Yuklamani o'chirish",
      message:   `"${entry.title}" oflayn fayli o'chiriladi.`,
      onConfirm: () => {
        setConfirm(s => ({ ...s, visible: false }))
        deleteDownload(entry.lessonId)
      },
    })
  }

  function confirmDeleteCourse(group: GroupedCourse) {
    setConfirm({
      visible:   true,
      title:     "Kurs yuklamalarini o'chirish",
      message:   `"${group.courseTitle}" kursi uchun barcha ${group.lessons.length} ta fayl o'chiriladi.`,
      onConfirm: () => {
        setConfirm(s => ({ ...s, visible: false }))
        group.lessons.forEach(l => deleteDownload(l.lessonId))
      },
    })
  }

  function handlePlay(entry: DownloadEntry) {
    router.push({
      pathname: '/(screens)/course/[id]' as any,
      params: { id: String(entry.courseId), startLessonId: String(entry.lessonId) },
    })
  }

  const renderGroup = useCallback(({ item }: { item: GroupedCourse }) => (
    <View style={[styles.group, { borderColor: c.border }]}>
      {/* Course header */}
      <View style={[styles.courseHeader, { backgroundColor: c.bgSecondary, borderBottomColor: c.border }]}>
        <View style={styles.courseInfo}>
          <Text style={[styles.courseTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            {item.courseTitle}
          </Text>
          <Text style={[styles.courseMeta, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {item.lessons.length} dars · {item.totalMb.toFixed(1)} MB
          </Text>
        </View>
        <Pressable
          onPress={() => confirmDeleteCourse(item)}
          hitSlop={10}
          style={[styles.deleteAllBtn, { borderColor: c.borderStrong }]}
        >
          <Trash2 size={13} color="#ef4444" />
          <Text style={[styles.deleteAllText, { fontFamily: typography.fontFamily.medium }]}>Barchasi</Text>
        </Pressable>
      </View>

      {/* Lesson rows */}
      {item.lessons.map(entry => (
        <View key={entry.lessonId} style={[styles.lessonRow, { borderTopColor: c.border }]}>
          <View style={[styles.dlIcon, { backgroundColor: c.brandSubtle }]}>
            <Download size={14} color={c.brand} />
          </View>
          <View style={styles.lessonInfo}>
            <Text numberOfLines={2} style={[styles.lessonTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
              {entry.title}
            </Text>
            <Text style={[styles.lessonMeta, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              {entry.sizeMb > 0 ? `${entry.sizeMb.toFixed(1)} MB` : 'Yuklab olindi'}
              {' · '}
              {new Date(entry.downloadedAt).toLocaleDateString('uz-UZ')}
            </Text>
          </View>
          <View style={styles.lessonActions}>
            <Pressable
              onPress={() => handlePlay(entry)}
              style={[styles.playBtn, { backgroundColor: c.brand }]}
              hitSlop={8}
            >
              <Play size={13} color="#fff" fill="#fff" />
            </Pressable>
            <Pressable
              onPress={() => confirmDelete(entry)}
              hitSlop={10}
              style={[styles.trashBtn, { borderColor: c.borderStrong }]}
            >
              <Trash2 size={14} color="#ef4444" />
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  ), [entries, c])

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={24} color={c.brand} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Yuklamalar
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {totalEntries === 0 ? (
        <View style={styles.empty}>
          <FolderOpen size={56} color={c.textMuted} style={{ marginBottom: spacing.base }} />
          <Text style={[styles.emptyTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Yuklamalar yo'q
          </Text>
          <Text style={[styles.emptyDesc, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            Kurs darslaridan yuklab olish belgisiga bosing
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={item => String(item.courseId)}
          renderItem={renderGroup}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ConfirmModal
        visible={confirm.visible}
        emoji="🗑️"
        title={confirm.title}
        message={confirm.message}
        confirmText="O'chirish"
        danger
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm(s => ({ ...s, visible: false }))}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: typography.size.lg },

  list: { padding: spacing.base, gap: spacing.sm },

  group: {
    borderRadius: radius.md, borderWidth: 1, overflow: 'hidden',
  },
  courseHeader: {
    flexDirection:   'row',
    alignItems:      'center',
    padding:         spacing.base,
    borderBottomWidth: 1,
    gap:             spacing.sm,
  },
  courseInfo:    { flex: 1 },
  courseTitle:   { fontSize: typography.size.md },
  courseMeta:    { fontSize: typography.size.xs, marginTop: 2 },
  deleteAllBtn:  {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: radius.sm, borderWidth: 1,
  },
  deleteAllText: { fontSize: typography.size.xs, color: '#ef4444' },

  lessonRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderTopWidth:    StyleSheet.hairlineWidth,
    gap:               spacing.sm,
  },
  dlIcon: {
    width:          32,
    height:         32,
    borderRadius:   16,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  lessonInfo:    { flex: 1 },
  lessonTitle:   { fontSize: typography.size.sm, lineHeight: 19 },
  lessonMeta:    { fontSize: typography.size.xs, marginTop: 2 },
  lessonActions: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  playBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  trashBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },

  empty: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: { fontSize: typography.size.lg, marginBottom: spacing.xs },
  emptyDesc:  { fontSize: typography.size.sm, textAlign: 'center', lineHeight: 20 },
})

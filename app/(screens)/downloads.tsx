import React, { useEffect, useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, Pressable, Image,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as FileSystem from 'expo-file-system/legacy'
import {
  ChevronLeft, Trash2, Download, FolderOpen, Play, Pause, RotateCcw, AlertCircle, Clock, HardDrive,
} from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { useDownloadStore } from '../../stores/downloadStore'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { typography, spacing, radius } from '../../lib/constants'
import type { DownloadRecord, DownloadStatus } from '../../stores/downloadStore'

type GroupedCourse = {
  courseId:    number
  courseTitle: string
  lessons:     DownloadRecord[]
  totalBytes:  number
}

function groupByCourse(entries: Record<number, DownloadRecord>): GroupedCourse[] {
  const map: Record<number, GroupedCourse> = {}
  for (const entry of Object.values(entries)) {
    if (entry.status !== 'completed') continue
    if (!map[entry.courseId]) {
      map[entry.courseId] = { courseId: entry.courseId, courseTitle: entry.courseTitle, lessons: [], totalBytes: 0 }
    }
    map[entry.courseId].lessons.push(entry)
    map[entry.courseId].totalBytes += entry.totalBytes ?? 0
  }
  return Object.values(map)
}

function fmtBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB'
  const mb = bytes / (1024 * 1024)
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`
}

const STATUS_LABEL: Record<DownloadStatus, string> = {
  queued:      'Navbatda',
  downloading: 'Yuklanmoqda',
  paused:      'Pauza',
  failed:      'Xatolik',
  completed:   'Tayyor',
}

export default function DownloadsScreen() {
  const { c }    = useTheme()
  const router   = useRouter()
  const insets   = useSafeAreaInsets()
  const {
    entries, courseThumbs, load, deleteDownload, deleteCourse, deleteAll,
    pauseDownload, resumeDownload, retryDownload, getProgress,
  } = useDownloadStore()
  const [confirm, setConfirm] = useState<{ visible: boolean; title: string; message?: string; onConfirm: () => void }>({ visible: false, title: '', onConfirm: () => {} })
  const [freeBytes, setFreeBytes] = useState<number | null>(null)

  useEffect(() => {
    load()
    FileSystem.getFreeDiskStorageAsync().then(setFreeBytes).catch(() => setFreeBytes(null))
  }, [])

  const allEntries = Object.values(entries)
  const active      = allEntries.filter(e => e.status !== 'completed')
  const groups       = groupByCourse(entries)
  const totalUsed    = allEntries.reduce((sum, e) => sum + (e.status === 'completed' ? (e.totalBytes ?? 0) : 0), 0)
  const totalEntries = allEntries.length

  function confirmDelete(entry: DownloadRecord) {
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
        deleteCourse(group.courseId)
      },
    })
  }

  function confirmDeleteAll() {
    setConfirm({
      visible:   true,
      title:     "Hammasini o'chirish",
      message:   `Barcha ${totalEntries} ta yuklama o'chiriladi. Bu amalni bekor qilib bo'lmaydi.`,
      onConfirm: () => {
        setConfirm(s => ({ ...s, visible: false }))
        deleteAll()
      },
    })
  }

  function handlePlay(entry: DownloadRecord) {
    router.push({
      pathname: '/(screens)/course/[id]' as any,
      params: { id: String(entry.courseId), startLessonId: String(entry.lessonId) },
    })
  }

  function handleActiveAction(entry: DownloadRecord) {
    if (entry.status === 'downloading' || entry.status === 'queued') pauseDownload(entry.lessonId)
    else if (entry.status === 'paused') resumeDownload(entry.lessonId)
    else if (entry.status === 'failed') retryDownload(entry.lessonId)
  }

  const renderActiveRow = useCallback(({ item }: { item: DownloadRecord }) => {
    const progress = getProgress(item.lessonId)
    return (
      <View style={[styles.activeRow, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
        <View style={[styles.dlIcon, { backgroundColor: c.brandSubtle }]}>
          {item.status === 'queued'      ? <Clock size={14} color={c.brand} /> :
           item.status === 'downloading' ? <Download size={14} color={c.brand} /> :
           item.status === 'paused'      ? <Pause size={14} color={c.brand} /> :
           <AlertCircle size={14} color="#ef4444" />}
        </View>
        <View style={styles.lessonInfo}>
          <Text numberOfLines={1} style={[styles.lessonTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
            {item.title}
          </Text>
          <Text style={[styles.lessonMeta, { color: item.status === 'failed' ? '#ef4444' : c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {STATUS_LABEL[item.status]}
            {item.status === 'downloading' ? ` · ${Math.round(progress * 100)}%` : ''}
          </Text>
          {item.status === 'downloading' && (
            <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
              <View style={[styles.progressFill, { backgroundColor: c.brand, width: `${Math.round(progress * 100)}%` }]} />
            </View>
          )}
        </View>
        <Pressable onPress={() => handleActiveAction(item)} hitSlop={10} style={[styles.trashBtn, { borderColor: c.borderStrong }]}>
          {item.status === 'downloading' || item.status === 'queued'
            ? <Pause size={14} color={c.textSecondary} />
            : item.status === 'paused'
            ? <Play size={14} color={c.brand} fill={c.brand} />
            : <RotateCcw size={14} color={c.brand} />
          }
        </Pressable>
        <Pressable onPress={() => confirmDelete(item)} hitSlop={10} style={[styles.trashBtn, { borderColor: c.borderStrong }]}>
          <Trash2 size={14} color="#ef4444" />
        </Pressable>
      </View>
    )
  }, [c, entries])

  const renderGroup = useCallback(({ item }: { item: GroupedCourse }) => (
    <View style={[styles.group, { borderColor: c.border }]}>
      {/* Course header */}
      <View style={[styles.courseHeader, { backgroundColor: c.bgSecondary, borderBottomColor: c.border }]}>
        {courseThumbs[item.courseId] ? (
          <Image source={{ uri: courseThumbs[item.courseId] }} style={styles.courseThumb} />
        ) : (
          <View style={[styles.courseThumb, { backgroundColor: c.brandSubtle, alignItems: 'center', justifyContent: 'center' }]}>
            <FolderOpen size={16} color={c.brand} />
          </View>
        )}
        <View style={styles.courseInfo}>
          <Text numberOfLines={2} style={[styles.courseTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            {item.courseTitle}
          </Text>
          <Text style={[styles.courseMeta, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {item.lessons.length} dars · {fmtBytes(item.totalBytes)}
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
      {item.lessons.sort((a, b) => a.orderIndex - b.orderIndex).map(entry => (
        <View key={entry.lessonId} style={[styles.lessonRow, { borderTopColor: c.border }]}>
          <View style={[styles.dlIcon, { backgroundColor: c.brandSubtle }]}>
            <Download size={14} color={c.brand} />
          </View>
          <View style={styles.lessonInfo}>
            <Text numberOfLines={2} style={[styles.lessonTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
              {entry.title}
            </Text>
            <Text style={[styles.lessonMeta, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              {entry.quality} · {fmtBytes(entry.totalBytes ?? 0)}
              {entry.completedAt ? ` · ${new Date(entry.completedAt).toLocaleDateString('uz-UZ')}` : ''}
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
  ), [entries, courseThumbs, c])

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
          ListHeaderComponent={
            <View style={{ gap: spacing.sm }}>
              {/* Storage header */}
              <View style={[styles.storageCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <HardDrive size={16} color={c.brand} />
                  <Text style={[styles.storageTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                    Yuklab olingan: {fmtBytes(totalUsed)}
                  </Text>
                </View>
                {freeBytes != null && (
                  <Text style={[styles.storageSub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                    Qurilmada bo'sh joy: {fmtBytes(freeBytes)}
                  </Text>
                )}
                {totalEntries > 0 && (
                  <Pressable onPress={confirmDeleteAll} style={[styles.deleteAllRow, { borderColor: c.borderStrong }]}>
                    <Trash2 size={13} color="#ef4444" />
                    <Text style={[styles.deleteAllRowText, { fontFamily: typography.fontFamily.medium }]}>Hammasini o'chirish</Text>
                  </Pressable>
                )}
              </View>

              {/* Active downloads */}
              {active.length > 0 && (
                <View style={{ gap: spacing.xs }}>
                  <Text style={[styles.sectionLabel, { color: c.textMuted, fontFamily: typography.fontFamily.semibold }]}>
                    FAOL YUKLAMALAR
                  </Text>
                  {active
                    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                    .map(item => <View key={item.lessonId}>{renderActiveRow({ item })}</View>)
                  }
                </View>
              )}

              {groups.length > 0 && (
                <Text style={[styles.sectionLabel, { color: c.textMuted, fontFamily: typography.fontFamily.semibold }]}>
                  YUKLAB OLINGAN
                </Text>
              )}
            </View>
          }
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

  storageCard: {
    borderRadius: radius.md, borderWidth: 1, padding: spacing.base, gap: 4,
  },
  storageTitle: { fontSize: typography.size.sm },
  storageSub:   { fontSize: typography.size.xs },
  deleteAllRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    marginTop: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: radius.sm, borderWidth: 1,
  },
  deleteAllRowText: { fontSize: typography.size.xs, color: '#ef4444' },

  sectionLabel: { fontSize: 11, letterSpacing: 0.6, marginTop: spacing.xs },

  activeRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, padding: spacing.sm,
  },
  progressTrack: { height: 3, borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  progressFill:  { height: 3, borderRadius: 2 },

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
  courseThumb:   { width: 40, height: 40, borderRadius: radius.sm },
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

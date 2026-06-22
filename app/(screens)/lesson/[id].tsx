import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  Alert, Linking, TextInput, Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence,
  withRepeat, Easing, runOnJS,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as FileSystem from 'expo-file-system'
import {
  ChevronLeft, Download, FileText, Paperclip, BookOpen,
  Calendar, ExternalLink, Video,
} from 'lucide-react-native'
import { useTheme } from '../../../hooks/useTheme'
import { useCourseStore } from '../../../stores/courseStore'
import { useDownloadStore } from '../../../stores/downloadStore'
import { lessons as lessonsApi, courses as coursesApi } from '../../../lib/api'
import { VideoPlayer } from '../../../components/courses/VideoPlayer'
import { typography, spacing, radius } from '../../../lib/constants'
import type { Lesson, Course } from '../../../lib/api'

// ── Lazy requires ─────────────────────────────────────────────────────────────

let WebView: any = null
try { WebView = require('react-native-webview').WebView } catch {}

// ── Constants ─────────────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const PLAYER_H  = Math.round(SCREEN_W * 9 / 16)
const READING_H = Math.round(SCREEN_H * 0.55)
const TABS = ['Materiallar', 'Izohlar'] as const
type TabIndex = 0 | 1

// ── Types ─────────────────────────────────────────────────────────────────────

type LiveState =
  | 'before'
  | 'starting_soon'
  | 'live_now'
  | 'ended_recording'
  | 'ended_no_recording'

// ── Helpers ───────────────────────────────────────────────────────────────────

function posKey(id: number)     { return `lesson_pos_${id}` }
function notesKey(id: number)   { return `lesson_notes_${id}` }
function lessonCacheKey(id: number) { return `lesson_cache_${id}` }

async function loadPosition(id: number): Promise<number> {
  try { const v = await AsyncStorage.getItem(posKey(id)); return v ? Number(v) : 0 }
  catch { return 0 }
}
async function savePosition(id: number, sec: number) {
  try { await AsyncStorage.setItem(posKey(id), String(Math.floor(sec))) } catch {}
}
async function loadNotes(id: number): Promise<string> {
  try { return (await AsyncStorage.getItem(notesKey(id))) ?? '' } catch { return '' }
}
async function saveNotes(id: number, text: string) {
  try { await AsyncStorage.setItem(notesKey(id), text) } catch {}
}

function fmtTime(sec: number): string {
  const s = Math.floor(sec), m = Math.floor(s / 60), h = Math.floor(m / 60)
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

function fmtCountdown(ms: number): string {
  if (ms <= 0) return '0 daq'
  const totalMin = Math.floor(ms / 60000)
  const days  = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const mins  = totalMin % 60
  if (days > 0)  return `${days} kun ${hours} soat ${mins} daq`
  if (hours > 0) return `${hours} soat ${mins} daq`
  return `${mins} daqiqada`
}

function getLiveState(lesson: Lesson, now: Date): LiveState {
  if (!lesson.scheduled_at) return 'before'
  const scheduled = new Date(lesson.scheduled_at)
  const duration  = lesson.live_duration_minutes ?? 90
  const end       = new Date(scheduled.getTime() + duration * 60_000)
  const diffMin   = (scheduled.getTime() - now.getTime()) / 60_000

  if (now >= end) {
    return (lesson.hls_url || lesson.video_url) ? 'ended_recording' : 'ended_no_recording'
  }
  if (diffMin <= 0)  return 'live_now'
  if (diffMin <= 30) return 'starting_soon'
  return 'before'
}

function buildCalendarUrl(lesson: Lesson): string {
  const title = encodeURIComponent(lesson.title)
  const start = lesson.scheduled_at ? new Date(lesson.scheduled_at) : new Date()
  const end   = new Date(start.getTime() + (lesson.live_duration_minutes ?? 90) * 60_000)
  const notes = lesson.zoom_link ? encodeURIComponent(`Zoom: ${lesson.zoom_link}`) : ''
  const fmt   = (d: Date) => d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
  return `https://calendar.google.com/calendar/r/eventedit?text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${notes}`
}

function getFileExt(url: string | null, name: string | null): string {
  return ((name || url || '').split('.').pop() ?? '').toLowerCase()
}

// ── XP float animation ────────────────────────────────────────────────────────

function XpFloat({ visible, xp }: { visible: boolean; xp: number }) {
  const { c }      = useTheme()
  const translateY = useSharedValue(0)
  const opacity    = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      translateY.value = 0
      opacity.value    = 0
      translateY.value = withTiming(-44, { duration: 900, easing: Easing.out(Easing.cubic) })
      opacity.value    = withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0, { duration: 820 }),
      )
    }
  }, [visible])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity:   opacity.value,
  }))

  if (!visible) return null
  return (
    <Animated.Text style={[styles.xpFloat, { color: c.accentPrimary }, animStyle]}>
      +{xp} XP
    </Animated.Text>
  )
}

// ── Pulsing dot (for live state) ──────────────────────────────────────────────

function PulsingDot({ color }: { color: string }) {
  const scale = useSharedValue(1)
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.6, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1,
    )
  }, [])
  const s = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  return <Animated.View style={[styles.liveDot, { backgroundColor: color }, s]} />
}

// ── Live lesson block ─────────────────────────────────────────────────────────

function LiveBlock({ lesson, c }: { lesson: Lesson; c: any }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const state     = getLiveState(lesson, now)
  const scheduled = lesson.scheduled_at ? new Date(lesson.scheduled_at) : null
  const diffMs    = scheduled ? scheduled.getTime() - now.getTime() : 0

  if (state === 'ended_recording') return null  // caller shows VideoPlayer

  return (
    <View style={[styles.liveContainer, { height: PLAYER_H }]}>
      {state === 'before' && (
        <View style={[styles.liveCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <Calendar size={48} color={c.textDisabled} />
          <Text style={[styles.liveLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Jonli dars boshlanishiga:
          </Text>
          <Text style={[styles.liveCountdown, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            {fmtCountdown(diffMs)}
          </Text>
          <Pressable
            onPress={() => Linking.openURL(buildCalendarUrl(lesson))}
            style={styles.calBtn}
          >
            <Calendar size={14} color={c.accentSecondary} />
            <Text style={[styles.calBtnText, { color: c.accentSecondary, fontFamily: typography.fontFamily.medium }]}>
              Taqvimga qo'shish
            </Text>
          </Pressable>
        </View>
      )}

      {state === 'starting_soon' && (
        <View style={[styles.liveCard, { backgroundColor: c.warningMuted, borderColor: c.warning }]}>
          <Text style={[styles.liveUrgent, { color: c.warning, fontFamily: typography.fontFamily.semibold }]}>
            Dars tez orada boshlanadi!
          </Text>
          <Text style={[styles.liveCountdown, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            {fmtCountdown(diffMs)}
          </Text>
          {lesson.zoom_link && (
            <>
              <Pressable
                onPress={() => Linking.openURL(lesson.zoom_link!)}
                style={[styles.zoomBtn, { backgroundColor: '#2D8CFF' }]}
              >
                <ExternalLink size={16} color="#fff" />
                <Text style={[styles.zoomBtnText, { fontFamily: typography.fontFamily.semibold }]}>
                  Zoom ga qo'shilish
                </Text>
              </Pressable>
              <Text style={[styles.zoomLink, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}
                onLongPress={() => {/* copy to clipboard */}}>
                {lesson.zoom_link}
              </Text>
            </>
          )}
        </View>
      )}

      {state === 'live_now' && (
        <View style={[styles.liveCard, { backgroundColor: c.accentPrimaryMuted, borderColor: c.accentPrimary }]}>
          <View style={styles.liveNowRow}>
            <PulsingDot color={c.error} />
            <Text style={[styles.liveBadge, { color: c.error, fontFamily: typography.fontFamily.bold }]}>
              JONLI
            </Text>
          </View>
          <Text style={[styles.liveUrgent, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Dars hozir bo'lmoqda!
          </Text>
          {lesson.zoom_link && (
            <Pressable
              onPress={() => Linking.openURL(lesson.zoom_link!)}
              style={[styles.zoomBtn, { backgroundColor: '#2D8CFF' }]}
            >
              <ExternalLink size={16} color="#fff" />
              <Text style={[styles.zoomBtnText, { fontFamily: typography.fontFamily.semibold }]}>
                Zoom ga qo'shilish
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {state === 'ended_no_recording' && (
        <View style={[styles.liveCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <Video size={40} color={c.textDisabled} />
          <Text style={[styles.liveUrgent, { color: c.textSecondary, fontFamily: typography.fontFamily.semibold }]}>
            Jonli dars o'tdi
          </Text>
          <Text style={[styles.liveLabel, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
            Yozuv hali yuklanmadi
          </Text>
        </View>
      )}
    </View>
  )
}

// ── Reading lesson HTML block ─────────────────────────────────────────────────

function ReadingBlock({
  html, c, onRead,
}: { html: string; c: any; onRead: () => void }) {
  const injectedJS = `
    (function() {
      function report() {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'height', value: document.body.scrollHeight })
        );
      }
      window.addEventListener('scroll', function() {
        var pct = (window.scrollY + window.innerHeight) / document.body.scrollHeight;
        if (pct >= 0.9) {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
            JSON.stringify({ type: 'scrolled90' })
          );
        }
      });
      setTimeout(report, 200);
    })();
    true;
  `

  const htmlSource = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,system-ui;font-size:15px;line-height:26px;
  color:${c.textPrimary};background:${c.bgPrimary};padding:16px;word-break:break-word}
h1{font-size:24px;font-weight:700;margin:16px 0 8px}
h2{font-size:20px;font-weight:700;margin:14px 0 6px}
h3{font-size:17px;font-weight:600;margin:12px 0 4px}
p{margin-bottom:12px}
ul,ol{padding-left:20px;margin-bottom:12px}
li{margin-bottom:4px}
a{color:${c.accentSecondary};text-decoration:underline}
code{background:${c.bgTertiary};font-size:13px;padding:2px 6px;border-radius:4px;font-family:monospace}
pre{background:${c.bgTertiary};padding:12px;border-radius:8px;margin-bottom:12px;overflow-x:auto}
pre code{padding:0;background:none}
img{width:100%;border-radius:8px;margin:16px 0}
blockquote{border-left:3px solid ${c.accentPrimary};padding-left:12px;color:${c.textSecondary};margin-bottom:12px}
</style></head>
<body>${html}</body></html>`

  if (!WebView) {
    const plain = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    return (
      <ScrollView style={[styles.readingFallback, { backgroundColor: c.bgSecondary }]}
        contentContainerStyle={{ padding: spacing.base }}>
        <Text style={[styles.readingPlain, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}>
          {plain}
        </Text>
      </ScrollView>
    )
  }

  return (
    <WebView
      source={{ html: htmlSource }}
      style={{ height: READING_H, width: SCREEN_W, backgroundColor: c.bgPrimary }}
      scrollEnabled
      javaScriptEnabled
      originWhitelist={['*']}
      mixedContentMode="always"
      showsVerticalScrollIndicator={false}
      injectedJavaScript={injectedJS}
      onMessage={(e: any) => {
        try {
          const msg = JSON.parse(e.nativeEvent.data)
          if (msg.type === 'scrolled90') onRead()
        } catch {}
      }}
    />
  )
}

// ── Materials tab content ─────────────────────────────────────────────────────

function MaterialsContent({ lesson, c }: { lesson: Lesson; c: any }) {
  const [downloading, setDownloading] = useState(false)
  const [fileSize,    setFileSize]    = useState<string | null>(null)

  useEffect(() => {
    if (!lesson.material_url) return
    fetch(lesson.material_url, { method: 'HEAD' })
      .then(r => {
        const bytes = Number(r.headers.get('content-length') ?? 0)
        if (bytes > 0) {
          const mb = bytes / (1024 * 1024)
          setFileSize(mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`)
        }
      })
      .catch(() => {})
  }, [lesson.material_url])

  const handleDownload = useCallback(async () => {
    if (!lesson.material_url) return
    const rawName   = lesson.material_name || 'material'
    const ext       = getFileExt(lesson.material_url, lesson.material_name)
    const fileName  = rawName.includes('.') ? rawName : `${rawName}.${ext || 'pdf'}`
    const localUri  = (FileSystem.documentDirectory ?? '') + fileName

    try {
      setDownloading(true)
      const { uri } = await FileSystem.downloadAsync(lesson.material_url, localUri)
      await Linking.openURL(uri)
    } catch {
      // Fall back to opening in browser
      try { await Linking.openURL(lesson.material_url!) } catch {}
    } finally {
      setDownloading(false)
    }
  }, [lesson.material_url, lesson.material_name])

  if (!lesson.material_url) {
    return (
      <View style={styles.emptyState}>
        <Paperclip size={36} color={c.textDisabled} />
        <Text style={[styles.emptyText, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
          Materiallar yo'q
        </Text>
      </View>
    )
  }

  const ext   = getFileExt(lesson.material_url, lesson.material_name)
  const isPdf = ext === 'pdf'

  return (
    <View style={{ padding: spacing.base }}>
      <Pressable
        onPress={handleDownload}
        disabled={downloading}
        style={[styles.materialCard, { backgroundColor: c.bgSecondary, borderColor: c.border, opacity: downloading ? 0.6 : 1 }]}
      >
        {isPdf
          ? <FileText size={22} color={c.textSecondary} />
          : <Paperclip size={22} color={c.textSecondary} />
        }
        <View style={{ flex: 1 }}>
          <Text style={[styles.materialName, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            {lesson.material_name || 'Material'}
          </Text>
          <Text style={[styles.materialSub, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
            {downloading ? 'Yuklanmoqda...' : fileSize ?? 'Yuklab olish'}
          </Text>
        </View>
        {downloading
          ? <ActivityIndicator size="small" color={c.accentPrimary} />
          : <Download size={18} color={c.accentPrimary} />
        }
      </Pressable>
    </View>
  )
}

// ── Notes (Izohlar) tab content ───────────────────────────────────────────────

function IzohlarContent({
  notes, onChange, active, onActivate, c,
}: {
  notes:      string
  onChange:   (t: string) => void
  active:     boolean
  onActivate: () => void
  c:          any
}) {
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    if (active && notes === '') {
      const t = setTimeout(() => inputRef.current?.focus(), 150)
      return () => clearTimeout(t)
    }
  }, [active])

  if (!active) {
    return (
      <View style={styles.emptyState}>
        <Pressable
          onPress={onActivate}
          style={[styles.addNoteBtn, { borderColor: c.accentPrimary }]}
        >
          <Text style={[styles.addNoteBtnText, { color: c.accentPrimary, fontFamily: typography.fontFamily.semibold }]}>
            + Izoh qo'shish
          </Text>
        </Pressable>
      </View>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.base, gap: spacing.xs }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.notesHint, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
        Avtomatik saqlanadi
      </Text>
      <TextInput
        ref={inputRef}
        value={notes}
        onChangeText={onChange}
        multiline
        placeholder="Bu yerga yozing..."
        placeholderTextColor={c.textDisabled}
        style={[
          styles.notesInput,
          {
            color:           c.textPrimary,
            backgroundColor: c.bgSecondary,
            borderColor:     c.border,
            fontFamily:      typography.fontFamily.regular,
          },
        ]}
      />
    </ScrollView>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function LessonPlayerScreen() {
  const { c }    = useTheme()
  const router   = useRouter()
  const insets   = useSafeAreaInsets()
  const { id }   = useLocalSearchParams<{ id: string }>()
  const lessonId = Number(id)

  const { markComplete, progressCache } = useCourseStore()

  const [lesson,           setLesson]           = useState<Lesson | null>(null)
  const [course,           setCourse]           = useState<Course | null>(null)
  const [siblingLessons,   setSiblingLessons]   = useState<Lesson[]>([])
  const [loading,          setLoading]          = useState(true)
  const [activeTabIndex,   setActiveTabIndex]   = useState<TabIndex>(0)
  const [completing,       setCompleting]       = useState(false)
  const [certIssued,       setCertIssued]       = useState(false)
  const [certCode,         setCertCode]         = useState<string | null>(null)
  const [notes,            setNotes]            = useState('')
  const [izohActive,       setIzohActive]       = useState(false)
  const [resumePos,        setResumePos]        = useState(0)
  const [showResumeBanner, setShowResumeBanner] = useState(false)
  const [readingDone,      setReadingDone]      = useState(false)
  const [xpVisible,        setXpVisible]        = useState(false)
  const [pagerH,           setPagerH]           = useState(0)

  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pagerRef      = useRef<ScrollView>(null)

  const isCompleted = lesson
    ? (progressCache[lesson.course_id]?.has(lessonId) ?? false)
    : false

  const currentIndex = siblingLessons.findIndex(l => l.id === lessonId)
  const prevLesson   = currentIndex > 0 ? siblingLessons[currentIndex - 1] : null
  const nextLesson   = currentIndex >= 0 && currentIndex < siblingLessons.length - 1
    ? siblingLessons[currentIndex + 1]
    : null
  const isLastLesson = currentIndex === siblingLessons.length - 1 && siblingLessons.length > 0

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const l = await lessonsApi.get(lessonId)
      // Cache lesson metadata for offline use
      AsyncStorage.setItem(lessonCacheKey(lessonId), JSON.stringify(l)).catch(() => {})
      setLesson(l)

      const [siblings, courseData, pos, storedNotes] = await Promise.all([
        lessonsApi.listByCourse(l.course_id).catch(() => [] as Lesson[]),
        coursesApi.get(l.course_id).catch(() => null as Course | null),
        lessonsApi.getVideoPosition(lessonId)
          .then(r => { savePosition(lessonId, r.position); return r.position })
          .catch(() => loadPosition(lessonId)),
        loadNotes(lessonId),
      ])

      setSiblingLessons(siblings.sort((a, b) => a.order_index - b.order_index))
      setCourse(courseData)
      setNotes(storedNotes)
      if (storedNotes.length > 0) setIzohActive(true)

      if (pos > 10) {
        setResumePos(pos)
        setShowResumeBanner(true)
      }
    } catch {
      // Network failed — try cached lesson + downloaded video
      const cachedRaw = await AsyncStorage.getItem(lessonCacheKey(lessonId)).catch(() => null)
      const downloadEntry = useDownloadStore.getState().entries[lessonId]
      if (cachedRaw && downloadEntry) {
        try {
          const cached: Lesson = JSON.parse(cachedRaw)
          const pos = await loadPosition(lessonId)
          const storedNotes = await loadNotes(lessonId)
          setLesson(cached)
          setNotes(storedNotes)
          if (storedNotes.length > 0) setIzohActive(true)
          if (pos > 10) { setResumePos(pos); setShowResumeBanner(true) }
          return
        } catch {}
      }
      Alert.alert('Xatolik', 'Dars yuklanmadi. Internet aloqasini tekshiring.')
      router.back()
    } finally {
      setLoading(false)
    }
  }, [lessonId])

  useEffect(() => { load() }, [load])

  useEffect(() => () => {
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current)
  }, [])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleNotesChange = useCallback((text: string) => {
    setNotes(text)
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current)
    notesTimerRef.current = setTimeout(() => saveNotes(lessonId, text), 2000)
  }, [lessonId])

  const handlePositionUpdate = useCallback((sec: number) => {
    savePosition(lessonId, sec)                                    // instant local write
    lessonsApi.saveVideoPosition(lessonId, sec).catch(() => {})   // background API sync
  }, [lessonId])

  const triggerXp = useCallback(() => {
    setXpVisible(false)
    requestAnimationFrame(() => setXpVisible(true))
  }, [])

  const completeCurrentLesson = useCallback(async (): Promise<boolean> => {
    if (!lesson || isCompleted) return true
    const result = await markComplete(lesson.course_id, lessonId)
    if (result.certificate_issued) {
      setCertIssued(true)
      // Fetch certificate code so we can navigate to the certificate screen
      try {
        const certs = await lessonsApi.getMyCertificates()
        const cert  = certs.find(c => c.course_id === lesson.course_id)
        if (cert) setCertCode(cert.certificate_id)
      } catch {}
    }
    triggerXp()
    return result.certificate_issued
  }, [lesson, isCompleted, lessonId, markComplete, triggerXp])

  const handleComplete = useCallback(async () => {
    if (!lesson || completing || isCompleted) return
    setCompleting(true)
    try {
      await completeCurrentLesson()
    } catch (e: any) {
      Alert.alert('Xatolik', e?.message ?? 'Saqlashda xatolik')
    } finally {
      setCompleting(false)
    }
  }, [lesson, completing, isCompleted, completeCurrentLesson])

  const handleNext = useCallback(async () => {
    if (!lesson || completing) return
    setCompleting(true)
    try {
      const certNow = await completeCurrentLesson()
      if (nextLesson) {
        router.replace(`/(screens)/lesson/${nextLesson.id}` as any)
      } else {
        // Last lesson: course completion flow
        if (certNow || certIssued) {
          const code = certCode   // capture ref at this moment
          Alert.alert(
            '🎓 Kurs tugadi!',
            'Tabriklaymiz! Barcha darslar yakunlandi va sertifikat olindingiz!',
            [
              { text: 'Kursga qaytish', style: 'cancel', onPress: () => router.back() },
              ...(code ? [{ text: "Sertifikatni ko'rish →", onPress: () => router.push(`/(screens)/certificate/${code}` as any) }] : []),
            ],
          )
        } else {
          Alert.alert(
            '✅ Barcha darslar tugadi!',
            'Tabriklaymiz! Kursning barcha darslari yakunlandi.',
            [{ text: 'Kursga qaytish', onPress: () => router.back() }],
          )
        }
      }
    } catch (e: any) {
      Alert.alert('Xatolik', e?.message ?? 'Saqlashda xatolik')
    } finally {
      setCompleting(false)
    }
  }, [lesson, completing, completeCurrentLesson, nextLesson, certIssued, router])

  const handlePrev = useCallback(() => {
    if (prevLesson) router.replace(`/(screens)/lesson/${prevLesson.id}` as any)
  }, [prevLesson, router])

  // ── Tab switching ────────────────────────────────────────────────────────────

  const switchTab = useCallback((index: TabIndex) => {
    setActiveTabIndex(index)
    pagerRef.current?.scrollTo({ x: index * SCREEN_W, animated: true })
  }, [])

  const swipeGesture = Gesture.Pan()
    .minDistance(40)
    .onEnd(e => {
      if (e.velocityX < -200 && activeTabIndex === 0) runOnJS(switchTab)(1)
      else if (e.velocityX > 200 && activeTabIndex === 1) runOnJS(switchTab)(0)
    })

  // ── Lesson type ──────────────────────────────────────────────────────────────

  const isLive     = lesson?.lesson_type === 'live'
  const isReading  = lesson?.lesson_type === 'text' || lesson?.lesson_type === 'reading'
  const isMaterial = lesson?.lesson_type === 'material'
  const isQuiz     = lesson?.lesson_type === 'quiz'

  // For live ended-with-recording, switch to video player
  const liveHasRecording = isLive && !!(lesson?.hls_url || lesson?.video_url)

  const canComplete = isReading ? readingDone : true

  // ── Loading state ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
        <NavBar onBack={() => router.back()} title="" c={c} />
        <View style={styles.center}>
          <ActivityIndicator color={c.accentPrimary} size="large" />
        </View>
      </View>
    )
  }

  if (!lesson) return null

  // "finished" (status 4) = ready; anything else = still encoding
  const encodingReady = !lesson.encoding_status || lesson.encoding_status === 'finished'
  const localFile = useDownloadStore.getState().entries[lessonId]?.fileUri ?? null
  const videoUri  = localFile ?? (encodingReady ? (lesson.hls_url || lesson.video_url || null) : null)

  // If teacher stored a YouTube watch URL in video_url instead of an embed URL,
  // synthesise the embed URL so EmbedWebPlayer can handle it.
  const ytWatchMatch = (!lesson.embed_url && lesson.video_url)
    ? (lesson.video_url.match(/(?:youtube\.com\/watch\?.*v=|youtu\.be\/)([^?&\s]+)/))
    : null
  const embedUrl = lesson.embed_url
    || (ytWatchMatch ? `https://www.youtube.com/embed/${ytWatchMatch[1]}` : null)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: '#000' }]}>
      {/* Safe-area nav */}
      <View style={{ paddingTop: insets.top, backgroundColor: c.bgSecondary }}>
        <NavBar onBack={() => router.back()} title={lesson.title} c={c} />
      </View>

      {/* Content area: video / live / reading / material / quiz */}
      {(isLive && !liveHasRecording) ? (
        <LiveBlock lesson={lesson} c={c} />
      ) : isReading ? (
        lesson.content_html
          ? <ReadingBlock html={lesson.content_html} c={c} onRead={() => setReadingDone(true)} />
          : <PlaceholderBlock icon="book" label="Matnli dars" c={c} />
      ) : isMaterial ? (
        <MaterialsContent lesson={lesson} c={c} />
      ) : isQuiz ? (
        <PlaceholderBlock icon="book" label="Test darsi" c={c} />
      ) : !encodingReady && !embedUrl ? (
        <PlaceholderBlock icon="video" label="Video tayyorlanmoqda..." c={c} />
      ) : (
        <VideoPlayer
          uri={videoUri}
          embedUrl={embedUrl}
          websiteUrl={`https://www.sahifalab.uz/courses/${lesson.course_id}`}
          title={lesson.title}
          initialPosition={resumePos}
          onComplete={handleComplete}
          onPositionUpdate={handlePositionUpdate}
        />
      )}

      {/* Resume banner */}
      {showResumeBanner && (
        <Pressable
          onPress={() => setShowResumeBanner(false)}
          style={[styles.resumeBanner, { backgroundColor: c.accentPrimaryMuted }]}
        >
          <Text style={[styles.resumeText, { color: c.accentPrimary, fontFamily: typography.fontFamily.medium }]}>
            ▶ {fmtTime(resumePos)} dan davom etilmoqda · × bekor qilish
          </Text>
        </Pressable>
      )}

      {/* Certificate banner */}
      {certIssued && (
        <Pressable
          onPress={() => certCode && router.push(`/(screens)/certificate/${certCode}` as any)}
          style={[styles.certBanner, { backgroundColor: c.accentPrimary }]}
        >
          <Text style={[styles.certText, { fontFamily: typography.fontFamily.bold }]}>
            🎓 Sertifikat olindingiz! {certCode ? "Ko'rish →" : ''}
          </Text>
        </Pressable>
      )}

      {/* Reading read confirmation */}
      {isReading && !readingDone && lesson.content_html && (
        <Pressable
          onPress={() => setReadingDone(true)}
          style={[styles.readDoneBtn, { backgroundColor: c.bgSecondary, borderColor: c.border }]}
        >
          <BookOpen size={16} color={c.textSecondary} />
          <Text style={[styles.readDoneText, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
            O'qib bo'ldim ✓
          </Text>
        </Pressable>
      )}

      {/* Body: info + tabs */}
      <View style={[styles.body, { backgroundColor: c.bgPrimary }]}>
        {/* Info section */}
        <View style={[styles.infoSection, { borderBottomColor: c.border }]}>
          <Text
            numberOfLines={2}
            style={[styles.lessonTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}
          >
            {lesson.title}
          </Text>
          {(course || lesson.section_title) && (
            <Pressable onPress={() => router.back()} style={styles.breadcrumb}>
              <Text style={[styles.breadcrumbText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                {course?.title ?? ''}
                {lesson.section_title ? ` · ${lesson.section_title}` : ''}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Tab bar */}
        <View style={[styles.tabBar, { borderBottomColor: c.border }]}>
          {TABS.map((tab, i) => {
            const active = activeTabIndex === i
            return (
              <Pressable
                key={tab}
                onPress={() => switchTab(i as TabIndex)}
                style={[styles.tabItem, active && { borderBottomColor: c.accentPrimary, borderBottomWidth: 2 }]}
              >
                <Text style={[styles.tabLabel, {
                  color:      active ? c.accentPrimary : c.textSecondary,
                  fontFamily: active ? typography.fontFamily.semibold : typography.fontFamily.regular,
                }]}>
                  {tab}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {/* Swipeable tab pages */}
        <GestureDetector gesture={swipeGesture}>
          <View
            style={{ flex: 1 }}
            onLayout={e => setPagerH(e.nativeEvent.layout.height)}
          >
            {pagerH > 0 && (
              <ScrollView
                ref={pagerRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={32}
                style={{ width: SCREEN_W, height: pagerH }}
                contentContainerStyle={{ height: pagerH }}
                onMomentumScrollEnd={e => {
                  const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W)
                  setActiveTabIndex(i as TabIndex)
                }}
              >
                <View style={{ width: SCREEN_W, height: pagerH }}>
                  <MaterialsContent lesson={lesson} c={c} />
                </View>
                <View style={{ width: SCREEN_W, height: pagerH }}>
                  <IzohlarContent
                    notes={notes}
                    onChange={handleNotesChange}
                    active={izohActive}
                    onActivate={() => setIzohActive(true)}
                    c={c}
                  />
                </View>
              </ScrollView>
            )}
          </View>
        </GestureDetector>
      </View>

      {/* Bottom nav */}
      <View style={[
        styles.bottomNav,
        { backgroundColor: c.bgSecondary, borderTopColor: c.border, paddingBottom: insets.bottom + spacing.xs },
      ]}>
        {/* Prev button */}
        {prevLesson ? (
          <Pressable
            onPress={handlePrev}
            style={[styles.navBtn, { borderColor: c.border, borderWidth: 1 }]}
          >
            <Text style={[styles.navBtnLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
              ← Oldingi
            </Text>
          </Pressable>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {/* Next / complete button with XP float */}
        <View style={styles.nextWrapper}>
          <XpFloat visible={xpVisible} xp={20} />
          {isCompleted && !nextLesson ? (
            <View style={[styles.navBtn, { backgroundColor: c.bgTertiary }]}>
              <Text style={[styles.navBtnLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.semibold }]}>
                ✓ Bajarildi
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={handleNext}
              disabled={completing || (isReading && !canComplete && !isCompleted)}
              style={[
                styles.navBtn,
                {
                  backgroundColor:
                    (isReading && !canComplete && !isCompleted)
                      ? c.bgTertiary
                      : c.accentPrimary,
                },
              ]}
            >
              {completing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.navBtnLabel, { color: '#fff', fontFamily: typography.fontFamily.bold }]}>
                  {isLastLesson ? 'Darsni tugatish ✓' : 'Keyingi dars →'}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </View>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NavBar({ onBack, title, c }: { onBack: () => void; title: string; c: any }) {
  return (
    <View style={[styles.navBar, { borderBottomColor: c.border, backgroundColor: c.bgSecondary }]}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.navBack}>
        <ChevronLeft size={22} color={c.accentPrimary} />
      </Pressable>
      <Text numberOfLines={1} style={[styles.navTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
        {title}
      </Text>
      <View style={{ width: 44 }} />
    </View>
  )
}

function PlaceholderBlock({ icon, label, c }: { icon: 'book' | 'video'; label: string; c: any }) {
  return (
    <View style={[styles.placeholder, { backgroundColor: c.bgSecondary }]}>
      {icon === 'book'
        ? <BookOpen size={40} color={c.textDisabled} />
        : <Video size={40} color={c.textDisabled} />
      }
      <Text style={[styles.placeholderText, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
        {label}
      </Text>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  navBar: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.sm,
    borderBottomWidth: 1,
  },
  navBack:  { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: typography.size.sm },

  // Live block
  liveContainer: {
    width:          '100%',
    alignItems:     'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  liveCard: {
    width:          SCREEN_W - 32,
    borderWidth:    1,
    borderRadius:   radius.card,
    padding:        spacing.base,
    alignItems:     'center',
    gap:            spacing.sm,
  },
  liveLabel:     { fontSize: typography.size.sm, textAlign: 'center' },
  liveCountdown: { fontSize: typography.size.xl, textAlign: 'center' },
  liveUrgent:    { fontSize: typography.size.lg, textAlign: 'center' },
  liveNowRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot:       { width: 8, height: 8, borderRadius: 4 },
  liveBadge:     { fontSize: typography.size.sm, letterSpacing: 1 },
  calBtn: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  calBtnText:    { fontSize: typography.size.sm },
  zoomBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.sm,
    borderRadius:      radius.full,
    width:             '100%',
    justifyContent:    'center',
  },
  zoomBtnText: { color: '#fff', fontSize: typography.size.base },
  zoomLink:    { fontSize: typography.size.xs, textAlign: 'center' },

  // Reading
  readingFallback: { height: READING_H, width: SCREEN_W },
  readingPlain:    { fontSize: typography.size.base, lineHeight: 26 },

  // Banners
  resumeBanner: { paddingHorizontal: spacing.base, paddingVertical: 7 },
  resumeText:   { fontSize: typography.size.xs },
  certBanner:   { padding: spacing.sm, alignItems: 'center' },
  certText:     { color: '#fff', fontSize: typography.size.sm },

  readDoneBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               spacing.xs,
    marginHorizontal:  spacing.base,
    marginVertical:    spacing.xs,
    paddingVertical:   spacing.xs,
    borderRadius:      radius.md,
    borderWidth:       1,
  },
  readDoneText: { fontSize: typography.size.sm },

  // Body
  body:         { flex: 1 },
  infoSection:  {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.sm,
    paddingBottom:     spacing.sm,
    borderBottomWidth: 1,
    gap:               3,
  },
  lessonTitle:   { fontSize: typography.size.xl, lineHeight: 26 },
  breadcrumb:    { marginTop: 2 },
  breadcrumbText:{ fontSize: typography.size.sm },

  // Tabs
  tabBar: {
    flexDirection:     'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: spacing.sm,
  },
  tabLabel: { fontSize: typography.size.sm },

  // Empty states
  emptyState: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing.sm,
    padding:        spacing.xl,
  },
  emptyText: { fontSize: typography.size.base },

  // Materials
  materialCard: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    padding:       spacing.sm,
    borderRadius:  radius.cardSm,
    borderWidth:   1,
  },
  materialName: { fontSize: typography.size.sm },
  materialSub:  { fontSize: typography.size.xs },

  // Notes
  addNoteBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.sm,
    borderRadius:      radius.full,
    borderWidth:       1.5,
  },
  addNoteBtnText: { fontSize: typography.size.base },
  notesHint:      { fontSize: typography.size.xs, paddingHorizontal: spacing.base, paddingTop: spacing.sm },
  notesInput: {
    minHeight:         200,
    borderRadius:      radius.cardSm,
    borderWidth:       1,
    padding:           spacing.sm,
    fontSize:          typography.size.base,
    textAlignVertical: 'top',
    lineHeight:        22,
    margin:            spacing.base,
    marginTop:         spacing.xs,
  },

  // Placeholder
  placeholder: {
    width:          '100%',
    height:         PLAYER_H,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing.sm,
  },
  placeholderText: { fontSize: typography.size.base },

  // Bottom nav
  bottomNav: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.sm,
    borderTopWidth:    1,
    minHeight:         56,
  },
  navBtn: {
    flex:            1,
    paddingVertical: spacing.sm + 2,
    borderRadius:    radius.button,
    alignItems:      'center',
    justifyContent:  'center',
    minHeight:       44,
  },
  navBtnLabel: { fontSize: typography.size.base },
  nextWrapper: { flex: 1, position: 'relative' },
  xpFloat: {
    position:   'absolute',
    alignSelf:  'center',
    bottom:     '100%',
    fontSize:   typography.size.lg,
    fontWeight: '800',
    zIndex:     10,
  },
})

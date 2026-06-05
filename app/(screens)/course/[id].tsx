import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, FlatList, Pressable,
  Image, ActivityIndicator, Alert, Linking, Share, Animated,
  TextInput, Dimensions,
} from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  BookOpen, Play, Pause, Star, Users, Clock, Globe, Calendar,
  CheckCircle, Heart, Award, Folder, Infinity as InfinityIcon,
  Smartphone, FileText, Share2, Download, Lock, Pencil,
} from 'lucide-react-native'
import { MotiView } from 'moti'
import { VideoPlayer } from '../../../components/courses/VideoPlayer'
import { useTheme } from '../../../hooks/useTheme'
import { useAuthStore } from '../../../stores/authStore'
import { useCourseStore } from '../../../stores/courseStore'
import { useDownloadStore, getDownloadUrl } from '../../../stores/downloadStore'
import { courses as coursesApi, lessons as lessonsApi, profile } from '../../../lib/api'
import { typography, spacing, radius, WEB_URL } from '../../../lib/constants'
import type { Course, Lesson, CourseReview, CourseCertificate } from '../../../lib/api'
import type { ProfileData } from '../../../lib/types'
import { ComingSoonModal } from '../../../components/ui/ComingSoonModal'

// ── Helpers ────────────────────────────────────────────────────────────────────

const LEVEL_LABEL: Record<string, string> = {
  beginner: "Boshlang'ich", intermediate: "O'rta", advanced: 'Murakkab',
}
const LANG_LABEL: Record<string, string> = {
  uz: "O'zbek", ru: 'Rus', en: 'Ingliz', other: 'Boshqa',
}
const WISHLIST_KEY = 'wishlist_course_ids'
const SCREEN_W = Dimensions.get('window').width

type Section = { title: string; lessons: Lesson[]; minutes: number }

function buildSections(ls: Lesson[]): Section[] {
  const map = new Map<string, Lesson[]>()
  for (const l of ls) {
    const key = l.section_title ?? 'Umumiy'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(l)
  }
  return Array.from(map.entries()).map(([title, items]) => ({
    title, lessons: items,
    minutes: items.reduce((s, i) => s + (i.duration_minutes ?? 0), 0),
  }))
}

function getVideoUri(lesson: Lesson): string | null {
  if (lesson.hls_url)   return lesson.hls_url
  if (lesson.video_url) return lesson.video_url
  return null
}

function fmtDuration(m: number) {
  const h = Math.floor(m / 60), mn = m % 60
  if (h > 0 && mn > 0) return `${h}s ${mn}d`
  if (h > 0) return `${h} soat`
  return `${mn} daqiqa`
}
function fmtDurationLong(m: number) {
  const h = Math.floor(m / 60), mn = m % 60
  if (h > 0 && mn > 0) return `${h} soat ${mn} daqiqa`
  if (h > 0) return `${h} soat`
  return `${mn} daqiqa`
}
function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long' }) }
  catch { return iso }
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  const full = Math.floor(rating), half = rating - full >= 0.5
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} color="#f59e0b" strokeWidth={1.5}
          fill={i <= full ? '#f59e0b' : (i === full + 1 && half) ? '#f59e0b' : 'transparent'} />
      ))}
    </View>
  )
}

// ── Download button with SVG ring animation ────────────────────────────────────

const DL_SIZE = 28
const DL_R    = (DL_SIZE - 5) / 2
const DL_CIRC = 2 * Math.PI * DL_R

function DownloadBtn({
  downloading, downloaded, dlProgress, color, onPress,
}: {
  downloading: boolean; downloaded: boolean; dlProgress: number; color: string; onPress: () => void
}) {
  const checkScale = useRef(new Animated.Value(downloaded ? 1 : 0)).current

  useEffect(() => {
    Animated.spring(checkScale, {
      toValue:         downloaded ? 1 : 0,
      useNativeDriver: true,
      damping:         12,
      stiffness:       180,
    }).start()
  }, [downloaded])

  if (downloaded) {
    return (
      <Pressable onPress={onPress} hitSlop={12} style={styles.dlBtn}>
        <Animated.View style={{ transform: [{ scale: checkScale }] }}>
          <CheckCircle size={DL_SIZE - 4} color={color} fill={color} />
        </Animated.View>
      </Pressable>
    )
  }

  if (downloading) {
    const offset = DL_CIRC * (1 - Math.min(1, Math.max(0, dlProgress)))
    return (
      <Pressable onPress={onPress} hitSlop={12} style={styles.dlBtn}>
        <Svg width={DL_SIZE} height={DL_SIZE}>
          <Circle cx={DL_SIZE / 2} cy={DL_SIZE / 2} r={DL_R}
            stroke={`${color}30`} strokeWidth={2.5} fill="none" />
          <Circle cx={DL_SIZE / 2} cy={DL_SIZE / 2} r={DL_R}
            stroke={color} strokeWidth={2.5} fill="none"
            strokeDasharray={`${DL_CIRC} ${DL_CIRC}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${DL_SIZE / 2}, ${DL_SIZE / 2}`}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 7, fontWeight: '700', color }}>{Math.round(dlProgress * 100)}</Text>
        </View>
      </Pressable>
    )
  }

  return (
    <Pressable onPress={onPress} hitSlop={12} style={styles.dlBtn}>
      <Download size={15} color={color} />
    </Pressable>
  )
}

// ── Enrolled: lesson item ──────────────────────────────────────────────────────

function LessonItem({
  lesson, current, isPlaying, completed, onPress, onDownload,
  downloaded, downloading, dlProgress, c,
}: {
  lesson: Lesson; current: boolean; isPlaying: boolean; completed: boolean
  onPress: () => void; onDownload: () => void
  downloaded: boolean; downloading: boolean; dlProgress: number
  c: any
}) {
  const isPdf = lesson.lesson_type === 'pdf'
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.lessonItem,
        { borderBottomColor: c.border },
        current && { backgroundColor: c.brandSubtle, borderLeftWidth: 3, borderLeftColor: c.brand },
      ]}
    >
      <View style={styles.lessonItemIcon}>
        {completed
          ? <CheckCircle size={16} color={c.brand} fill={c.brand} />
          : isPdf
            ? <FileText size={16} color={c.textMuted} />
            : current && isPlaying
              ? <Pause size={16} color={c.brand} fill={c.brand} />
              : current
                ? <Play size={16} color={c.brand} fill={c.brand} />
                : <View style={[styles.lessonCircle, { borderColor: c.textMuted }]} />
        }
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={2} style={[styles.lessonItemTitle, {
          color: current ? c.textPrimary : c.textSecondary,
          fontFamily: current ? typography.fontFamily.semibold : typography.fontFamily.regular,
        }]}>
          {lesson.title}
        </Text>
        {lesson.duration_minutes > 0 && (
          <Text style={[styles.lessonItemMeta, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {fmtDuration(lesson.duration_minutes)}
          </Text>
        )}
      </View>
      {!isPdf && (
        <DownloadBtn
          downloading={downloading}
          downloaded={downloaded}
          dlProgress={dlProgress}
          color={c.brand}
          onPress={onDownload}
        />
      )}
    </Pressable>
  )
}

function EnrolledSectionRow({
  section, currentId, isVideoPlaying, progress, onLesson, onDownload,
  isDownloaded, isDownloading, getDlProgress, defaultOpen, c,
}: {
  section: Section; currentId: number | null; isVideoPlaying: boolean; progress: Set<number>
  onLesson: (l: Lesson) => void
  onDownload: (l: Lesson) => void
  isDownloaded: (id: number) => boolean
  isDownloading: (id: number) => boolean
  getDlProgress: (id: number) => number
  defaultOpen: boolean; c: any
}) {
  const [open, setOpen] = useState(defaultOpen)
  const done = section.lessons.filter(l => progress.has(l.id)).length
  return (
    <View>
      <Pressable onPress={() => setOpen(v => !v)} style={[styles.secHeader, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={2} style={[styles.secTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            {section.title}
          </Text>
          <Text style={[styles.secMeta, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {done}/{section.lessons.length} • {fmtDuration(section.minutes)}
          </Text>
        </View>
        {open ? <ChevronUp size={16} color={c.textMuted} /> : <ChevronDown size={16} color={c.textMuted} />}
      </Pressable>
      {open && section.lessons.map(l => (
        <LessonItem
          key={l.id} lesson={l}
          current={l.id === currentId}
          isPlaying={l.id === currentId && isVideoPlaying}
          completed={progress.has(l.id)}
          onPress={() => onLesson(l)}
          onDownload={() => onDownload(l)}
          downloaded={isDownloaded(l.id)}
          downloading={isDownloading(l.id)}
          dlProgress={getDlProgress(l.id)}
          c={c}
        />
      ))}
    </View>
  )
}

// ── Review form ────────────────────────────────────────────────────────────────

function ReviewForm({ courseId, onSubmitted, c }: { courseId: number; onSubmitted: () => void; c: any }) {
  const [rating,  setRating]  = useState(0)
  const [text,    setText]    = useState('')
  const [loading, setLoading] = useState(false)
  const [loaded,  setLoaded]  = useState(false)

  useEffect(() => {
    coursesApi.getMyRating(courseId).then(r => {
      setRating(r.rating ?? 0)
      setText(r.review ?? '')
    }).catch(() => {}).finally(() => setLoaded(true))
  }, [courseId])

  async function submit() {
    if (!rating) { Alert.alert('Baho bering', '1-5 yulduz tanlang'); return }
    setLoading(true)
    try {
      await coursesApi.rate(courseId, rating, text)
      setText('')
      onSubmitted()
    } catch (e: any) {
      Alert.alert('Xatolik', e?.message ?? 'Sharh yuborilmadi')
    } finally {
      setLoading(false)
    }
  }

  if (!loaded) return null

  return (
    <View style={[styles.reviewForm, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
      <Text style={[styles.reviewFormTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
        {rating ? 'Bahongizni yangilang' : 'Sharh qoldiring'}
      </Text>
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map(i => (
          <Pressable key={i} onPress={() => setRating(i)} hitSlop={8}>
            <Star size={30} color="#f59e0b" strokeWidth={1.5} fill={i <= rating ? '#f59e0b' : 'transparent'} />
          </Pressable>
        ))}
      </View>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Izohingizni yozing... (ixtiyoriy)"
        placeholderTextColor={c.textMuted}
        multiline
        numberOfLines={3}
        style={[styles.reviewInput, { color: c.textPrimary, backgroundColor: c.bgTertiary, fontFamily: typography.fontFamily.regular }]}
      />
      <Pressable
        onPress={submit}
        disabled={loading}
        style={[styles.reviewSubmitBtn, { backgroundColor: rating ? c.brand : c.bgTertiary }]}
      >
        {loading
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={[styles.reviewSubmitText, { color: rating ? '#fff' : c.textMuted, fontFamily: typography.fontFamily.semibold }]}>
              {rating ? 'Yuborish' : 'Yulduz tanlang'}
            </Text>
        }
      </Pressable>
    </View>
  )
}

// ── Udemy-style rating breakdown ──────────────────────────────────────────────

function RatingBreakdown({ reviews, overallRating, c }: { reviews: CourseReview[]; overallRating: number; c: any }) {
  const total = reviews.length
  if (!overallRating || total === 0) return null

  return (
    <View style={styles.ratingBreakdown}>
      {/* Left: big number + stars + count */}
      <View style={styles.ratingLeft}>
        <Text style={[styles.ratingBigNum, { color: '#f59e0b', fontFamily: typography.fontFamily.bold }]}>
          {overallRating.toFixed(1)}
        </Text>
        <Stars rating={overallRating} size={13} />
        <Text style={[{ color: c.textMuted, fontSize: typography.size.xs, fontFamily: typography.fontFamily.regular, marginTop: 2 }]}>
          {total} ta sharh
        </Text>
      </View>

      {/* Right: 5→1 bar rows */}
      <View style={{ flex: 1, gap: 7 }}>
        {[5, 4, 3, 2, 1].map(star => {
          const count = reviews.filter(r => Math.round(r.rating) === star).length
          const pct   = count / total
          return (
            <View key={star} style={styles.ratingBarRow}>
              <View style={[styles.ratingBarTrack, { backgroundColor: c.bgTertiary }]}>
                <View style={[styles.ratingBarFill, { width: `${Math.round(pct * 100)}%` }]} />
              </View>
              <Text style={[styles.ratingPct, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                {Math.round(pct * 100)}%
              </Text>
              <View style={{ flexDirection: 'row', gap: 1 }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} size={9} color="#f59e0b" strokeWidth={1.5}
                    fill={i <= star ? '#f59e0b' : 'transparent'} />
                ))}
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

// ── Review card with owner edit / delete ──────────────────────────────────────

function ReviewCard({ rv, courseId, myUserId, myUsername, onChanged, c }: {
  rv: CourseReview; courseId: number; myUserId?: number; myUsername?: string | null
  onChanged: () => void; c: any
}) {
  const [editing,    setEditing]    = useState(false)
  const [editRating, setEditRating] = useState(rv.rating)
  const [editText,   setEditText]   = useState(rv.review ?? '')
  const [saving,     setSaving]     = useState(false)

  const isOwner =
    (!!myUserId && rv.student_id === myUserId) ||
    (!!myUsername && !!rv.profiles.username && rv.profiles.username === myUsername)

  function openEdit() {
    setEditRating(rv.rating)
    setEditText(rv.review ?? '')
    setEditing(true)
  }

  async function handleUpdate() {
    if (!editRating) { Alert.alert('Baho bering', '1-5 yulduz tanlang'); return }
    setSaving(true)
    try {
      await coursesApi.rate(courseId, editRating, editText)
      setEditing(false)
      onChanged()
    } catch (e: any) {
      Alert.alert('Xatolik', e?.message ?? "Yangilab bo'lmadi")
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.reviewFlat}>
      <View style={styles.reviewTop}>
        {rv.profiles.photo_url
          ? <Image source={{ uri: rv.profiles.photo_url }} style={styles.reviewAvatar} />
          : <View style={[styles.reviewAvatar, { backgroundColor: c.bgTertiary, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: c.textMuted, fontSize: 11 }}>{rv.profiles.first_name[0]?.toUpperCase()}</Text>
            </View>
        }
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[{ color: c.textPrimary, fontSize: typography.size.sm, fontFamily: typography.fontFamily.semibold }]}>{rv.profiles.first_name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Stars rating={editing ? editRating : rv.rating} size={11} />
            <Text style={[{ color: c.textMuted, fontSize: typography.size.xs, fontFamily: typography.fontFamily.regular }]}>{fmtDate(rv.created_at)}</Text>
          </View>
        </View>
        {isOwner && !editing && (
          <Pressable onPress={openEdit} hitSlop={12}>
            <Pencil size={14} color={c.brand} />
          </Pressable>
        )}
      </View>

      {editing ? (
        <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {[1, 2, 3, 4, 5].map(i => (
              <Pressable key={i} onPress={() => setEditRating(i)} hitSlop={8}>
                <Star size={26} color="#f59e0b" strokeWidth={1.5} fill={i <= editRating ? '#f59e0b' : 'transparent'} />
              </Pressable>
            ))}
          </View>
          <TextInput
            value={editText}
            onChangeText={setEditText}
            placeholder="Izohingizni yozing..."
            placeholderTextColor={c.textMuted}
            multiline
            numberOfLines={3}
            style={[styles.reviewInput, { color: c.textPrimary, backgroundColor: c.bgTertiary, fontFamily: typography.fontFamily.regular }]}
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Pressable
              onPress={() => setEditing(false)}
              style={[styles.reviewSubmitBtn, { flex: 1, backgroundColor: c.bgTertiary }]}
            >
              <Text style={[styles.reviewSubmitText, { color: c.textMuted, fontFamily: typography.fontFamily.semibold }]}>Bekor</Text>
            </Pressable>
            <Pressable
              onPress={handleUpdate}
              disabled={saving}
              style={[styles.reviewSubmitBtn, { flex: 2, backgroundColor: c.brand }]}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={[styles.reviewSubmitText, { color: '#fff', fontFamily: typography.fontFamily.semibold }]}>Saqlash</Text>
              }
            </Pressable>
          </View>
        </View>
      ) : (
        rv.review
          ? <Text style={[{ color: c.textSecondary, fontSize: typography.size.sm, lineHeight: 20, fontFamily: typography.fontFamily.regular }]}>{rv.review}</Text>
          : null
      )}
    </View>
  )
}

// ── Enrolled: info tab (certificate + about) ───────────────────────────────────

function EnrolledInfoTab({
  course, lessons, progress, certificate, teacher, reviews, myUserId, myUsername, onReviewSubmitted, router, c, insets,
}: {
  course: Course; lessons: Lesson[]; progress: Set<number>
  certificate: CourseCertificate | null; teacher: ProfileData | null
  reviews: CourseReview[]; myUserId?: number; myUsername?: string | null
  onReviewSubmitted: () => void; router: any; c: any; insets: any
}) {
  const [descExpanded, setDescExpanded] = useState(false)
  const total     = lessons.length
  const completed = progress.size
  const remaining = total - completed
  const certUrl   = certificate ? `${WEB_URL}/certificate/${certificate.certificate_id}` : null

  async function shareCert() {
    if (!certUrl) return
    try { await Share.share({ message: `${course.title} kursini tugatdim! ${certUrl}` }) }
    catch {}
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      {/* Certificate section */}
      <View style={[styles.certCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
        {certificate ? (
          <>
            <View style={styles.certIconRow}>
              <Award size={36} color={c.brand} />
            </View>
            <Text style={[styles.certTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              Tabriklaymiz! 🎉
            </Text>
            <Text style={[styles.certSub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              Siz «{course.title}» kursini muvaffaqiyatli tugatdingiz
            </Text>
            <View style={styles.certBtnRow}>
              <Pressable
                onPress={() => certUrl && Linking.openURL(certUrl)}
                style={[styles.certBtn, { backgroundColor: c.brand }]}
              >
                <Download size={15} color="#fff" />
                <Text style={[styles.certBtnText, { fontFamily: typography.fontFamily.bold }]}>Yuklab olish</Text>
              </Pressable>
              <Pressable
                onPress={shareCert}
                style={[styles.certBtnOutline, { borderColor: c.brand }]}
              >
                <Share2 size={15} color={c.brand} />
                <Text style={[styles.certBtnTextOutline, { color: c.brand, fontFamily: typography.fontFamily.semibold }]}>Ulashish</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.certProgress, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              {remaining > 0
                ? `Sertifikat uchun yana ${remaining} ta dars qoldi`
                : 'Barcha darslar bajarildi!'}
            </Text>
            <View style={[styles.certTrack, { backgroundColor: c.bgTertiary }]}>
              <View style={[styles.certFill, { width: `${total > 0 ? (completed / total) * 100 : 0}%`, backgroundColor: c.brand }]} />
            </View>
            <Text style={[styles.certCountText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              {completed} / {total} ta dars bajarildi
            </Text>
          </>
        )}
      </View>

      <View style={styles.infoBody}>
        {course.description ? (
          <View style={[styles.infoSection, { borderColor: c.border }]}>
            <Text style={[styles.infoHeading, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>Tavsif</Text>
            <Text numberOfLines={descExpanded ? undefined : 4}
              style={[styles.infoText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              {course.description}
            </Text>
            {course.description.length > 150 && (
              <Pressable onPress={() => setDescExpanded(v => !v)}>
                <Text style={[styles.moreBtn, { color: c.brand, fontFamily: typography.fontFamily.semibold }]}>
                  {descExpanded ? 'Kamroq' : "Ko'proq"}
                </Text>
              </Pressable>
            )}
          </View>
        ) : null}

        {course.what_you_learn && course.what_you_learn.length > 0 && (
          <View style={[styles.infoSection, { borderColor: c.border }]}>
            <Text style={[styles.infoHeading, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>Nima o'rganasiz?</Text>
            {course.what_you_learn.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <CheckCircle size={13} color={c.brand} style={{ marginTop: 2 }} />
                <Text style={[styles.bulletText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.infoSection, { borderColor: c.border }]}>
          <Text style={[styles.infoHeading, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>Bu kursga nima kiradi?</Text>
          {(course.total_duration_minutes ?? 0) > 0 && (
            <View style={styles.includeRow}><Clock size={14} color={c.brand} />
              <Text style={[styles.includeText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                {fmtDurationLong(course.total_duration_minutes)} video
              </Text>
            </View>
          )}
          {lessons.some(l => l.material_url) && (
            <View style={styles.includeRow}><Folder size={14} color={c.brand} />
              <Text style={[styles.includeText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>Qo'llab-quvvatlash fayllari</Text>
            </View>
          )}
          <View style={styles.includeRow}><InfinityIcon size={14} color={c.brand} />
            <Text style={[styles.includeText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>Umrbod kirish huquqi</Text>
          </View>
          <View style={styles.includeRow}><Smartphone size={14} color={c.brand} />
            <Text style={[styles.includeText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>Mobil, kompyuter va TV orqali kirish</Text>
          </View>
          <View style={styles.includeRow}><Award size={14} color={c.brand} />
            <Text style={[styles.includeText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>Tugallash sertifikati</Text>
          </View>
        </View>

        {course.requirements && course.requirements.length > 0 && (
          <View style={[styles.infoSection, { borderColor: c.border }]}>
            <Text style={[styles.infoHeading, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>Talablar</Text>
            {course.requirements.map((r, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={{ color: c.textMuted }}>•</Text>
                <Text style={[styles.bulletText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>{r}</Text>
              </View>
            ))}
          </View>
        )}

        {teacher && (
          <View style={[styles.infoSection, { borderColor: c.border }]}>
            <Text style={[styles.infoHeading, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>O'qituvchi</Text>
            <Pressable
              onPress={() => router.push(`/(screens)/profile/${teacher.telegram_id}` as any)}
              style={styles.teacherRow}
            >
              {teacher.photo_url
                ? <Image source={{ uri: teacher.photo_url }} style={styles.teacherAvatar} />
                : <View style={[styles.teacherAvatar, { backgroundColor: c.bgTertiary, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ color: c.textMuted, fontSize: 16 }}>{teacher.first_name[0].toUpperCase()}</Text>
                  </View>
              }
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={[styles.teacherName, { color: c.brand, fontFamily: typography.fontFamily.bold }]}>{teacher.first_name}</Text>
                {teacher.headline && (
                  <Text numberOfLines={1} style={[styles.teacherHeadline, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>{teacher.headline}</Text>
                )}
              </View>
            </Pressable>
            {teacher.bio && (
              <Text numberOfLines={3} style={[styles.teacherBio, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>{teacher.bio}</Text>
            )}
          </View>
        )}

        <View style={[styles.infoSection, { borderColor: c.border }]}>
          <Text style={[styles.infoHeading, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>Sharhlar</Text>
          <RatingBreakdown reviews={reviews} overallRating={course.rating ?? 0} c={c} />
          <ReviewForm courseId={course.id} onSubmitted={onReviewSubmitted} c={c} />
        </View>

        {reviews.length > 0 && (
          <View style={[styles.infoSection, { borderColor: c.border }]}>
            {reviews.slice(0, 10).map((rv, idx) => (
              <React.Fragment key={rv.id}>
                {idx > 0 && <View style={[styles.reviewDivider, { backgroundColor: c.border }]} />}
                <ReviewCard
                  rv={rv}
                  courseId={course.id}
                  myUserId={myUserId}
                  myUsername={myUsername}
                  onChanged={onReviewSubmitted}
                  c={c}
                />
              </React.Fragment>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function CourseDetailScreen() {
  const { c }    = useTheme()
  const { user } = useAuthStore()
  const router   = useRouter()
  const insets   = useSafeAreaInsets()
  const { id, startLessonId } = useLocalSearchParams<{ id: string; startLessonId?: string }>()
  const courseId = Number(id)

  const { checkEnrollment, enroll, loadProgress, markComplete, enrollmentCache, progressCache } = useCourseStore()
  const downloadStore = useDownloadStore()
  const { startDownload, isDownloaded, isDownloading, getProgress, deleteDownload } = downloadStore

  const [course,         setCourse]         = useState<Course | null>(null)
  const [lessons,        setLessons]        = useState<Lesson[]>([])
  const [reviews,        setReviews]        = useState<CourseReview[]>([])
  const [teacher,        setTeacher]        = useState<ProfileData | null>(null)
  const [teacherCourses, setTeacherCourses] = useState<Course[]>([])
  const [certificate,    setCertificate]    = useState<CourseCertificate | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [enrolling,      setEnrolling]      = useState(false)
  const [showComingSoon, setShowComingSoon] = useState(false)
  const [wishlisted,     setWishlisted]     = useState(false)
  const [descExpanded,   setDescExpanded]   = useState(false)
  const [showAllSections,setShowAllSections]= useState(false)
  const [showStickyBar,  setShowStickyBar]  = useState(false)
  const [activeTab,      setActiveTab]      = useState<'lessons' | 'info'>('lessons')
  const [currentLesson,  setCurrentLesson]  = useState<Lesson | null>(null)
  const [videoUri,       setVideoUri]       = useState<string | null>(null)
  const [embedUrl,       setEmbedUrl]       = useState<string | null>(null)
  const [videoLoading,   setVideoLoading]   = useState(false)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)

  const priceY      = useRef(0)
  const tabScrollRef = useRef<ScrollView>(null)
  const tabScrollX   = useRef(new Animated.Value(0)).current

  const enrollment = enrollmentCache[courseId]
  const progress   = progressCache[courseId] ?? new Set<number>()
  const isEnrolled = enrollment?.enrolled ?? false
  const isOwner    = enrollment?.owner    ?? false
  const canAccess  = isEnrolled || isOwner

  // ── Wishlist ────────────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(WISHLIST_KEY).then(raw => {
      if (!raw) return
      const ids: number[] = JSON.parse(raw)
      setWishlisted(ids.includes(courseId))
    })
  }, [courseId])

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [courseData, ls, rv] = await Promise.all([
        coursesApi.get(courseId),
        lessonsApi.listByCourse(courseId),
        coursesApi.getReviews(courseId),
      ])
      setCourse(courseData)
      setLessons(ls)
      setReviews(rv)
      await Promise.all([checkEnrollment(courseId), loadProgress(courseId)])

      const progSet = progressCache[courseId] ?? new Set<number>()
      const startL  = startLessonId ? ls.find(l => l.id === Number(startLessonId)) : null
      const first   = startL ?? ls.find(l => !progSet.has(l.id) && l.lesson_type !== 'pdf' && l.lesson_type !== 'test') ?? ls.find(l => l.lesson_type !== 'pdf' && l.lesson_type !== 'test') ?? null
      setCurrentLesson(first)

      const [teacherData, tcRes, certs] = await Promise.all([
        profile.getPublic(courseData.teacher_id).catch(() => null),
        coursesApi.list({ teacher_id: courseData.teacher_id, limit: 4 }).catch(() => null),
        lessonsApi.getMyCertificates().catch(() => [] as any[]),
      ])
      setTeacher(teacherData)
      if (tcRes) setTeacherCourses(tcRes.courses.filter((c: Course) => c.id !== courseId).slice(0, 3))
      const cert = (certs as any[]).find((c: any) => c.course_id === courseId) ?? null
      setCertificate(cert)
    } catch (e: any) {
      Alert.alert('Xatolik', e?.message ?? 'Kurs yuklanmadi')
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => { load() }, [load])

  // ── Resolve video URI whenever currentLesson changes ───────────────────────
  const currentIsDownloaded = currentLesson ? isDownloaded(currentLesson.id) : false

  useEffect(() => {
    if (!currentLesson) {
      setVideoUri(null); setEmbedUrl(null); setVideoLoading(false)
      return
    }
    let cancelled = false
    setVideoUri(null); setEmbedUrl(null)
    setVideoLoading(true); setIsVideoPlaying(false)

    ;(async () => {
      // 1. Local offline download (plays without network)
      const localUri = downloadStore.entries[currentLesson.id]?.fileUri
      if (localUri) {
        if (!cancelled) { setVideoUri(localUri); setEmbedUrl(null); setVideoLoading(false) }
        return
      }
      // 2. Direct HLS / MP4 from list response
      const uri = getVideoUri(currentLesson)
      if (uri) {
        if (!cancelled) { setVideoUri(uri); setEmbedUrl(null); setVideoLoading(false) }
        return
      }
      // 3. Bunny embed URL from list response (WebView player)
      if (currentLesson.embed_url) {
        if (!cancelled) { setVideoUri(null); setEmbedUrl(currentLesson.embed_url); setVideoLoading(false) }
        return
      }
      // 4. Fetch individual lesson — backend may compute URL dynamically
      try {
        const full    = await lessonsApi.get(currentLesson.id)
        const fullUri = getVideoUri(full)
        if (!cancelled) {
          // Keep both: VideoPlayer tries expo-video (HLS) first, WebView embed as fallback
          setVideoUri(fullUri)
          setEmbedUrl(full.embed_url ?? null)
          setVideoLoading(false)
        }
      } catch {
        if (!cancelled) { setVideoUri(null); setEmbedUrl(null); setVideoLoading(false) }
      }
    })()

    return () => { cancelled = true }
  }, [currentLesson?.id, currentIsDownloaded])

  // ── Wishlist toggle ────────────────────────────────────────────────────────
  async function toggleWishlist() {
    const raw  = await AsyncStorage.getItem(WISHLIST_KEY)
    const ids: number[] = raw ? JSON.parse(raw) : []
    const next = wishlisted ? ids.filter(i => i !== courseId) : [...ids, courseId]
    await AsyncStorage.setItem(WISHLIST_KEY, JSON.stringify(next))
    setWishlisted(!wishlisted)
  }

  // ── Enroll / buy ───────────────────────────────────────────────────────────
  async function handleEnroll() {
    if (!course) return
    if (course.is_paid) { setShowComingSoon(true); return }
    setEnrolling(true)
    try { await enroll(courseId) }
    catch (e: any) { Alert.alert('Xatolik', e?.message ?? "Ro'yxatdan o'tishda xatolik") }
    finally { setEnrolling(false) }
  }

  // ── Lesson complete ────────────────────────────────────────────────────────
  async function handleLessonComplete() {
    if (!currentLesson || !canAccess) return
    try {
      const res = await markComplete(courseId, currentLesson.id)
      if (res.certificate_issued) {
        const certs = await lessonsApi.getMyCertificates().catch(() => [])
        const cert  = certs.find((c: any) => c.course_id === courseId) ?? null
        setCertificate(cert)
        Alert.alert('Tabriklaymiz! 🎉', 'Siz kursni tugatdingiz va sertifikat berildi!')
      }
    } catch {}
    const idx  = lessons.findIndex(l => l.id === currentLesson.id)
    const next = lessons.slice(idx + 1).find(isPlayableLesson)
    if (next) setCurrentLesson(next)
  }

  // ── Download lesson ────────────────────────────────────────────────────────
  async function handleDownload(lesson: Lesson) {
    if (isDownloaded(lesson.id)) {
      Alert.alert(
        "Yuklab olingan fayl",
        `"${lesson.title}" ni o'chirmoqchimisiz?`,
        [
          { text: 'Bekor qilish', style: 'cancel' },
          { text: "O'chirish", style: 'destructive', onPress: () => deleteDownload(lesson.id) },
        ],
      )
      return
    }
    if (isDownloading(lesson.id) || !course) return

    // Always fetch a fresh signed download URL — tokens expire in 1 hour
    let downloadUrl: string | null = null
    try {
      const res = await lessonsApi.getDownloadUrl(lesson.id)
      downloadUrl = res.download_url
    } catch {
      // Backend endpoint failed — fall back to constructing URL from cached lesson fields
      let lessonForDl = lesson
      if (!getDownloadUrl(lesson)) {
        try { lessonForDl = await lessonsApi.get(lesson.id) }
        catch { Alert.alert('Xatolik', 'Yuklab olish URL topilmadi'); return }
      }
      downloadUrl = getDownloadUrl(lessonForDl)
    }

    if (!downloadUrl) {
      Alert.alert('Xatolik', "Bu dars uchun yuklab olish mumkin emas")
      return
    }

    startDownload({ ...lesson, video_url: downloadUrl, hls_url: null }, courseId, course.title)
  }

  // ── Refresh reviews after submission ──────────────────────────────────────
  const refreshReviews = useCallback(async () => {
    try {
      const rv = await coursesApi.getReviews(courseId)
      setReviews(rv)
    } catch {}
  }, [courseId])

  // ── Lesson selection ───────────────────────────────────────────────────────
  const isPlayableLesson = (l: Lesson) => l.lesson_type !== 'pdf' && l.lesson_type !== 'test'

  function selectLesson(lesson: Lesson) {
    if (lesson.lesson_type === 'pdf' && lesson.material_url) {
      Linking.openURL(lesson.material_url)
      return
    }
    if (lesson.lesson_type === 'test') {
      router.push(`/(screens)/test/${lesson.test_id ?? lesson.id}` as any)
      return
    }
    setCurrentLesson(lesson)
  }

  function goPrev() {
    if (!currentLesson) return
    const idx  = lessons.findIndex(l => l.id === currentLesson.id)
    const prev = [...lessons].slice(0, idx).reverse().find(isPlayableLesson)
    if (prev) setCurrentLesson(prev)
  }

  function goNext() {
    if (!currentLesson) return
    const idx  = lessons.findIndex(l => l.id === currentLesson.id)
    const next = lessons.slice(idx + 1).find(isPlayableLesson)
    if (next) setCurrentLesson(next)
  }

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bgPrimary }]} edges={['top', 'bottom']}>
      <View style={[styles.navBar, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.navBack}>
          <ChevronLeft size={22} color={c.textPrimary} />
        </Pressable>
      </View>
      <View style={styles.center}><ActivityIndicator color={c.brand} size="large" /></View>
    </SafeAreaView>
  )

  if (!course) return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bgPrimary }]} edges={['top', 'bottom']}>
      <View style={[styles.navBar, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.navBack}>
          <ChevronLeft size={22} color={c.textPrimary} />
        </Pressable>
      </View>
      <View style={styles.center}>
        <BookOpen size={40} color={c.textMuted} />
        <Text style={{ color: c.textMuted, fontFamily: typography.fontFamily.regular }}>Kurs topilmadi</Text>
      </View>
    </SafeAreaView>
  )

  const sections        = buildSections(lessons)
  const totalMins       = course.total_duration_minutes ?? 0
  const firstFreeLesson = lessons.find(l => l.is_free && getVideoUri(l))
  const hasDiscount     = !!(course.original_price && course.original_price > course.price)
  const completedCount  = progress.size
  const ratingCount     = course.ratings_count ?? reviews.length
  const hasMaterials    = lessons.some(l => l.material_url)

  // ── ENROLLED VIEW ──────────────────────────────────────────────────────────
  if (canAccess) {
    const curIdx  = currentLesson ? lessons.findIndex(l => l.id === currentLesson.id) : -1
    const hasPrev = curIdx > 0 && lessons.slice(0, curIdx).some(isPlayableLesson)
    const hasNext = curIdx < lessons.length - 1 && lessons.slice(curIdx + 1).some(isPlayableLesson)

    return (
      <SafeAreaView style={[styles.root, { backgroundColor: '#000' }]} edges={['top']}>
        {/* Video player */}
        <View style={styles.playerWrap}>
          {(videoUri || embedUrl) ? (
            <VideoPlayer
              key={`${currentLesson?.id}`}
              uri={videoUri}
              embedUrl={embedUrl}
              onComplete={handleLessonComplete}
              onPlayingChange={setIsVideoPlaying}
            />
          ) : videoLoading ? (
            <View style={styles.playerCenter}>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={styles.playerStatusText}>Video yuklanmoqda...</Text>
            </View>
          ) : (
            <View style={styles.playerCenter}>
              <BookOpen size={40} color="rgba(255,255,255,0.4)" />
              <Text style={styles.playerStatusText}>Video mavjud emas</Text>
            </View>
          )}
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.playerBack}>
            <View style={styles.playerBackBubble}>
              <ChevronLeft size={20} color="#fff" />
            </View>
          </Pressable>
        </View>

        {/* Lesson title + prev/next + downloads link */}
        <View style={[styles.lessonTitleBar, { backgroundColor: c.bgSecondary, borderBottomColor: c.border }]}>
          <Pressable onPress={goPrev} disabled={!hasPrev} hitSlop={8} style={styles.navArrow}>
            <ChevronLeft size={18} color={hasPrev ? c.textPrimary : c.textMuted} />
          </Pressable>
          <Text numberOfLines={1} style={[styles.lessonTitleText, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            {currentLesson?.title ?? course.title}
          </Text>
          <Pressable onPress={goNext} disabled={!hasNext} hitSlop={8} style={styles.navArrow}>
            <ChevronRight size={18} color={hasNext ? c.textPrimary : c.textMuted} />
          </Pressable>
          <Pressable onPress={() => router.push('/(screens)/downloads' as any)} hitSlop={8} style={styles.navArrow}>
            <Download size={16} color={c.brand} />
          </Pressable>
        </View>

        {/* Tab bar */}
        <View style={[styles.tabBar, { backgroundColor: c.bgSecondary, borderBottomColor: c.border }]}>
          {(['lessons', 'info'] as const).map((t, i) => {
            const active = activeTab === t
            const label  = t === 'lessons' ? 'Darslar' : "Ko'proq"
            return (
              <Pressable
                key={t}
                onPress={() => {
                  tabScrollRef.current?.scrollTo({ x: i * SCREEN_W, animated: true })
                  setActiveTab(t)
                }}
                style={styles.tabItem}
              >
                <Text style={[styles.tabLabel, {
                  color: active ? c.brand : c.textMuted,
                  fontFamily: active ? typography.fontFamily.bold : typography.fontFamily.regular,
                }]}>{label}</Text>
              </Pressable>
            )
          })}
          <Animated.View
            style={[
              styles.tabUnderline,
              { backgroundColor: c.brand },
              {
                transform: [{
                  translateX: tabScrollX.interpolate({
                    inputRange: [0, SCREEN_W],
                    outputRange: [0, SCREEN_W / 2],
                    extrapolate: 'clamp',
                  }),
                }],
              },
            ]}
          />
        </View>

        {/* Tab content — swipeable pages */}
        <ScrollView
          ref={tabScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: tabScrollX } } }],
            { useNativeDriver: false },
          )}
          onMomentumScrollEnd={e => {
            const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W)
            setActiveTab(page === 0 ? 'lessons' : 'info')
          }}
          style={[styles.tabContent, { backgroundColor: c.bgPrimary }]}
        >
          <View style={{ width: SCREEN_W, flex: 1 }}>
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            >
              {sections.map((sec, i) => (
                <EnrolledSectionRow
                  key={i} section={sec}
                  currentId={currentLesson?.id ?? null}
                  isVideoPlaying={isVideoPlaying}
                  progress={progress}
                  onLesson={selectLesson}
                  onDownload={handleDownload}
                  isDownloaded={isDownloaded}
                  isDownloading={isDownloading}
                  getDlProgress={getProgress}
                  defaultOpen={i === 0 || sec.lessons.some(l => l.id === currentLesson?.id)}
                  c={c}
                />
              ))}
            </ScrollView>
          </View>
          <View style={{ width: SCREEN_W, flex: 1 }}>
            <EnrolledInfoTab
              course={course} lessons={lessons} progress={progress}
              certificate={certificate} teacher={teacher} reviews={reviews}
              myUserId={user?.telegram_id}
              myUsername={user?.username ?? null}
              onReviewSubmitted={refreshReviews}
              router={router} c={c} insets={insets}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── MARKETING VIEW (not enrolled) ──────────────────────────────────────────
  const visibleSections = showAllSections ? sections : sections.slice(0, 3)
  const priceText  = course.is_paid ? `${course.price.toLocaleString()} so'm` : 'Bepul'
  const enrollLabel = course.is_paid ? 'Sotib olish' : "Kursga yozilmoq"

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bgPrimary }]} edges={['top', 'bottom']}>
      <View style={[styles.navBar, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.navBack}>
          <ChevronLeft size={22} color={c.textPrimary} />
        </Pressable>
        <Text numberOfLines={1} style={[styles.navTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          {course.title}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={e => setShowStickyBar(e.nativeEvent.contentOffset.y > priceY.current + 20)}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Hero */}
        <Pressable onPress={() => firstFreeLesson && setCurrentLesson(firstFreeLesson)} disabled={!firstFreeLesson}>
          {course.thumbnail_url
            ? <Image source={{ uri: course.thumbnail_url }} style={styles.cover} resizeMode="cover" />
            : <View style={[styles.cover, { backgroundColor: c.brandSubtle, alignItems: 'center', justifyContent: 'center' }]}>
                <BookOpen size={56} color={c.brand} />
              </View>
          }
          {firstFreeLesson && (
            <View style={styles.playOverlay}>
              <View style={[styles.playBtn, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                <Play size={26} color="#fff" fill="#fff" />
              </View>
              <Text style={styles.previewLabel}>Bepul ko'rish</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.mktBody}>
          {course.categories && (
            <View style={[styles.catBadge, { backgroundColor: c.brandSubtle }]}>
              <Text style={[styles.catBadgeText, { color: c.brand, fontFamily: typography.fontFamily.medium }]}>
                {course.categories.name}
              </Text>
            </View>
          )}

          <Text style={[styles.mktTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            {course.title}
          </Text>

          {course.description ? (
            <View>
              <Text numberOfLines={descExpanded ? undefined : 2}
                style={[styles.mktDesc, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                {course.description}
              </Text>
              {course.description.length > 100 && (
                <Pressable onPress={() => setDescExpanded(v => !v)}>
                  <Text style={[styles.moreBtn, { color: c.brand, fontFamily: typography.fontFamily.semibold }]}>
                    {descExpanded ? 'Kamroq' : "Ko'proq"}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : null}

          {(course.rating ?? 0) > 0 && (
            <View style={styles.ratingRow}>
              <Text style={[styles.ratingNum, { color: '#f59e0b', fontFamily: typography.fontFamily.bold }]}>
                {course.rating!.toFixed(1)}
              </Text>
              <Stars rating={course.rating!} size={14} />
              {ratingCount > 0 && (
                <Text style={[styles.ratingCount, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                  ({ratingCount} ta reyting)
                </Text>
              )}
              <Text style={{ color: c.textMuted }}>•</Text>
              <Users size={13} color={c.textMuted} />
              <Text style={[styles.ratingCount, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                {course.enrolled_count.toLocaleString()} o'quvchi
              </Text>
            </View>
          )}

          <Pressable
            onPress={() => teacher && router.push(`/(screens)/profile/${teacher.telegram_id}` as any)}
            style={styles.teacherRow}
          >
            {teacher?.photo_url
              ? <Image source={{ uri: teacher.photo_url }} style={styles.teacherAvatar} />
              : <View style={[styles.teacherAvatar, { backgroundColor: c.bgTertiary, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: c.textMuted, fontSize: 13 }}>{(teacher?.first_name ?? 'T')[0].toUpperCase()}</Text>
                </View>
            }
            <Text style={[styles.teacherBy, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              Yaratuvchi:{' '}
              <Text style={{ color: c.brand, fontFamily: typography.fontFamily.semibold }} numberOfLines={1}>
                {teacher?.first_name ?? `Teacher #${course.teacher_id}`}
              </Text>
            </Text>
          </Pressable>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Calendar size={12} color={c.textMuted} />
              <Text style={[styles.metaText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                {fmtDate(course.updated_at ?? course.created_at)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Globe size={12} color={c.textMuted} />
              <Text style={[styles.metaText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                {LANG_LABEL[course.language] ?? course.language}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={[styles.metaText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                {LEVEL_LABEL[course.level] ?? course.level}
              </Text>
            </View>
          </View>

          {/* Price section */}
          <View
            style={[styles.priceSection, { borderColor: c.border }]}
            onLayout={e => { priceY.current = e.nativeEvent.layout.y }}
          >
            {course.is_paid && (
              <View style={styles.priceRow}>
                <Text style={[styles.price, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
                  {course.price.toLocaleString()} so'm
                </Text>
                {hasDiscount && (
                  <>
                    <Text style={[styles.oldPrice, { color: c.textMuted }]}>
                      {course.original_price!.toLocaleString()} so'm
                    </Text>
                    <View style={[styles.discountBadge, { backgroundColor: '#dc2626' }]}>
                      <Text style={styles.discountText}>
                        {Math.round((1 - course.price / course.original_price!) * 100)}% chegirma
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}
            <Pressable
              onPress={handleEnroll}
              disabled={enrolling}
              style={[styles.enrollBtn, { backgroundColor: c.brand, marginTop: course.is_paid ? spacing.sm : 0 }]}
            >
              {enrolling
                ? <ActivityIndicator color="#fff" />
                : <Text style={[styles.enrollBtnText, { fontFamily: typography.fontFamily.bold }]}>{enrollLabel}</Text>
              }
            </Pressable>
            <Pressable
              onPress={toggleWishlist}
              style={[styles.wishlistBtn, { borderColor: wishlisted ? c.brand : c.borderStrong }]}
            >
              <Heart size={15} color={wishlisted ? c.brand : c.textSecondary} fill={wishlisted ? c.brand : 'transparent'} />
              <Text style={[styles.wishlistText, { color: wishlisted ? c.brand : c.textSecondary, fontFamily: typography.fontFamily.semibold }]}>
                {wishlisted ? 'Sevimlilardan olib tashlash' : "Sevimlilarga qo'shish"}
              </Text>
            </Pressable>
          </View>

          {/* What you'll learn */}
          {course.what_you_learn && course.what_you_learn.length > 0 && (
            <View style={[styles.mktSection, { borderColor: c.border }]}>
              <Text style={[styles.mktSectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>Nima o'rganasiz?</Text>
              {course.what_you_learn.map((item, i) => (
                <View key={i} style={styles.bulletRow}>
                  <CheckCircle size={13} color={c.brand} style={{ marginTop: 2, flexShrink: 0 }} />
                  <Text style={[styles.bulletText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Curriculum */}
          {sections.length > 0 && (
            <View style={[styles.mktSection, { borderColor: c.border }]}>
              <Text style={[styles.mktSectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>Kurs mazmuni</Text>
              <Text style={[styles.currMeta, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                {sections.length} bo'lim • {lessons.length} dars • {fmtDurationLong(totalMins)}
              </Text>
              <View style={{ marginHorizontal: -spacing.base }}>
                {visibleSections.map((sec, i) => (
                  <MktSectionPreview key={i} section={sec} c={c} />
                ))}
              </View>
              {sections.length > 3 && (
                <Pressable onPress={() => setShowAllSections(v => !v)} style={[styles.showMoreBtn, { borderColor: c.borderStrong }]}>
                  <Text style={[styles.showMoreText, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                    {showAllSections ? "Kamroq ko'rsatish" : `${sections.length - 3} ta bo'limni ko'rish`}
                  </Text>
                  {showAllSections ? <ChevronUp size={15} color={c.textPrimary} /> : <ChevronDown size={15} color={c.textPrimary} />}
                </Pressable>
              )}
            </View>
          )}

          {/* Includes */}
          <View style={[styles.mktSection, { borderColor: c.border }]}>
            <Text style={[styles.mktSectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>Bu kursga nima kiradi?</Text>
            {totalMins > 0 && <IncludeRow icon={<Clock size={14} color={c.brand} />} label={`${fmtDurationLong(totalMins)} video`} c={c} />}
            {hasMaterials && <IncludeRow icon={<Folder size={14} color={c.brand} />} label="Qo'llab-quvvatlash fayllari" c={c} />}
            <IncludeRow icon={<InfinityIcon size={14} color={c.brand} />} label="Umrbod kirish huquqi" c={c} />
            <IncludeRow icon={<Smartphone size={14} color={c.brand} />} label="Mobil, kompyuter va TV orqali kirish" c={c} />
            <IncludeRow icon={<Award size={14} color={c.brand} />} label="Tugallash sertifikati" c={c} />
          </View>

          {/* Requirements */}
          {course.requirements && course.requirements.length > 0 && (
            <View style={[styles.mktSection, { borderColor: c.border }]}>
              <Text style={[styles.mktSectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>Talablar</Text>
              {course.requirements.map((r, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={{ color: c.textMuted }}>•</Text>
                  <Text style={[styles.bulletText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>{r}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Teacher's other courses */}
          {teacherCourses.length > 0 && (
            <View style={[styles.mktSection, { borderColor: c.border }]}>
              <Text style={[styles.mktSectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>O'qituvchining boshqa kurslari</Text>
              {teacherCourses.map(tc => (
                <Pressable key={tc.id} onPress={() => router.push(`/(screens)/course/${tc.id}` as any)}
                  style={[styles.relatedCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
                  {tc.thumbnail_url
                    ? <Image source={{ uri: tc.thumbnail_url }} style={styles.relatedThumb} resizeMode="cover" />
                    : <View style={[styles.relatedThumb, { backgroundColor: c.bgTertiary, alignItems: 'center', justifyContent: 'center' }]}>
                        <BookOpen size={18} color={c.textMuted} />
                      </View>
                  }
                  <View style={{ flex: 1, padding: spacing.xs }}>
                    <Text numberOfLines={2} style={[{ color: c.textPrimary, fontSize: typography.size.sm, fontFamily: typography.fontFamily.semibold }]}>{tc.title}</Text>
                    <Text style={[{ color: c.brand, fontSize: typography.size.sm, fontFamily: typography.fontFamily.bold, marginTop: 4 }]}>
                      {tc.is_paid ? `${tc.price.toLocaleString()} so'm` : 'Bepul'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* Teacher card */}
          {teacher && (
            <View style={[styles.mktSection, { borderColor: c.border }]}>
              <Text style={[styles.mktSectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>O'qituvchi haqida</Text>
              <Pressable onPress={() => router.push(`/(screens)/profile/${teacher.telegram_id}` as any)} style={styles.teacherRow}>
                {teacher.photo_url
                  ? <Image source={{ uri: teacher.photo_url }} style={[styles.teacherAvatar, { width: 48, height: 48, borderRadius: 24 }]} />
                  : <View style={[styles.teacherAvatar, { width: 48, height: 48, borderRadius: 24, backgroundColor: c.bgTertiary, alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ color: c.textMuted, fontSize: 18 }}>{teacher.first_name[0].toUpperCase()}</Text>
                    </View>
                }
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={[{ color: c.brand, fontSize: typography.size.base, fontFamily: typography.fontFamily.bold }]}>{teacher.first_name}</Text>
                  {teacher.headline && <Text numberOfLines={1} style={[{ color: c.textMuted, fontSize: typography.size.xs, fontFamily: typography.fontFamily.regular }]}>{teacher.headline}</Text>}
                </View>
              </Pressable>
              {teacher.bio && (
                <Text numberOfLines={3} style={[{ color: c.textSecondary, fontSize: typography.size.sm, lineHeight: 22, fontFamily: typography.fontFamily.regular }]}>{teacher.bio}</Text>
              )}
              <Pressable onPress={() => router.push(`/(screens)/profile/${teacher.telegram_id}` as any)} style={styles.moreLinkRow}>
                <Text style={[styles.moreLink, { color: c.brand, fontFamily: typography.fontFamily.semibold }]}>Profilga o'tish</Text>
                <ChevronRight size={14} color={c.brand} />
              </Pressable>
            </View>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <View style={[styles.mktSection, { borderColor: c.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[styles.mktSectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>Sharhlar</Text>
                {(course.rating ?? 0) > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[{ color: '#f59e0b', fontSize: 20, fontFamily: typography.fontFamily.bold }]}>{course.rating!.toFixed(1)}</Text>
                    <Stars rating={course.rating!} size={15} />
                  </View>
                )}
              </View>
              {reviews.slice(0, 5).map(rv => (
                <View key={rv.id} style={[styles.reviewCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
                  <View style={styles.reviewTop}>
                    {rv.profiles.photo_url
                      ? <Image source={{ uri: rv.profiles.photo_url }} style={styles.reviewAvatar} />
                      : <View style={[styles.reviewAvatar, { backgroundColor: c.bgTertiary, alignItems: 'center', justifyContent: 'center' }]}>
                          <Text style={{ color: c.textMuted, fontSize: 11 }}>{rv.profiles.first_name[0]?.toUpperCase()}</Text>
                        </View>
                    }
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={[{ color: c.textPrimary, fontSize: typography.size.sm, fontFamily: typography.fontFamily.semibold }]}>{rv.profiles.first_name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Stars rating={rv.rating} size={11} />
                        <Text style={[{ color: c.textMuted, fontSize: typography.size.xs, fontFamily: typography.fontFamily.regular }]}>{fmtDate(rv.created_at)}</Text>
                      </View>
                    </View>
                  </View>
                  {rv.review ? <Text style={[{ color: c.textSecondary, fontSize: typography.size.sm, lineHeight: 20, fontFamily: typography.fontFamily.regular }]}>{rv.review}</Text> : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      {showStickyBar && (
        <MotiView
          from={{ translateY: 80 }}
          animate={{ translateY: 0 }}
          transition={{ type: 'timing', duration: 200 }}
          style={[styles.stickyBottom, { backgroundColor: c.bgPrimary, borderTopColor: c.border, paddingBottom: insets.bottom || spacing.sm }]}
        >
          <View style={styles.stickyLeft}>
            <Text style={[styles.stickyPrice, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              {course.is_paid ? `${course.price.toLocaleString()} so'm` : 'Bepul'}
            </Text>
            {hasDiscount && (
              <Text style={[styles.stickyOld, { color: c.textMuted }]}>
                {course.original_price!.toLocaleString()} so'm
              </Text>
            )}
          </View>
          <Pressable onPress={handleEnroll} disabled={enrolling} style={[styles.stickyBtn, { backgroundColor: c.brand }]}>
            {enrolling
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={[styles.stickyBtnText, { fontFamily: typography.fontFamily.bold }]}>{enrollLabel}</Text>
            }
          </Pressable>
        </MotiView>
      )}

      <ComingSoonModal visible={showComingSoon} onClose={() => setShowComingSoon(false)} />
    </SafeAreaView>
  )
}

function MktSectionPreview({ section, c }: { section: Section; c: any }) {
  const [open, setOpen] = useState(false)
  return (
    <View style={[styles.secHeader, { borderColor: c.border, backgroundColor: c.bgSecondary }]}>
      <Pressable onPress={() => setOpen(v => !v)} style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={2} style={[styles.secTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>{section.title}</Text>
          <Text style={[styles.secMeta, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {section.lessons.length} dars • {fmtDuration(section.minutes)}
          </Text>
        </View>
        {open ? <ChevronUp size={15} color={c.textMuted} /> : <ChevronDown size={15} color={c.textMuted} />}
      </Pressable>
      {open && section.lessons.map((l) => (
        <View key={l.id} style={[styles.previewLesson, { borderTopColor: c.border }]}>
          {l.is_free ? <Play size={13} color={c.brand} /> : <Lock size={13} color={c.textMuted} />}
          <Text numberOfLines={1} style={[{ flex: 1, color: c.textSecondary, fontSize: typography.size.xs, fontFamily: typography.fontFamily.regular }]}>{l.title}</Text>
          {l.duration_minutes > 0 && <Text style={[{ color: c.textMuted, fontSize: typography.size.xs, fontFamily: typography.fontFamily.regular }]}>{fmtDuration(l.duration_minutes)}</Text>}
        </View>
      ))}
    </View>
  )
}

function IncludeRow({ icon, label, c }: { icon: React.ReactNode; label: string; c: any }) {
  return (
    <View style={styles.includeRow}>
      {icon}
      <Text style={[styles.includeText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>{label}</Text>
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },

  navBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
  },
  navBack:  { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: typography.size.sm },
  navArrow: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  // Enrolled player view
  playerWrap:   { width: '100%', height: 220, backgroundColor: '#000' },
  playerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  playerStatusText: {
    color: 'rgba(255,255,255,0.5)', marginTop: 4,
    fontFamily: 'PlusJakartaSans-Regular', fontSize: 13,
  },
  playerBack: { position: 'absolute', top: 12, left: 12 },
  playerBackBubble: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },

  lessonTitleBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xs, paddingVertical: spacing.xs,
    borderBottomWidth: 1, gap: 4,
  },
  lessonTitleText: { flex: 1, fontSize: typography.size.sm, textAlign: 'center' },

  tabBar:     { flexDirection: 'row', borderBottomWidth: 1, position: 'relative' },
  tabItem:    { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  tabLabel:   { fontSize: typography.size.sm },
  tabUnderline: { position: 'absolute', bottom: 0, left: SCREEN_W * 0.1, width: SCREEN_W * 0.3, height: 2, borderRadius: 1 },
  tabContent: { flex: 1 },

  // Enrolled lesson list
  lessonItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lessonItemIcon:  { width: 20, alignItems: 'center', marginTop: 2 },
  lessonCircle:    { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },
  lessonItemTitle: { fontSize: typography.size.sm, lineHeight: 20 },
  lessonItemMeta:  { fontSize: typography.size.xs, marginTop: 2 },

  // Download button in lesson row
  dlBtn: { width: DL_SIZE, height: DL_SIZE, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  secHeader: {
    padding: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  secTitle: { fontSize: typography.size.sm },
  secMeta:  { fontSize: typography.size.xs, marginTop: 2 },

  // Certificate card
  certCard: {
    margin: spacing.base, borderRadius: radius.md, borderWidth: 1,
    padding: spacing.base, gap: spacing.sm, alignItems: 'center',
  },
  certIconRow:   { alignItems: 'center' },
  certTitle:     { fontSize: typography.size.lg, textAlign: 'center' },
  certSub:       { fontSize: typography.size.sm, textAlign: 'center', lineHeight: 20 },
  certBtnRow:    { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  certBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: radius.sm,
  },
  certBtnText:        { color: '#fff', fontSize: typography.size.sm },
  certBtnOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1.5,
  },
  certBtnTextOutline: { fontSize: typography.size.sm },
  certProgress:  { fontSize: typography.size.base, textAlign: 'center' },
  certTrack:     { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden' },
  certFill:      { height: '100%', borderRadius: 3 },
  certCountText: { fontSize: typography.size.xs },

  // Info tab sections
  infoBody:    { padding: spacing.base, gap: spacing.base },
  infoSection: { borderTopWidth: 1, paddingTop: spacing.base, gap: spacing.sm },
  infoHeading: { fontSize: typography.size.base },
  infoText:    { fontSize: typography.size.sm, lineHeight: 22 },

  teacherRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  teacherAvatar:  { width: 30, height: 30, borderRadius: 15 },
  teacherName:    { fontSize: typography.size.base },
  teacherHeadline:{ fontSize: typography.size.xs, marginTop: 2 },
  teacherBio:     { fontSize: typography.size.sm, lineHeight: 22 },

  // Marketing view
  cover:       { width: '100%', height: 220 },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  playBtn:     { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  previewLabel: {
    color: '#fff', fontSize: typography.size.sm, fontFamily: 'PlusJakartaSans-SemiBold',
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  mktBody:    { padding: spacing.base, gap: spacing.base },
  catBadge:   { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full },
  catBadgeText:{ fontSize: typography.size.xs },
  mktTitle:   { fontSize: 22, lineHeight: 30 },
  mktDesc:    { fontSize: typography.size.sm, lineHeight: 22 },
  moreBtn:    { fontSize: typography.size.sm, marginTop: 4 },

  ratingRow:   { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  ratingNum:   { fontSize: typography.size.base },
  ratingCount: { fontSize: typography.size.xs },

  teacherBy:   { fontSize: typography.size.sm, flex: 1 },
  metaRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metaItem:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:    { fontSize: typography.size.xs },

  priceSection: { borderWidth: 1, borderRadius: radius.md, padding: spacing.base, gap: spacing.xs },
  priceRow:     { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  price:        { fontSize: 26 },
  oldPrice:     { fontSize: typography.size.base, textDecorationLine: 'line-through' },
  discountBadge:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  discountText: { color: '#fff', fontSize: typography.size.xs, fontFamily: 'PlusJakartaSans-Bold' },
  enrollBtn:    { paddingVertical: 14, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  enrollBtnText:{ color: '#fff', fontSize: typography.size.base },
  wishlistBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: 12, borderRadius: radius.sm, borderWidth: 1, marginTop: spacing.xs },
  wishlistText: { fontSize: typography.size.sm },

  mktSection:      { borderTopWidth: 1, paddingTop: spacing.base, gap: spacing.sm },
  mktSectionTitle: { fontSize: typography.size.lg },
  currMeta:        { fontSize: typography.size.xs, marginTop: -spacing.xs },

  previewLesson: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingTop: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.xs },

  bulletRow:  { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
  bulletText: { flex: 1, fontSize: typography.size.sm, lineHeight: 22 },

  showMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm,
    borderWidth: 1, borderRadius: radius.sm, marginTop: spacing.xs,
  },
  showMoreText: { fontSize: typography.size.sm },

  includeRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  includeText: { fontSize: typography.size.sm, flex: 1 },

  relatedCard:  { flexDirection: 'row', borderRadius: radius.sm, borderWidth: 1, overflow: 'hidden' },
  relatedThumb: { width: 90, height: 64 },

  moreLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  moreLink:    { fontSize: typography.size.sm },

  reviewCard:   { borderRadius: radius.sm, borderWidth: 1, padding: spacing.sm, gap: spacing.xs },
  reviewFlat:   { paddingVertical: spacing.sm, gap: spacing.sm },
  reviewDivider:{ height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  reviewTop:    { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18 },

  // Rating breakdown (Udemy style)
  ratingBreakdown: { flexDirection: 'row', alignItems: 'center', gap: spacing.base, paddingBottom: spacing.xs },
  ratingLeft:      { alignItems: 'center', gap: 3, width: 76 },
  ratingBigNum:    { fontSize: 42, lineHeight: 46 },
  ratingBarRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingBarTrack:  { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  ratingBarFill:   { height: '100%', backgroundColor: '#f59e0b', borderRadius: 3 },
  ratingPct:       { width: 30, fontSize: typography.size.xs, textAlign: 'right' as const },

  reviewForm:      { borderRadius: radius.sm, borderWidth: 1, padding: spacing.base, gap: spacing.sm, marginBottom: spacing.sm },
  reviewFormTitle: { fontSize: typography.size.base },
  starRow:         { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', paddingVertical: spacing.xs },
  reviewInput: {
    borderRadius: radius.sm, padding: spacing.sm,
    fontSize: typography.size.sm, lineHeight: 22,
    textAlignVertical: 'top' as const, minHeight: 80,
  },
  reviewSubmitBtn:  { paddingVertical: 12, borderRadius: radius.sm, alignItems: 'center' as const, justifyContent: 'center' as const },
  reviewSubmitText: { fontSize: typography.size.sm },

  // Sticky bottom bar
  stickyBottom: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingTop: spacing.sm,
    borderTopWidth: 1, gap: spacing.sm,
  },
  stickyLeft:    { flex: 3, flexDirection: 'column', justifyContent: 'center' },
  stickyPrice:   { fontSize: typography.size.base },
  stickyOld:     { fontSize: typography.size.xs, textDecorationLine: 'line-through', marginTop: 1 },
  stickyBtn:     { flex: 7, paddingVertical: 12, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  stickyBtnText: { color: '#fff', fontSize: typography.size.sm },
})

/**
 * Toʻlov holati (redesign Phase 7b): where a purchase waits after the hand-off
 * to the pay bot. Shows the code, what happens next, and flips to "Kurs
 * ochildi" once the admin approves. Re-checks on focus and whenever the app
 * comes back to the foreground (no polling timer); the approval push also
 * refreshes the enrolment from _layout.
 */
import React, { useCallback, useEffect, useState } from 'react'
import { AppState, Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
import { BookOpen, CircleCheck, Clock, Copy, Send, TimerOff } from 'lucide-react-native'
import { courses as coursesApi, enrollments, type Course, type PendingEnrollmentStatus } from '../../../lib/api'
import { getCoursePreview } from '../../../lib/coursePreview'
import { useCourseStore } from '../../../stores/courseStore'
import { useTheme } from '../../../src/design/ThemeProvider'
import { avatarSize, iconSize, iconStroke, layout, radius, space } from '../../../src/design/spacing'
import { tabular, type as typeScale } from '../../../src/design/typography'
import { Button, Card, EmptyState, ListRow, ScreenHeader, SkeletonRow, showToast } from '../../../src/components/ui'
import { uzText } from '../../../src/features/today/today'
import { priceLabel } from '../../../src/features/courses/courses'
import { PAY_BOT_URL, settlePurchase, statusCopy, usePendingStore } from '../../../src/features/courses/purchase'

type View_ = 'loading' | 'pending' | 'approved' | 'closed'

export default function PurchaseStatusScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { courseId: raw } = useLocalSearchParams<{ courseId: string }>()
  const courseId = Number(raw)

  const local = usePendingStore(s => s.byCourse[courseId])
  const [course, setCourse] = useState<Course | null>(() => getCoursePreview(courseId))
  const [server, setServer] = useState<PendingEnrollmentStatus | null>(null)
  const [enrolled, setEnrolled] = useState<boolean | null>(null)

  useEffect(() => {
    if (course) return
    coursesApi.get(courseId).then(setCourse).catch(() => {})
  }, [course, courseId])

  const check = useCallback(() => {
    Promise.all([
      useCourseStore.getState().checkEnrollment(courseId).catch(() => null),
      enrollments.pendingStatus(courseId).catch(() => null),
    ]).then(([e, p]) => {
      if (p) setServer(p)
      if (e) {
        setEnrolled(e.enrolled)
        if (e.enrolled) settlePurchase(courseId, 'status_screen')
      }
    })
  }, [courseId])

  useFocusEffect(check)
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => { if (s === 'active') check() })
    return () => sub.remove()
  }, [check])

  // The server's answer once it arrives; until then the store's copy (set
  // when the code was issued) bridges the first load.
  const pending = server
    ? (server.has_pending && server.reference_code && server.status ? { code: server.reference_code, status: server.status } : null)
    : local ? { code: local.reference_code, status: local.status } : null

  const view: View_ = enrolled
    ? 'approved'
    : pending ? 'pending'
    : enrolled === false && server ? 'closed'
    : 'loading'

  const openCourse = () => router.replace(`/(screens)/course/${courseId}` as any)
  const back = () => (router.canGoBack() ? router.back() : openCourse())

  async function copy(code: string) {
    await Clipboard.setStringAsync(code).catch(() => {})
    showToast('success', 'Kod nusxalandi')
  }

  const copyText = pending ? statusCopy(pending.status) : null

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScreenHeader title="Toʻlov holati" onBack={back} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xl }]}>
        {course ? (
          <ListRow
            title={uzText(course.title)}
            subtitle={priceLabel(course)}
            leading={course.thumbnail_url ? { kind: 'thumbnail', uri: course.thumbnail_url } : { kind: 'icon', icon: BookOpen }}
          />
        ) : <SkeletonRow />}

        {view === 'loading' && <Card loading />}

        {view === 'approved' && (
          <>
            <EmptyState icon={CircleCheck} title="Kurs ochildi" body="Toʻlov tasdiqlandi. Birinchi darsdan boshlang." />
            <Button label="Boshlash" size="lg" fullWidth onPress={openCourse} />
          </>
        )}

        {view === 'closed' && (
          <>
            <EmptyState icon={TimerOff} title="Kod muddati tugadi" body="Toʻlov kodi 24 soat amal qiladi. Yangi kod olib, qaytadan boshlang." />
            <Button label="Qayta sotib olish" size="lg" fullWidth onPress={openCourse} />
          </>
        )}

        {view === 'pending' && pending && copyText && (
          <>
            <Card style={styles.status}>
              <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
                <Clock size={iconSize.md} color={colors.accentText} strokeWidth={iconStroke} />
              </View>
              <View style={styles.flex}>
                <Text style={[typeScale.headline, { color: colors.text }]} accessibilityRole="header">{copyText.title}</Text>
                <Text style={[typeScale.body, { color: colors.textMuted }]}>{copyText.body}</Text>
              </View>
            </Card>

            <Card style={styles.codeCard}>
              <Text style={[typeScale.overline, { color: colors.textMuted }]}>Toʻlov kodi</Text>
              <Text style={[typeScale.title2, tabular, { color: colors.text }]} selectable accessibilityLabel={`Toʻlov kodi ${pending.code}`}>
                {pending.code}
              </Text>
              <Button label="Kodni nusxalash" icon={Copy} variant="secondary" size="sm" onPress={() => copy(pending.code)} />
            </Card>

            <View style={styles.actions}>
              <Button
                label="Telegramni ochish"
                icon={Send}
                size="lg"
                fullWidth
                onPress={() => { copy(pending.code); Linking.openURL(PAY_BOT_URL).catch(() => {}) }}
              />
              <Button label="Kursga qaytish" variant="ghost" fullWidth onPress={openCourse} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.xs, gap: layout.cardGap },
  status: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  icon: { width: avatarSize.md, height: avatarSize.md, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: space.xxs },
  codeCard: { gap: space.xs, alignItems: 'flex-start' },
  actions: { gap: space.xs },
})

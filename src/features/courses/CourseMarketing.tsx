/**
 * Course detail for someone not enrolled (redesign Phase 7b): a 16:9 cover
 * with a circular back button, the title and meta below it (never on the
 * image), "NIMANI OʻRGANASIZ", the lessons (free ones "Bepul koʻrish", the
 * rest locked), and a sticky bar with the price and "Sotib olish" /
 * "Boshlash" — or "Holatni koʻrish" while a payment is being checked.
 *
 * Social proof follows the Kurslar rules: no rating or reviews under 5
 * ratings ("Yangi"), no student count under 20.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BookOpen, Check, ChevronLeft, Heart, Lock, Play } from 'lucide-react-native'
import type { Course, CourseReview, Lesson } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { avatarSize, iconSize, iconStroke, layout, radius, space } from '../../design/spacing'
import { imageChip, onImage } from '../../design/tokens'
import { tabular, type as typeScale } from '../../design/typography'
import { Avatar, Badge, Button, Card, ListRow, Pressable } from '../../components/ui'
import { uzText } from '../today/today'
import { CourseRow } from './CourseRow'
import { courseMeta, durationLabel, groupDigits, isFree, isPreviewable, priceLabel, socialProof } from './courses'
import { PENDING_CHIP } from './purchase'

const LESSONS_SHOWN = 8
const REVIEWS_SHOWN = 3
const DESC_LINES = 4

export interface CourseMarketingProps {
  course: Course
  lessons: Lesson[]
  reviews: CourseReview[]
  teacher: { telegram_id: number; first_name: string; photo_url: string | null; headline: string | null } | null
  teacherCourses: Course[]
  /** An open payment request for this course. */
  pending: boolean
  saved: boolean
  busy: boolean
  /** The preview player, shown in place of the cover while a free lesson plays. */
  player: React.ReactNode | null
  playingId: number | null
  onBack: () => void
  onToggleSave: () => void
  onPreview: (lesson: Lesson) => void
  /** "Sotib olish" / "Boshlash" / "Holatni koʻrish" — the screen decides. */
  onPrimary: () => void
  onOpenTeacher: (telegramId: number) => void
  onOpenCourse: (id: number) => void
}

type LessonGroup = { title: string | null; lessons: Lesson[] }

function groupLessons(lessons: Lesson[]): LessonGroup[] {
  const out: LessonGroup[] = []
  for (const l of lessons) {
    const title = l.section_title ?? null
    const last = out[out.length - 1]
    if (last && last.title === title) last.lessons.push(l)
    else out.push({ title, lessons: [l] })
  }
  return out.length > 1 ? out : out.map(g => ({ ...g, title: null }))
}

export function CourseMarketing(p: CourseMarketingProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [allLessons, setAllLessons] = useState(false)
  const [descOpen, setDescOpen] = useState(false)
  const [barH, setBarH] = useState(0)
  const scrollRef = useRef<ScrollView>(null)

  // A preview started from the lesson list plays in the cover slot: bring it into view.
  useEffect(() => {
    if (p.playingId != null) scrollRef.current?.scrollTo({ y: 0, animated: true })
  }, [p.playingId])

  const { course } = p
  const proof = socialProof(course)
  const free = isFree(course)
  const firstFree = p.lessons.find(isPreviewable) ?? null
  const shownLessons = allLessons ? p.lessons : p.lessons.slice(0, LESSONS_SHOWN)
  const groups = useMemo(() => groupLessons(shownLessons), [shownLessons])
  const totalMin = p.lessons.reduce((s, l) => s + (l.duration_minutes ?? 0), 0) || course.total_duration_minutes
  const discount = !free && course.original_price && course.original_price > course.price ? course.original_price : null
  const primaryLabel = p.pending ? 'Holatni koʻrish' : free ? 'Boshlash' : 'Sotib olish'
  const teacherName = p.teacher?.first_name ?? course.teacher?.first_name ?? null
  const teacherId = p.teacher?.telegram_id ?? course.teacher?.telegram_id ?? course.teacher_id

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: barH + space.xl }} showsVerticalScrollIndicator={false}>
        {p.player ?? (
          <Pressable
            onPress={firstFree ? () => p.onPreview(firstFree) : undefined}
            disabled={!firstFree}
            accessibilityLabel={firstFree ? 'Bepul darsni koʻrish' : uzText(course.title)}
            style={[styles.cover, { backgroundColor: colors.surfaceRaised }]}
          >
            {course.thumbnail_url ? (
              <Image source={{ uri: course.thumbnail_url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <View style={styles.coverIcon}>
                <BookOpen size={avatarSize.lg} color={colors.textFaint} strokeWidth={iconStroke} />
              </View>
            )}
            {firstFree && (
              <View style={[styles.previewChip, { backgroundColor: imageChip }]}>
                <Play size={iconSize.sm - 4} color={onImage} fill={onImage} strokeWidth={iconStroke} />
                <Text style={[typeScale.callout, { color: onImage }]}>Bepul koʻrish</Text>
              </View>
            )}
          </Pressable>
        )}

        {/* Over the cover (or the player): back and save. */}
        <View style={styles.overlay} pointerEvents="box-none">
          <CircleButton label="Orqaga" onPress={p.onBack}>
            <ChevronLeft size={iconSize.md} color={onImage} strokeWidth={iconStroke} />
          </CircleButton>
          <CircleButton label={p.saved ? 'Sevimlilardan olib tashlash' : 'Sevimlilarga qoʻshish'} onPress={p.onToggleSave} selected={p.saved}>
            <Heart size={iconSize.sm} color={onImage} fill={p.saved ? onImage : 'transparent'} strokeWidth={iconStroke} />
          </CircleButton>
        </View>

        <View style={styles.body}>
          <View style={styles.titleBlock}>
            {course.categories?.name ? (
              <Text style={[typeScale.overline, { color: colors.accentText }]}>{course.categories.name}</Text>
            ) : null}
            <Text style={[typeScale.title1, { color: colors.text }]} accessibilityRole="header">{uzText(course.title)}</Text>
            <Text style={[typeScale.callout, { color: colors.textMuted }]}>{courseMeta(course)}</Text>
            {p.pending && <Badge kind="status" status="accent" label={PENDING_CHIP} />}
          </View>

          {teacherName && (
            <ListRow
              title={teacherName}
              subtitle={p.teacher?.headline ?? 'Oʻqituvchi'}
              leading={{ kind: 'avatar', name: teacherName, uri: p.teacher?.photo_url ?? course.teacher?.photo_url }}
              trailing={{ kind: 'chevron' }}
              onPress={() => p.onOpenTeacher(teacherId)}
            />
          )}

          {course.description ? (
            <View style={styles.gapXs}>
              <Text style={[typeScale.body, { color: colors.text }]} numberOfLines={descOpen ? undefined : DESC_LINES}>
                {course.description}
              </Text>
              {course.description.length > 180 && (
                <Button label={descOpen ? 'Kamroq' : 'Koʻproq'} variant="ghost" size="sm" onPress={() => setDescOpen(v => !v)} style={styles.start} />
              )}
            </View>
          ) : null}

          {!!course.what_you_learn?.length && (
            <Card style={styles.gapSm}>
              <Text style={[typeScale.overline, { color: colors.textMuted }]} accessibilityRole="header">Nimani oʻrganasiz</Text>
              {course.what_you_learn.map((item, i) => (
                <View key={i} style={styles.bullet}>
                  <Check size={iconSize.sm - 2} color={colors.successText} strokeWidth={iconStroke} />
                  <Text style={[typeScale.body, styles.flex, { color: colors.text }]}>{item}</Text>
                </View>
              ))}
            </Card>
          )}

          {p.lessons.length > 0 && (
            <View style={styles.gapXs}>
              <Text style={[typeScale.overline, { color: colors.textMuted }]} accessibilityRole="header">
                Darslar · {p.lessons.length}{durationLabel(totalMin) ? ` · ${durationLabel(totalMin)}` : ''}
              </Text>
              <Card style={styles.lessons}>
                {groups.map((g, gi) => (
                  <View key={`${g.title ?? ''}-${gi}`}>
                    {g.title && <Text style={[typeScale.caption, styles.section, { color: colors.textMuted }]}>{uzText(g.title)}</Text>}
                    {g.lessons.map(l => {
                      const open = isPreviewable(l)
                      const dur = durationLabel(l.duration_minutes)
                      return (
                        <ListRow
                          key={l.id}
                          title={uzText(l.title)}
                          subtitle={dur ?? undefined}
                          leading={{ kind: 'icon', icon: open ? Play : Lock, color: open ? undefined : colors.textFaint }}
                          trailing={open ? { kind: 'value', value: p.playingId === l.id ? 'Koʻrilmoqda' : 'Bepul koʻrish', color: colors.accentText } : undefined}
                          onPress={open ? () => p.onPreview(l) : undefined}
                        />
                      )
                    })}
                  </View>
                ))}
              </Card>
              {p.lessons.length > LESSONS_SHOWN && (
                <Button
                  label={allLessons ? 'Kamroq koʻrsatish' : `Barcha darslar (${p.lessons.length})`}
                  variant="secondary"
                  fullWidth
                  onPress={() => setAllLessons(v => !v)}
                />
              )}
            </View>
          )}

          {!!course.requirements?.length && (
            <Card style={styles.gapSm}>
              <Text style={[typeScale.overline, { color: colors.textMuted }]} accessibilityRole="header">Talablar</Text>
              {course.requirements.map((r, i) => (
                <Text key={i} style={[typeScale.body, { color: colors.text }]}>• {r}</Text>
              ))}
            </Card>
          )}

          {proof.rating && p.reviews.length > 0 && (
            <View style={styles.gapXs}>
              <Text style={[typeScale.overline, { color: colors.textMuted }]} accessibilityRole="header">
                Sharhlar · ★ {proof.rating} · {groupDigits(course.ratings_count ?? 0)} ta baho
              </Text>
              {p.reviews.slice(0, REVIEWS_SHOWN).map(rv => (
                <Card key={rv.id} style={styles.gapXs}>
                  <View style={styles.reviewHead}>
                    <Avatar name={rv.profiles.first_name} uri={rv.profiles.photo_url} size="sm" />
                    <Text style={[typeScale.headline, styles.flex, { color: colors.text }]} numberOfLines={1}>{rv.profiles.first_name}</Text>
                    <Text style={[typeScale.callout, tabular, { color: colors.accentText }]}>★ {rv.rating}</Text>
                  </View>
                  {rv.review ? <Text style={[typeScale.body, { color: colors.text }]}>{rv.review}</Text> : null}
                </Card>
              ))}
            </View>
          )}

          {p.teacherCourses.length > 0 && (
            <View style={styles.gapXs}>
              <Text style={[typeScale.overline, { color: colors.textMuted }]} accessibilityRole="header">Oʻqituvchining boshqa kurslari</Text>
              {p.teacherCourses.map(tc => <CourseRow key={tc.id} course={tc} onPress={() => p.onOpenCourse(tc.id)} />)}
            </View>
          )}
        </View>
      </ScrollView>

      <View
        onLayout={e => setBarH(e.nativeEvent.layout.height)}
        style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + space.xs }]}
      >
        <View style={styles.flex}>
          <Text style={[typeScale.overline, { color: colors.textMuted }]}>Narxi</Text>
          <View style={styles.priceRow}>
            <Text style={[typeScale.title2, tabular, { color: free ? colors.successText : colors.text }]} numberOfLines={1}>
              {priceLabel(course)}
            </Text>
            {discount && (
              <Text style={[typeScale.callout, tabular, styles.strike, { color: colors.textMuted }]} numberOfLines={1}>
                {groupDigits(discount)}
              </Text>
            )}
          </View>
        </View>
        <Button label={primaryLabel} size="lg" loading={p.busy} onPress={p.onPrimary} style={styles.cta} />
      </View>
    </View>
  )
}

function CircleButton({ label, onPress, selected, children }: {
  label: string; onPress: () => void; selected?: boolean; children: React.ReactNode
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={space.xxs}
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { selected }}
      style={[styles.circle, { backgroundColor: imageChip }]}
    >
      {children}
    </Pressable>
  )
}

const CIRCLE = layout.minTouch - space.xs

const styles = StyleSheet.create({
  root: { flex: 1 },
  cover: { width: '100%', aspectRatio: 16 / 9, overflow: 'hidden' },
  coverIcon: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  previewChip: {
    position: 'absolute', left: layout.gutter, bottom: space.sm,
    flexDirection: 'row', alignItems: 'center', gap: space.xxs + 2,
    paddingHorizontal: space.sm, paddingVertical: space.xxs + 2, borderRadius: radius.full,
  },
  overlay: {
    position: 'absolute', top: space.xs, left: space.xs, right: space.xs,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  circle: { width: CIRCLE, height: CIRCLE, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: layout.gutter, paddingTop: space.lg, gap: layout.sectionGap },
  titleBlock: { gap: space.xs },
  gapXs: { gap: space.xs },
  gapSm: { gap: space.sm },
  start: { alignSelf: 'flex-start' },
  flex: { flex: 1 },
  bullet: { flexDirection: 'row', gap: space.xs, alignItems: 'flex-start', paddingTop: 2 },
  lessons: { paddingVertical: space.xxs },
  section: { paddingTop: space.sm, textTransform: 'uppercase' },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  bar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: layout.gutter, paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  strike: { textDecorationLine: 'line-through' },
  cta: { minWidth: avatarSize.xl * 2 },
})

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, Image, Pressable,
  ActivityIndicator, ScrollView, Alert, TextInput, Linking,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import {
  ChevronLeft, BookOpen, Star, Download, BookOpenCheck, Lock, Pencil,
} from 'lucide-react-native'
import { useTheme } from '../../../hooks/useTheme'
import { useAuthStore } from '../../../stores/authStore'
import { request } from '../../../lib/api'
import { typography, spacing, radius } from '../../../lib/constants'

interface Book {
  id:              number
  title:           string
  author:          string
  description:     string | null
  category:        string | null
  is_paid:         boolean
  price:           number | null
  thumbnail_url:   string | null
  file_url:        string | null
  rating:          number
  downloads:       number
  is_downloadable: boolean
  is_available:    boolean
}

interface BookReview {
  id:         number
  user_id:    number
  rating:     number
  review:     string | null
  created_at: string
  profiles: {
    first_name: string
    username:   string | null
    photo_url:  string | null
  }
}

// ── Stars ─────────────────────────────────────────────────────────────────────

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

// ── Rating breakdown (Udemy-style) ────────────────────────────────────────────

function RatingBreakdown({ reviews, overallRating, c }: { reviews: BookReview[]; overallRating: number; c: any }) {
  const total = reviews.length
  if (!overallRating || total === 0) return null

  return (
    <View style={styles.ratingBreakdown}>
      <View style={styles.ratingLeft}>
        <Text style={[styles.ratingBigNum, { color: '#f59e0b', fontFamily: typography.fontFamily.bold }]}>
          {overallRating.toFixed(1)}
        </Text>
        <Stars rating={overallRating} size={13} />
        <Text style={[{ color: c.textMuted, fontSize: typography.size.xs, fontFamily: typography.fontFamily.regular, marginTop: 2 }]}>
          {total} ta sharh
        </Text>
      </View>
      <View style={{ flex: 1, gap: 7 }}>
        {[5, 4, 3, 2, 1].map(star => {
          const count = reviews.filter(r => Math.round(r.rating) === star).length
          const pct   = count / total
          return (
            <View key={star} style={styles.ratingBarRow}>
              <View style={{ flexDirection: 'row', gap: 1, width: 54 }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} size={10} color="#f59e0b" strokeWidth={1.5}
                    fill={i <= star ? '#f59e0b' : 'transparent'} />
                ))}
              </View>
              <View style={[styles.ratingBarTrack, { backgroundColor: c.bgTertiary }]}>
                <View style={[styles.ratingBarFill, { width: `${Math.round(pct * 100)}%` }]} />
              </View>
              <Text style={[styles.ratingPct, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                {Math.round(pct * 100)}%
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

// ── Review form ───────────────────────────────────────────────────────────────

function ReviewForm({ bookId, onSubmitted, onInputFocus, c }: {
  bookId: number; onSubmitted: () => void; onInputFocus?: () => void; c: any
}) {
  const { user }  = useAuthStore()
  const [rating,  setRating]  = useState(0)
  const [text,    setText]    = useState('')
  const [loading, setLoading] = useState(false)
  const [loaded,  setLoaded]  = useState(false)

  useEffect(() => {
    request<{ rating: number; review?: string | null }>(
      `/api/books/${bookId}/my-rating`, { auth: true }
    ).then(r => {
      setRating(r.rating ?? 0)
      setText(r.review ?? '')
    }).catch(() => {}).finally(() => setLoaded(true))
  }, [bookId])

  async function submit() {
    if (!rating) { Alert.alert('Baho bering', '1-5 yulduz tanlang'); return }
    setLoading(true)
    try {
      await request(`/api/books/${bookId}/rate`, {
        method: 'POST', auth: true,
        body: JSON.stringify({ telegram_id: user?.telegram_id, rating, review: text }),
      })
      // Reload own rating to sync displayed state with what was actually saved
      try {
        const saved = await request<{ rating: number; review?: string | null }>(
          `/api/books/${bookId}/my-rating`, { auth: true }
        )
        setRating(saved.rating ?? rating)
        setText(saved.review ?? '')
      } catch {
        setText('')
      }
      Alert.alert('', 'Sharhingiz qabul qilindi!')
      onSubmitted()
    } catch (e: any) {
      const raw = String(e?.message ?? '')
      const msg = raw.startsWith('[') || raw.startsWith('{')
        ? 'Server xatoligi. Qayta urinib ko\'ring.'
        : raw || 'Sharh yuborilmadi'
      Alert.alert('Xatolik', msg)
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
        onFocus={onInputFocus}
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

// ── Review card ───────────────────────────────────────────────────────────────

function ReviewCard({ rv, bookId, myUserId, myUsername, onChanged, c }: {
  rv: BookReview; bookId: number; myUserId?: number; myUsername?: string | null
  onChanged: () => void; c: any
}) {
  const [editing,    setEditing]    = useState(false)
  const [editRating, setEditRating] = useState(rv.rating)
  const [editText,   setEditText]   = useState(rv.review ?? '')
  const [saving,     setSaving]     = useState(false)

  const isOwner =
    (!!myUserId && rv.user_id === myUserId) ||
    (!!myUsername && !!rv.profiles.username && rv.profiles.username === myUsername)

  async function handleUpdate() {
    if (!editRating) { Alert.alert('Baho bering', '1-5 yulduz tanlang'); return }
    setSaving(true)
    try {
      await request(`/api/books/${bookId}/rate`, {
        method: 'POST', auth: true,
        body: JSON.stringify({ telegram_id: myUserId, rating: editRating, review: editText }),
      })
      setEditing(false)
      onChanged()
    } catch (e: any) {
      Alert.alert('Xatolik', e?.message ?? "Yangilab bo'lmadi")
    } finally {
      setSaving(false)
    }
  }

  function fmtDate(iso: string) {
    try { return new Date(iso).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long' }) }
    catch { return iso }
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
          <Text numberOfLines={1} style={[{ color: c.textPrimary, fontSize: typography.size.sm, fontFamily: typography.fontFamily.semibold }]}>
            {rv.profiles.first_name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Stars rating={editing ? editRating : rv.rating} size={11} />
            <Text style={[{ color: c.textMuted, fontSize: typography.size.xs, fontFamily: typography.fontFamily.regular }]}>
              {fmtDate(rv.created_at)}
            </Text>
          </View>
        </View>
        {isOwner && !editing && (
          <Pressable onPress={() => { setEditRating(rv.rating); setEditText(rv.review ?? ''); setEditing(true) }} hitSlop={12}>
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

// ── Main screen ───────────────────────────────────────────────────────────────

export default function BookDetailScreen() {
  const { c }      = useTheme()
  const { user }   = useAuthStore()
  const router     = useRouter()
  const insets     = useSafeAreaInsets()
  const scrollRef  = useRef<ScrollView>(null)
  const { id }     = useLocalSearchParams<{ id: string }>()

  const [book,         setBook]         = useState<Book | null>(null)
  const [reviews,      setReviews]      = useState<BookReview[]>([])
  const [reviewsError, setReviewsError] = useState<string | null>(null)
  const [loading,      setLoading]      = useState(true)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    try {
      const b = await request<Book>(`/api/books/${id}`, { auth: true })
      setBook(b)
    } catch {}
    try {
      const rv = await request<BookReview[]>(`/api/books/${id}/reviews`, { auth: true })
      setReviews(rv)
      setReviewsError(null)
    } catch (e: any) {
      setReviewsError(String(e?.message ?? 'Sharhlarni yuklashda xatolik'))
      setReviews([])
    }
    finally { setLoading(false) }
  }

  const refreshReviews = useCallback(async () => {
    try {
      const b = await request<Book>(`/api/books/${id}`, { auth: true })
      setBook(b)
    } catch {}
    try {
      const rv = await request<BookReview[]>(`/api/books/${id}/reviews`, { auth: true })
      setReviews(rv)
      setReviewsError(null)
    } catch (e: any) {
      setReviewsError(String(e?.message ?? 'Sharhlarni yuklashda xatolik'))
    }
  }, [id])

  function handleRead() {
    router.push({
      pathname: '/(screens)/book-reader/[id]',
      params: { id, title: book?.title ?? '', file_url: book?.file_url ?? '' },
    } as any)
  }

  async function handleDownload() {
    if (!book?.is_downloadable) {
      Alert.alert('', 'Bu kitob yuklab olish uchun mavjud emas.')
      return
    }
    try {
      const res = await request<{ download_url: string }>(
        `/api/books/${id}/download`, { auth: true }
      )
      await Linking.openURL(res.download_url)
    } catch (e: any) {
      if (e?.message?.includes('402') || e?.message?.includes('Purchase')) {
        Alert.alert("To'lov kerak", `Bu kitob ${book?.price?.toLocaleString('uz-UZ')} so'm turadi.`)
      } else {
        Alert.alert('Xatolik', 'Yuklab olishda xatolik yuz berdi.')
      }
    }
  }

  function scrollToForm() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bgPrimary }]} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={22} color={c.brand} />
          </Pressable>
        </View>
        <ActivityIndicator color={c.brand} style={{ marginTop: spacing['2xl'] }} />
      </SafeAreaView>
    )
  }

  if (!book) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bgPrimary }]} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={22} color={c.brand} />
          </Pressable>
        </View>
        <Text style={[{ color: c.textMuted, textAlign: 'center', marginTop: 40 }]}>Kitob topilmadi</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bgPrimary }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={c.brand} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]} numberOfLines={1}>
          {book.title}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Cover + meta */}
        <View style={styles.coverSection}>
          {book.thumbnail_url ? (
            <Image source={{ uri: book.thumbnail_url }} style={styles.cover} resizeMode="cover" />
          ) : (
            <View style={[styles.cover, { backgroundColor: c.bgTertiary, alignItems: 'center', justifyContent: 'center' }]}>
              <BookOpen size={48} color={c.textMuted} />
            </View>
          )}

          <View style={styles.meta}>
            <Text style={[styles.bookTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              {book.title}
            </Text>
            <Text style={[styles.author, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              {book.author}
            </Text>

            {book.category && (
              <View style={[styles.catChip, { backgroundColor: c.bgTertiary }]}>
                <Text style={[styles.catText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                  {book.category}
                </Text>
              </View>
            )}

            <View style={styles.statsRow}>
              {book.rating > 0 && (
                <View style={styles.statItem}>
                  <Star size={14} color="#f59e0b" fill="#f59e0b" />
                  <Text style={[styles.statText, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
                    {book.rating.toFixed(1)}
                  </Text>
                </View>
              )}
              <View style={styles.statItem}>
                <Download size={14} color={c.textMuted} />
                <Text style={[styles.statText, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
                  {book.downloads.toLocaleString()}
                </Text>
              </View>
              <Text style={[styles.priceTag, {
                color:           book.is_paid ? c.brand : '#22c55e',
                fontFamily:      typography.fontFamily.bold,
                backgroundColor: book.is_paid ? c.brandSubtle : 'rgba(34,197,94,0.12)',
              }]}>
                {book.is_paid && book.price ? `${book.price.toLocaleString('uz-UZ')} so'm` : 'Bepul'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <Pressable onPress={handleRead} style={[styles.actionBtn, { backgroundColor: c.brand }]}>
            <BookOpenCheck size={16} color="#fff" />
            <Text style={[styles.actionBtnText, { color: '#fff', fontFamily: typography.fontFamily.semibold }]}>
              O'qish
            </Text>
          </Pressable>
          <Pressable
            onPress={handleDownload}
            style={[styles.actionBtn, { backgroundColor: c.bgTertiary, borderColor: c.border, borderWidth: 1 }]}
          >
            {book.is_paid && !book.is_downloadable
              ? <Lock size={16} color={c.textMuted} />
              : <Download size={16} color={c.textSecondary} />
            }
            <Text style={[styles.actionBtnText, { color: c.textSecondary, fontFamily: typography.fontFamily.semibold }]}>
              Yuklab olish
            </Text>
          </Pressable>
        </View>

        {/* Description */}
        {book.description && (
          <View style={[styles.section, { borderTopColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
              Tavsif
            </Text>
            <Text style={[styles.description, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              {book.description}
            </Text>
          </View>
        )}

        {/* Reviews section */}
        <View style={[styles.section, { borderTopColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Sharhlar
          </Text>

          <RatingBreakdown reviews={reviews} overallRating={book.rating} c={c} />

          <ReviewForm bookId={book.id} onSubmitted={refreshReviews} onInputFocus={scrollToForm} c={c} />
        </View>

        <View style={[styles.section, { borderTopColor: c.border }]}>
          {reviewsError ? (
            <Text style={[{ color: '#ef4444', fontSize: typography.size.xs, fontFamily: typography.fontFamily.regular, textAlign: 'center', paddingVertical: spacing.sm }]}>
              Xatolik: {reviewsError}
            </Text>
          ) : reviews.length === 0 ? (
            <Text style={[{ color: c.textMuted, fontSize: typography.size.sm, fontFamily: typography.fontFamily.regular, textAlign: 'center', paddingVertical: spacing.sm }]}>
              Hali sharhlar yo'q. Birinchi bo'lib sharh qoldiring!
            </Text>
          ) : (
            reviews.slice(0, 10).map((rv, idx) => (
              <React.Fragment key={rv.id}>
                {idx > 0 && <View style={[styles.reviewDivider, { backgroundColor: c.border }]} />}
                <ReviewCard
                  rv={rv}
                  bookId={book.id}
                  myUserId={user?.telegram_id}
                  myUsername={user?.username ?? null}
                  onChanged={refreshReviews}
                  c={c}
                />
              </React.Fragment>
            ))
          )}
        </View>

      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1 },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderBottomWidth: 1,
    gap:               spacing.sm,
  },
  headerTitle: {
    flex:      1,
    fontSize:  typography.size.md,
    textAlign: 'center',
  },
  content: {
    paddingBottom: 0,
  },
  coverSection: {
    flexDirection: 'row',
    gap:           spacing.base,
    padding:       spacing.base,
  },
  cover: {
    width:        120,
    height:       160,
    borderRadius: radius.lg,
    overflow:     'hidden',
    flexShrink:   0,
  },
  meta: {
    flex:           1,
    gap:            spacing.xs,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize:   typography.size.lg,
    lineHeight: 24,
  },
  author: {
    fontSize: typography.size.sm,
  },
  catChip: {
    alignSelf:         'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical:   2,
    borderRadius:      radius.full,
    marginTop:         spacing.xs,
  },
  catText: {
    fontSize: 11,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    marginTop:     spacing.xs,
    flexWrap:      'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  statText: {
    fontSize: typography.size.sm,
  },
  priceTag: {
    fontSize:          typography.size.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical:   3,
    borderRadius:      radius.full,
  },
  actions: {
    flexDirection:     'row',
    gap:               spacing.sm,
    paddingHorizontal: spacing.base,
    paddingBottom:     spacing.base,
  },
  actionBtn: {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius:    radius.xl,
  },
  actionBtnText: {
    fontSize: typography.size.sm,
  },
  section: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.base,
    paddingBottom:     spacing.sm,
    borderTopWidth:    1,
    gap:               spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.size.md,
  },
  description: {
    fontSize:   typography.size.base,
    lineHeight: 22,
  },

  // Rating breakdown
  ratingBreakdown: { flexDirection: 'row', alignItems: 'center', gap: spacing.base, paddingBottom: spacing.xs },
  ratingLeft:      { alignItems: 'center', gap: 3, width: 76 },
  ratingBigNum:    { fontSize: 42, lineHeight: 46 },
  ratingBarRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingBarTrack:  { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  ratingBarFill:   { height: '100%', backgroundColor: '#f59e0b', borderRadius: 3 },
  ratingPct:       { width: 30, fontSize: typography.size.xs, textAlign: 'right' as const },

  // Review form
  reviewForm:      { borderRadius: radius.sm, borderWidth: 1, padding: spacing.base, gap: spacing.sm, marginBottom: spacing.xs },
  reviewFormTitle: { fontSize: typography.size.base },
  starRow:         { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', paddingVertical: spacing.xs },
  reviewInput: {
    borderRadius:       radius.sm,
    padding:            spacing.sm,
    fontSize:           typography.size.sm,
    lineHeight:         22,
    textAlignVertical:  'top' as const,
    minHeight:          80,
  },
  reviewSubmitBtn:  { paddingVertical: 12, borderRadius: radius.sm, alignItems: 'center' as const, justifyContent: 'center' as const },
  reviewSubmitText: { fontSize: typography.size.sm },

  // Review cards
  reviewFlat:    { paddingVertical: spacing.sm, gap: spacing.sm },
  reviewDivider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  reviewTop:     { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  reviewAvatar:  { width: 36, height: 36, borderRadius: 18 },
})

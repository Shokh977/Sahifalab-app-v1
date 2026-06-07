import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, ScrollView, Image, Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack, useRouter } from 'expo-router'
import { ChevronLeft, Bookmark, Heart, BookOpen } from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../../hooks/useTheme'
import { request, courses as coursesApi } from '../../lib/api'
import { PostCard } from '../../components/feed/PostCard'
import { CommentsSheet } from '../../components/feed/CommentsSheet'
import { typography, spacing, radius } from '../../lib/constants'
import type { Post } from '../../lib/types'
import type { Course } from '../../lib/api'

const WISHLIST_KEY = 'wishlist_course_ids'

interface FeedResponse {
  items:    Post[]
  has_more: boolean
}

function SavedCourseCard({ course }: { course: Course }) {
  const { c } = useTheme()
  const router = useRouter()
  return (
    <Pressable
      onPress={() => router.push(`/(screens)/course/${course.id}` as any)}
      style={({ pressed }) => [
        styles.courseCard,
        { backgroundColor: c.bgSecondary, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {course.thumbnail_url ? (
        <Image source={{ uri: course.thumbnail_url }} style={styles.courseThumb} />
      ) : (
        <View style={[styles.courseThumb, { backgroundColor: c.bgTertiary, alignItems: 'center', justifyContent: 'center' }]}>
          <BookOpen size={20} color={c.textMuted} />
        </View>
      )}
      <View style={styles.courseInfo}>
        <Text style={[styles.courseTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]} numberOfLines={2}>
          {course.title}
        </Text>
        <Text style={[styles.courseMeta, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          {course.is_paid ? `${course.price.toLocaleString()} so'm` : 'Bepul'} · {course.total_lessons} dars
        </Text>
      </View>
    </Pressable>
  )
}

function SavedCoursesSection({ onRefresh }: { onRefresh?: number }) {
  const { c } = useTheme()
  const [savedCourses, setSavedCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  const loadSaved = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await AsyncStorage.getItem(WISHLIST_KEY)
      const ids: number[] = raw ? JSON.parse(raw) : []
      if (ids.length === 0) { setSavedCourses([]); return }
      const results = await Promise.allSettled(ids.map(id => coursesApi.get(id)))
      const loaded = results
        .filter((r): r is PromiseFulfilledResult<Course> => r.status === 'fulfilled')
        .map(r => r.value)
      setSavedCourses(loaded)
    } catch {
      setSavedCourses([])
    } finally {
      setLoading(false)
    }
  }, [onRefresh])

  useEffect(() => { loadSaved() }, [loadSaved])

  if (loading) {
    return (
      <View style={styles.coursesSection}>
        <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Sevimli kurslar
        </Text>
        <ActivityIndicator color={c.brand} style={{ marginVertical: spacing.base }} />
      </View>
    )
  }

  if (savedCourses.length === 0) return null

  return (
    <View style={styles.coursesSection}>
      <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
        Sevimli kurslar
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.coursesRow}>
        {savedCourses.map(course => (
          <SavedCourseCard key={course.id} course={course} />
        ))}
      </ScrollView>
    </View>
  )
}

export default function SavedScreen() {
  const { c }  = useTheme()
  const router = useRouter()

  const [posts,       setPosts]       = useState<Post[]>([])
  const [page,        setPage]        = useState(1)
  const [hasMore,     setHasMore]     = useState(true)
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing,  setRefreshing]  = useState(false)
  const [commentPost, setCommentPost] = useState<Post | null>(null)
  const [refreshKey,  setRefreshKey]  = useState(0)

  const load = useCallback(async (pg = 1, refresh = false) => {
    if (refresh) setRefreshing(true)
    if (pg === 1 && !refresh) setLoading(true)
    else if (pg > 1) setLoadingMore(true)
    try {
      const data = await request<FeedResponse>(
        `/api/v1/social/posts/saved?page=${pg}&page_size=20`, { auth: true }
      )
      const items = data.items ?? (data as any).posts ?? []
      if (pg === 1) setPosts(items)
      else          setPosts(prev => [...prev, ...items])
      setPage(pg)
      setHasMore(data.has_more ?? false)
    } catch {}
    finally { setLoading(false); setLoadingMore(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load(1) }, [load])

  const handleRefresh = () => {
    setRefreshKey(k => k + 1)
    load(1, true)
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bgPrimary }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={c.brand} />
        </Pressable>
        <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Saqlangan
        </Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={c.brand} style={{ marginTop: spacing['2xl'] }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <PostCard post={item} onCommentPress={setCommentPost} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={c.brand}
              colors={[c.brand]}
            />
          }
          onEndReached={() => { if (hasMore && !loadingMore) load(page + 1) }}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={<SavedCoursesSection onRefresh={refreshKey} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Bookmark size={40} color={c.textMuted} />
              <Text style={[styles.emptyText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                Hali hech narsa saqlanmagan
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator color={c.brand} style={{ marginVertical: spacing.base }} />
              : null
          }
        />
      )}

      <CommentsSheet
        post={commentPost}
        visible={!!commentPost}
        onClose={() => setCommentPost(null)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderBottomWidth: 1,
    gap:               spacing.sm,
  },
  title: {
    flex:      1,
    fontSize:  typography.size.lg,
    textAlign: 'center',
  },
  list: {
    paddingTop:    spacing.sm,
    paddingBottom: 80,
  },
  empty: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap:             spacing.sm,
  },
  emptyText: { fontSize: typography.size.sm },

  // Saved courses
  coursesSection: {
    paddingVertical: spacing.base,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize:         typography.size.base,
    paddingHorizontal: spacing.base,
  },
  coursesRow: {
    paddingHorizontal: spacing.base,
    gap:               spacing.sm,
  },
  courseCard: {
    width:        200,
    borderRadius: radius.md,
    borderWidth:  1,
    overflow:     'hidden',
  },
  courseThumb: {
    width:  '100%',
    height: 110,
  },
  courseInfo: {
    padding: spacing.sm,
    gap:     4,
  },
  courseTitle: {
    fontSize:   typography.size.sm,
    lineHeight: 18,
  },
  courseMeta: {
    fontSize: typography.size.xs,
  },
})

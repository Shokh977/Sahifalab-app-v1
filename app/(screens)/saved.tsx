import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack, useRouter } from 'expo-router'
import { ChevronLeft, Bookmark } from 'lucide-react-native'
import { Pressable } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { request } from '../../lib/api'
import { PostCard } from '../../components/feed/PostCard'
import { CommentsSheet } from '../../components/feed/CommentsSheet'
import { typography, spacing } from '../../lib/constants'
import type { Post } from '../../lib/types'

interface FeedResponse {
  items:    Post[]
  has_more: boolean
}

export default function SavedPostsScreen() {
  const { c }  = useTheme()
  const router = useRouter()

  const [posts,      setPosts]      = useState<Post[]>([])
  const [page,       setPage]       = useState(1)
  const [hasMore,    setHasMore]    = useState(true)
  const [loading,    setLoading]    = useState(true)
  const [loadingMore,setLoadingMore]= useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [commentPost,setCommentPost]= useState<Post | null>(null)

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

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bgPrimary }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={c.brand} />
        </Pressable>
        <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Saqlangan postlar
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
              onRefresh={() => load(1, true)}
              tintColor={c.brand}
              colors={[c.brand]}
            />
          }
          onEndReached={() => { if (hasMore && !loadingMore) load(page + 1) }}
          onEndReachedThreshold={0.3}
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
    flex:     1,
    fontSize: typography.size.lg,
    textAlign: 'center',
  },
  list: {
    paddingTop:    spacing.sm,
    paddingBottom: 80,
  },
  empty: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap:             spacing.sm,
  },
  emptyText: {
    fontSize: typography.size.sm,
  },
})

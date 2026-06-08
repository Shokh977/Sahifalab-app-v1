import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from 'react'
import {
  View, Text, StyleSheet, Modal, Pressable, FlatList,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  Image, Animated, Dimensions,
} from 'react-native'
import Reanimated, {
  useSharedValue, useAnimatedStyle, withSpring, runOnJS,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import {
  X, Heart, CornerDownRight, ChevronDown, ChevronUp, Trash2, Send, ArrowLeft,
} from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../../hooks/useTheme'
import { useAuthStore } from '../../stores/authStore'
import { useFeedStore } from '../../stores/feedStore'
import { social, type CommentItem } from '../../lib/api'
import { formatTime } from '../../lib/utils'
import { LinkText } from '../ui/LinkText'
import { typography, spacing, radius } from '../../lib/constants'
import { ConfirmModal } from '../ui/ConfirmModal'
import { RoleBadge } from '../ui/RoleBadge'
import type { Post } from '../../lib/types'

const SCREEN_H     = Dimensions.get('window').height
const SPRING       = { mass: 0.5, damping: 26, stiffness: 320 }
const AVATAR_SIZE  = 36
const REPLY_AVATAR = 28

// ── Types ──────────────────────────────────────────────────────────────────────

interface RichComment extends CommentItem {
  likes_count: number
  is_liked:    boolean
  parent_id:   number | null
}

interface Thread {
  comment: RichComment
  replies: RichComment[]
}

interface ReplyingTo {
  id:         number
  authorName: string
  username?:  string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalise(c: CommentItem): RichComment {
  return {
    ...c,
    likes_count: (c as any).likes_count ?? 0,
    is_liked:    (c as any).is_liked    ?? false,
    parent_id:   (c as any).parent_id   ?? null,
  }
}

function buildThreads(list: RichComment[]): Thread[] {
  const top: RichComment[] = []
  const map = new Map<number, RichComment[]>()
  for (const c of list) {
    if (c.parent_id) {
      const bucket = map.get(c.parent_id) ?? []
      bucket.push(c)
      map.set(c.parent_id, bucket)
    } else {
      top.push(c)
    }
  }
  return top.map(c => ({ comment: c, replies: map.get(c.id) ?? [] }))
}

// ── Thread parent-ID cache (backend doesn't return parent_id in GET comments) ──
// Maps commentId → parentId per post, persisted in AsyncStorage so threading
// survives app restarts until the backend adds parent_id to its response schema.

function threadKey(postId: number) { return `thread_pids_${postId}` }

async function loadThreadCache(postId: number): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(threadKey(postId))
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

async function saveThreadCache(postId: number, commentId: number, parentId: number) {
  try {
    const key  = threadKey(postId)
    const raw  = await AsyncStorage.getItem(key)
    const map: Record<string, number> = raw ? JSON.parse(raw) : {}
    map[commentId] = parentId
    await AsyncStorage.setItem(key, JSON.stringify(map))
  } catch {}
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({ uri, name, size = AVATAR_SIZE }: { uri?: string | null; name: string; size?: number }) {
  const { c } = useTheme()
  const init  = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.brandSubtle, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: c.brand, fontSize: size * 0.38, fontFamily: typography.fontFamily.bold }}>{init}</Text>
    </View>
  )
}

// ── Like button ────────────────────────────────────────────────────────────────

function LikeBtn({ liked, count, onPress, c }: { liked: boolean; count: number; onPress: () => void; c: any }) {
  const scale = useRef(new Animated.Value(1)).current
  const color = liked ? '#ef4444' : c.textMuted

  function press() {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.5, useNativeDriver: true, speed: 500, bounciness: 0 }),
      Animated.spring(scale, { toValue: 1,   useNativeDriver: true, speed: 160, bounciness: 12 }),
    ]).start()
    onPress()
  }

  return (
    <Pressable onPress={press} hitSlop={10} style={styles.likeBtn}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Heart size={13} color={color} fill={liked ? '#ef4444' : 'transparent'} />
      </Animated.View>
      {count > 0 && (
        <Text style={[styles.likeCnt, { color, fontFamily: typography.fontFamily.regular }]}>{count}</Text>
      )}
    </Pressable>
  )
}

// ── Comment row (with YouTube-style thread line) ───────────────────────────────

function CommentRow({ thread, myId, onLike, onReply, onDelete, c }: {
  thread:   Thread
  myId?:    number
  onLike:   (id: number)     => void
  onReply:  (to: ReplyingTo) => void
  onDelete: (id: number)     => void
  c: any
}) {
  const [expanded, setExpanded] = useState(false)
  const { comment, replies }    = thread
  const isOwn = myId !== undefined && myId === comment.author.telegram_id

  return (
    <View style={styles.commentBlock}>
      <View style={styles.commentInner}>

        {/* ── Left column: avatar + vertical thread line ── */}
        <View style={styles.leftCol}>
          <Avatar uri={comment.author.photo_url} name={comment.author.full_name} size={AVATAR_SIZE} />
          {expanded && replies.length > 0 && (
            <View style={[styles.threadLine, { backgroundColor: c.border }]} />
          )}
        </View>

        {/* ── Right column: parent + inline replies ── */}
        <View style={styles.rightCol}>

          {/* Parent comment */}
          <View style={styles.metaRow}>
            <Text numberOfLines={1} style={[styles.authorName, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
              {comment.author.full_name}
            </Text>
            <RoleBadge role={comment.author.role} size={13} />
            <Text style={[styles.timeText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              {formatTime(comment.created_at)}
            </Text>
            {isOwn && (
              <Pressable onPress={() => onDelete(comment.id)} hitSlop={10} style={styles.trashBtn}>
                <Trash2 size={13} color={c.textMuted} />
              </Pressable>
            )}
          </View>

          <LinkText
            style={[styles.contentText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}
            linkColor={c.brand}
          >
            {comment.content}
          </LinkText>

          <View style={styles.actionRow}>
            <LikeBtn liked={comment.is_liked} count={comment.likes_count} onPress={() => onLike(comment.id)} c={c} />
            <Pressable
              hitSlop={10}
              onPress={() => onReply({ id: comment.id, authorName: comment.author.full_name, username: comment.author.username })}
              style={styles.replyBtn}
            >
              <CornerDownRight size={12} color={c.textMuted} />
              <Text style={[styles.replyBtnText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>Javob</Text>
            </Pressable>
          </View>

          {/* Replies toggle */}
          {replies.length > 0 && (
            <Pressable onPress={() => setExpanded(v => !v)} style={styles.showRepliesRow}>
              {expanded
                ? <ChevronUp   size={12} color={c.brand} />
                : <ChevronDown size={12} color={c.brand} />
              }
              <Text style={[styles.showRepliesText, { color: c.brand, fontFamily: typography.fontFamily.semibold }]}>
                {expanded ? 'Yopish' : `${replies.length} ta javob`}
              </Text>
            </Pressable>
          )}

          {/* ── Inline replies (YouTube-style, below toggle) ── */}
          {expanded && replies.map(r => {
            const isReplyOwn = myId !== undefined && myId === r.author.telegram_id
            return (
              <View key={r.id} style={styles.replyRow}>
                <Avatar uri={r.author.photo_url} name={r.author.full_name} size={REPLY_AVATAR} />
                <View style={{ flex: 1 }}>
                  <View style={styles.metaRow}>
                    <Text numberOfLines={1} style={[styles.authorName, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold, fontSize: typography.size.xs }]}>
                      {r.author.full_name}
                    </Text>
                    <RoleBadge role={r.author.role} size={12} />
                    <Text style={[styles.timeText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                      {formatTime(r.created_at)}
                    </Text>
                    {isReplyOwn && (
                      <Pressable onPress={() => onDelete(r.id)} hitSlop={10} style={styles.trashBtn}>
                        <Trash2 size={11} color={c.textMuted} />
                      </Pressable>
                    )}
                  </View>
                  <LinkText
                    style={[styles.contentText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm }]}
                    linkColor={c.brand}
                  >
                    {r.content}
                  </LinkText>
                  <View style={styles.actionRow}>
                    <LikeBtn liked={r.is_liked} count={r.likes_count} onPress={() => onLike(r.id)} c={c} />
                    {/* Replying to a reply targets the parent thread, not a nested thread */}
                    <Pressable
                      hitSlop={10}
                      onPress={() => onReply({ id: comment.id, authorName: r.author.full_name, username: r.author.username })}
                      style={styles.replyBtn}
                    >
                      <CornerDownRight size={11} color={c.textMuted} />
                      <Text style={[styles.replyBtnText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>Javob</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )
}

// ── Main sheet ─────────────────────────────────────────────────────────────────

interface Props {
  post:    Post | null
  visible: boolean
  onClose: () => void
}

export function CommentsSheet({ post, visible, onClose }: Props) {
  const { c }          = useTheme()
  const insets         = useSafeAreaInsets()
  const { user }       = useAuthStore()
  const { updatePost } = useFeedStore()

  const [mounted,    setMounted]    = useState(false)
  const [comments,   setComments]   = useState<RichComment[]>([])
  const [loading,    setLoading]    = useState(false)
  const [text,       setText]       = useState('')
  const [sending,    setSending]    = useState(false)
  const [replyingTo, setReplyingTo] = useState<ReplyingTo | null>(null)
  const [confirm, setConfirm] = useState<{ visible: boolean; pendingId: number }>({ visible: false, pendingId: 0 })
  const inputRef = useRef<TextInput>(null)

  const translateY = useSharedValue(SCREEN_H)

  // ── Open / close animation ───────────────────────────────────────────────

  useEffect(() => {
    if (visible) {
      setMounted(true)
      translateY.value = withSpring(0, SPRING)
      setTimeout(() => inputRef.current?.focus(), 450)
    } else if (mounted) {
      translateY.value = withSpring(SCREEN_H, SPRING, finished => {
        if (finished) runOnJS(setMounted)(false)
      })
    }
  }, [visible])

  // ── Load comments (merge cached parent_ids so threading survives refresh) ──

  useEffect(() => {
    if (!visible || !post) return
    setComments([])
    setLoading(true)
    Promise.all([social.getComments(post.id), loadThreadCache(post.id)])
      .then(([list, cache]) => {
        setComments(list.map(c => {
          const pid = c.parent_id ?? cache[c.id] ?? null
          return normalise({ ...c, parent_id: pid })
        }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [visible, post?.id])

  const threads = useMemo(() => buildThreads(comments), [comments])

  // ── Send comment / reply ─────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!text.trim() || !post || sending) return
    const mention = replyingTo
      ? `@${replyingTo.username ?? replyingTo.authorName} `
      : ''
    const trimmed  = `${mention}${text.trim()}`
    const parentId = replyingTo?.id
    setSending(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      const raw        = await social.addComment(post.id, trimmed, parentId)
      const resolvedPid = parentId ?? raw.parent_id ?? null
      const newComment  = normalise({ ...raw, parent_id: resolvedPid })
      setComments(prev => [...prev, newComment])
      // Persist parent_id so threading survives a refresh (backend omits it in GET)
      if (resolvedPid && raw.id) saveThreadCache(post.id, raw.id, resolvedPid)
      setText('')
      setReplyingTo(null)
      if (post) updatePost({ ...post, comments_count: (post.comments_count ?? 0) + 1 })
      if (parentId) social.notifyReply(parentId).catch(() => {})
    } catch {}
    finally { setSending(false) }
  }, [text, post, sending, replyingTo])

  // ── Like (optimistic, fire-and-forget) ──────────────────────────────────

  const handleLike = useCallback((id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setComments(prev => prev.map(c => {
      if (c.id !== id) return c
      const liked = !c.is_liked
      ;(liked ? social.likeComment(id) : social.unlikeComment(id)).catch(() => {})
      return { ...c, is_liked: liked, likes_count: liked ? c.likes_count + 1 : c.likes_count - 1 }
    }))
  }, [])

  // ── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = useCallback((id: number) => {
    setConfirm({ visible: true, pendingId: id })
  }, [])

  const doDeleteComment = useCallback(async (id: number) => {
    setConfirm({ visible: false, pendingId: 0 })
    setComments(prev => {
      const removed = prev.filter(c => c.id === id || c.parent_id === id)
      if (post) updatePost({ ...post, comments_count: Math.max(0, (post.comments_count ?? removed.length) - removed.length) })
      return prev.filter(c => c.id !== id && c.parent_id !== id)
    })
    try { await social.deleteComment(id) } catch {}
  }, [post])

  // ── Reply tap ────────────────────────────────────────────────────────────

  const handleReply = useCallback((to: ReplyingTo) => {
    setReplyingTo(to)
    Haptics.selectionAsync()
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [])

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  const hasInput = text.trim().length > 0

  if (!mounted) return null

  return (
    <Modal
      visible={mounted}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Reanimated.View style={[styles.sheet, { backgroundColor: c.bgPrimary }, sheetStyle]}>
        <KeyboardAvoidingView
          behavior="padding"
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <View style={[styles.header, { paddingTop: insets.top + 4, borderBottomColor: c.border, backgroundColor: c.bgPrimary }]}>
            <Pressable onPress={onClose} hitSlop={12} style={styles.headerBack}>
              <ArrowLeft size={22} color={c.textPrimary} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
              Izohlar{comments.length > 0 ? ` (${comments.length})` : ''}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* ── Post preview ─────────────────────────────────────────────── */}
          {post && (
            <View style={[styles.postPreview, { borderBottomColor: c.border, backgroundColor: c.bgSecondary }]}>
              <Avatar uri={post.author.photo_url} name={post.author.full_name} size={28} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text numberOfLines={1} style={[styles.previewAuthor, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                    {post.author.full_name}
                  </Text>
                  <RoleBadge role={post.author.role} size={12} />
                </View>
                <Text numberOfLines={1} style={[styles.previewText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                  {post.content}
                </Text>
              </View>
            </View>
          )}

          {/* ── Comment list ─────────────────────────────────────────────── */}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={c.brand} />
            </View>
          ) : (
            <FlatList
              data={threads}
              keyExtractor={t => String(t.comment.id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.listPad, { paddingBottom: insets.bottom + 80 }]}
              ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: c.border }]} />}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={[styles.emptyText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                    Hali izoh yo'q.{'\n'}Birinchi bo'ling!
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <CommentRow
                  thread={item}
                  myId={user?.telegram_id}
                  onLike={handleLike}
                  onReply={handleReply}
                  onDelete={handleDelete}
                  c={c}
                />
              )}
            />
          )}

          {/* ── Input bar ─────────────────────────────────────────────────── */}
          <View style={[styles.inputWrap, { borderTopColor: c.border, backgroundColor: c.bgPrimary, paddingBottom: insets.bottom || spacing.sm }]}>
            {replyingTo && (
              <View style={[styles.replyContext, { backgroundColor: c.bgSecondary, borderLeftColor: c.brand }]}>
                <CornerDownRight size={12} color={c.brand} />
                <Text style={[styles.replyContextText, { color: c.brand, fontFamily: typography.fontFamily.regular }]}>
                  {replyingTo.authorName}ga javob
                </Text>
                <Pressable onPress={() => setReplyingTo(null)} hitSlop={10} style={{ marginLeft: 'auto' }}>
                  <X size={13} color={c.textMuted} />
                </Pressable>
              </View>
            )}
            <View style={styles.inputRow}>
              <Avatar uri={user?.photo_url} name={user?.first_name ?? 'U'} size={32} />
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={setText}
                placeholder={replyingTo ? `${replyingTo.authorName}ga javob...` : 'Izoh yozing...'}
                placeholderTextColor={c.textMuted}
                style={[styles.input, {
                  backgroundColor: c.bgSecondary,
                  color:           c.textPrimary,
                  borderColor:     hasInput ? c.brand : c.border,
                  fontFamily:      typography.fontFamily.regular,
                }]}
                multiline
                maxLength={500}
                returnKeyType="default"
              />
              <Pressable
                onPress={handleSend}
                disabled={!hasInput || sending}
                style={[styles.sendBtn, { backgroundColor: hasInput ? c.brand : c.bgSecondary, borderColor: hasInput ? c.brand : c.border }]}
              >
                {sending
                  ? <ActivityIndicator size="small" color={hasInput ? '#fff' : c.textMuted} />
                  : <Send size={15} color={hasInput ? '#fff' : c.textMuted} />
                }
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Reanimated.View>

      <ConfirmModal
        visible={confirm.visible}
        emoji="🗑️"
        title="Izohni o'chirish"
        message="Bu izoh butunlay o'chirib tashlanadi."
        confirmText="O'chirish"
        danger
        onConfirm={() => doDeleteComment(confirm.pendingId)}
        onCancel={() => setConfirm({ visible: false, pendingId: 0 })}
      />
    </Modal>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },

  // Header
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.sm,
    paddingBottom:     spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBack:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: typography.size.base },

  // Post preview strip
  postPreview: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  previewAuthor: { fontSize: typography.size.xs },
  previewText:   { fontSize: typography.size.xs, marginTop: 1 },

  // List
  listPad:   { paddingTop: spacing.xs },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.base },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: typography.size.sm, textAlign: 'center', lineHeight: 22 },

  // ── YouTube thread layout ──────────────────────────────────────────────────

  commentBlock: {
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm + 2,
  },
  commentInner: {
    flexDirection: 'row',
  },

  // Left column: fixed-width, avatar on top, thread line stretches below
  leftCol: {
    width:      AVATAR_SIZE,
    alignItems: 'center',
  },
  // Extends from bottom of avatar to bottom of right column (all replies)
  threadLine: {
    flex:        1,
    width:       2,
    marginTop:   6,
    marginBottom: -(spacing.sm + 2), // compensate commentBlock paddingVertical
    borderRadius: 1,
  },

  // Right column holds parent content + all replies stacked
  rightCol: {
    flex:        1,
    paddingLeft: spacing.sm,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
    marginBottom:  2,
  },
  authorName:  { fontSize: typography.size.sm },
  timeText:    { fontSize: typography.size.xs },
  contentText: { fontSize: typography.size.base, lineHeight: 20, marginTop: 2 },
  trashBtn:    { marginLeft: 'auto' },

  actionRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.base,
    marginTop:     spacing.xs,
  },
  likeBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  likeCnt:      { fontSize: typography.size.xs },
  replyBtn:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  replyBtnText: { fontSize: typography.size.xs },

  showRepliesRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
    marginTop:     spacing.xs,
  },
  showRepliesText: { fontSize: typography.size.xs },

  // Reply rows — indented naturally inside rightCol
  replyRow: {
    flexDirection:  'row',
    gap:            spacing.sm,
    alignItems:     'flex-start',
    marginTop:      spacing.sm + 2,
  },

  // Input
  inputWrap: { borderTopWidth: StyleSheet.hairlineWidth },
  replyContext: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.xs,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.xs,
    borderLeftWidth:   3,
    marginHorizontal:  spacing.base,
    marginTop:         spacing.xs,
    borderRadius:      4,
  },
  replyContextText: { fontSize: typography.size.xs, flex: 1 },
  inputRow: {
    flexDirection:     'row',
    alignItems:        'flex-end',
    gap:               spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop:        spacing.sm,
  },
  input: {
    flex:              1,
    borderRadius:      radius.xl,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical:   Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    fontSize:          typography.size.base,
    maxHeight:         120,
    minHeight:         40,
    borderWidth:       1,
  },
  sendBtn: {
    width:          40,
    height:         40,
    borderRadius:   radius.full,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
  },
})

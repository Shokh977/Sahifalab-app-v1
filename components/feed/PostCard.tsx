import React, { useState, useCallback, memo, useRef } from 'react'
import {
  View, Text, StyleSheet, Pressable, Image, Share,
  Modal, TextInput, Animated,
} from 'react-native'
import {
  Star, MessageCircle, Repeat2, Bookmark, BadgeCheck,
  Repeat, Eye, Share2, MoreHorizontal, Pencil, Trash2,
  Award, GraduationCap,
} from 'lucide-react-native'
import { MotiView } from 'moti'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../hooks/useTheme'
import { useFeedStore } from '../../stores/feedStore'
import { useAuthStore } from '../../stores/authStore'
import { social } from '../../lib/api'
import { formatCount, formatTime } from '../../lib/utils'
import { LinkText } from '../ui/LinkText'
import { typography, spacing, radius } from '../../lib/constants'
import { ConfirmModal } from '../ui/ConfirmModal'
import { RoleBadge } from '../ui/RoleBadge'
import type { Post } from '../../lib/types'

interface Props {
  post:            Post
  onCommentPress?: (post: Post) => void
}

function ScaleBtn({
  onPress, style, children,
}: {
  onPress: () => void
  style?: object
  children: React.ReactNode
}) {
  const scale = useRef(new Animated.Value(1)).current
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() =>
        Animated.spring(scale, { toValue: 0.80, useNativeDriver: true, speed: 300, bounciness: 0 }).start()
      }
      onPressOut={() =>
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 120, bounciness: 6 }).start()
      }
      style={style}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </Pressable>
  )
}

function Avatar({ uri, name, size = 36 }: { uri?: string | null; name: string; size?: number }) {
  const { c } = useTheme()
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: c.brandSubtle, alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: c.brand, fontSize: size * 0.38, fontFamily: typography.fontFamily.bold }}>
        {initials}
      </Text>
    </View>
  )
}

function AchievementCard({ metadata }: { metadata: Record<string, any> }) {
  const isQuiz   = metadata.achievement_type === 'quiz_passed'
  const isCourse = metadata.achievement_type === 'course_completed'
  if (!isQuiz && !isCourse) return null

  const label    = isQuiz
    ? `Sertifikat oldi · ${metadata.score ?? 100}%`
    : 'Kurs yakunlandi'
  const subtitle = isQuiz ? metadata.quiz_title : metadata.course_title

  return (
    <View style={[achStyles.wrap, { borderColor: '#f59e0b33' }]}>
      <View style={achStyles.iconWrap}>
        {isQuiz
          ? <Award size={22} color="#f59e0b" />
          : <GraduationCap size={22} color="#f59e0b" />
        }
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[achStyles.label, { fontFamily: typography.fontFamily.semibold, color: '#92400e' }]}>
          {label}
        </Text>
        {!!subtitle && (
          <Text numberOfLines={1} style={[achStyles.subtitle, { fontFamily: typography.fontFamily.regular, color: '#b45309' }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  )
}

function PostCardComponent({ post, onCommentPress }: Props) {
  const { c }    = useTheme()
  const router   = useRouter()
  const { toggleLike, toggleRepost, toggleSave, removePost, updatePost } = useFeedStore()
  const { user } = useAuthStore()
  const [liking,    setLiking]    = useState(false)
  const [reposting, setReposting] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [starAnim,  setStarAnim]  = useState(0)
  const [showMenu,  setShowMenu]  = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText,  setEditText]  = useState(post.content ?? '')
  const [saving2,       setSaving2]       = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isOwner = !!user && user.telegram_id === post.author.telegram_id

  const handleDelete = useCallback(() => {
    setShowMenu(false)
    setShowDeleteConfirm(true)
  }, [])

  const doDeletePost = useCallback(async () => {
    setShowDeleteConfirm(false)
    removePost(post.id)
    try { await social.deletePost(post.id) } catch {}
  }, [post.id, removePost])

  const handleSaveEdit = useCallback(async () => {
    const trimmed = editText.trim()
    if (!trimmed || trimmed === post.content || saving2) return
    setSaving2(true)
    try {
      const updated = await social.updatePost(post.id, trimmed)
      updatePost(updated)
      setIsEditing(false)
    } catch {}
    finally { setSaving2(false) }
  }, [editText, post.id, post.content, saving2, updatePost])

  const handleLike = useCallback(async () => {
    if (liking) return
    setLiking(true)
    setStarAnim(n => n + 1)
    toggleLike(post.id)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      if (post.is_liked) await social.unlikePost(post.id)
      else               await social.likePost(post.id)
    } catch {
      toggleLike(post.id)
    } finally {
      setLiking(false)
    }
  }, [liking, post.id, post.is_liked, toggleLike])

  const handleRepost = useCallback(async () => {
    if (reposting) return
    setReposting(true)
    toggleRepost(post.id)
    try {
      if (post.is_reposted) await social.unrepostPost(post.id)
      else                  await social.repostPost(post.id)
    } catch {
      toggleRepost(post.id)
    } finally {
      setReposting(false)
    }
  }, [reposting, post.id, post.is_reposted, toggleRepost])

  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    toggleSave(post.id)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      if (post.is_saved) await social.unsavePost(post.id)
      else               await social.savePost(post.id)
    } catch {
      toggleSave(post.id)
    } finally {
      setSaving(false)
    }
  }, [saving, post.id, post.is_saved, toggleSave])

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: post.content ?? 'Sahifalabdagi post',
        url:     `https://sahifalab.uz/posts/${post.id}`,
      })
    } catch {}
  }, [post.id, post.content])

  const author = post.repost_by ?? post.author
  const starColor = '#f59e0b'

  return (
    <View style={[styles.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
      {/* Repost banner */}
      {post.repost_by && (
        <View style={styles.repostBanner}>
          <Repeat size={12} color="#4ade80" style={{ marginRight: 4 }} />
          <Text numberOfLines={1} style={[styles.repostText, { color: '#4ade80', fontFamily: typography.fontFamily.medium }]}>
            {post.repost_by.full_name} repost qildi
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.push(`/(screens)/profile/${author.telegram_id}` as any)} hitSlop={4}>
          <Avatar uri={author.photo_url} name={author.full_name} />
        </Pressable>
        <Pressable style={styles.headerText} onPress={() => router.push(`/(screens)/profile/${author.telegram_id}` as any)}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}
                  numberOfLines={1}>
              {author.full_name}
            </Text>
            {author.is_verified && (
              <BadgeCheck size={14} color={c.brand} fill={c.brandSubtle} />
            )}
            <RoleBadge role={author.role} size={14} />
          </View>
          {author.headline ? (
            <Text numberOfLines={1} style={[styles.headline, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              {author.headline}
            </Text>
          ) : (
            <Text style={[styles.headline, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              Lv.{(author as any).level || 1}
            </Text>
          )}
        </Pressable>
        <View style={styles.headerRight}>
          <Text style={[styles.time, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {formatTime(post.created_at)}
          </Text>
          {isOwner && (
            <Pressable onPress={() => setShowMenu(true)} hitSlop={8} style={styles.menuBtn}>
              <MoreHorizontal size={16} color={c.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Owner dropdown menu */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setShowMenu(false)}>
          <View style={[styles.menuCard, { backgroundColor: c.bgSecondary, borderColor: c.borderStrong }]}>
            <Pressable
              style={styles.menuItem}
              onPress={() => { setEditText(post.content ?? ''); setIsEditing(true); setShowMenu(false) }}
            >
              <Pencil size={14} color={c.textSecondary} />
              <Text style={[styles.menuItemText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Tahrirlash
              </Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={handleDelete}>
              <Trash2 size={14} color="#f87171" />
              <Text style={[styles.menuItemText, { color: '#f87171', fontFamily: typography.fontFamily.regular }]}>
                O'chirish
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Content */}
      {isEditing ? (
        <View style={styles.editWrap}>
          <TextInput
            value={editText}
            onChangeText={setEditText}
            multiline
            autoFocus
            style={[styles.editInput, { color: c.textPrimary, backgroundColor: c.bgTertiary, borderColor: c.border, fontFamily: typography.fontFamily.regular }]}
          />
          <View style={styles.editActions}>
            <Pressable onPress={() => setIsEditing(false)} style={[styles.editBtn, { borderColor: c.border }]}>
              <Text style={{ color: c.textMuted, fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm }}>Bekor</Text>
            </Pressable>
            <Pressable onPress={handleSaveEdit} style={[styles.editBtn, { backgroundColor: c.brand, borderColor: c.brand }]}>
              <Text style={{ color: '#fff', fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm }}>Saqlash</Text>
            </Pressable>
          </View>
        </View>
      ) : !!post.content && (
        <LinkText
          style={[styles.content, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}
          linkColor={c.brand}
        >
          {post.content}
        </LinkText>
      )}

      {/* Achievement badge card */}
      {!!post.post_metadata?.achievement_type && (
        <AchievementCard metadata={post.post_metadata} />
      )}

      {/* Image */}
      {(post.image_url || (post.image_urls?.length > 0)) && (
        <Image
          source={{ uri: post.image_url ?? post.image_urls[0] }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      {/* Action bar */}
      <View style={[styles.actionBar, { borderTopColor: c.border }]}>
        {/* Comments */}
        <ScaleBtn onPress={() => onCommentPress?.(post)} style={styles.actionBtn}>
          <View style={styles.actionInner}>
            <MessageCircle
              size={17}
              color={(post.comments_count ?? 0) > 0 ? '#60a5fa' : c.textMuted}
            />
            {(post.comments_count ?? 0) > 0 && (
              <Text style={[styles.actionCount, { color: '#60a5fa' }]}>
                {formatCount(post.comments_count)}
              </Text>
            )}
          </View>
        </ScaleBtn>

        {/* Repost */}
        <ScaleBtn onPress={handleRepost} style={styles.actionBtn}>
          <View style={styles.actionInner}>
            <Repeat2
              size={17}
              color={post.is_reposted ? '#4ade80' : c.textMuted}
              fill={post.is_reposted ? '#4ade8022' : 'transparent'}
            />
            {(post.reposts_count ?? 0) > 0 && (
              <Text style={[styles.actionCount, { color: post.is_reposted ? '#4ade80' : c.textMuted }]}>
                {formatCount(post.reposts_count)}
              </Text>
            )}
          </View>
        </ScaleBtn>

        {/* Star (Foydali) */}
        <ScaleBtn onPress={handleLike} style={styles.actionBtn}>
          <View style={styles.actionInner}>
            <MotiView
              key={starAnim}
              from={starAnim > 0 ? { scale: 0.7 } : undefined}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 600, damping: 18 }}
            >
              <Star
                size={17}
                color={post.is_liked ? starColor : c.textMuted}
                fill={post.is_liked ? starColor : 'transparent'}
              />
            </MotiView>
            {(post.likes_count ?? 0) > 0 && (
              <Text style={[styles.actionCount, { color: post.is_liked ? starColor : c.textMuted }]}>
                {formatCount(post.likes_count)}
              </Text>
            )}
          </View>
        </ScaleBtn>

        {/* Views */}
        {(post as any).views_count > 0 && (
          <View style={[styles.actionBtn, styles.actionInner]}>
            <Eye size={15} color={c.textMuted} />
            <Text style={[styles.actionCount, { color: c.textMuted }]}>
              {formatCount((post as any).views_count)}
            </Text>
          </View>
        )}

        <View style={{ flex: 1 }} />

        {/* Share */}
        <ScaleBtn onPress={handleShare} style={styles.actionBtn}>
          <View style={styles.actionInner}>
            <Share2 size={16} color={c.textMuted} />
          </View>
        </ScaleBtn>

        {/* Bookmark */}
        <ScaleBtn onPress={handleSave} style={styles.actionBtn}>
          <View style={styles.actionInner}>
            <Bookmark
              size={17}
              color={post.is_saved ? c.brand : c.textMuted}
              fill={post.is_saved ? c.brand : 'transparent'}
            />
          </View>
        </ScaleBtn>
      </View>

      <ConfirmModal
        visible={showDeleteConfirm}
        emoji="🗑️"
        title="Postni o'chirish"
        message="Bu post butunlay o'chirib tashlanadi."
        confirmText="O'chirish"
        danger
        onConfirm={doDeletePost}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.base,
    marginBottom:     spacing.sm,
    borderRadius:     radius['2xl'],
    borderWidth:      1,
    overflow:         'hidden',
  },
  repostBanner: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.sm,
    paddingBottom:     spacing.xs,
  },
  repostText: {
    fontSize: 11,
  },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    padding:        spacing.base,
    paddingBottom:  spacing.sm,
    gap:            spacing.sm,
  },
  headerText: {
    flex: 1,
    gap:  2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
    flex:          1,
  },
  name: {
    fontSize:  typography.size.md,
    flex:      1,
    flexShrink: 1,
  },
  headline: {
    fontSize: 11,
  },
  time: {
    fontSize:   11,
    flexShrink: 0,
  },
  content: {
    fontSize:        typography.size.base,
    lineHeight:      22,
    paddingHorizontal: spacing.base,
    paddingBottom:   spacing.sm,
  },
  image: {
    width:       '100%',
    aspectRatio: 16 / 9,
  },
  actionBar: {
    flexDirection:     'row',
    alignItems:        'center',
    borderTopWidth:    1,
    paddingVertical:   spacing.sm,
    paddingHorizontal: spacing.md,
    gap:               2,
  },
  actionBtn: {
    paddingVertical:   spacing.xs,
    paddingHorizontal: spacing.xs,
    minHeight:         36,
    justifyContent:    'center',
  },
  actionInner: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
    paddingHorizontal: 4,
  },
  actionCount: {
    fontSize: 12,
    tabularNums: true,
  } as any,
  headerRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
    flexShrink:    0,
  },
  menuBtn: {
    padding: 4,
  },
  menuBackdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent:  'flex-start',
    alignItems:      'flex-end',
    paddingTop:      80,
    paddingRight:    spacing.base,
  },
  menuCard: {
    borderRadius: radius.xl,
    borderWidth:  1,
    overflow:     'hidden',
    minWidth:     144,
    shadowColor:  '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius:  12,
    elevation:     12,
  },
  menuItem: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  menuItemText: {
    fontSize: typography.size.sm,
  },
  editWrap: {
    paddingHorizontal: spacing.base,
    paddingBottom:     spacing.sm,
    gap:               spacing.sm,
  },
  editInput: {
    borderRadius:   radius.md,
    borderWidth:    1,
    padding:        spacing.sm,
    fontSize:       typography.size.base,
    lineHeight:     22,
    minHeight:      80,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    gap:           spacing.sm,
    justifyContent: 'flex-end',
  },
  editBtn: {
    paddingVertical:   6,
    paddingHorizontal: spacing.base,
    borderRadius:      radius.md,
    borderWidth:       1,
  },
})

const achStyles = StyleSheet.create({
  wrap: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    marginHorizontal:  spacing.base,
    marginBottom:      spacing.sm,
    paddingVertical:   spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius:      radius.lg,
    borderWidth:       1,
    backgroundColor:   '#fef3c7',
  },
  iconWrap: {
    width:           40,
    height:          40,
    borderRadius:    radius.md,
    backgroundColor: '#fde68a',
    alignItems:      'center',
    justifyContent:  'center',
  },
  label: {
    fontSize: typography.size.sm,
  },
  subtitle: {
    fontSize:  typography.size.xs,
    marginTop: 1,
  },
})

// Memo: only re-render when engagement counters or own-state flags change
export const PostCard = memo(PostCardComponent, (a, b) =>
  a.post.id              === b.post.id              &&
  a.post.is_liked        === b.post.is_liked        &&
  a.post.likes_count     === b.post.likes_count     &&
  a.post.comments_count  === b.post.comments_count  &&
  a.post.is_saved        === b.post.is_saved        &&
  a.post.is_reposted     === b.post.is_reposted     &&
  a.post.reposts_count   === b.post.reposts_count   &&
  a.post.content         === b.post.content
)

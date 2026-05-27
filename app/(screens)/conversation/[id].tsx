import React, {
  useCallback, useEffect, useRef, useState, useMemo,
} from 'react'
import {
  View, Text, FlatList, Pressable, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, Image,
  ActivityIndicator, Modal, Clipboard, Animated, Dimensions, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ChevronLeft, MessageCircle, Trash2, Reply, Copy } from 'lucide-react-native'
import { useShallow } from 'zustand/shallow'
import { useMessagingStore } from '../../../stores/messagingStore'
import { useAuthStore } from '../../../stores/authStore'
import { useTheme } from '../../../hooks/useTheme'
import { typography, spacing, radius } from '../../../lib/constants'
import { Message } from '../../../lib/api'
import { formatDistanceToNowStrict } from 'date-fns'
import { uz } from 'date-fns/locale'

// ── Constants ─────────────────────────────────────────────────────────────────

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏']

// ── Helpers ───────────────────────────────────────────────────────────────────

function msgTime(iso: string) {
  try { return formatDistanceToNowStrict(new Date(iso), { locale: uz, addSuffix: false }) }
  catch { return '' }
}

function Avatar({ uri, name, size = 36 }: { uri?: string; name: string; size?: number }) {
  const { c } = useTheme()
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.bgTertiary, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: c.brand, fontSize: typography.size.sm, fontFamily: typography.fontFamily.semibold }}>
        {initials}
      </Text>
    </View>
  )
}

// ── Ticks ─────────────────────────────────────────────────────────────────────

function Ticks({ msg }: { msg: Message }) {
  const color = msg.is_read ? '#38bdf8' : 'rgba(255,255,255,0.55)'
  if (!msg.is_delivered && !msg.is_read) {
    // sent only
    return <Text style={[styles.tick, { color: 'rgba(255,255,255,0.55)' }]}>✓</Text>
  }
  return <Text style={[styles.tick, { color }]}>✓✓</Text>
}

// ── Reply snippet inside bubble ───────────────────────────────────────────────

function ReplySnippet({
  content, isMine,
}: { content: string | null | undefined; isMine: boolean }) {
  const { c } = useTheme()
  if (!content) return null
  return (
    <View style={[
      styles.replySnippet,
      { borderLeftColor: isMine ? 'rgba(255,255,255,0.6)' : c.brand, backgroundColor: isMine ? 'rgba(0,0,0,0.12)' : c.bgTertiary },
    ]}>
      <Text numberOfLines={1} style={[styles.replySnippetText, { color: isMine ? 'rgba(255,255,255,0.8)' : c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {content}
      </Text>
    </View>
  )
}

// ── Reaction pills ────────────────────────────────────────────────────────────

function ReactionPills({
  reactions, myId, onPress,
}: { reactions: Message['reactions']; myId: number; onPress: (emoji: string) => void }) {
  if (!reactions || reactions.length === 0) return null
  return (
    <View style={styles.reactionRow}>
      {reactions.map(r => {
        const mine = r.user_ids.includes(myId)
        return (
          <Pressable key={r.emoji} onPress={() => onPress(r.emoji)}
            style={[styles.reactionPill, mine && styles.reactionPillMine]}>
            <Text style={styles.reactionEmoji}>{r.emoji}</Text>
            {r.count > 1 && <Text style={styles.reactionCount}>{r.count}</Text>}
          </Pressable>
        )
      })}
    </View>
  )
}

// ── Typing dots animation ─────────────────────────────────────────────────────

function TypingDots() {
  const { c } = useTheme()
  const dot1 = useRef(new Animated.Value(0)).current
  const dot2 = useRef(new Animated.Value(0)).current
  const dot3 = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      )
    const a1 = anim(dot1, 0)
    const a2 = anim(dot2, 150)
    const a3 = anim(dot3, 300)
    a1.start(); a2.start(); a3.start()
    return () => { a1.stop(); a2.stop(); a3.stop() }
  }, [])

  const dot = (val: Animated.Value) => (
    <Animated.View style={[styles.typingDot, { backgroundColor: c.textMuted, opacity: val.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]} />
  )

  return (
    <View style={[styles.typingWrap, { backgroundColor: c.bgElevated }]}>
      {dot(dot1)}{dot(dot2)}{dot(dot3)}
    </View>
  )
}

// ── Bubble ────────────────────────────────────────────────────────────────────

function Bubble({
  msg, isMine, myId, onLongPress, onReact,
}: {
  msg: Message
  isMine: boolean
  myId: number
  onLongPress: (msg: Message, pageY: number) => void
  onReact: (msgId: number, emoji: string) => void
}) {
  const { c } = useTheme()
  const isOptimistic = msg.id < 0

  return (
    <View style={[styles.bubbleOuter, isMine ? styles.bubbleOuterMine : styles.bubbleOuterTheirs]}>
      <Pressable
        onLongPress={(e) => onLongPress(msg, e.nativeEvent.pageY)}
        delayLongPress={300}
        style={[
          styles.bubble,
          isMine ? { backgroundColor: c.brand } : { backgroundColor: c.bgElevated },
        ]}
      >
        {msg.reply_to_content ? (
          <ReplySnippet content={msg.reply_to_content} isMine={isMine} />
        ) : null}
        <Text style={[styles.bubbleText, { color: isMine ? '#fff' : c.textPrimary, fontFamily: typography.fontFamily.regular }]}>
          {msg.content}
        </Text>
        <View style={styles.bubbleMeta}>
          <Text style={[styles.bubbleTime, { color: isMine ? 'rgba(255,255,255,0.55)' : c.textMuted }]}>
            {isOptimistic ? '...' : msgTime(msg.created_at)}
          </Text>
          {isMine && !isOptimistic && <Ticks msg={msg} />}
        </View>
      </Pressable>
      <ReactionPills
        reactions={msg.reactions}
        myId={myId}
        onPress={(emoji) => onReact(msg.id, emoji)}
      />
    </View>
  )
}

// ── New messages divider ──────────────────────────────────────────────────────

function NewMessagesDivider() {
  const { c } = useTheme()
  return (
    <View style={styles.dividerWrap}>
      <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
      <Text style={[styles.dividerText, { color: c.textMuted, backgroundColor: c.bgPrimary, fontFamily: typography.fontFamily.regular }]}>
        Yangi xabarlar
      </Text>
      <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
    </View>
  )
}

// ── Reply preview bar (above input) ──────────────────────────────────────────

function ReplyPreviewBar({
  msg, onCancel,
}: { msg: Message; onCancel: () => void }) {
  const { c } = useTheme()
  return (
    <View style={[styles.replyBar, { backgroundColor: c.bgSecondary, borderTopColor: c.border }]}>
      <Reply size={14} color={c.brand} />
      <Text numberOfLines={1} style={[styles.replyBarText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {msg.content}
      </Text>
      <Pressable onPress={onCancel} hitSlop={8}>
        <Text style={{ color: c.textMuted, fontSize: 18, lineHeight: 20 }}>×</Text>
      </Pressable>
    </View>
  )
}

// ── Action sheet (long-press modal) ──────────────────────────────────────────

const SHEET_H   = 220  // approximate height of sheet content
const SCREEN_H  = Dimensions.get('window').height
const SHEET_MX  = 16   // horizontal margin

function ActionSheet({
  msg, myId, convId, visible, anchorY, onClose, onReply,
}: {
  msg: Message | null
  myId: number
  convId: number
  visible: boolean
  anchorY: number
  onClose: () => void
  onReply: (msg: Message) => void
}) {
  const { c } = useTheme()
  const { toggleReaction, deleteMessage } = useMessagingStore(
    useShallow(s => ({ toggleReaction: s.toggleReaction, deleteMessage: s.deleteMessage }))
  )

  if (!msg) return null
  const isMine = msg.sender_id === myId || msg.sender_id === -1

  const showAbove = anchorY > SCREEN_H * 0.55
  const sheetTop  = showAbove ? Math.max(8, anchorY - SHEET_H - 8) : anchorY + 8

  function handleReact(emoji: string) {
    toggleReaction(convId, msg!.id, emoji, myId)
    onClose()
  }

  function handleCopy() {
    Clipboard.setString(msg!.content)
    onClose()
  }

  function handleReply() {
    onReply(msg!)
    onClose()
  }

  function handleDelete() {
    onClose()
    if (isMine) {
      Alert.alert(
        "Xabarni o'chirish",
        "Bu xabar ikki tomondan ham o'chiriladi.",
        [
          { text: 'Bekor qilish', style: 'cancel' },
          {
            text: "O'chirish",
            style: 'destructive',
            onPress: () => deleteMessage(convId, msg!.id),
          },
        ]
      )
    } else {
      Alert.alert(
        "Xabarni yashirish",
        "Bu xabar faqat siz uchun o'chiriladi.",
        [
          { text: 'Bekor qilish', style: 'cancel' },
          {
            text: "O'chirish",
            style: 'destructive',
            onPress: () => deleteMessage(convId, msg!.id, true),
          },
        ]
      )
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
      </Pressable>

      <View
        pointerEvents="box-none"
        style={[styles.sheet, {
          backgroundColor: c.bgSecondary,
          position: 'absolute',
          top:   sheetTop,
          left:  SHEET_MX,
          right: SHEET_MX,
        }]}
      >
        {/* Emoji row */}
        <View style={styles.emojiRow}>
          {REACTION_EMOJIS.map(emoji => (
            <Pressable key={emoji} onPress={() => handleReact(emoji)} style={styles.emojiBtn}>
              <Text style={styles.emojiPickerText}>{emoji}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.sheetDivider, { backgroundColor: c.border }]} />

        <Pressable onPress={handleReply} style={styles.sheetItem}>
          <Reply size={18} color={c.textSecondary} />
          <Text style={[styles.sheetItemText, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}>Javob berish</Text>
        </Pressable>

        <Pressable onPress={handleCopy} style={styles.sheetItem}>
          <Copy size={18} color={c.textSecondary} />
          <Text style={[styles.sheetItemText, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}>Nusxalash</Text>
        </Pressable>

        <Pressable onPress={handleDelete} style={styles.sheetItem}>
          <Trash2 size={18} color={c.error ?? '#ef4444'} />
          <Text style={[styles.sheetItemText, { color: c.error ?? '#ef4444', fontFamily: typography.fontFamily.regular }]}>
            {isMine ? "O'chirish" : "Menda o'chirish"}
          </Text>
        </Pressable>
      </View>
    </Modal>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ConversationScreen() {
  const { c } = useTheme()
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string; name: string; photo_url: string; other_id: string }>()

  const convId  = Number(params.id)
  const name    = params.name    ?? 'Foydalanuvchi'
  const photoUrl= params.photo_url ?? ''
  const otherId = Number(params.other_id)

  const myId = useAuthStore(s => s.user?.telegram_id ?? 0)

  const {
    messages, convLoading, hasMore,
    loadMessages, loadMoreMessages, sendMessage,
    markRead, typingInConv,
    subscribeConvPresence, setTyping,
    toggleReaction,
  } = useMessagingStore(useShallow(s => ({
    messages:             s.messages,
    convLoading:          s.convLoading,
    hasMore:              s.hasMore,
    loadMessages:         s.loadMessages,
    loadMoreMessages:     s.loadMoreMessages,
    sendMessage:          s.sendMessage,
    markRead:             s.markRead,
    typingInConv:         s.typingInConv,
    subscribeConvPresence: s.subscribeConvPresence,
    setTyping:            s.setTyping,
    toggleReaction:       s.toggleReaction,
  })))

  const [draft,       setDraft]       = useState('')
  const [sending,     setSending]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [replyTo,     setReplyTo]     = useState<Message | null>(null)
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null)
  const [sheetY,      setSheetY]      = useState(0)
  const [newMsgIdx,   setNewMsgIdx]   = useState<number | null>(null)

  const listRef = useRef<FlatList>(null)
  const isTypingOther = typingInConv[convId] ?? false

  const msgs = messages[convId] ?? []
  const isLoading = convLoading[convId] ?? false

  // Mark where "new messages" divider should appear (first unread from other)
  useEffect(() => {
    if (msgs.length === 0) return
    const firstUnread = msgs.findIndex(m => m.sender_id !== myId && !m.is_read)
    setNewMsgIdx(firstUnread >= 0 ? firstUnread : null)
  }, [msgs.length]) // only on initial load

  useEffect(() => {
    loadMessages(convId)
    markRead(convId)
  }, [convId])

  // Presence subscription (typing indicator)
  useEffect(() => {
    const unsub = subscribeConvPresence(convId, myId)
    return unsub
  }, [convId, myId])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (msgs.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [msgs.length])

  // Build list data with optional "new messages" divider
  const listData = useMemo(() => {
    if (newMsgIdx === null || newMsgIdx === 0) return msgs
    return [
      ...msgs.slice(0, newMsgIdx),
      { id: 'divider', type: 'divider' } as any,
      ...msgs.slice(newMsgIdx),
    ]
  }, [msgs, newMsgIdx])

  const onSend = useCallback(async () => {
    const text = draft.trim()
    if (!text || sending) return
    setDraft('')
    setReplyTo(null)
    setSending(true)
    setError(null)
    setTyping(convId, myId, false)
    try {
      await sendMessage(convId, text, replyTo?.id ?? null)
    } catch {
      setError('Xabar yuborilmadi. Qayta urining.')
    } finally {
      setSending(false)
    }
  }, [draft, sending, convId, replyTo, myId])

  const onLoadMore = useCallback(() => {
    if (hasMore[convId] && !isLoading) loadMoreMessages(convId)
  }, [convId, hasMore, isLoading])

  function handleDraftChange(text: string) {
    setDraft(text)
    setTyping(convId, myId, text.length > 0)
  }

  function handleLongPress(msg: Message, pageY: number) {
    if (msg.id < 0) return // optimistic
    setSheetY(pageY)
    setSelectedMsg(msg)
  }

  function handleReact(msgId: number, emoji: string) {
    toggleReaction(convId, msgId, emoji, myId)
  }

  const renderItem = useCallback(({ item }: { item: any }) => {
    if (item.type === 'divider') return <NewMessagesDivider />
    const msg = item as Message
    const isMine = msg.sender_id === myId || msg.sender_id === -1
    return (
      <Bubble
        msg={msg}
        isMine={isMine}
        myId={myId}
        onLongPress={handleLongPress}
        onReact={handleReact}
      />
    )
  }, [myId])

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bgPrimary }]} edges={['top', 'bottom']}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.bgSecondary, borderBottomColor: c.border }]}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/messages')}
          hitSlop={12}
          style={styles.backBtn}
        >
          <ChevronLeft size={24} color={c.brand} />
        </Pressable>
        <View style={{ position: 'relative' }}>
          <Avatar uri={photoUrl || undefined} name={name} size={36} />
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[styles.headerName, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            {name}
          </Text>
          {isTypingOther && (
            <Text style={[styles.headerSub, { color: c.brand, fontFamily: typography.fontFamily.regular }]}>
              yozmoqda...
            </Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {isLoading && msgs.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={c.brand} size="large" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={listData}
            keyExtractor={item => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onEndReached={onLoadMore}
            onEndReachedThreshold={0.15}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              isLoading && msgs.length > 0
                ? <ActivityIndicator color={c.brand} style={{ marginVertical: spacing.sm }} />
                : null
            }
            ListFooterComponent={isTypingOther ? <TypingDots /> : null}
            ListEmptyComponent={
              <View style={styles.center}>
                <MessageCircle size={40} color={c.textMuted} />
                <Text style={[styles.emptyText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                  Salomlashing va muloqotni boshlang!
                </Text>
              </View>
            }
          />
        )}

        {error && (
          <View style={[styles.errorBar, { backgroundColor: '#ef4444' }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Reply preview */}
        {replyTo && (
          <ReplyPreviewBar msg={replyTo} onCancel={() => setReplyTo(null)} />
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { backgroundColor: c.bgSecondary, borderTopColor: c.border }]}>
          <TextInput
            value={draft}
            onChangeText={handleDraftChange}
            placeholder="Xabar yozing..."
            placeholderTextColor={c.textMuted}
            multiline
            maxLength={2000}
            style={[styles.input, { color: c.textPrimary, backgroundColor: c.bgTertiary, fontFamily: typography.fontFamily.regular }]}
          />
          <Pressable
            onPress={onSend}
            disabled={!draft.trim() || sending}
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: draft.trim() && !sending ? c.brand : c.bgTertiary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.sendIcon}>↑</Text>
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Long-press action sheet */}
      <ActionSheet
        msg={selectedMsg}
        myId={myId}
        convId={convId}
        visible={!!selectedMsg}
        anchorY={sheetY}
        onClose={() => setSelectedMsg(null)}
        onReply={(msg) => setReplyTo(msg)}
      />
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
  backBtn:    { paddingRight: spacing.xs },
  headerName: { fontSize: typography.size.base },
  headerSub:  { fontSize: typography.size.xs },

  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyText: { fontSize: typography.size.sm, textAlign: 'center' },

  listContent: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, flexGrow: 1 },

  // Bubbles
  bubbleOuter:       { marginVertical: 2, maxWidth: '80%' },
  bubbleOuterMine:   { alignSelf: 'flex-end' },
  bubbleOuterTheirs: { alignSelf: 'flex-start' },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    borderRadius:      radius.lg,
    gap:               2,
  },
  bubbleText: { fontSize: typography.size.base, lineHeight: 20 },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 2 },
  bubbleTime: { fontSize: 10 },
  tick:       { fontSize: 11 },

  // Reply snippet inside bubble
  replySnippet: {
    borderLeftWidth:   3,
    paddingLeft:       spacing.xs,
    paddingVertical:   2,
    marginBottom:      spacing.xs,
    borderRadius:      2,
  },
  replySnippetText: { fontSize: typography.size.xs },

  // Reactions
  reactionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  reactionPill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               2,
    paddingHorizontal: 7,
    paddingVertical:   3,
    borderRadius:      12,
    backgroundColor:   'rgba(128,128,128,0.15)',
  },
  reactionPillMine: { backgroundColor: 'rgba(232,121,47,0.2)' },
  reactionEmoji:    { fontSize: 14 },
  reactionCount:    { fontSize: 11, color: '#888' },

  // Typing dots
  typingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignSelf: 'flex-start',
    marginLeft: spacing.sm,
    marginVertical: 4,
  },
  typingDot: { width: 7, height: 7, borderRadius: 4 },

  // New messages divider
  dividerWrap: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.sm, gap: spacing.xs },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: typography.size.xs, paddingHorizontal: spacing.xs },

  // Reply preview bar
  replyBar: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.xs,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.xs,
    borderTopWidth:    StyleSheet.hairlineWidth,
  },
  replyBarText: { flex: 1, fontSize: typography.size.xs },

  // Error
  errorBar:  { padding: spacing.sm, alignItems: 'center' },
  errorText: { color: '#fff', fontSize: typography.size.sm },

  // Input bar
  inputBar: {
    flexDirection:     'row',
    alignItems:        'flex-end',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderTopWidth:    1,
    gap:               spacing.sm,
  },
  input: {
    flex:              1,
    borderRadius:      radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    fontSize:          typography.size.base,
    maxHeight:         120,
  },
  sendBtn: {
    width:          44,
    height:         44,
    borderRadius:   22,
    alignItems:     'center',
    justifyContent: 'center',
  },
  sendIcon: { color: '#fff', fontSize: 22, lineHeight: 26 },

  // Action sheet
  sheet: {
    borderRadius:      radius.xl,
    paddingTop:        spacing.md,
    paddingBottom:     spacing.md,
    paddingHorizontal: spacing.base,
    shadowColor:       '#000',
    shadowOpacity:     0.2,
    shadowRadius:      12,
    shadowOffset:      { width: 0, height: 4 },
    elevation:         8,
  },
  emojiRow: {
    flexDirection:  'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  emojiBtn:        { padding: spacing.xs },
  emojiPickerText: { fontSize: 28 },
  sheetDivider:    { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },
  sheetItem: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing.md,
    paddingVertical: spacing.md,
  },
  sheetItemText: { fontSize: typography.size.base },
})

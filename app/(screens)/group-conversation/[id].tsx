import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View, Text, FlatList, Pressable, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, Image,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ChevronLeft, Users } from 'lucide-react-native'
import { useShallow } from 'zustand/shallow'
import { useMessagingStore } from '../../../stores/messagingStore'
import { useAuthStore } from '../../../stores/authStore'
import { useTheme } from '../../../hooks/useTheme'
import { typography, spacing, radius } from '../../../lib/constants'
import { GroupMessage } from '../../../lib/api'
import { formatDistanceToNowStrict } from 'date-fns'
import { uz } from 'date-fns/locale'

function msgTime(iso: string) {
  try { return formatDistanceToNowStrict(new Date(iso), { locale: uz, addSuffix: false }) }
  catch { return '' }
}

function SenderAvatar({ photo, name, size = 30 }: { photo?: string | null; name: string; size?: number }) {
  const { c } = useTheme()
  if (photo) return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  const initials = (name ?? '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.bgTertiary, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: c.brand, fontSize: 11, fontFamily: typography.fontFamily.semibold }}>{initials}</Text>
    </View>
  )
}

function GroupBubble({ msg, isMine }: { msg: GroupMessage; isMine: boolean }) {
  const { c } = useTheme()
  const isOptimistic = msg.id < 0
  return (
    <View style={[styles.bubbleOuter, isMine ? styles.bubbleOuterMine : styles.bubbleOuterTheirs]}>
      {!isMine && (
        <SenderAvatar photo={msg.sender_photo} name={msg.sender_name} />
      )}
      <View style={{ flex: 1, maxWidth: '80%' }}>
        {!isMine && (
          <Text numberOfLines={1} style={[styles.senderName, { color: c.brand, fontFamily: typography.fontFamily.semibold }]}>
            {msg.sender_name}
          </Text>
        )}
        <View style={[styles.bubble, isMine ? { backgroundColor: c.brand } : { backgroundColor: c.bgElevated }]}>
          <Text style={[styles.bubbleText, { color: isMine ? '#fff' : c.textPrimary, fontFamily: typography.fontFamily.regular }]}>
            {msg.content}
          </Text>
          <View style={styles.bubbleMeta}>
            <Text style={[styles.bubbleTime, { color: isMine ? 'rgba(255,255,255,0.55)' : c.textMuted }]}>
              {isOptimistic ? '...' : msgTime(msg.created_at)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}

export default function GroupConversationScreen() {
  const { c }  = useTheme()
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string; name: string; cover_url: string }>()

  const groupId  = Number(params.id)
  const name     = params.name ?? 'Guruh'
  const coverUrl = params.cover_url ?? ''

  const myId = useAuthStore(s => s.user?.telegram_id ?? 0)

  const { groupMessages, groupsLoading, loadGroupMessages, sendGroupMessage } =
    useMessagingStore(useShallow(s => ({
      groupMessages:    s.groupMessages,
      groupsLoading:    s.groupsLoading,
      loadGroupMessages: s.loadGroupMessages,
      sendGroupMessage:  s.sendGroupMessage,
    })))

  const [draft,   setDraft]   = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<FlatList>(null)

  const msgs = groupMessages[groupId] ?? []
  const isLoading = groupsLoading && msgs.length === 0

  useEffect(() => { loadGroupMessages(groupId) }, [groupId])

  useEffect(() => {
    if (msgs.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [msgs.length])

  const onSend = useCallback(async () => {
    const text = draft.trim()
    if (!text || sending) return
    setDraft('')
    setSending(true)
    try { await sendGroupMessage(groupId, text) }
    finally { setSending(false) }
  }, [draft, sending, groupId])

  const renderItem = useCallback(({ item }: { item: GroupMessage }) => (
    <GroupBubble msg={item} isMine={item.sender_id === myId || item.sender_id === -1} />
  ), [myId])

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bgPrimary }]} edges={['top', 'bottom']}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.bgSecondary, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/messages')} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={24} color={c.brand} />
        </Pressable>
        {coverUrl
          ? <Image source={{ uri: coverUrl }} style={styles.headerAvatar} />
          : (
            <View style={[styles.headerAvatar, { backgroundColor: c.brandSubtle, alignItems: 'center', justifyContent: 'center' }]}>
              <Users size={18} color={c.brand} />
            </View>
          )
        }
        <Text numberOfLines={1} style={[styles.headerName, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold, flex: 1 }]}>
          {name}
        </Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={c.brand} size="large" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={msgs}
            keyExtractor={item => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={[styles.listContent, msgs.length === 0 && { flex: 1, justifyContent: 'center', alignItems: 'center' }]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', gap: spacing.sm }}>
                <Users size={40} color={c.textMuted} />
                <Text style={[{ color: c.textMuted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm }]}>
                  Guruhda hali xabarlar yo'q
                </Text>
              </View>
            }
          />
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { backgroundColor: c.bgSecondary, borderTopColor: c.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderBottomWidth: 1, gap: spacing.sm,
  },
  backBtn:      { paddingRight: spacing.xs },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerName:   { fontSize: typography.size.base },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent:  { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, flexGrow: 1 },
  bubbleOuter:      { marginVertical: 4, flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-end' },
  bubbleOuterMine:  { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  bubbleOuterTheirs:{ alignSelf: 'flex-start' },
  senderName:   { fontSize: typography.size.xs, marginBottom: 2, marginLeft: 2 },
  bubble: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.lg, gap: 2,
  },
  bubbleText: { fontSize: typography.size.base, lineHeight: 20 },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 2 },
  bubbleTime: { fontSize: 10 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderTopWidth: 1, gap: spacing.sm,
  },
  input: {
    flex: 1, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: typography.size.base, maxHeight: 120,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendIcon: { color: '#fff', fontSize: 22, lineHeight: 26 },
})

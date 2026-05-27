import { create } from 'zustand'
import { messenger, groups as groupsApi, Conversation, Message, MessageReaction, GroupChat, GroupMessage } from '../lib/api'
import { supabase } from '../lib/supabase'

interface MessagingStore {
  conversations:   Conversation[]
  messages:        Record<number, Message[]>
  unreadTotal:     number
  loading:         boolean
  convLoading:     Record<number, boolean>
  hasMore:         Record<number, boolean>
  // Presence
  onlineUsers:     number[]
  typingInConv:    Record<number, boolean>
  // Groups
  groupList:       GroupChat[]
  groupMessages:   Record<number, GroupMessage[]>
  groupsLoading:   boolean

  loadConversations:   () => Promise<void>
  loadMessages:        (convId: number) => Promise<void>
  loadMoreMessages:    (convId: number) => Promise<void>
  sendMessage:         (convId: number, content: string, replyToId?: number | null) => Promise<void>
  deleteMessage:       (convId: number, messageId: number, localOnly?: boolean) => Promise<void>
  deleteConversation:  (convId: number) => Promise<void>
  markRead:            (convId: number) => Promise<void>
  toggleReaction:      (convId: number, messageId: number, emoji: string, myId: number) => Promise<void>
  receiveMessage:      (msg: Message) => void
  updateMessageStatus: (msgId: number, patch: Partial<Message>) => void
  subscribeRealtime:   (myId: number) => () => void
  subscribeConvPresence: (convId: number, myId: number) => () => void
  setTyping:           (convId: number, myId: number, isTyping: boolean) => void
  refreshUnread:       () => Promise<void>
  // Groups
  loadGroups:          () => Promise<void>
  loadGroupMessages:   (groupId: number) => Promise<void>
  sendGroupMessage:    (groupId: number, content: string) => Promise<void>
}

const PAGE = 40

// Normalise last_message — backend may return a Message dict while migrating
function normConv(c: any): Conversation {
  return {
    ...c,
    last_message: typeof c.last_message === 'string'
      ? c.last_message
      : (c.last_message as any)?.content ?? null,
  }
}

// Typing timeout handles per-conv
const typingTimers: Record<number, ReturnType<typeof setTimeout>> = {}
// Per-conv presence channels (keyed by convId)
const presenceChannels: Record<number, any> = {}

export const useMessagingStore = create<MessagingStore>((set, get) => ({
  conversations: [],
  messages:      {},
  unreadTotal:   0,
  loading:       false,
  convLoading:   {},
  hasMore:       {},
  onlineUsers:   [],
  typingInConv:  {},
  groupList:     [],
  groupMessages: {},
  groupsLoading: false,

  // ── Conversations ────────────────────────────────────────────────────────

  loadConversations: async () => {
    set({ loading: true })
    try {
      const raw   = await messenger.listConversations()
      const convs = raw.map(normConv)
      const total = convs.reduce((s, c) => s + c.unread_count, 0)
      set({ conversations: convs, unreadTotal: total })
    } catch { /* non-fatal */ }
    finally { set({ loading: false }) }
  },

  // ── Messages ─────────────────────────────────────────────────────────────

  loadMessages: async (convId) => {
    set(s => ({ convLoading: { ...s.convLoading, [convId]: true } }))
    try {
      const msgs = await messenger.listMessages(convId, undefined, PAGE)
      set(s => ({
        messages: { ...s.messages, [convId]: msgs },
        hasMore:  { ...s.hasMore,  [convId]: msgs.length === PAGE },
      }))
    } catch { /* non-fatal */ }
    finally { set(s => ({ convLoading: { ...s.convLoading, [convId]: false } })) }
  },

  loadMoreMessages: async (convId) => {
    if (!get().hasMore[convId]) return
    const existing = get().messages[convId] ?? []
    if (!existing.length) return
    const oldestId = existing[0].id
    try {
      const older = await messenger.listMessages(convId, oldestId, PAGE)
      if (!older.length) {
        set(s => ({ hasMore: { ...s.hasMore, [convId]: false } }))
        return
      }
      set(s => ({
        messages: { ...s.messages, [convId]: [...older, ...existing] },
        hasMore:  { ...s.hasMore,  [convId]: older.length === PAGE },
      }))
    } catch { /* non-fatal */ }
  },

  sendMessage: async (convId, content, replyToId) => {
    const tempId = -Date.now()
    const tempMsg: Message = {
      id: tempId, conversation_id: convId,
      sender_id: -1, content,
      is_delivered: false, is_read: false,
      created_at: new Date().toISOString(),
      reply_to_id: replyToId ?? null,
      reactions: [],
    }
    set(s => ({ messages: { ...s.messages, [convId]: [...(s.messages[convId] ?? []), tempMsg] } }))

    try {
      const real = await messenger.sendMessage(convId, content, replyToId)
      set(s => ({
        messages: {
          ...s.messages,
          [convId]: (s.messages[convId] ?? []).map(m => m.id === tempId ? real : m),
        },
        conversations: s.conversations.map(c =>
          c.id === convId
            ? { ...c, last_message: content, last_message_at: real.created_at }
            : c
        ),
      }))
    } catch (err) {
      set(s => ({
        messages: { ...s.messages, [convId]: (s.messages[convId] ?? []).filter(m => m.id !== tempId) },
      }))
      throw err
    }
  },

  deleteMessage: async (convId, messageId, localOnly = false) => {
    set(s => ({
      messages: {
        ...s.messages,
        [convId]: (s.messages[convId] ?? []).filter(m => m.id !== messageId),
      },
    }))
    if (localOnly) return
    try {
      await messenger.deleteMessage(messageId)
    } catch {
      get().loadMessages(convId)
    }
  },

  deleteConversation: async (convId) => {
    // Optimistic remove
    set(s => {
      const removed = s.conversations.find(c => c.id === convId)
      const next = s.conversations.filter(c => c.id !== convId)
      const newUnread = Math.max(0, s.unreadTotal - (removed?.unread_count ?? 0))
      const msgs = { ...s.messages }
      delete msgs[convId]
      return { conversations: next, unreadTotal: newUnread, messages: msgs }
    })
    try {
      await messenger.deleteConversation(convId)
    } catch {
      get().loadConversations()
    }
  },

  markRead: async (convId) => {
    const conv = get().conversations.find(c => c.id === convId)
    if (!conv || conv.unread_count === 0) return
    try {
      await messenger.markRead(convId)
      set(s => ({
        conversations: s.conversations.map(c => c.id === convId ? { ...c, unread_count: 0 } : c),
        unreadTotal: Math.max(0, s.unreadTotal - conv.unread_count),
      }))
    } catch { /* silent */ }
  },

  toggleReaction: async (convId, messageId, emoji, myId) => {
    // Snapshot previous reactions for rollback
    const prevMsgs = get().messages[convId] ?? []
    const prevReactions = prevMsgs.find(m => m.id === messageId)?.reactions ?? []

    // Optimistic update
    set(s => {
      const msgs = s.messages[convId] ?? []
      return {
        messages: {
          ...s.messages,
          [convId]: msgs.map(m => {
            if (m.id !== messageId) return m
            const reactions = m.reactions ?? []
            const existing = reactions.find(r => r.emoji === emoji)
            const hasMyReaction = existing?.user_ids.includes(myId)
            let newReactions: MessageReaction[]
            if (hasMyReaction) {
              newReactions = reactions
                .map(r => r.emoji !== emoji ? r : {
                  ...r,
                  count: r.count - 1,
                  user_ids: r.user_ids.filter(id => id !== myId),
                })
                .filter(r => r.count > 0)
            } else {
              newReactions = existing
                ? reactions.map(r => r.emoji !== emoji ? r : {
                    ...r, count: r.count + 1, user_ids: [...r.user_ids, myId],
                  })
                : [...reactions, { emoji, count: 1, user_ids: [myId] }]
            }
            return { ...m, reactions: newReactions }
          }),
        },
      }
    })

    try {
      await messenger.toggleReaction(messageId, emoji)
    } catch {
      // Revert only the affected message — don't reload everything
      set(s => ({
        messages: {
          ...s.messages,
          [convId]: (s.messages[convId] ?? []).map(m =>
            m.id === messageId ? { ...m, reactions: prevReactions } : m
          ),
        },
      }))
    }
  },

  // ── Realtime ──────────────────────────────────────────────────────────────

  receiveMessage: (msg) => {
    const convId = msg.conversation_id
    set(s => {
      const existing = s.messages[convId] ?? []
      if (existing.some(m => m.id === msg.id)) return s
      const conv = s.conversations.find(c => c.id === convId)
      return {
        messages: { ...s.messages, [convId]: [...existing, msg] },
        conversations: s.conversations.map(c =>
          c.id === convId
            ? { ...c, last_message: msg.content, last_message_at: msg.created_at, unread_count: c.unread_count + 1 }
            : c
        ),
        unreadTotal: conv ? s.unreadTotal + 1 : s.unreadTotal,
      }
    })
  },

  updateMessageStatus: (msgId, patch) => {
    set(s => {
      const updated: Record<number, Message[]> = {}
      for (const [cid, msgs] of Object.entries(s.messages)) {
        const idx = msgs.findIndex(m => m.id === msgId)
        if (idx !== -1) {
          const arr = [...msgs]
          arr[idx] = { ...arr[idx], ...patch }
          updated[Number(cid)] = arr
        }
      }
      return { messages: { ...s.messages, ...updated } }
    })
  },

  subscribeRealtime: (myId) => {
    const channel = supabase
      .channel(`dm-${myId}`)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload: any) => {
          const msg = payload.new as Message
          if (msg.sender_id !== myId) get().receiveMessage({ ...msg, reactions: [] })
        },
      )
      .on(
        'postgres_changes' as any,
        { event: 'UPDATE', schema: 'public', table: 'direct_messages' },
        (payload: any) => {
          const msg = payload.new as Message
          get().updateMessageStatus(msg.id, {
            is_delivered: msg.is_delivered,
            is_read:      msg.is_read,
          })
        },
      )
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'message_reactions' },
        (payload: any) => {
          const { message_id, user_id, emoji } = payload.new
          if (user_id === myId) return  // already applied optimistically
          set(s => {
            for (const [cid, msgs] of Object.entries(s.messages)) {
              const idx = msgs.findIndex(m => m.id === message_id)
              if (idx === -1) continue
              const arr = [...msgs]
              const reactions = arr[idx].reactions ?? []
              const existing = reactions.find(r => r.emoji === emoji)
              arr[idx] = {
                ...arr[idx],
                reactions: existing
                  ? reactions.map(r => r.emoji !== emoji ? r : { ...r, count: r.count + 1, user_ids: [...r.user_ids, user_id] })
                  : [...reactions, { emoji, count: 1, user_ids: [user_id] }],
              }
              return { messages: { ...s.messages, [Number(cid)]: arr } }
            }
            return s
          })
        },
      )
      .on(
        'postgres_changes' as any,
        { event: 'DELETE', schema: 'public', table: 'message_reactions' },
        (payload: any) => {
          const { message_id, user_id, emoji } = payload.old
          if (user_id === myId) return
          set(s => {
            for (const [cid, msgs] of Object.entries(s.messages)) {
              const idx = msgs.findIndex(m => m.id === message_id)
              if (idx === -1) continue
              const arr = [...msgs]
              arr[idx] = {
                ...arr[idx],
                reactions: (arr[idx].reactions ?? [])
                  .map(r => r.emoji !== emoji ? r : { ...r, count: r.count - 1, user_ids: r.user_ids.filter(id => id !== user_id) })
                  .filter(r => r.count > 0),
              }
              return { messages: { ...s.messages, [Number(cid)]: arr } }
            }
            return s
          })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  },

  // ── Presence (typing + online) ────────────────────────────────────────────

  subscribeConvPresence: (convId, myId) => {
    if (presenceChannels[convId]) {
      supabase.removeChannel(presenceChannels[convId])
    }

    const channel = supabase
      .channel(`conv-presence-${convId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ user_id: number; typing: boolean }>()
        const others = Object.values(state)
          .flat()
          .filter((p: any) => p.user_id !== myId)
        const isTyping = others.some((p: any) => p.typing === true)
        set(s => ({ typingInConv: { ...s.typingInConv, [convId]: isTyping } }))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: myId, typing: false })
        }
      })

    presenceChannels[convId] = channel

    return () => {
      supabase.removeChannel(channel)
      delete presenceChannels[convId]
    }
  },

  setTyping: (convId, myId, isTyping) => {
    const channel = presenceChannels[convId]
    if (!channel) return
    channel.track({ user_id: myId, typing: isTyping })

    if (isTyping) {
      clearTimeout(typingTimers[convId])
      typingTimers[convId] = setTimeout(() => {
        channel.track({ user_id: myId, typing: false })
      }, 3000)
    }
  },

  refreshUnread: async () => {
    try {
      const { count } = await messenger.getUnreadCount()
      set({ unreadTotal: count })
    } catch { /* silent */ }
  },

  // ── Groups ────────────────────────────────────────────────────────────────

  loadGroups: async () => {
    set({ groupsLoading: true })
    try {
      const data = await groupsApi.list()
      set({ groupList: data })
    } catch { /* non-fatal */ }
    finally { set({ groupsLoading: false }) }
  },

  loadGroupMessages: async (groupId) => {
    try {
      const msgs = await groupsApi.listMessages(groupId)
      set(s => ({ groupMessages: { ...s.groupMessages, [groupId]: msgs } }))
    } catch { /* non-fatal */ }
  },

  sendGroupMessage: async (groupId, content) => {
    const tempId = -Date.now()
    const temp: GroupMessage = {
      id: tempId, group_id: groupId, sender_id: -1,
      sender_name: '', sender_photo: null, content,
      created_at: new Date().toISOString(),
    }
    set(s => ({ groupMessages: { ...s.groupMessages, [groupId]: [...(s.groupMessages[groupId] ?? []), temp] } }))
    try {
      const real = await groupsApi.sendMessage(groupId, content)
      set(s => ({
        groupMessages: {
          ...s.groupMessages,
          [groupId]: (s.groupMessages[groupId] ?? []).map(m => m.id === tempId ? real : m),
        },
        groupList: s.groupList.map(g =>
          g.id === groupId ? { ...g, last_message: content, last_message_at: real.created_at } : g
        ),
      }))
    } catch {
      set(s => ({
        groupMessages: {
          ...s.groupMessages,
          [groupId]: (s.groupMessages[groupId] ?? []).filter(m => m.id !== tempId),
        },
      }))
    }
  },
}))

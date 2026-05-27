import React, { useState, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack, useRouter } from 'expo-router'
import { ChevronLeft, Send, Sparkles } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { request } from '../../lib/api'
import { typography, spacing, radius } from '../../lib/constants'

interface ChatMessage {
  id:        string
  role:      'user' | 'ai'
  text:      string
  timestamp: string
}

const GREETING: ChatMessage = {
  id:        'greeting',
  role:      'ai',
  text:      "Salom! Men SAHIFALAB AI yordamchisiman. O'qish, kurslar, kitoblar yoki shaxsiy rivojlanish haqida savollaringiz bo'lsa, bemalol so'rang. Sizga qanday yordam bera olaman?",
  timestamp: new Date().toISOString(),
}

function MessageBubble({ msg, c }: { msg: ChatMessage; c: any }) {
  const isUser = msg.role === 'user'
  return (
    <View style={[styles.bubbleWrap, isUser && styles.bubbleWrapUser]}>
      {!isUser && (
        <View style={[styles.aiAvatar, { backgroundColor: c.brand }]}>
          <Sparkles size={14} color="#fff" />
        </View>
      )}
      <View style={[
        styles.bubble,
        isUser
          ? { backgroundColor: c.brand }
          : { backgroundColor: c.bgSecondary, borderColor: c.border, borderWidth: 1 },
      ]}>
        <Text style={[styles.bubbleText, {
          color:      isUser ? '#fff' : c.textPrimary,
          fontFamily: typography.fontFamily.regular,
        }]}>
          {msg.text}
        </Text>
      </View>
    </View>
  )
}

export default function AICompanionScreen() {
  const { c }  = useTheme()
  const router = useRouter()
  const listRef = useRef<FlatList>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg: ChatMessage = {
      id:        `user-${Date.now()}`,
      role:      'user',
      text,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await request<{ reply?: string; message?: string; response?: string }>(
        '/api/v1/ai/chat',
        {
          method: 'POST',
          auth: true,
          body: JSON.stringify({ message: text }),
        }
      )
      const reply = res.reply ?? res.message ?? res.response ?? '...'
      const aiMsg: ChatMessage = {
        id:        `ai-${Date.now()}`,
        role:      'ai',
        text:      reply,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, aiMsg])
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
    } catch {
      setMessages(prev => [...prev, {
        id:        `err-${Date.now()}`,
        role:      'ai',
        text:      'Kechirasiz, xatolik yuz berdi. Qayta urinib ko\'ring.',
        timestamp: new Date().toISOString(),
      }])
    }
    finally { setLoading(false) }
  }, [input, loading])

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bgPrimary }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border, backgroundColor: c.bgPrimary }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={c.brand} />
        </Pressable>
        <View style={styles.headerTitle}>
          <View style={[styles.aiIcon, { backgroundColor: c.brand }]}>
            <Sparkles size={14} color="#fff" />
          </View>
          <View>
            <Text style={[styles.titleText, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              AI Yordamchi
            </Text>
            <Text style={[styles.subtitleText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              SAHIFALAB • Gemini AI
            </Text>
          </View>
        </View>
        <View style={{ width: 22 }} />
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={({ item }) => <MessageBubble msg={item} c={c} />}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListFooterComponent={
          loading ? (
            <View style={[styles.bubbleWrap]}>
              <View style={[styles.aiAvatar, { backgroundColor: c.brand }]}>
                <Sparkles size={14} color="#fff" />
              </View>
              <View style={[styles.bubble, { backgroundColor: c.bgSecondary, borderColor: c.border, borderWidth: 1 }]}>
                <ActivityIndicator size="small" color={c.brand} />
              </View>
            </View>
          ) : null
        }
      />

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.inputBar, { borderTopColor: c.border, backgroundColor: c.bgPrimary }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Savol yozing..."
            placeholderTextColor={c.textMuted}
            multiline
            maxLength={1000}
            style={[styles.input, {
              backgroundColor: c.bgSecondary,
              borderColor:     input.trim() ? c.brand : c.border,
              color:           c.textPrimary,
              fontFamily:      typography.fontFamily.regular,
            }]}
          />
          <Pressable
            onPress={send}
            disabled={!input.trim() || loading}
            style={[styles.sendBtn, { backgroundColor: input.trim() && !loading ? c.brand : c.bgTertiary }]}
          >
            <Send size={16} color={input.trim() && !loading ? '#fff' : c.textMuted} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

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
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  aiIcon: {
    width:          36,
    height:         36,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: typography.size.md,
  },
  subtitleText: {
    fontSize:  11,
    marginTop: 1,
  },
  messageList: {
    padding:       spacing.base,
    paddingBottom: spacing.sm,
    gap:           spacing.sm,
  },
  bubbleWrap: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    gap:           spacing.xs,
    marginBottom:  spacing.sm,
  },
  bubbleWrapUser: {
    flexDirection:  'row-reverse',
  },
  aiAvatar: {
    width:          28,
    height:         28,
    borderRadius:   14,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  bubble: {
    maxWidth:          '75%',
    borderRadius:      radius.xl,
    borderBottomLeftRadius: 4,
    padding:           spacing.sm + 2,
  },
  bubbleText: {
    fontSize:   typography.size.base,
    lineHeight: 22,
  },
  inputBar: {
    flexDirection:   'row',
    alignItems:      'flex-end',
    gap:             spacing.sm,
    padding:         spacing.sm,
    borderTopWidth:  1,
  },
  input: {
    flex:              1,
    borderRadius:      radius.xl,
    borderWidth:       1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical:   spacing.sm,
    fontSize:          typography.size.base,
    maxHeight:         100,
    minHeight:         44,
  },
  sendBtn: {
    width:          44,
    height:         44,
    borderRadius:   radius.full,
    alignItems:     'center',
    justifyContent: 'center',
  },
})

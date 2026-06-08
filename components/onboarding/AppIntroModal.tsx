import React, { useRef, useState, useCallback, useEffect } from 'react'
import {
  Modal, View, Text, Pressable, StyleSheet, FlatList,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'

interface Slide {
  id:          string
  emoji:       string
  title:       string
  description: string
  accent:      string
}

const SLIDES: Slide[] = [
  {
    id:          'welcome',
    emoji:       '👋',
    title:       "Sahifalab'ga xush kelibsiz!",
    description: "O'rganish jarayonini qiziqarli va samarali qiling. Keling, asosiy imkoniyatlar bilan tanishamiz.",
    accent:      '#F5A623',
  },
  {
    id:          'timer',
    emoji:       '⏱️',
    title:       'Fokus Taymeri',
    description: "Har kuni taymer bilan o'qing va XP to'plang. Har bir seans seriyangizni uzaytiradi va statistikangizga qo'shiladi.",
    accent:      '#F5A623',
  },
  {
    id:          'courses',
    emoji:       '🎓',
    title:       'Video Darslar',
    description: "Yuqori sifatli video darslar orqali yangi ko'nikmalar egallang. Qurilmangizga yuklab oflayn ko'ring.",
    accent:      '#4DA6FF',
  },
  {
    id:          'streak',
    emoji:       '🔥',
    title:       'Seriya (Streak)',
    description: "Har kuni o'qib seriyangizni uzilmasdan saqlang. Qancha uzun bo'lsa, shuncha katta mukofotlar va bonuslar!",
    accent:      '#FF5E00',
  },
  {
    id:          'flashcards',
    emoji:       '🃏',
    title:       'Flashkartalar',
    description: "Kartalar yordamida so'z va tushunchalarni tezroq eslab qoling. SM-2 algoritmi sizga eng kerakli kartalarni ko'rsatadi.",
    accent:      '#34C759',
  },
]

interface Props {
  visible:  boolean
  onFinish: () => void
}

export function AppIntroModal({ visible, onFinish }: Props) {
  const { c }        = useTheme()
  const insets       = useSafeAreaInsets()
  const { width }    = useWindowDimensions()
  const listRef      = useRef<FlatList<Slide>>(null)
  const [index, setIndex] = useState(0)

  // Reset to first slide whenever modal opens
  useEffect(() => {
    if (visible) {
      setIndex(0)
      listRef.current?.scrollToOffset({ offset: 0, animated: false })
    }
  }, [visible])

  const slide  = SLIDES[index]
  const isLast = index === SLIDES.length - 1

  const handleNext = useCallback(() => {
    if (isLast) { onFinish(); return }
    const next = index + 1
    setIndex(next)
    listRef.current?.scrollToIndex({ index: next, animated: true })
  }, [index, isLast, onFinish])

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setIndex(viewableItems[0].index ?? 0)
  }, [])

  const viewabilityConfigCallbackPairs = useRef([{
    viewabilityConfig: { viewAreaCoveragePercentThreshold: 50 },
    onViewableItemsChanged,
  }])

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onFinish}
    >
      <View style={[styles.container, {
        backgroundColor: c.bgPrimary,
        paddingTop:      insets.top + spacing.base,
        paddingBottom:   insets.bottom + spacing.base,
      }]}>

        {/* Progress dots */}
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View
              key={s.id}
              style={[
                styles.dot,
                {
                  backgroundColor: i <= index ? slide.accent : c.border,
                  width:           i === index ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Slides */}
        <FlatList
          ref={listRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={s => s.id}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
          style={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width }]}>
              <View style={[
                styles.emojiCircle,
                { backgroundColor: item.accent + '1A', borderColor: item.accent + '50' },
              ]}>
                <Text style={styles.emoji}>{item.emoji}</Text>
              </View>
              <Text style={[
                styles.title,
                { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold },
              ]}>
                {item.title}
              </Text>
              <Text style={[
                styles.desc,
                { color: c.textSecondary, fontFamily: typography.fontFamily.regular },
              ]}>
                {item.description}
              </Text>
            </View>
          )}
        />

        {/* Actions */}
        <View style={[styles.actions, { paddingHorizontal: spacing.xl }]}>
          <Pressable
            style={[styles.btn, { backgroundColor: slide.accent }]}
            onPress={handleNext}
          >
            <Text style={[styles.btnText, { fontFamily: typography.fontFamily.bold }]}>
              {isLast ? "Boshlash 🚀" : "Keyingi →"}
            </Text>
          </Pressable>

          {!isLast && (
            <Pressable style={styles.skip} onPress={onFinish}>
              <Text style={[styles.skipText, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
                O'tkazib yuborish
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dots: {
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
    gap:            6,
    paddingVertical: spacing.sm,
  },
  dot: {
    height:       8,
    borderRadius: 4,
  },
  list: {
    flex: 1,
  },
  slide: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: spacing.xl,
    gap:               spacing.lg,
  },
  emojiCircle: {
    width:          120,
    height:         120,
    borderRadius:   60,
    borderWidth:    2,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   spacing.sm,
  },
  emoji: {
    fontSize: 54,
  },
  title: {
    fontSize:   typography.size['2xl'],
    textAlign:  'center',
    lineHeight: 32,
  },
  desc: {
    fontSize:   typography.size.base,
    textAlign:  'center',
    lineHeight: 24,
    maxWidth:   300,
  },
  actions: {
    gap:        spacing.xs,
    alignItems: 'center',
    paddingTop: spacing.base,
  },
  btn: {
    width:           '100%',
    paddingVertical: spacing.md + 2,
    borderRadius:    radius.lg,
    alignItems:      'center',
  },
  btnText: {
    color:    '#fff',
    fontSize: typography.size.base,
  },
  skip: {
    paddingVertical: spacing.sm,
  },
  skipText: {
    fontSize: typography.size.sm,
  },
})

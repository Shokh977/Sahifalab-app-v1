import React, { useEffect, useRef, useState } from 'react'
import {
  Modal, View, Text, Pressable, StyleSheet,
  Animated, Easing, ActivityIndicator, TextInput, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Star } from 'phosphor-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { flashcards as flashcardsApi } from '../../lib/api'
import type { RateDeckResult } from '../../lib/types'

interface Props {
  visible:    boolean
  originalDeckId: number
  onClose:    () => void
  onRated:    (result: RateDeckResult) => void
}

export function RatingSheet({ visible, originalDeckId, onClose, onRated }: Props) {
  const { c }  = useTheme()
  const insets = useSafeAreaInsets()
  const slideAnim   = useRef(new Animated.Value(500)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  const [rating,  setRating]  = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (visible) {
      setRating(0)
      setComment('')
      Animated.parallel([
        Animated.timing(slideAnim,   { toValue: 0,   duration: 300, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(opacityAnim, { toValue: 1,   duration: 200, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(slideAnim,   { toValue: 500, duration: 250, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
        Animated.timing(opacityAnim, { toValue: 0,   duration: 200, useNativeDriver: true }),
      ]).start()
    }
  }, [visible])

  async function handleSubmit() {
    if (!rating || loading) return
    setLoading(true)
    try {
      const result = await flashcardsApi.rateDeck(originalDeckId, { rating, comment: comment.trim() || undefined })
      onRated(result)
      onClose()
    } catch (e: any) {
      Alert.alert('Xatolik', e.message ?? 'Baholashda xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  const sheetPaddingBottom = Math.max(insets.bottom, spacing.md) + spacing.sm

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <View style={styles.overlay}>
        <Animated.View style={[
          styles.sheet,
          { backgroundColor: c.bgSecondary, borderColor: c.border, paddingBottom: sheetPaddingBottom, transform: [{ translateY: slideAnim }] },
        ]}>
          <View style={[styles.handle, { backgroundColor: c.border }]} />
          <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            To'plamni baholash
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <Pressable key={n} onPress={() => setRating(n)} hitSlop={6}>
                <Star size={36} color={n <= rating ? '#FFB830' : c.border} weight={n <= rating ? 'fill' : 'regular'} />
              </Pressable>
            ))}
          </View>

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Fikringiz (ixtiyoriy)"
            placeholderTextColor={c.textDisabled}
            style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border, fontFamily: typography.fontFamily.regular }]}
            multiline
            maxLength={500}
          />

          <Pressable
            onPress={handleSubmit}
            disabled={!rating || loading}
            style={[styles.submitBtn, { backgroundColor: rating ? c.accentPrimary : c.bgTertiary }]}
          >
            {loading
              ? <ActivityIndicator color={c.textInverse} size="small" />
              : <Text style={[styles.submitText, { color: rating ? c.textInverse : c.textDisabled, fontFamily: typography.fontFamily.semibold }]}>
                  Baholash
                </Text>
            }
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.base, gap: spacing.base,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: spacing.sm },
  title:  { fontSize: 18, textAlign: 'center' },

  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: spacing.sm },

  input: {
    borderWidth: 1, borderRadius: radius.input, padding: spacing.base,
    minHeight: 70, fontSize: typography.size.sm, textAlignVertical: 'top',
  },

  submitBtn: { height: 50, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: typography.size.base },
})

import React, { useEffect, useRef, useState } from 'react'
import {
  Modal, View, Text, Pressable, StyleSheet,
  Animated, Easing, ActivityIndicator, TextInput, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { apiErrorDetails } from '../../lib/api'
import { usePublicDecksStore } from '../../stores/publicDecksStore'
import type { DeckReportReason } from '../../lib/types'

interface Props {
  visible: boolean
  deckId:  number
  onClose: () => void
}

const REASONS: { key: DeckReportReason; label: string }[] = [
  { key: 'spam',          label: 'Spam' },
  { key: 'errors',        label: 'Xatolar' },
  { key: 'inappropriate', label: 'Nomaqbul' },
  { key: 'offensive',     label: 'Haqoratli' },
  { key: 'copyright',     label: 'Mualliflik huquqi' },
  { key: 'other',         label: 'Boshqa' },
]

export function ReportSheet({ visible, deckId, onClose }: Props) {
  const { c }  = useTheme()
  const insets = useSafeAreaInsets()
  const slideAnim   = useRef(new Animated.Value(500)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  const [reason,  setReason]  = useState<DeckReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (visible) {
      setReason(null)
      setDetails('')
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
    if (!reason || loading) return
    setLoading(true)
    try {
      await usePublicDecksStore.getState().reportDeck(deckId, reason, details.trim() || undefined)
      onClose()
      Alert.alert('Yuborildi', "Shikoyatingiz qabul qilindi. Ko'rib chiqamiz.")
    } catch (e: any) {
      Alert.alert('Xatolik', apiErrorDetails(e))
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
            Shikoyat qilish
          </Text>

          <View style={styles.reasonsWrap}>
            {REASONS.map(r => {
              const selected = reason === r.key
              return (
                <Pressable
                  key={r.key}
                  onPress={() => setReason(r.key)}
                  style={[styles.reasonChip, { backgroundColor: selected ? c.accentPrimaryMuted : c.bgTertiary, borderColor: selected ? c.accentPrimary : c.border }]}
                >
                  <Text style={[styles.reasonText, { color: selected ? c.accentPrimary : c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                    {r.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Qo'shimcha izoh (ixtiyoriy)"
            placeholderTextColor={c.textDisabled}
            style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border, fontFamily: typography.fontFamily.regular }]}
            multiline
            maxLength={500}
          />

          <Pressable
            onPress={handleSubmit}
            disabled={!reason || loading}
            style={[styles.submitBtn, { backgroundColor: reason ? c.error : c.bgTertiary }]}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={[styles.submitText, { color: reason ? '#fff' : c.textDisabled, fontFamily: typography.fontFamily.semibold }]}>
                  Yuborish
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
  title:  { fontSize: 18 },

  reasonsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonChip:  { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.button, borderWidth: 1 },
  reasonText:  { fontSize: typography.size.sm },

  input: {
    borderWidth: 1, borderRadius: radius.input, padding: spacing.base,
    minHeight: 70, fontSize: typography.size.sm, textAlignVertical: 'top',
  },

  submitBtn: { height: 50, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: typography.size.base },
})

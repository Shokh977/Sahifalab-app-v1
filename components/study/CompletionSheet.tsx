/**
 * Bottom sheet shown after a timer session completes.
 * Slides up, lets user add an optional note, then calls onSave.
 */
import React, { useState, useEffect } from 'react'
import {
  View, Text, Modal, StyleSheet, Pressable, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing, FadeIn, FadeOut,
} from 'react-native-reanimated'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'

interface Props {
  visible:      boolean
  minutes:      number
  xpEarned:    number
  onSave:      (note: string) => void
  onSkip:      () => void
  saving?:     boolean
}

export function CompletionSheet({ visible, minutes, xpEarned, onSave, onSkip, saving }: Props) {
  const { c } = useTheme()
  const [note, setNote] = useState('')

  const translateY = useSharedValue(400)

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) })
      setNote('')
    } else {
      translateY.value = withTiming(400, { duration: 250, easing: Easing.in(Easing.cubic) })
    }
  }, [visible])

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  if (!visible) return null

  return (
    <Modal transparent animationType="none" visible={visible} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(180)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onSkip} />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.sheet, { backgroundColor: c.bgSecondary }, sheetStyle]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: c.border }]} />

          {/* Header */}
          <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            Ajoyib! {minutes} daqiqa o'qidingiz 🎉
          </Text>
          <Text style={[styles.xp, { color: c.accentPrimary, fontFamily: typography.fontFamily.semibold }]}>
            +{xpEarned} XP
          </Text>

          <View style={[styles.divider, { backgroundColor: c.borderSubtle }]} />

          {/* Note input */}
          <Text style={[styles.noteLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Nima o'qidingiz?
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Izoh qo'shish (ixtiyoriy)..."
            placeholderTextColor={c.textDisabled}
            multiline
            numberOfLines={2}
            style={[
              styles.noteInput,
              {
                backgroundColor: c.bgInput,
                color:           c.textPrimary,
                fontFamily:      typography.fontFamily.regular,
                borderColor:     c.border,
              },
            ]}
          />

          {/* Buttons */}
          <Pressable
            onPress={() => onSave(note)}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: c.accentPrimary, opacity: pressed || saving ? 0.85 : 1 },
            ]}
          >
            {saving
              ? <ActivityIndicator color={c.textInverse} size="small" />
              : <Text style={[styles.saveBtnText, { color: c.textInverse, fontFamily: typography.fontFamily.semibold }]}>
                  {note.trim() ? 'Saqlash' : 'Tayyor'}
                </Text>
            }
          </Pressable>

          <Pressable onPress={onSkip} disabled={saving} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              O'tkazib yuborish
            </Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>

  )
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },

  sheet: {
    borderTopLeftRadius:  radius.modal,
    borderTopRightRadius: radius.modal,
    padding:              spacing.lg,
    paddingBottom:        spacing['3xl'],
    gap:                  spacing.sm,
  },
  handle: {
    width:        40,
    height:       4,
    borderRadius: 2,
    alignSelf:    'center',
    marginBottom: spacing.sm,
  },

  title: { fontSize: typography.size.xl, textAlign: 'center' },
  xp:    { fontSize: typography.size.lg, textAlign: 'center' },

  divider: { height: 1, marginVertical: spacing.sm },

  noteLabel: { fontSize: typography.size.sm },
  noteInput: {
    borderWidth:  1,
    borderRadius: radius.input,
    padding:      spacing.sm + 4,
    minHeight:    72,
    textAlignVertical: 'top',
    fontSize:     typography.size.base,
    marginTop:    4,
  },

  saveBtn: {
    height:         52,
    borderRadius:   radius['2xl'],
    alignItems:     'center',
    justifyContent: 'center',
    marginTop:      spacing.sm,
  },
  saveBtnText: { fontSize: typography.size.lg },

  skipBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  skipText: { fontSize: typography.size.sm },
})

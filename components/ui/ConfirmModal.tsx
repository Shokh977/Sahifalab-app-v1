import React, { useEffect, useRef } from 'react'
import { Modal, View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'

export interface ConfirmModalProps {
  visible:      boolean
  emoji?:       string
  title:        string
  message?:     string
  confirmText?: string
  cancelText?:  string
  danger?:      boolean
  onConfirm:    () => void
  onCancel:     () => void
}

export function ConfirmModal({
  visible, emoji = '🤔', title, message,
  confirmText = 'Tasdiqlash', cancelText = "Bekor qilish",
  danger = false, onConfirm, onCancel,
}: ConfirmModalProps) {
  const { c } = useTheme()
  const scale   = useRef(new Animated.Value(0.82)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      scale.setValue(0.82)
      opacity.setValue(0)
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 260 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      ]).start()
    }
  }, [visible])

  const confirmBg = danger ? '#FF453A' : c.accentPrimary

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onCancel}>
      <Animated.View style={[styles.overlay, { opacity, backgroundColor: c.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <Animated.View style={[
          styles.card,
          { backgroundColor: c.bgSecondary, borderColor: c.border, transform: [{ scale }] },
        ]}>
          <Text style={styles.emoji}>{emoji}</Text>

          <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
            {title}
          </Text>

          {message ? (
            <Text style={[styles.message, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              {message}
            </Text>
          ) : null}

          <View style={styles.buttons}>
            <Pressable
              style={[styles.btn, styles.btnCancel, { backgroundColor: c.bgTertiary, borderColor: c.border }]}
              onPress={onCancel}
            >
              <Text style={[styles.btnText, { color: c.textSecondary, fontFamily: typography.fontFamily.semibold }]}>
                {cancelText}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.btn, styles.btnConfirm, { backgroundColor: confirmBg }]}
              onPress={onConfirm}
            >
              <Text style={[styles.btnText, { color: '#fff', fontFamily: typography.fontFamily.bold }]}>
                {confirmText}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        spacing.xl,
  },
  card: {
    width:             '100%',
    maxWidth:          340,
    borderRadius:      radius.cardXl,
    borderWidth:       1,
    paddingHorizontal: spacing.xl,
    paddingTop:        spacing.xl,
    paddingBottom:     spacing.base,
    alignItems:        'center',
    gap:               spacing.sm,
  },
  emoji: {
    fontSize:     48,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize:  typography.size.xl,
    textAlign: 'center',
    lineHeight: 26,
  },
  message: {
    fontSize:   typography.size.sm,
    textAlign:  'center',
    lineHeight: 20,
    marginTop:  2,
  },
  buttons: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginTop:     spacing.sm,
    width:         '100%',
  },
  btn: {
    flex:            1,
    paddingVertical: spacing.md,
    borderRadius:    radius.lg,
    alignItems:      'center',
  },
  btnCancel: {
    borderWidth: 1,
  },
  btnConfirm: {},
  btnText: {
    fontSize: typography.size.sm,
  },
})

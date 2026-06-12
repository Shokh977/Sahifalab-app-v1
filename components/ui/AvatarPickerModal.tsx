import React, { useEffect, useRef, useState } from 'react'
import { Modal, View, Text, Pressable, StyleSheet, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Camera, Images } from 'phosphor-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'

interface Props {
  visible:   boolean
  onClose:   () => void
  onCamera:  () => void
  onGallery: () => void
}

export function AvatarPickerModal({ visible, onClose, onCamera, onGallery }: Props) {
  const { c }  = useTheme()
  const insets = useSafeAreaInsets()

  // Keep modal in the tree until the exit animation finishes
  const [rendered, setRendered] = useState(visible)
  const backdropAnim = useRef(new Animated.Value(0)).current
  const sheetAnim    = useRef(new Animated.Value(320)).current

  useEffect(() => {
    if (visible) {
      setRendered(true)
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(sheetAnim,    { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(sheetAnim,    { toValue: 320, duration: 200, useNativeDriver: true }),
      ]).start(() => setRendered(false))
    }
  }, [visible])

  if (!rendered) return null

  // Close modal first, then open the picker — avoids animation clash
  const pick = (fromCamera: boolean) => {
    onClose()
    setTimeout(() => (fromCamera ? onCamera() : onGallery()), 250)
  }

  return (
    <Modal transparent visible={rendered} onRequestClose={onClose} statusBarTranslucent>
      {/* Backdrop — tappable to dismiss */}
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Bottom sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: c.bgSecondary,
            paddingBottom:   insets.bottom + spacing.base,
            transform:       [{ translateY: sheetAnim }],
          },
        ]}
      >
        {/* Drag handle */}
        <View style={[styles.handle, { backgroundColor: c.border }]} />

        {/* Title */}
        <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          Rasm tanlash
        </Text>

        {/* Action options */}
        <View style={[styles.group, { backgroundColor: c.bgTertiary }]}>
          {/* Camera */}
          <Pressable
            onPress={() => pick(true)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.bgPrimary }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: c.accentPrimary + '22' }]}>
              <Camera size={20} color={c.accentPrimary} weight="bold" />
            </View>
            <Text style={[styles.rowText, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
              Rasmga olish
            </Text>
          </Pressable>

          <View style={[styles.sep, { backgroundColor: c.border, marginLeft: 16 + 36 + spacing.sm }]} />

          {/* Gallery */}
          <Pressable
            onPress={() => pick(false)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.bgPrimary }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: c.accentPrimary + '22' }]}>
              <Images size={20} color={c.accentPrimary} weight="bold" />
            </View>
            <Text style={[styles.rowText, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
              Galereyadan tanlash
            </Text>
          </Pressable>
        </View>

        {/* Cancel */}
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.cancelBtn, { backgroundColor: c.bgTertiary, opacity: pressed ? 0.65 : 1 }]}
        >
          <Text style={[styles.cancelLabel, { color: c.accentPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Bekor
          </Text>
        </Pressable>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  sheet: {
    position:             'absolute',
    bottom:               0,
    left:                 0,
    right:                0,
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    paddingHorizontal:    spacing.base,
    paddingTop:           spacing.sm,
    elevation:            24,
    shadowColor:          '#000',
    shadowOffset:         { width: 0, height: -3 },
    shadowOpacity:        0.15,
    shadowRadius:         14,
  },
  handle: {
    width:        36,
    height:       4,
    borderRadius: 2,
    alignSelf:    'center',
    marginBottom: spacing.sm,
  },
  title: {
    textAlign:    'center',
    fontSize:     typography.size.base,
    marginBottom: spacing.base,
  },
  group: {
    borderRadius: radius.card,
    overflow:     'hidden',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm + 4,
  },
  iconWrap: {
    width:          36,
    height:         36,
    borderRadius:   10,
    alignItems:     'center',
    justifyContent: 'center',
  },
  rowText: { fontSize: typography.size.base },
  sep:     { height: StyleSheet.hairlineWidth },
  cancelBtn: {
    borderRadius:    radius.card,
    paddingVertical: spacing.sm + 4,
    alignItems:      'center',
  },
  cancelLabel: { fontSize: typography.size.base },
})

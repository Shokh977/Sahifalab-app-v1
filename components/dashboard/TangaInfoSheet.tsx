import React, { useEffect, useRef, useState } from 'react'
import { Modal, View, Text, Pressable, StyleSheet, Animated, Easing, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'

const SCREEN_H = Dimensions.get('window').height
const SHEET_H  = Math.round(SCREEN_H * 0.3)

const OPEN_DURATION  = 320
const CLOSE_DURATION = 260

interface Props {
  visible:      boolean
  tangaBalance: number
  onClose:      () => void
}

export function TangaInfoSheet({ visible, tangaBalance, onClose }: Props) {
  const { c }    = useTheme()
  const insets   = useSafeAreaInsets()
  const slideY   = useRef(new Animated.Value(-SHEET_H)).current
  const backdrop = useRef(new Animated.Value(0)).current
  // Keeps the native Modal mounted during the closing animation — Modal's
  // own `visible` prop hides it instantly with no transition, so it can
  // only go false once the slide-up has actually finished.
  const [modalVisible, setModalVisible] = useState(visible)

  useEffect(() => {
    if (visible) {
      setModalVisible(true)
      Animated.parallel([
        Animated.timing(slideY, {
          toValue: 0, duration: OPEN_DURATION,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 1, duration: OPEN_DURATION,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(slideY, {
          toValue: -SHEET_H, duration: CLOSE_DURATION,
          easing: Easing.in(Easing.cubic), useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 0, duration: CLOSE_DURATION,
          easing: Easing.in(Easing.cubic), useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setModalVisible(false)
      })
    }
  }, [visible])

  return (
    <Modal transparent visible={modalVisible} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              height: SHEET_H + insets.top,
              paddingTop: insets.top,
              backgroundColor: c.bgSecondary,
              transform: [{ translateY: slideY }],
            },
          ]}
        >
          <Text style={styles.coinEmoji}>🪙</Text>

          <Text style={[styles.amount, { color: '#f59e0b', fontFamily: typography.fontFamily.extrabold }]}>
            {tangaBalance.toLocaleString()} Tanga
          </Text>

          <Text style={[styles.explainTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Tanga nima?
          </Text>
          <Text style={[styles.explainBody, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            XP — bu sizning umumiy natijangiz, u hech qachon kamaymaydi. Tanga esa sarflaydigan
            valyutangiz: seriya muzlatish, AI bilan flashcard yaratish va boshqa AI xizmatlari
            uchun ishlatiladi. O'qishni davom ettirsangiz, Tanga ko'payib boradi.
          </Text>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position:          'absolute',
    top:               0,
    left:              0,
    right:             0,
    borderBottomLeftRadius:  radius.cardXl,
    borderBottomRightRadius: radius.cardXl,
    alignItems:        'center',
    paddingHorizontal: spacing.xl,
    paddingBottom:     spacing.lg,
    overflow:          'hidden',
  },

  coinEmoji: { fontSize: 52 },

  amount: { fontSize: 20, marginTop: 4 },

  explainTitle: { fontSize: 14, marginTop: spacing.sm },
  explainBody: {
    fontSize:   12,
    lineHeight: 17,
    textAlign:  'center',
    marginTop:  4,
  },

})

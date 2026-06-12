import React, { useEffect, useRef, useState } from 'react'
import { Modal, View, Text, Pressable, StyleSheet, Animated } from 'react-native'
import { Info } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing } from '../../lib/constants'

interface Props {
  visible:      boolean
  title:        string
  body:         string
  buttonLabel?: string
  onClose:      () => void
}

export function InfoModal({ visible, title, body, buttonLabel = 'Tushunarli', onClose }: Props) {
  const { c } = useTheme()

  // Stay in tree during exit animation, then unmount
  const [rendered, setRendered] = useState(visible)
  const backdropAnim = useRef(new Animated.Value(0)).current
  const scaleAnim    = useRef(new Animated.Value(0.86)).current
  const opacityAnim  = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      setRendered(true)
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scaleAnim,    { toValue: 1, tension: 70, friction: 11, useNativeDriver: true }),
        Animated.timing(opacityAnim,  { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(scaleAnim,    { toValue: 0.92, duration: 140, useNativeDriver: true }),
        Animated.timing(opacityAnim,  { toValue: 0, duration: 140, useNativeDriver: true }),
      ]).start(() => {
        setRendered(false)
        scaleAnim.setValue(0.86)  // reset for next open
      })
    }
  }, [visible])

  if (!rendered) return null

  return (
    <Modal transparent visible={rendered} onRequestClose={onClose} statusBarTranslucent>
      {/* Backdrop — tappable to dismiss */}
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Centered card */}
      <Animated.View
        style={[styles.overlay, { opacity: opacityAnim }]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: c.bgSecondary, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Icon badge */}
          <View style={[styles.iconWrap, { backgroundColor: c.accentPrimary + '1A' }]}>
            <Info size={24} color={c.accentPrimary} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            {title}
          </Text>

          {/* Body */}
          <Text style={[styles.body, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {body}
          </Text>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: c.border }]} />

          {/* Action button */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.btnText, { color: c.accentPrimary, fontFamily: typography.fontFamily.semibold }]}>
              {buttonLabel}
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  overlay: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 40,
  },
  card: {
    width:             '100%',
    borderRadius:      20,
    paddingTop:        spacing.xl,
    paddingHorizontal: spacing.xl,
    alignItems:        'center',
    gap:               spacing.sm,
    elevation:         20,
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 8 },
    shadowOpacity:     0.18,
    shadowRadius:      20,
  },
  iconWrap: {
    width:          52,
    height:         52,
    borderRadius:   26,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   spacing.xs,
  },
  title: {
    fontSize:  typography.size.lg,
    textAlign: 'center',
  },
  body: {
    fontSize:     typography.size.sm,
    textAlign:    'center',
    lineHeight:   22,
    marginBottom: spacing.sm,
  },
  divider: {
    height:    StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  btn: {
    alignSelf:       'stretch',
    alignItems:      'center',
    paddingVertical: spacing.base,
  },
  btnText: { fontSize: typography.size.base },
})

/**
 * The PRO mark beside a Sahifalab Pro user's name — gold, the same pill as
 * the Pro screen. Tappable where it opens the Pro screen (your own name);
 * plain text elsewhere.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { fonts } from '../../design/typography'
import { Pressable } from '../../components/ui'

export function ProPill({ onPress, small }: { onPress?: () => void; small?: boolean }) {
  const pill = (
    <View style={[styles.pill, small && styles.small]} accessible accessibilityLabel="Sahifalab Pro">
      <LinearGradient
        colors={['#F6E3A8', '#E4BE68', '#C99A3E', '#F1D58E']}
        locations={[0, 0.4, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={[styles.text, small && styles.smallText]}>PRO</Text>
    </View>
  )
  return onPress ? <Pressable onPress={onPress} hitSlop={8}>{pill}</Pressable> : pill
}

const styles = StyleSheet.create({
  pill: { height: 22, borderRadius: 7, paddingHorizontal: 7, justifyContent: 'center', overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.6)' },
  small: { height: 18, borderRadius: 6, paddingHorizontal: 5 },
  text: { color: '#3A2A00', fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.8 },
  smallText: { fontSize: 9.5 },
})

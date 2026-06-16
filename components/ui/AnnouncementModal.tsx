import React from 'react'
import {
  Modal, View, Text, Pressable, StyleSheet, Linking, ScrollView,
} from 'react-native'
import { Image } from 'expo-image'
import { X } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { useAnnouncementStore } from '../../stores/announcementStore'
import { typography, spacing, radius } from '../../lib/constants'

export function AnnouncementModal() {
  const { c } = useTheme()
  const current  = useAnnouncementStore(s => s.current)
  const dismiss  = useAnnouncementStore(s => s.dismiss)
  const snooze   = useAnnouncementStore(s => s.snooze)

  if (!current) return null

  const handleCta = () => {
    if (current.cta_link) {
      Linking.openURL(current.cta_link).catch(() => {})
    }
    dismiss(current.id)
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => snooze(current.id)}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={() => snooze(current.id)}>
        {/* inner card — stop propagation so tapping inside doesn't dismiss */}
        <Pressable
          style={[styles.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}
          onPress={() => {}}
        >
          {/* Close X */}
          <Pressable
            onPress={() => snooze(current.id)}
            hitSlop={12}
            style={styles.closeBtn}
          >
            <X size={18} color={c.textDisabled} strokeWidth={2} />
          </Pressable>

          {/* Optional image */}
          {current.image_url ? (
            <Image
              source={{ uri: current.image_url }}
              style={[styles.image, { backgroundColor: c.bgTertiary }]}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.iconPlaceholder, { backgroundColor: c.brandSubtle }]}>
              <Text style={styles.iconEmoji}>📢</Text>
            </View>
          )}

          {/* Text */}
          <ScrollView
            style={styles.textScroll}
            contentContainerStyle={styles.textContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              {current.title}
            </Text>
            <Text style={[styles.body, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              {current.body}
            </Text>
          </ScrollView>

          {/* Optional CTA */}
          {current.cta_text ? (
            <Pressable
              onPress={handleCta}
              style={({ pressed }) => [
                styles.ctaBtn,
                { backgroundColor: c.brand, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.ctaBtnText, { fontFamily: typography.fontFamily.semibold }]}>
                {current.cta_text}
              </Text>
            </Pressable>
          ) : null}

          {/* Action row */}
          <View style={[styles.actionRow, { borderTopColor: c.border }]}>
            <Pressable
              onPress={() => snooze(current.id)}
              style={({ pressed }) => [styles.snoozeBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.snoozeTxt, { color: c.textDisabled, fontFamily: typography.fontFamily.medium }]}>
                Bugun ko'rsatma
              </Text>
            </Pressable>

            <Pressable
              onPress={() => dismiss(current.id)}
              style={({ pressed }) => [
                styles.dismissBtn,
                { backgroundColor: c.bgTertiary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.dismissTxt, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                Yopish
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         spacing.xl,
  },
  card: {
    width:        '100%',
    maxWidth:     340,
    borderRadius: radius['2xl'],
    borderWidth:  1,
    overflow:     'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top:      14,
    right:    14,
    zIndex:   10,
    padding:  4,
  },
  image: {
    width:  '100%',
    height: 160,
  },
  iconPlaceholder: {
    width:          '100%',
    height:         110,
    alignItems:     'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 44,
  },
  textScroll: {
    maxHeight: 200,
  },
  textContent: {
    padding: spacing.lg,
    gap:     spacing.xs,
  },
  title: {
    fontSize:   typography.size.lg,
    lineHeight: 26,
  },
  body: {
    fontSize:   typography.size.sm,
    lineHeight: 22,
    marginTop:  spacing.xs,
  },
  ctaBtn: {
    marginHorizontal: spacing.lg,
    marginBottom:     spacing.sm,
    height:           46,
    borderRadius:     radius.xl,
    alignItems:       'center',
    justifyContent:   'center',
  },
  ctaBtnText: {
    color:    '#fff',
    fontSize: typography.size.base,
  },
  actionRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
    gap:            spacing.sm,
  },
  snoozeBtn: {
    flex: 1,
  },
  snoozeTxt: {
    fontSize: typography.size.sm,
  },
  dismissBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.sm,
    borderRadius:      radius.lg,
  },
  dismissTxt: {
    fontSize: typography.size.sm,
  },
})

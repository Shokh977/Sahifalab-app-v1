import React, { useState } from 'react'
import {
  Modal, View, Text, Pressable, StyleSheet, Linking, ScrollView, Platform,
} from 'react-native'
import { Image } from 'expo-image'
import { X } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { useAnnouncementStore } from '../../stores/announcementStore'
import { typography, spacing, radius } from '../../lib/constants'

const TEXT_MAX_HEIGHT = 220

export function AnnouncementModal() {
  const { c } = useTheme()
  const current = useAnnouncementStore(s => s.current)
  const dismiss = useAnnouncementStore(s => s.dismiss)
  const snooze  = useAnnouncementStore(s => s.snooze)
  const [textScrollable, setTextScrollable] = useState(false)

  if (!current) return null

  const hasImage = !!current.image_url
  const hasCta   = !!(current.cta_text && current.cta_link)

  const handleCta = () => {
    if (current.cta_link) Linking.openURL(current.cta_link).catch(() => {})
    // CTA just opens the link + hides for today — NOT forever
    snooze(current.id)
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
        <Pressable style={[styles.card, { backgroundColor: c.bgSecondary }]} onPress={() => {}}>

          {/* ── Top: image or emoji placeholder ─────────────────────────── */}
          {hasImage ? (
            <View style={styles.imageWrap}>
              <Image
                source={{ uri: current.image_url! }}
                style={styles.image}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              {/* X overlaid on image */}
              <Pressable onPress={() => snooze(current.id)} hitSlop={12} style={styles.closeBtnOnImage}>
                <X size={15} color="#fff" strokeWidth={2.5} />
              </Pressable>
            </View>
          ) : (
            <View style={[styles.iconWrap, { backgroundColor: c.brandSubtle }]}>
              <Text style={styles.iconEmoji}>📢</Text>
              <Pressable onPress={() => snooze(current.id)} hitSlop={12} style={[styles.closeBtnPlain, { backgroundColor: c.bgTertiary }]}>
                <X size={15} color={c.textDisabled} strokeWidth={2} />
              </Pressable>
            </View>
          )}

          {/* ── Body text ────────────────────────────────────────────────── */}
          <View style={styles.textWrap}>
            <ScrollView
              style={styles.textScroll}
              contentContainerStyle={styles.textContent}
              showsVerticalScrollIndicator={textScrollable}
              nestedScrollEnabled
              scrollIndicatorInsets={{ right: 2 }}
              onContentSizeChange={(_w, h) => setTextScrollable(h > TEXT_MAX_HEIGHT)}
            >
              <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
                {current.title}
              </Text>
              <Text style={[styles.body, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                {current.body}
              </Text>
            </ScrollView>
            {textScrollable && (
              <View style={styles.fadeOverlay} pointerEvents="none">
                <View style={[styles.fadeBar, { backgroundColor: c.bgSecondary }]} />
              </View>
            )}
          </View>

          {/* ── CTA button (only when both text + link set) ──────────────── */}
          {hasCta && (
            <Pressable
              onPress={handleCta}
              style={({ pressed }) => [
                styles.ctaBtn,
                { backgroundColor: c.brand, opacity: pressed ? 0.82 : 1 },
              ]}
            >
              <Text style={[styles.ctaText, { fontFamily: typography.fontFamily.semibold }]}>
                {current.cta_text}
              </Text>
            </Pressable>
          )}

          {/* ── Action row ───────────────────────────────────────────────── */}
          <View style={[styles.actionRow, { borderTopColor: c.border }]}>
            <Pressable
              onPress={() => snooze(current.id)}
              style={({ pressed }) => [styles.snoozeBtn, { opacity: pressed ? 0.55 : 1 }]}
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         spacing.xl,
  },

  // No border — shadow gives depth without the border artefact around images
  card: {
    width:        '100%',
    maxWidth:     340,
    borderRadius: radius['2xl'],
    overflow:     'hidden',
    ...Platform.select({
      ios: {
        shadowColor:   '#000',
        shadowOffset:  { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius:  20,
      },
      android: { elevation: 12 },
    }),
  },

  // ── Image / placeholder ─────────────────────────────────────────────────────
  imageWrap: {
    width:  '100%',
    height: 180,
  },
  image: {
    width:  '100%',
    height: '100%',
  },
  closeBtnOnImage: {
    position:        'absolute',
    top:             12,
    right:           12,
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  iconWrap: {
    width:          '100%',
    height:         100,
    alignItems:     'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 40,
  },
  closeBtnPlain: {
    position:     'absolute',
    top:          12,
    right:        12,
    width:        28,
    height:       28,
    borderRadius: 14,
    alignItems:   'center',
    justifyContent: 'center',
  },

  // ── Text ────────────────────────────────────────────────────────────────────
  textWrap: {
    position: 'relative',
  },
  textScroll: {
    maxHeight: TEXT_MAX_HEIGHT,
  },
  textContent: {
    paddingHorizontal: spacing.lg,
    paddingTop:        spacing.md,
    paddingBottom:     spacing.lg,
    gap:               spacing.xs,
  },
  title: {
    fontSize:   typography.size.lg,
    lineHeight: 26,
  },
  body: {
    fontSize:   typography.size.sm,
    lineHeight: 22,
    marginTop:  4,
  },
  fadeOverlay: {
    position:       'absolute',
    bottom:         0,
    left:           0,
    right:          0,
    height:         28,
    justifyContent: 'flex-end',
    pointerEvents:  'none',
  },
  fadeBar: {
    height:  14,
    opacity: 0.9,
  },

  // ── CTA ─────────────────────────────────────────────────────────────────────
  ctaBtn: {
    marginHorizontal: spacing.lg,
    marginBottom:     spacing.sm,
    height:           46,
    borderRadius:     radius.xl,
    alignItems:       'center',
    justifyContent:   'center',
  },
  ctaText: {
    color:    '#fff',
    fontSize: typography.size.base,
  },

  // ── Action row ───────────────────────────────────────────────────────────────
  actionRow: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    borderTopWidth:    StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
    gap:               spacing.sm,
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

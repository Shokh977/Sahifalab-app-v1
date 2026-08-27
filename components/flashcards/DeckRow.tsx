/**
 * DeckRow — Mening kartalarim row (Kartalar redesign). Replaces the old
 * DeckCard's gradient banner with an accent spine + subject tile; the whole
 * row never grows past ~96px, title clamps at 2 lines.
 */
import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet, Modal, Animated as RNAnimated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Swipeable } from 'react-native-gesture-handler'
import { PencilSimple, Share, Trash, Check } from 'phosphor-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { kartalarColorsFor, kartalarCardShadow, subjectStyle } from './subjectTheme'
import { SubjectTile } from './SubjectTile'
import type { FlashcardDeck } from '../../lib/types'

const ROW_HEIGHT = 96
const MASTERED_THRESHOLD = 0.85

export function DeckRow({ deck, onPress, onEdit, onShare, onDelete }: {
  deck:     FlashcardDeck
  onPress:  () => void
  onEdit:   () => void
  onShare:  () => void
  onDelete: () => void
}) {
  const { theme } = useTheme()
  const kc = kartalarColorsFor(theme)
  const shadow = kartalarCardShadow(theme)
  const subject = subjectStyle(deck.category, deck.title, theme)

  const [sheetVisible, setSheetVisible] = useState(false)
  const [pressed, setPressed] = useState(false)
  let swipeRef: Swipeable | null = null

  const mastery = deck.card_count > 0 ? deck.mastered_count / deck.card_count : 0
  const isMastered = deck.card_count > 0 && mastery >= MASTERED_THRESHOLD
  const progressPct = Math.round(mastery * 100)

  const metaLine = deck.card_count === 0
    ? "hali boshlanmagan"
    : deck.due_count === 0 && deck.mastered_count > 0
      // No precise "studied today" flag on the deck record — a cleared due
      // queue with at least one mastered card is the closest honest signal.
      ? 'bugun tugallandi'
      : deck.due_count === 0
        ? "hali boshlanmagan"
        : `${deck.card_count} karta · ${deck.mastered_count} o'zlashtirilgan`

  const a11yLabel = `${deck.title}, ${deck.card_count} karta, ` +
    (deck.due_count > 0 ? `${deck.due_count} takrorlash kerak, ` : '') +
    `${progressPct} foiz`

  function closeSwipe() { swipeRef?.close() }

  function renderRightActions(_progress: RNAnimated.AnimatedInterpolation<number>, dragX: RNAnimated.AnimatedInterpolation<number>) {
    return (
      <View style={styles.swipeActions}>
        <SwipeAction icon={<PencilSimple size={18} color="#fff" weight="bold" />} label="Tahrirlash" bg={kc.textMutedStrong} onPress={() => { closeSwipe(); onEdit() }} dragX={dragX} />
        <SwipeAction icon={<Share size={18} color="#fff" weight="bold" />} label="Ulashish" bg={kc.accent} onPress={() => { closeSwipe(); onShare() }} dragX={dragX} />
        <SwipeAction icon={<Trash size={18} color="#fff" weight="bold" />} label="O'chirish" bg={kc.destructive} onPress={() => { closeSwipe(); onDelete() }} dragX={dragX} />
      </View>
    )
  }

  return (
    <>
      <Swipeable ref={r => { swipeRef = r }} renderRightActions={renderRightActions} overshootRight={false}>
        <Pressable
          onPress={onPress}
          onLongPress={() => setSheetVisible(true)}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
          style={[
            styles.row,
            { backgroundColor: kc.surface, minHeight: ROW_HEIGHT, transform: [{ scale: pressed ? 0.985 : 1 }] },
            shadow,
          ]}
        >
          <View style={[styles.spine, { backgroundColor: subject.color }]} />

          <SubjectTile color={subject.color} tint={subject.tint} glyph={subject.glyph} size={44} />

          <View style={styles.content}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: kc.textPrimary, fontFamily: typography.fontFamily.bold }]} numberOfLines={2}>
                {deck.title}
              </Text>
              {deck.due_count > 0 ? (
                <View style={[styles.pill, { backgroundColor: kc.accent }]}>
                  <Text style={[styles.pillText, { color: kc.onAccent, fontFamily: typography.fontFamily.bold }]}>
                    {deck.due_count > 99 ? '99+' : deck.due_count}
                  </Text>
                </View>
              ) : isMastered ? (
                <View style={[styles.pill, { backgroundColor: kc.greenTint }]}>
                  <Check size={11} color={kc.green} weight="bold" />
                </View>
              ) : null}
            </View>

            <Text style={[styles.meta, { color: kc.textMuted, fontFamily: typography.fontFamily.medium }]} numberOfLines={1}>
              {metaLine}
            </Text>

            {deck.card_count > 0 && (
              <View style={styles.progressRow}>
                <View style={[styles.progressTrack, { backgroundColor: kc.progressTrack }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progressPct}%` as any, backgroundColor: isMastered ? kc.green : subject.color },
                    ]}
                  />
                </View>
                <Text style={[styles.progressLabel, { color: kc.textMuted, fontFamily: typography.fontFamily.bold }]}>
                  {progressPct}%
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </Swipeable>

      <RowActionSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onEdit={onEdit}
        onShare={onShare}
        onDelete={onDelete}
      />
    </>
  )
}

function SwipeAction({ icon, label, bg, onPress, dragX }: {
  icon: React.ReactNode; label: string; bg: string; onPress: () => void
  dragX: RNAnimated.AnimatedInterpolation<number>
}) {
  return (
    <Pressable onPress={onPress} style={[styles.swipeAction, { backgroundColor: bg }]}>
      {icon}
      <Text style={styles.swipeActionLabel}>{label}</Text>
    </Pressable>
  )
}

function RowActionSheet({ visible, onClose, onEdit, onShare, onDelete }: {
  visible: boolean; onClose: () => void
  onEdit: () => void; onShare: () => void; onDelete: () => void
}) {
  const { theme } = useTheme()
  const kc = kartalarColorsFor(theme)
  const insets = useSafeAreaInsets()
  if (!visible) return null

  const act = (fn: () => void) => { onClose(); fn() }

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} statusBarTranslucent animationType="fade">
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: kc.surface, paddingBottom: insets.bottom + spacing.base }]}>
        <View style={[styles.sheetHandle, { backgroundColor: kc.hairline }]} />
        <SheetRow icon={<PencilSimple size={18} color={kc.textPrimary} />} label="Tahrirlash" color={kc.textPrimary} onPress={() => act(onEdit)} />
        <SheetRow icon={<Share size={18} color={kc.textPrimary} />} label="Ulashish" color={kc.textPrimary} onPress={() => act(onShare)} />
        <SheetRow icon={<Trash size={18} color={kc.destructive} />} label="O'chirish" color={kc.destructive} onPress={() => act(onDelete)} />
      </View>
    </Modal>
  )
}

function SheetRow({ icon, label, color, onPress }: { icon: React.ReactNode; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.sheetRow, pressed && { opacity: 0.6 }]}>
      {icon}
      <Text style={[styles.sheetRowLabel, { color, fontFamily: typography.fontFamily.semibold }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    borderRadius:       radius['3xl'] + 2,
    padding:            13,
    gap:                12,
    overflow:           'hidden',
    position:           'relative',
  },
  spine: {
    position:     'absolute',
    left:         0,
    top:          13,
    bottom:       13,
    width:        3,
    borderTopRightRadius:    3,
    borderBottomRightRadius: 3,
  },

  content: { flex: 1, gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title:    { flex: 1, fontSize: 13.5, lineHeight: 17.5 },

  pill: {
    flexShrink:        0,
    minWidth:          20,
    height:            20,
    borderRadius:      10,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 6,
  },
  pillText: { fontSize: 10 },

  meta: { fontSize: 11 },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 1 },
  progressTrack: { flex: 1, height: 5, borderRadius: radius.full, overflow: 'hidden' },
  progressFill:  { height: 5, borderRadius: radius.full },
  progressLabel: { fontSize: 10, minWidth: 28, textAlign: 'right' },

  // Swipe actions
  swipeActions: { flexDirection: 'row', alignItems: 'stretch' },
  swipeAction: {
    width:          72,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            4,
  },
  swipeActionLabel: { color: '#fff', fontSize: 9.5, fontWeight: '700' },

  // Long-press sheet
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 12, paddingHorizontal: spacing.base,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  sheetRowLabel: { fontSize: 14 },
})

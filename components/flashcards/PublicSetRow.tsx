/**
 * PublicSetRow — Ommaviy to'plamlar row (Kartalar redesign).
 *
 * PublicDeckItem (lib/types.ts) has no price field — every public deck is a
 * free clone today (already_cloned/clone_count, no purchase concept at all).
 * The "priced" and "downloading" visual states below are built per spec so
 * the row is ready the day a real price ships, but with today's data they
 * are unreachable — `priceTanga` is always undefined, never fabricated.
 * Insufficient-balance handling (a coin top-up sheet) is intentionally not
 * built for the same reason: there is no real path that can ever trigger it
 * yet, and a whole top-up flow for a charge that can't happen is exactly the
 * kind of speculative feature this app's own conventions warn against.
 */
import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { Cards, Star, Coins, Check } from 'phosphor-react-native'
import { typography, radius } from '../../lib/constants'
import { kartalarColorsFor, kartalarCardShadow, subjectStyle } from './subjectTheme'
import { useTheme } from '../../hooks/useTheme'
import { SubjectTile } from './SubjectTile'
import type { PublicDeckItem } from '../../lib/types'

export function PublicSetRow({ deck, priceTanga, onPress, onAcquire }: {
  deck:        PublicDeckItem
  priceTanga?: number   // always undefined today — see module docstring
  onPress:     () => void
  onAcquire:   () => Promise<void>
}) {
  const { theme } = useTheme()
  const kc = kartalarColorsFor(theme)
  const shadow = kartalarCardShadow(theme)
  const subject = subjectStyle(deck.category, deck.title, theme)

  const [owned, setOwned]         = useState(deck.already_cloned)
  const [acquiring, setAcquiring] = useState(false)

  const authorLabel = deck.creator?.name ?? 'Anonim'
  const ratingLabel = deck.rating_count > 0 ? `★ ${deck.rating_avg.toFixed(1)}` : 'yangi'

  async function handleAcquire() {
    if (owned || acquiring) return
    setAcquiring(true)
    const prevOwned = owned
    setOwned(true) // optimistic
    try {
      await onAcquire()
    } catch (e: any) {
      setOwned(prevOwned) // rollback
      Alert.alert('Xatolik', e?.message ?? "To'plamni olishda xatolik yuz berdi")
    } finally {
      setAcquiring(false)
    }
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${deck.title}, ${authorLabel}, ${deck.card_count} karta`}
      style={[styles.row, { backgroundColor: kc.surface }, shadow]}
    >
      <SubjectTile color={subject.color} tint={subject.tint} glyph={subject.glyph} size={46} />

      <View style={styles.content}>
        <Text style={[styles.title, { color: kc.textPrimary, fontFamily: typography.fontFamily.bold }]} numberOfLines={2}>
          {deck.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.metaAuthor, { color: kc.accent, fontFamily: typography.fontFamily.semibold }]} numberOfLines={1}>
            {authorLabel}
          </Text>
          <Text style={[styles.metaDot, { color: kc.textMuted }]}>·</Text>
          <Cards size={11} color={kc.textMuted} />
          <Text style={[styles.metaText, { color: kc.textMuted, fontFamily: typography.fontFamily.medium }]}>
            {deck.card_count} karta
          </Text>
          <Text style={[styles.metaDot, { color: kc.textMuted }]}>·</Text>
          <Text style={[styles.metaText, { color: deck.rating_count > 0 ? kc.accent : kc.textMuted, fontFamily: typography.fontFamily.semibold }]}>
            {ratingLabel}
          </Text>
        </View>
      </View>

      <RightAction
        owned={owned}
        acquiring={acquiring}
        priceTanga={priceTanga}
        onPress={handleAcquire}
        kc={kc}
      />
    </Pressable>
  )
}

function RightAction({ owned, acquiring, priceTanga, onPress, kc }: {
  owned: boolean; acquiring: boolean; priceTanga?: number
  onPress: () => void
  kc: ReturnType<typeof kartalarColorsFor>
}) {
  if (owned) {
    return (
      <View style={[styles.actionBtn, { backgroundColor: kc.greenTint }]}>
        <Text style={[styles.actionLabel, { color: kc.green, fontFamily: typography.fontFamily.bold }]}>Olindi</Text>
      </View>
    )
  }

  if (acquiring) {
    return (
      <View style={[styles.actionBtn, { backgroundColor: kc.accentTint }]}>
        <ActivityIndicator size="small" color={kc.accent} />
      </View>
    )
  }

  if (priceTanga != null && priceTanga > 0) {
    return (
      <Pressable onPress={onPress} hitSlop={4} style={[styles.actionBtn, styles.actionBtnFilled, { backgroundColor: kc.accent }]}>
        <Coins size={13} color={kc.onAccent} weight="fill" />
        <Text style={[styles.actionLabel, { color: kc.onAccent, fontFamily: typography.fontFamily.bold }]}>{priceTanga}</Text>
      </Pressable>
    )
  }

  return (
    <Pressable onPress={onPress} hitSlop={4} style={[styles.actionBtn, styles.actionBtnOutlined, { borderColor: kc.accent }]}>
      <Text style={[styles.actionLabel, { color: kc.accent, fontFamily: typography.fontFamily.bold }]}>Olish</Text>
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
  },
  content: { flex: 1, gap: 5 },
  title:   { fontSize: 13.5, lineHeight: 17.5 },

  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  metaAuthor:  { fontSize: 11, flexShrink: 1, maxWidth: 100 },
  metaDot:     { fontSize: 11 },
  metaText:    { fontSize: 11 },

  actionBtn: {
    flexShrink:        0,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               4,
    borderRadius:      radius.xl,
    paddingVertical:   9,
    paddingHorizontal: 13,
    minWidth:          64,
    minHeight:         36,
  },
  actionBtnOutlined: { borderWidth: 1.5 },
  actionBtnFilled:   {},
  actionLabel: { fontSize: 11.5 },
})

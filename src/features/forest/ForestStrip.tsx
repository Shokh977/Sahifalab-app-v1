/**
 * The profile's O'rmon strip: "O'rmon · N daraxt ›" and a row of small tree
 * cards bleeding off the right edge — "Hozir" (the live streak, in the
 * profile's tree look) first, then finished streaks newest first. Trees are
 * still (static SVG), so the row costs nothing to scroll. The header and the
 * cards open the O'rmon screen.
 */
import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { MagicTree } from '../../../components/streak/MagicTree'
import type { TreeLook } from '../../../lib/treeLooks'
import { useTheme } from '../../design/ThemeProvider'
import { layout, space } from '../../design/spacing'
import { fonts, tabular } from '../../design/typography'
import { Pressable } from '../../components/ui'
import { monthLabel, treeStage, type ForestTree } from './forest'

const CARD_W = 78
const CARD_H = 116
const TREE_W = 56
const THUMB = { w: 80, h: 100 }   // MagicTree "thumb", scaled to TREE_W

export function MiniTree({ days, look = 'tabiiy', uid, width = TREE_W }: {
  days: number; look?: TreeLook; uid: string; width?: number
}) {
  const scale = width / THUMB.w
  const h = THUMB.h * scale
  return (
    <View style={{ width, height: h }}>
      <View style={{ position: 'absolute', width: THUMB.w, height: THUMB.h, left: (width - THUMB.w) / 2, top: (h - THUMB.h) / 2, transform: [{ scale }] }}>
        <MagicTree stage={treeStage(Math.max(days, 0))} size="thumb" look={look} uid={uid} animate={false} simplified />
      </View>
    </View>
  )
}

export function ForestStrip({ trees, currentStreak, look, onOpen, idPrefix }: {
  trees: ForestTree[]
  currentStreak: number
  look: TreeLook
  onOpen: () => void
  /** Keeps SVG gradient ids unique when two profiles are mounted. */
  idPrefix: string
}) {
  const { colors } = useTheme()
  const count = trees.length + (currentStreak > 0 ? 1 : 0)

  return (
    <View style={styles.root}>
      <Pressable noFeedback onPress={onOpen} accessibilityLabel={`Oʻrmon, ${count} ta daraxt`} style={styles.head}>
        <Text style={[styles.title, { color: colors.text }]}>Oʻrmon</Text>
        <View style={styles.link}>
          <Text style={[styles.linkText, { color: colors.accentText }]}>{count} daraxt</Text>
          <ChevronRight size={16} color={colors.accentText} />
        </View>
      </Pressable>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.bleed}>
        <Pressable
          onPress={onOpen}
          accessibilityLabel={`Hozirgi daraxt, ${currentStreak} kun`}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.orangeLine, borderWidth: 1.5 }]}
        >
          <MiniTree days={currentStreak} look={look} uid={`${idPrefix}-now`} />
          <Text style={[styles.days, { color: colors.accentText }]}>Hozir</Text>
          <Text style={[styles.sub, tabular, { color: colors.textMuted }]}>{currentStreak} kun</Text>
        </Pressable>
        {trees.map(t => (
          <Pressable
            key={t.end}
            onPress={onOpen}
            accessibilityLabel={`${t.days} kunlik seriya, ${monthLabel(t.end)}`}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <MiniTree days={t.days} uid={`${idPrefix}-${t.end}`} />
            <Text style={[styles.days, tabular, { color: colors.text }]}>{t.days} kun</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>{monthLabel(t.end)}</Text>
          </Pressable>
        ))}
        {trees.length === 0 && (
          <View style={[styles.hint, { backgroundColor: colors.surfaceRaised }]}>
            <Text style={[styles.sub, { color: colors.textMuted }]}>
              3+ kunlik har bir seriya oʻrmonda daraxt boʻlib qoladi
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.extrabold, fontSize: 21 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkText: { fontFamily: fonts.bold, fontSize: 15 },
  bleed: { marginRight: -layout.gutter },
  row: { gap: 10, paddingRight: layout.gutter },
  card: { width: CARD_W, height: CARD_H, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: space.xs },
  days: { fontFamily: fonts.bold, fontSize: 13, marginTop: 2 },
  sub: { fontFamily: fonts.medium, fontSize: 11 },
  hint: { width: 150, height: CARD_H, borderRadius: 18, padding: space.sm, justifyContent: 'center' },
})

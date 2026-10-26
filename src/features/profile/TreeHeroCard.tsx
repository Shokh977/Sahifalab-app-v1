/**
 * The profile's hero tree card: streak and stage with the tree look chip,
 * the streak tree (MagicTree in the profile's colour look, still: like on
 * Bugun, the animated SVG tree is too costly here) in a softly lit well,
 * and progress to the next stage. On someone else's profile the
 * chip opens "Bu ko'rinishni oling".
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Flame } from 'lucide-react-native'
import { Canvas, RadialGradient, Rect, vec } from '@shopify/react-native-skia'
import { MagicTree } from '../../../components/streak/MagicTree'
import { TREE_STAGES, stageFromStreak, type TreeState } from '../../../lib/treeTheme'
import { treeLookPalette, type TreeLook } from '../../../lib/treeLooks'
import { useTheme } from '../../design/ThemeProvider'
import { radius, space } from '../../design/spacing'
import { fonts, tabular, type as typeScale } from '../../design/typography'
import { Pressable, ProgressBar } from '../../components/ui'
import { uzText } from '../today/today'
import { RARITY_COLOR, RARITY_LABEL, TREES } from './cosmetics/cosmetics'

const WELL_H = 300
const TREE_W = 232
const HERO = { w: 280, h: 350 }   // MagicTree "hero" size, scaled down to TREE_W

/** Light / dark well colour for Tabiiy at the centre of the radial light. */
const WELL = { light: '#E3F3E6', dark: '#1B2B22' }

export function TreeHeroCard({ streak, state = 'alive', uid, look = 'tabiiy', onLookPress }: {
  streak: number
  state?: TreeState
  uid: string
  look?: TreeLook
  onLookPress?: () => void
}) {
  const { colors, scheme, elevation } = useTheme()
  const stage = stageFromStreak(streak)
  const cur = TREE_STAGES.find(s => s.id === stage)
  const next = TREE_STAGES.find(s => s.id === stage + 1)
  const progress = next && cur ? (streak - cur.streakDays) / (next.streakDays - cur.streakDays) : 1
  const scale = TREE_W / HERO.w
  const [wellW, setWellW] = React.useState(0)
  const item = TREES[look]
  const rarity = RARITY_COLOR[scheme][item.rarity]
  // A look's well takes its glow colour, softened toward the card.
  const well = look === 'tabiiy' ? WELL[scheme] : treeLookPalette(look, stage).glow + (scheme === 'dark' ? '33' : '55')

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, elevation]}>
      <View style={styles.head}>
      <View
        accessible
        accessibilityLabel={`${streak} kunlik seriya, ${uzText(cur?.short ?? '')}, ${stage}-bosqich`}
      >
        <View style={styles.streakRow}>
          <Text style={[styles.streak, tabular, { color: colors.text }]}>{streak}</Text>
          <Text style={[styles.kun, { color: colors.text }]}>kun</Text>
          <Flame size={20} color={colors.accent} fill={colors.accent} strokeWidth={1.5} />
        </View>
        <Text style={[styles.stage, { color: colors.textMuted }]}>{uzText(cur?.short ?? '')} · {stage}-bosqich</Text>
      </View>
      <Pressable
        onPress={onLookPress}
        disabled={!onLookPress || look === 'tabiiy'}
        noFeedback={!onLookPress}
        accessibilityLabel={`Daraxt koʻrinishi: ${item.name}, ${RARITY_LABEL[item.rarity]}`}
        style={[
          styles.lookChip,
          look === 'tabiiy'
            ? { backgroundColor: colors.surfaceRaised }
            : { backgroundColor: rarity + (scheme === 'dark' ? '24' : '14') },
        ]}
      >
        <View style={[styles.lookDot, { backgroundColor: look === 'tabiiy' ? colors.textMuted : rarity }]} />
        <Text style={[styles.lookText, { color: look === 'tabiiy' ? colors.textMuted : rarity }]}>{item.name}</Text>
      </Pressable>
      </View>

      <View style={styles.well} onLayout={e => setWellW(e.nativeEvent.layout.width)}>
        {wellW > 0 && (
          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            <Rect x={0} y={0} width={wellW} height={WELL_H}>
              <RadialGradient
                c={vec(wellW / 2, WELL_H * 0.46)}
                r={Math.max(wellW * 0.6, WELL_H * 0.58)}
                colors={[well, colors.surface]}
              />
            </Rect>
          </Canvas>
        )}
        <View style={{ width: TREE_W, height: HERO.h * scale }}>
          <View style={[styles.tree, { left: (TREE_W - HERO.w) / 2, top: (HERO.h * scale - HERO.h) / 2, transform: [{ scale }] }]}>
            <MagicTree stage={stage} state={state} size="hero" uid={uid} animate={false} look={look} />
          </View>
        </View>
      </View>

      {next ? (
        <View style={styles.footer}>
          <View style={styles.footRow}>
            <Text style={[typeScale.label, styles.footLabel, { color: colors.text }]}>{uzText(next.short)} gacha</Text>
            <Text style={[typeScale.label, tabular, { color: colors.textMuted }]}>{next.streakDays - streak} kun</Text>
          </View>
          <ProgressBar
            value={progress}
            thickness="thick"
            accessibilityLabel={`${uzText(next.short)} bosqichigacha ${next.streakDays - streak} kun`}
          />
        </View>
      ) : (
        <Text style={[typeScale.label, { color: colors.textMuted }]}>Eng yuqori bosqich</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 28, borderWidth: 1, padding: 18, gap: space.md, overflow: 'hidden' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.sm },
  lookChip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, borderRadius: 15, paddingHorizontal: space.sm },
  lookDot: { width: 7, height: 7, borderRadius: 4 },
  lookText: { fontFamily: fonts.bold, fontSize: 13 },
  streakRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xxs + 2 },
  streak: { fontFamily: fonts.extrabold, fontSize: 34, lineHeight: 40 },
  kun: { fontFamily: fonts.bold, fontSize: 17 },
  stage: { fontFamily: fonts.semibold, fontSize: 15, marginTop: 2 },
  well: {
    height: WELL_H, borderRadius: radius.lg + 2, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'flex-end',
  },
  tree: { position: 'absolute', width: HERO.w, height: HERO.h },
  footer: { gap: space.xs },
  footRow: { flexDirection: 'row', justifyContent: 'space-between' },
  footLabel: { fontFamily: fonts.semibold },
})

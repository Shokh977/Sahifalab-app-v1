/**
 * The profile's hero tree card: streak and stage, the streak tree in a
 * softly lit well, and progress to the next stage. The tree is the
 * existing MagicTree (tree looks come later).
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Flame } from 'lucide-react-native'
import { Canvas, RadialGradient, Rect, vec } from '@shopify/react-native-skia'
import { MagicTree } from '../../../components/streak/MagicTree'
import { TREE_STAGES, stageFromStreak, type TreeState } from '../../../lib/treeTheme'
import { useTheme } from '../../design/ThemeProvider'
import { radius, space } from '../../design/spacing'
import { fonts, tabular, type as typeScale } from '../../design/typography'
import { ProgressBar } from '../../components/ui'
import { uzText } from '../today/today'

const WELL_H = 300
const TREE_W = 232
const HERO = { w: 280, h: 350 }   // MagicTree "hero" size, scaled down to TREE_W

/** Light / dark well colour at the centre of the radial light. */
const WELL = { light: '#E3F3E6', dark: '#1B2B22' }

export function TreeHeroCard({ streak, state = 'alive', uid, animate = true }: {
  streak: number
  state?: TreeState
  uid: string
  animate?: boolean
}) {
  const { colors, scheme, elevation } = useTheme()
  const stage = stageFromStreak(streak)
  const cur = TREE_STAGES.find(s => s.id === stage)
  const next = TREE_STAGES.find(s => s.id === stage + 1)
  const progress = next && cur ? (streak - cur.streakDays) / (next.streakDays - cur.streakDays) : 1
  const scale = TREE_W / HERO.w
  const [wellW, setWellW] = React.useState(0)

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, elevation]}>
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

      <View style={styles.well} onLayout={e => setWellW(e.nativeEvent.layout.width)}>
        {wellW > 0 && (
          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            <Rect x={0} y={0} width={wellW} height={WELL_H}>
              <RadialGradient
                c={vec(wellW / 2, WELL_H * 0.46)}
                r={Math.max(wellW * 0.6, WELL_H * 0.58)}
                colors={[WELL[scheme], colors.surface]}
              />
            </Rect>
          </Canvas>
        )}
        <View style={{ width: TREE_W, height: HERO.h * scale }}>
          <View style={[styles.tree, { left: (TREE_W - HERO.w) / 2, top: (HERO.h * scale - HERO.h) / 2, transform: [{ scale }] }]}>
            <MagicTree stage={stage} state={state} size="hero" uid={uid} animate={animate} />
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

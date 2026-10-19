/**
 * "Daraxt yoʻli" — the ten tree stages, moved from the old tree-stages
 * screen into Seriya (redesign Phase 5). Same MagicTree art and
 * TREE_STAGES; the current stage is outlined, locked ones show their
 * withered tree with a lock (readable, not faded out).
 */
import React, { useEffect, useState } from 'react'
import { InteractionManager, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import { Lock } from 'lucide-react-native'
import { MagicTree } from '../../../components/streak/MagicTree'
import { TREE_STAGES, stageFromStreak } from '../../../lib/treeTheme'
import { useTheme } from '../../design/ThemeProvider'
import { avatarSize, iconSize, iconStroke, radius, space } from '../../design/spacing'
import { tabular, type as typeScale } from '../../design/typography'
import { uzText } from '../today/today'

/** MagicTree "thumb" size: 80 × 100. */
const TREE_W = avatarSize.xl
const TREE_H = avatarSize.xl + space.lg

export function TreeStagesSection({ streakDays, onLayout }: { streakDays: number; onLayout?: (e: LayoutChangeEvent) => void }) {
  const { colors } = useTheme()
  const current = stageFromStreak(streakDays)
  const currentMeta = TREE_STAGES[current - 1]
  const next = current < 10 ? TREE_STAGES[current] : null

  // Ten SVG trees are heavy: draw them after the screen's push settles.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setReady(true))
    return () => task.cancel()
  }, [])

  return (
    <View style={styles.section} onLayout={onLayout}>
      <Text style={[typeScale.title2, { color: colors.text }]} accessibilityRole="header">Daraxt yoʻli</Text>
      <Text style={[typeScale.callout, { color: colors.textMuted }]}>Seriyangizni oshiring — barcha 10 shaklni oching.</Text>

      <View style={styles.grid}>
        {TREE_STAGES.map(s => {
          const locked = s.id > current
          const isCurrent = s.id === current
          return (
            <View
              key={s.id}
              accessible
              accessibilityLabel={`${s.id}-bosqich, ${uzText(s.name)}, ${s.days}${locked ? ', yopiq' : isCurrent ? ', hozirgi' : ''}`}
              style={[
                styles.cell,
                {
                  backgroundColor: isCurrent ? colors.accentSoft : colors.surface,
                  borderColor: isCurrent ? colors.accent : colors.border,
                  borderWidth: isCurrent ? 1.5 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View style={[styles.num, { backgroundColor: isCurrent ? colors.surface : colors.surfaceRaised }]}>
                <Text style={[typeScale.caption, tabular, { color: isCurrent ? colors.accentText : colors.textMuted }]}>{s.id}</Text>
              </View>
              <View style={styles.tree}>
                {ready
                  ? <MagicTree stage={s.id} state={locked ? 'dead' : 'alive'} size="thumb" uid={`ts_${s.id}`} animate={false} />
                  : <View style={styles.tree} />}
                {locked && (
                  <View style={[styles.lock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Lock size={iconSize.sm - 6} color={colors.textMuted} strokeWidth={iconStroke} />
                  </View>
                )}
              </View>
              <Text style={[typeScale.callout, { color: locked ? colors.textMuted : colors.text }]} numberOfLines={1}>{uzText(s.short)}</Text>
              <Text style={[typeScale.caption, { color: locked ? colors.textMuted : colors.successText }]}>{s.days}</Text>
            </View>
          )
        })}
      </View>

      <View style={[styles.hint, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[typeScale.body, styles.center, { color: colors.text }]}>
          Hozir: <Text style={{ color: colors.accentText }}>{current}-bosqich · {uzText(currentMeta.name)}</Text>
        </Text>
        {next && (
          <Text style={[typeScale.callout, styles.center, { color: colors.textMuted }]}>
            Keyingisi: {uzText(next.name)} — {next.days}dan
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: {
    width: '47%',
    flexGrow: 1,
    borderRadius: radius.lg,
    alignItems: 'center',
    paddingVertical: space.md,
    paddingHorizontal: space.xs,
    gap: space.xxs + 2,
  },
  num: { minWidth: space.lg + 2, height: space.lg + 2, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  tree: { width: TREE_W, height: TREE_H },
  lock: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderRadius: radius.full,
    borderWidth: 1,
    padding: space.xxs,
  },
  hint: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: space.md, gap: space.xxs },
  center: { textAlign: 'center' },
})

/**
 * O'rmon — a user's forest: the live streak's tree in front, then every
 * finished streak of 3+ days, kept at the stage it reached. Stats on top
 * (daraxtlar, eng uzun seriya, jami kunlar); "Manzara" shows the trees
 * standing in a landscape, "Roʻyxat" as a grid. Renders in the owner's app
 * theme, like their profile. Open to everyone (free, and public).
 */
import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuthStore } from '../../../stores/authStore'
import { useProfileStore } from '../../../stores/profileStore'
import type { ProfileData } from '../../../lib/types'
import { ThemeProvider, useTheme } from '../../../src/design/ThemeProvider'
import { layout, radius, space } from '../../../src/design/spacing'
import { fonts, tabular, type as typeScale } from '../../../src/design/typography'
import { ScreenHeader, SegmentedControl, SkeletonBlock } from '../../../src/components/ui'
import { uzText } from '../../../src/features/today/today'
import { MiniTree } from '../../../src/features/forest/ForestStrip'
import { monthLabel, treeStage, type ForestTree } from '../../../src/features/forest/forest'
import { themeKind, treeLookKind } from '../../../src/features/profile/cosmetics/cosmetics'
import { TREE_STAGES } from '../../../lib/treeTheme'

const VIEWS = ['Manzara', 'Roʻyxat'] as const
const LAND_H = 300

export default function ForestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const me = useAuthStore(s => s.user?.telegram_id)
  const own = useProfileStore(s => s.ownProfile) as ProfileData | null
  const cached = useProfileStore(s => s.cache[Number(id)]?.data ?? null)
  const loadPublicProfile = useProfileStore(s => s.loadPublicProfile)
  const isOwn = !!me && Number(id) === me
  const p = isOwn ? own : cached

  useEffect(() => {
    if (!p && id && !isOwn) loadPublicProfile(id).catch(() => {})
  }, [p, id, isOwn, loadPublicProfile])

  return (
    <ThemeProvider themeId={themeKind(p?.look?.theme)}>
      <ForestBody p={p} isOwn={isOwn} />
    </ThemeProvider>
  )
}

function ForestBody({ p, isOwn }: { p: ProfileData | null; isOwn: boolean }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const [view, setView] = useState(0)

  const trees: ForestTree[] = p?.forest ?? []
  const streak = p?.streak_days ?? 0
  const stats = p?.forest_stats ?? { trees: trees.length + (streak > 0 ? 1 : 0), longest: streak, total_days: streak }
  const look = treeLookKind(p?.look?.tree)
  const title = isOwn || !p ? 'Oʻrmon' : `${uzText(p.first_name)} oʻrmoni`
  const empty = trees.length === 0 && streak === 0

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={title} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.xxl }]}>
        {!p ? (
          <SkeletonBlock height={LAND_H} borderRadius={24} />
        ) : (
          <>
            <View style={styles.stats}>
              {[
                [String(stats.trees), 'daraxt'],
                [String(stats.longest), 'eng uzun seriya'],
                [String(stats.total_days), 'jami kun'],
              ].map(([value, label]) => (
                <View key={label} style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.statValue, tabular, { color: colors.text }]}>{value}</Text>
                  <Text style={[typeScale.callout, { color: colors.textMuted }]}>{label}</Text>
                </View>
              ))}
            </View>

            {empty ? (
              <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MiniTree days={0} uid="forest-empty" width={90} />
                <Text style={[typeScale.headline, styles.center, { color: colors.text }]}>Oʻrmon hali boʻsh</Text>
                <Text style={[typeScale.body, styles.center, { color: colors.textMuted }]}>
                  3 kun ketma-ket maqsadga yeting — har bir seriya shu yerda daraxt boʻlib qoladi.
                </Text>
              </View>
            ) : (
              <>
                <SegmentedControl segments={VIEWS} index={view} onChange={setView} size="md" />
                {view === 0
                  ? <Landscape trees={trees} streak={streak} look={look} width={width - layout.gutter * 2} />
                  : <Grid trees={trees} streak={streak} look={look} width={width - layout.gutter * 2} />}
              </>
            )}

            {!empty && (
              <Text style={[typeScale.callout, styles.center, { color: colors.textMuted }]}>
                3+ kunlik har bir seriya — bitta daraxt. Seriya tugasa ham, daraxti shu yerda qoladi.
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  )
}

/** Trees standing in a scrollable landscape: the live tree first and largest. */
function Landscape({ trees, streak, look, width }: { trees: ForestTree[]; streak: number; look: ReturnType<typeof treeLookKind>; width: number }) {
  const { colors, treeTile, scheme } = useTheme()
  const sky = treeTile ? [treeTile[1], treeTile[0]] as const : [colors.surfaceRaised, colors.surface] as const
  const ground = scheme === 'dark' ? ['#1E3326', '#142219'] as const : ['#CFE6B8', '#A9D08E'] as const
  const items = [
    ...(streak > 0 ? [{ key: 'now', days: streak, label: 'Hozir', sub: `${streak} kun`, now: true }] : []),
    ...trees.map(t => ({ key: t.end, days: t.days, label: `${t.days} kun`, sub: monthLabel(t.end), now: false })),
  ]
  return (
    <View style={[styles.land, { width, height: LAND_H, borderColor: colors.border }]}>
      <LinearGradient colors={sky} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={ground} style={styles.ground} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.landRow}>
        {items.map(it => {
          const stage = treeStage(it.days)
          const w = (it.now ? 120 : 64) + stage * (it.now ? 6 : 7)
          return (
            <View key={it.key} style={styles.standing} accessible accessibilityLabel={`${it.label}, ${it.sub}`}>
              <MiniTree days={it.days} look={it.now ? look : 'tabiiy'} uid={`land-${it.key}`} width={w} />
              <View style={[styles.plaque, { backgroundColor: colors.surface + 'E6', borderColor: it.now ? colors.orangeLine : colors.border }]}>
                <Text style={[styles.plaqueText, tabular, { color: it.now ? colors.accentText : colors.text }]}>{it.label}</Text>
                <Text style={[styles.plaqueSub, { color: colors.textMuted }]}>{it.sub}</Text>
              </View>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

function Grid({ trees, streak, look, width }: { trees: ForestTree[]; streak: number; look: ReturnType<typeof treeLookKind>; width: number }) {
  const { colors } = useTheme()
  const cellW = (width - space.sm * 2) / 3
  const items = [
    ...(streak > 0 ? [{ key: 'now', days: streak, top: 'Hozir', sub: `${streak} kun`, now: true }] : []),
    ...trees.map(t => ({ key: t.end, days: t.days, top: `${t.days} kun`, sub: monthLabel(t.end), now: false })),
  ]
  return (
    <View style={styles.grid}>
      {items.map(it => (
        <View
          key={it.key}
          accessible
          accessibilityLabel={`${it.top}, ${it.sub}`}
          style={[styles.cell, { width: cellW, backgroundColor: colors.surface, borderColor: it.now ? colors.orangeLine : colors.border }]}
        >
          <MiniTree days={it.days} look={it.now ? look : 'tabiiy'} uid={`grid-${it.key}`} width={cellW * 0.7} />
          <Text style={[styles.plaqueText, tabular, { color: it.now ? colors.accentText : colors.text }]}>{it.top}</Text>
          <Text style={[styles.plaqueSub, { color: colors.textMuted }]} numberOfLines={1}>
            {uzText(TREE_STAGES.find(s => s.id === treeStage(it.days))?.short ?? '')} · {it.sub}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { textAlign: 'center' },
  body: { paddingHorizontal: layout.gutter, gap: space.md },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, borderRadius: 18, borderWidth: 1, padding: space.sm + 2, gap: 2 },
  statValue: { fontFamily: fonts.extrabold, fontSize: 22 },
  empty: { borderRadius: 24, borderWidth: 1, padding: space.lg, alignItems: 'center', gap: space.sm },
  land: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 64 },
  landRow: { alignItems: 'flex-end', gap: space.sm, paddingHorizontal: space.md, paddingBottom: space.sm, minHeight: LAND_H },
  standing: { alignItems: 'center' },
  plaque: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, alignItems: 'center', marginTop: -4 },
  plaqueText: { fontFamily: fonts.bold, fontSize: 12 },
  plaqueSub: { fontFamily: fonts.medium, fontSize: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: { borderRadius: 18, borderWidth: 1, alignItems: 'center', paddingVertical: space.sm, gap: 2 },
})

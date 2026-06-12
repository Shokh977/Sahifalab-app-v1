import React, { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { MagicTree } from '../../components/streak/MagicTree'
import { TREE_STAGES } from '../../lib/treeTheme'
import type { StageNumber, TreeState, TreeSize } from '../../lib/treeTheme'
import { typography, spacing, radius } from '../../lib/constants'

const STATES: { value: TreeState; label: string; color: string }[] = [
  { value: 'alive',  label: 'Alive',   color: '#46c08a' },
  { value: 'frozen', label: 'Frozen',  color: '#58b6ff' },
  { value: 'dead',   label: 'Dead',    color: '#aaaaaa' },
]

const SIZES: { value: TreeSize; label: string }[] = [
  { value: 'thumb', label: 'Thumb' },
  { value: 'card',  label: 'Card'  },
  { value: 'hero',  label: 'Hero'  },
]

export default function TreeTestScreen() {
  const { c } = useTheme()
  const router  = useRouter()
  const insets  = useSafeAreaInsets()

  const [state, setState] = useState<TreeState>('alive')
  const [size,  setSize]  = useState<TreeSize>('card')

  return (
    <View style={[s.screen, { backgroundColor: c.bgPrimary }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} style={s.back} hitSlop={10}>
          <ChevronLeft size={22} color={c.textPrimary} />
        </Pressable>
        <Text style={[s.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Tree Dev Preview
        </Text>
      </View>

      {/* Controls */}
      <View style={[s.controls, { borderBottomColor: c.border, backgroundColor: c.bgSecondary }]}>
        <View style={s.controlRow}>
          <Text style={[s.controlLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
            Holat
          </Text>
          <View style={s.pills}>
            {STATES.map(({ value, label, color }) => (
              <Pressable
                key={value}
                onPress={() => setState(value)}
                style={[
                  s.pill,
                  { borderColor: color },
                  state === value && { backgroundColor: color },
                ]}
              >
                <Text style={[
                  s.pillText,
                  { color: state === value ? '#fff' : color, fontFamily: typography.fontFamily.semibold },
                ]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={s.controlRow}>
          <Text style={[s.controlLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
            O'lcham
          </Text>
          <View style={s.pills}>
            {SIZES.map(({ value, label }) => (
              <Pressable
                key={value}
                onPress={() => setSize(value)}
                style={[
                  s.pill,
                  { borderColor: c.brand },
                  size === value && { backgroundColor: c.brand },
                ]}
              >
                <Text style={[
                  s.pillText,
                  { color: size === value ? '#fff' : c.brand, fontFamily: typography.fontFamily.semibold },
                ]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.grid, size === 'hero' && s.gridSingle]}>
          {TREE_STAGES.map(stage => (
            <View
              key={stage.id}
              style={[
                s.cell,
                size === 'hero' && s.cellHero,
                size === 'thumb' && s.cellThumb,
              ]}
            >
              <View style={[s.treeBg, { backgroundColor: '#0f1b30' }]}>
                <MagicTree
                  stage={stage.id as StageNumber}
                  state={state}
                  size={size}
                  uid={`dev_${stage.id}_${state}_${size}`}
                />
              </View>
              <View style={s.meta}>
                <Text style={[s.stageNum, { color: '#46c08a', fontFamily: typography.fontFamily.extrabold }]}>
                  {stage.id}
                </Text>
                <Text style={[s.stageName, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]} numberOfLines={1}>
                  {stage.short}
                </Text>
                <Text style={[s.stageDays, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                  {stage.days}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingBottom:     spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap:               spacing.sm,
  },
  back:  { padding: 4 },
  title: { fontSize: 16, flex: 1 },

  controls: {
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap:               spacing.sm,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
  },
  controlLabel: { fontSize: 12, width: 52 },
  pills: { flexDirection: 'row', gap: spacing.xs },
  pill: {
    borderWidth:       1,
    borderRadius:      radius.full,
    paddingHorizontal: 12,
    paddingVertical:   4,
  },
  pillText: { fontSize: 12 },

  scroll:     { padding: spacing.sm, gap: spacing.sm },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gridSingle: { flexDirection: 'column' },

  cell: {
    width:        '47%',
    borderRadius: radius.lg,
    alignItems:   'center',
    gap:          spacing.xs,
    paddingBottom: spacing.xs,
  },
  cellThumb: { width: '30%' },
  cellHero:  { width: '100%' },

  treeBg: {
    borderRadius: radius.md,
    alignItems:   'center',
    justifyContent: 'center',
  },

  meta: { alignItems: 'center', gap: 2 },
  stageNum:  { fontSize: 11 },
  stageName: { fontSize: 12, maxWidth: 120 },
  stageDays: { fontSize: 10 },
})

/**
 * Oak tree preview — the new Skia "Eman" streak tree at every stage and
 * state (dev builds only; release builds redirect to the tabs). Opened
 * from Settings under __DEV__.
 */
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Redirect } from 'expo-router'
import { useTheme } from '../../src/design/ThemeProvider'
import { layout, space } from '../../src/design/spacing'
import { type as typeScale } from '../../src/design/typography'
import { Chip, ScreenHeader } from '../../src/components/ui'
import { OakTree } from '../../components/streak/oak/OakTree'
import { OAK_STAGES, type OakStage, type OakState } from '../../components/streak/oak/oakGeometry'

const STATES: OakState[] = ['alive', 'frozen', 'dead']
const CARDS = [
  { bg: '#FFFFFF', label: 'Oq karta' },
  { bg: '#17171B', label: 'Qorongʻi karta' },
]

export default function OakTreePreview() {
  if (!__DEV__) return <Redirect href="/(tabs)" />
  return <PreviewBody />
}

function PreviewBody() {
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  const [stage, setStage] = useState<OakStage>(7)
  const [state, setState] = useState<OakState>('alive')
  const hero = Math.min(width - layout.gutter * 2, 360)

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScreenHeader title="Eman daraxti" />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.wrap}>
          {OAK_STAGES.map(s => <Chip key={s} label={String(s)} selected={s === stage} onPress={() => setStage(s)} />)}
        </View>
        <View style={styles.wrap}>
          {STATES.map(s => <Chip key={s} label={s} selected={s === state} onPress={() => setState(s)} />)}
        </View>

        <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <OakTree stage={stage} state={state} size={hero - space.md * 2} />
        </View>

        {CARDS.map(card => (
          <View key={card.bg} style={styles.section}>
            <Text style={[typeScale.overline, { color: colors.textMuted }]}>{card.label} · 100 / 56 px</Text>
            <View style={styles.wrap}>
              {OAK_STAGES.map(s => (
                <View key={s} style={[styles.tile, { backgroundColor: card.bg }]}>
                  <OakTree stage={s} state={state} size={100} />
                </View>
              ))}
            </View>
            <View style={styles.wrap}>
              {OAK_STAGES.map(s => (
                <View key={s} style={[styles.tile, { backgroundColor: card.bg }]}>
                  <OakTree stage={s} state={state} size={56} animate={false} />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: layout.gutter, paddingBottom: space.xxl, gap: layout.sectionGap },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  hero: { borderRadius: 28, borderWidth: 1, padding: space.md, alignItems: 'center' },
  section: { gap: layout.cardGap },
  tile: { borderRadius: 16, padding: 4 },
})

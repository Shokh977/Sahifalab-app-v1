/**
 * Cosmetics preview — every banner scene and avatar ring, animated and
 * still, at the profile, preview and thumbnail sizes (dev builds only;
 * release builds redirect to the tabs). Opened from Settings under __DEV__.
 */
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Redirect } from 'expo-router'
import { useTheme } from '../../src/design/ThemeProvider'
import { layout, space } from '../../src/design/spacing'
import { type as typeScale } from '../../src/design/typography'
import { Chip, ScreenHeader } from '../../src/components/ui'
import { BannerScene } from '../../src/features/profile/cosmetics/BannerScene'
import { AvatarRing } from '../../src/features/profile/cosmetics/AvatarRing'
import {
  BANNERS, RARITY_COLOR, RARITY_LABEL, RINGS, type BannerKind, type RingKind,
} from '../../src/features/profile/cosmetics/cosmetics'

const BANNER_KINDS = Object.keys(BANNERS) as BannerKind[]
const RING_KINDS = Object.keys(RINGS) as RingKind[]

export default function CosmeticsPreview() {
  if (!__DEV__) return <Redirect href="/(tabs)" />
  return <PreviewBody />
}

function PreviewBody() {
  const { colors, scheme } = useTheme()
  const { width } = useWindowDimensions()
  const [animated, setAnimated] = useState(true)
  const w = width - layout.gutter * 2

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScreenHeader title="Bezaklar" />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.wrap}>
          <Chip label="Jonli" selected={animated} onPress={() => setAnimated(true)} />
          <Chip label="Harakatsiz" selected={!animated} onPress={() => setAnimated(false)} />
        </View>

        <Text style={[typeScale.overline, { color: colors.textMuted }]}>Bannerlar</Text>
        {BANNER_KINDS.map(k => (
          <View key={k} style={styles.item}>
            <View style={styles.banner}>
              <BannerScene kind={k} width={w} height={w * 180 / 411} animated={animated} />
            </View>
            <Text style={[typeScale.label, { color: colors.text }]}>
              {BANNERS[k].name} · <Text style={{ color: RARITY_COLOR[scheme][BANNERS[k].rarity] }}>{RARITY_LABEL[BANNERS[k].rarity]}</Text>
            </Text>
          </View>
        ))}

        <Text style={[typeScale.overline, { color: colors.textMuted }]}>Halqalar · 120 / 88 / 60 / 40</Text>
        {RING_KINDS.map(k => (
          <View key={k} style={styles.item}>
            <View style={styles.rings}>
              {[120, 88, 60, 40].map(size => (
                <AvatarRing key={size} kind={k} size={size} name="Nigora" id={7} animated={animated} />
              ))}
            </View>
            <Text style={[typeScale.label, { color: colors.text }]}>
              {RINGS[k].name} · <Text style={{ color: RARITY_COLOR[scheme][RINGS[k].rarity] }}>{RARITY_LABEL[RINGS[k].rarity]}</Text>
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: layout.gutter, paddingBottom: space.xxl, gap: layout.cardGap },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  item: { gap: space.xs, marginBottom: space.sm },
  banner: { borderRadius: 20, overflow: 'hidden' },
  rings: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingVertical: space.sm, paddingLeft: space.xs },
})

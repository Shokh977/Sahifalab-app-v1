/**
 * Name styles preview (9-qadam §7) — every name colour on every theme
 * surface at 15 and 26 px, every badge at 14 / 16 / 22 px on light and dark,
 * moving and still, and a long Reyting-like list of Pro names to scroll
 * (dev builds only; release builds redirect to the tabs). Opened from
 * Settings under __DEV__.
 */
import React, { useEffect, useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { Redirect } from 'expo-router'
import { ThemeProvider, useTheme } from '../../src/design/ThemeProvider'
import { THEMES, THEME_IDS } from '../../src/design/themes'
import { layout, radius, space } from '../../src/design/spacing'
import { fonts, type as typeScale } from '../../src/design/typography'
import { Chip, ScreenHeader } from '../../src/components/ui'
import { ProName } from '../../src/features/profile/names/ProName'
import { NameBadge } from '../../src/features/profile/names/NameBadge'
import { NAME_STYLES, NAME_STYLE_IDS } from '../../src/features/profile/names/nameStyles'
import { useBadgeCatalog } from '../../src/features/profile/names/badgeCatalog'

// Every theme surface: Standart in both modes, the others in their own.
const SURFACES = THEME_IDS.flatMap(id =>
  THEMES[id].mode ? [{ id, scheme: THEMES[id].mode! }] : [{ id, scheme: 'light' as const }, { id, scheme: 'dark' as const }],
)
const NAMES = ['Nigora', 'Jasur Karimov', 'Madina', 'Otabek Nazarov', 'Dilnoza', 'Sardor', 'Aziza Tursunova', 'Bekzod']

export default function NameStylesPreview() {
  if (!__DEV__) return <Redirect href="/(tabs)" />
  return <PreviewBody />
}

type Section = 'colours' | 'badges' | 'list'

function PreviewBody() {
  const { colors } = useTheme()
  const [section, setSection] = useState<Section>('colours')
  const [animated, setAnimated] = useState(true)
  const order = useBadgeCatalog(s => s.order)
  useEffect(() => { useBadgeCatalog.getState().load() }, [])

  const header = (
    <View style={styles.head}>
      <View style={styles.wrap}>
        <Chip label="Ranglar" selected={section === 'colours'} onPress={() => setSection('colours')} />
        <Chip label="Belgilar" selected={section === 'badges'} onPress={() => setSection('badges')} />
        <Chip label="50 qator" selected={section === 'list'} onPress={() => setSection('list')} />
      </View>
      <View style={styles.wrap}>
        <Chip label="Jonli" selected={animated} onPress={() => setAnimated(true)} />
        <Chip label="Harakatsiz" selected={!animated} onPress={() => setAnimated(false)} />
      </View>
    </View>
  )

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScreenHeader title="Ism uslublari" />
      {section === 'list' ? (
        <ThemeProvider themeId="tun">
          <LongList header={header} animated={animated} badges={order} />
        </ThemeProvider>
      ) : (
        <FlatList
          data={SURFACES}
          keyExtractor={s => `${s.id}-${s.scheme}`}
          ListHeaderComponent={header}
          contentContainerStyle={styles.body}
          renderItem={({ item }) => (
            <ThemeProvider themeId={item.id} scheme={item.scheme}>
              {section === 'colours'
                ? <ColourCard label={`${THEMES[item.id].name} · ${item.scheme}`} animated={animated} />
                : <BadgeCard label={`${THEMES[item.id].name} · ${item.scheme}`} animated={animated} badges={order} />}
            </ThemeProvider>
          )}
        />
      )}
    </View>
  )
}

function ColourCard({ label, animated }: { label: string; animated: boolean }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[typeScale.overline, { color: colors.textMuted }]}>{label}</Text>
      {NAME_STYLE_IDS.map(id => (
        <View key={id} style={styles.line}>
          <Text style={[styles.tag, { color: colors.textMuted }]}>{NAME_STYLES[id].name}</Text>
          <View style={styles.flex}>
            <ProName text="Nigora Karimova" nameStyle={id} badge="toj" context="list" animated={animated}
              textStyle={{ fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.text }} />
          </View>
        </View>
      ))}
      <View style={[styles.siz, { backgroundColor: colors.accentSoft }]}>
        <ProName text="Siz" nameStyle="yaltiroq" badge="olmos" context="siz" animated={animated}
          textStyle={{ fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, color: colors.text }} />
      </View>
      <ProName text="Otabek Nazarov" nameStyle="shafaq" badge="alanga" context="profile" animated={animated}
        textStyle={{ fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, color: colors.text }} />
    </View>
  )
}

function BadgeCard({ label, animated, badges }: { label: string; animated: boolean; badges: string[] }) {
  const { colors, scheme } = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[typeScale.overline, { color: colors.textMuted }]}>{label}</Text>
      {[14, 16, 22].map(size => (
        <View key={size} style={styles.badgeRow}>
          <Text style={[styles.tag, { color: colors.textMuted }]}>{size} px</Text>
          {badges.map(id => <NameBadge key={id} id={id} size={size} surface={scheme} animated={animated} />)}
        </View>
      ))}
    </View>
  )
}

/** 50 rows, 20 of them Pro names, for a scroll check. */
function LongList({ header, animated, badges }: { header: React.ReactElement; animated: boolean; badges: string[] }) {
  const { colors } = useTheme()
  const rows = Array.from({ length: 50 }, (_, i) => ({
    i,
    name: NAMES[i % NAMES.length],
    style: i % 5 < 2 ? NAME_STYLE_IDS[1 + (i % (NAME_STYLE_IDS.length - 1))] : 'oddiy',
    badge: i % 5 < 2 && badges.length ? badges[i % badges.length] : null,
  }))
  return (
    <FlatList
      data={rows}
      keyExtractor={r => String(r.i)}
      ListHeaderComponent={header}
      contentContainerStyle={[styles.body, { backgroundColor: colors.bg }]}
      renderItem={({ item }) => (
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <Text style={[styles.rank, { color: colors.textMuted }]}>{item.i + 1}</Text>
          <View style={styles.flex}>
            <ProName text={item.name} nameStyle={item.style} badge={item.badge} context="list" animated={animated}
              textStyle={{ fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.text }} />
          </View>
          <Text style={[styles.rank, { color: colors.textMuted }]}>{2400 - item.i * 37}</Text>
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  body: { paddingHorizontal: layout.gutter, paddingBottom: space.xxl, gap: space.md },
  head: { gap: space.sm, paddingBottom: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: space.md, gap: space.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tag: { width: 64, fontFamily: fonts.medium, fontSize: 11 },
  siz: { borderRadius: radius.md, padding: space.sm },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  rank: { width: 40, fontFamily: fonts.semibold, fontSize: 13 },
})

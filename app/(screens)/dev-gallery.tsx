/**
 * Dev gallery — every redesign component in both themes (dev builds only;
 * release builds redirect to the tabs). Opened from Settings under __DEV__.
 */
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Redirect } from 'expo-router'
import { BookOpen, Flame, Inbox, Search, Settings2, Star } from 'lucide-react-native'
import { ThemeProvider, useTheme } from '../../src/design/ThemeProvider'
import { layout, space } from '../../src/design/spacing'
import { type as typeScale } from '../../src/design/typography'
import type { Scheme } from '../../src/design/tokens'
import {
  Avatar, Badge, Button, Card, EmptyState, ListRow, ScreenHeader, SkeletonBlock, SkeletonLine, SkeletonRow,
} from '../../src/components/ui'

const WIDE = 760

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme()
  return (
    <View style={styles.section}>
      <Text style={[typeScale.overline, { color: colors.textMuted }]}>{title}</Text>
      {children}
    </View>
  )
}

function Column() {
  const { colors, scheme } = useTheme()
  const [loading, setLoading] = useState(false)
  const noop = () => {}

  return (
    <View style={[styles.column, { backgroundColor: colors.bg }]}>
      <ScreenHeader
        title={scheme === 'dark' ? 'Qorongʻi' : 'Yorugʻ'}
        onBack={noop}
        actions={[{ icon: Search, onPress: noop, accessibilityLabel: 'Qidirish' }]}
        noInset
      />
      <View style={styles.body}>
        <Section title="Typography">
          <Text style={[typeScale.display, { color: colors.text }]}>Display</Text>
          <Text style={[typeScale.title1, { color: colors.text }]}>Title 1 — Oʻzbekcha</Text>
          <Text style={[typeScale.title2, { color: colors.text }]}>Title 2 — Ўзбекча</Text>
          <Text style={[typeScale.headline, { color: colors.text }]}>Headline gʻ oʻ Қ Ғ Ҳ Ў</Text>
          <Text style={[typeScale.body, { color: colors.textMuted }]}>Body: bugun 5 ta savolga javob bering.</Text>
          <Text style={[typeScale.callout, { color: colors.accentText }]}>Callout accentText</Text>
          <Text style={[typeScale.overline, { color: colors.textMuted }]}>Overline</Text>
        </Section>

        <Section title="Button">
          <View style={styles.wrap}>
            <Button label="Davom etish" onPress={noop} />
            <Button label="Bekor" variant="secondary" onPress={noop} />
            <Button label="Ghost" variant="ghost" onPress={noop} />
            <Button label="Oʻchirish" variant="destructive" onPress={noop} />
          </View>
          <View style={styles.wrap}>
            <Button label="Kichik" size="sm" icon={Star} onPress={noop} />
            <Button label="Katta" size="lg" onPress={noop} />
            <Button label="Oʻchiq" disabled onPress={noop} />
            <Button label="Yuklanmoqda" loading onPress={noop} />
          </View>
          <Button label="Toʻliq kenglik" fullWidth onPress={noop} />
        </Section>

        <Section title="Card">
          <Card><Text style={[typeScale.body, { color: colors.text }]}>Plain card</Text></Card>
          <Card variant="pressable" onPress={noop}><Text style={[typeScale.body, { color: colors.text }]}>Pressable card</Text></Card>
          <Card variant="hero">
            <Text style={[typeScale.title2, { color: colors.text }]}>Hero card</Text>
            <Text style={[typeScale.body, { color: colors.textMuted }]}>Bugungi maqsad: 20 daqiqa</Text>
          </Card>
          <Card variant="hero" loading />
        </Section>

        <Section title="ListRow">
          <ListRow title="Kurslar" subtitle="12 ta dars" leading={{ kind: 'icon', icon: BookOpen }} trailing={{ kind: 'chevron' }} onPress={noop} />
          <ListRow title="Gʻayrat Qodirov" subtitle="Ustoz" leading={{ kind: 'avatar', name: 'Gʻayrat Qodirov' }} trailing={{ kind: 'value', value: '1 240 XP' }} onPress={noop} />
          <ListRow title="Bildirishnomalar" leading={{ kind: 'icon', icon: Inbox }} trailing={{ kind: 'count', count: 7 }} onPress={noop} />
          <ListRow title="1-dars: Kirish" subtitle="Tugallangan" leading={{ kind: 'icon', icon: Flame }} done onPress={noop} />
          <ListRow title="" loading />
        </Section>

        <Section title="Skeleton">
          <SkeletonBlock height={space.huge} />
          <SkeletonLine width="80%" />
          <SkeletonRow />
          <Button label={loading ? 'Toʻxtatish' : 'Card skeleton'} size="sm" variant="secondary" onPress={() => setLoading(v => !v)} />
          <Card loading={loading}><Text style={[typeScale.body, { color: colors.text }]}>Loaded content</Text></Card>
        </Section>

        <Section title="Badge">
          <View style={styles.wrapCenter}>
            <Badge kind="count" count={3} />
            <Badge kind="count" count={120} />
            <Badge kind="pro" />
            <Badge kind="status" status="success" label="Faol" />
            <Badge kind="status" status="danger" label="Muddati oʻtgan" />
            <Badge kind="status" status="neutral" label="Qoralama" />
          </View>
        </Section>

        <Section title="Avatar">
          <View style={styles.wrapCenter}>
            <Avatar name="Shohruh Aliyev" size="sm" />
            <Avatar name="Мадина" size="md" />
            <Avatar name="Oʻktam Gʻulomov" size="lg" level={7} />
            <Avatar name="Bekzod" size="xl" level={12} uri="https://invalid.example/avatar.png" />
          </View>
        </Section>

        <Section title="EmptyState">
          <EmptyState icon={Settings2} title="Hali hech narsa yoʻq" body="Birinchi kartochka toʻplamini yarating." action={{ label: 'Yaratish', onPress: noop }} />
        </Section>
      </View>
    </View>
  )
}

export default function DevGallery() {
  const { width } = useWindowDimensions()
  if (!__DEV__) return <Redirect href="/(tabs)" />
  const schemes: Scheme[] = ['dark', 'light']
  return (
    <ThemeProvider>
      <GalleryBody wide={width >= WIDE} schemes={schemes} />
    </ThemeProvider>
  )
}

function GalleryBody({ wide, schemes }: { wide: boolean; schemes: Scheme[] }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScreenHeader title="Dev gallery" />
      <ScrollView contentContainerStyle={[styles.columns, wide && styles.row]}>
        {schemes.map(s => (
          <ThemeProvider key={s} scheme={s}>
            <Column />
          </ThemeProvider>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  columns: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { flex: 1, paddingBottom: space.xxl },
  body: { paddingHorizontal: layout.gutter, gap: layout.sectionGap },
  section: { gap: layout.cardGap },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  wrapCenter: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' },
})

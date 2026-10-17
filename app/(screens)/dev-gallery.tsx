/**
 * Dev gallery — every redesign component in both themes (dev builds only;
 * release builds redirect to the tabs). Opened from Settings under __DEV__.
 */
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Redirect } from 'expo-router'
import { Bell, BookOpen, Clock, Flame, Inbox, Mail, Search, Settings2, Star } from 'lucide-react-native'
import { ThemeProvider, useTheme } from '../../src/design/ThemeProvider'
import { layout, space } from '../../src/design/spacing'
import { type as typeScale } from '../../src/design/typography'
import type { Scheme } from '../../src/design/tokens'
import {
  Avatar, Badge, Button, Card, Chip, CoinPill, Countdown, IconButton, EmptyState, Input, ListRow, ProgressBar, ProgressRing,
  ScreenHeader, SegmentedControl, Sheet, Stepper, SkeletonBlock, SkeletonLine, SkeletonRow, StatTile, TextArea, Toast,
  ToastHost, showToast,
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
  const [chip, setChip] = useState(0)
  const [filters, setFilters] = useState<number[]>([1])
  const [seg, setSeg] = useState(0)
  const [steps, setSteps] = useState(2)
  const [progress, setProgress] = useState(0.35)
  const [sheet, setSheet] = useState(false)
  const [text, setText] = useState('')
  const [note, setNote] = useState('')
  // A fixed target ~3 days ahead (kept stable across renders).
  const [target] = useState(() => Date.now() + ((3 * 24 + 5) * 60 + 42) * 60_000)
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

        <Section title="IconButton · CoinPill">
          <View style={styles.wrapCenter}>
            <IconButton icon={Bell} accessibilityLabel="Bildirishnomalar" onPress={noop} />
            <IconButton icon={Bell} accessibilityLabel="Bildirishnomalar" dot onPress={noop} />
            <IconButton icon={Search} accessibilityLabel="Qidirish" disabled />
            <CoinPill amount={340} onPress={noop} />
            <CoinPill amount={12_480} />
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

        <Section title="Chip">
          <View style={styles.wrap}>
            {['15', '25', '45', '60', 'Boshqa'].map((l, i) => (
              <Chip key={l} variant="choice" label={l} selected={chip === i} onPress={() => setChip(i)} />
            ))}
          </View>
          <View style={styles.wrap}>
            {['Barchasi', 'Dasturlash', 'Til'].map((l, i) => (
              <Chip
                key={l}
                label={l}
                icon={i === 0 ? undefined : BookOpen}
                selected={filters.includes(i)}
                onPress={() => setFilters(f => (f.includes(i) ? f.filter(x => x !== i) : [...f, i]))}
              />
            ))}
            <Chip label="Oʻchiq" disabled />
          </View>
        </Section>

        <Section title="SegmentedControl">
          <SegmentedControl segments={['Hafta', 'Oy', 'Hammasi']} index={seg} onChange={setSeg} />
          <SegmentedControl segments={['Kartalar', 'Statistika']} index={seg % 2} onChange={setSeg} />
        </Section>

        <Section title="Stepper">
          <View style={styles.wrapCenter}>
            <Stepper value={steps} onChange={setSteps} min={1} max={4} suffix="×" accessibilityLabel="Sessiyalar soni" />
            <Stepper value={1} onChange={noop} disabled accessibilityLabel="Oʻchiq" />
          </View>
        </Section>

        <Section title="Progress">
          <ProgressBar value={progress} accessibilityLabel="Thin" />
          <ProgressBar value={progress} thickness="thick" color={colors.success} accessibilityLabel="Thick" />
          <View style={styles.wrapCenter}>
            <ProgressRing value={progress}>
              <Text style={[typeScale.headline, { color: colors.text }]}>{Math.round(progress * 100)}%</Text>
            </ProgressRing>
            <ProgressRing value={1 - progress} thickness="thin" size={56} />
            <Button label="Oʻzgartirish" size="sm" variant="secondary" onPress={() => setProgress(p => (p > 0.8 ? 0.1 : p + 0.25))} />
          </View>
        </Section>

        <Section title="Input">
          <Input label="Email" icon={Mail} placeholder="siz@misol.uz" value={text} onChangeText={setText} />
          <Input label="Xato" value="abc" error="Email notoʻgʻri" onChangeText={noop} />
          <Input label="Oʻchiq" value="Tahrirlab boʻlmaydi" disabled />
          <TextArea label="Izoh" placeholder="Fikringizni yozing…" value={note} onChangeText={setNote} maxLength={200} counter />
        </Section>

        <Section title="Toast">
          <Toast kind="success" message="Kurs saqlandi" />
          <Toast kind="error" message="Internet aloqasi yoʻq. Qayta urinib koʻring." />
          <Toast kind="info" message="Yangi bellashuv ertaga boshlanadi" />
          <View style={styles.wrap}>
            <Button label="Success" size="sm" variant="secondary" onPress={() => showToast('success', 'Saqlandi')} />
            <Button label="Error" size="sm" variant="secondary" onPress={() => showToast('error', 'Xatolik yuz berdi')} />
          </View>
        </Section>

        <Section title="StatTile">
          <View style={styles.tiles}>
            <StatTile value={128} label="soat" delta={12} />
            <StatTile value={64} label="seriya" />
            <StatTile value={1240} label="reyting" delta={-3} format={n => n.toLocaleString('ru-RU')} />
          </View>
        </Section>

        <Section title="Countdown">
          <Countdown target={target} />
        </Section>

        <Section title="Sheet">
          <Button label="Sheetni ochish" variant="secondary" onPress={() => setSheet(true)} />
          <Sheet visible={sheet} onClose={() => setSheet(false)} title="Kursni sotib olish">
            <Text style={[typeScale.body, { color: colors.textMuted }]}>
              Pastga torting yoki fonni bosing — yopiladi.
            </Text>
            <View style={styles.sheetActions}>
              <Button label="Davom etish" fullWidth icon={Clock} onPress={() => setSheet(false)} />
            </View>
          </Sheet>
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
      <ToastHost />
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
  tiles: { flexDirection: 'row', gap: space.xs },
  sheetActions: { marginTop: space.lg },
  wrapCenter: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' },
})

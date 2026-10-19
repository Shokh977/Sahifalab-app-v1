/**
 * Dev gallery — every redesign component in both themes (dev builds only;
 * release builds redirect to the tabs). Opened from Settings under __DEV__.
 */
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Redirect } from 'expo-router'
import {
  Bell, BookOpen, CalendarCheck, ChevronRight, Clock, CircleHelp, Flame, GraduationCap, Inbox, Layers, Mail, Moon, Search,
  Settings2, Star, Timer, TreePine, Trophy, Users, Zap,
} from 'lucide-react-native'
import { ThemeProvider, useTheme } from '../../src/design/ThemeProvider'
import { LevelUpOverlay } from '../../components/study/LevelUpOverlay'
import { layout, space } from '../../src/design/spacing'
import { tabular, type as typeScale } from '../../src/design/typography'
import type { Scheme } from '../../src/design/tokens'
import {
  Avatar, Badge, Button, Card, Chip, CoinPill, Countdown, IconButton, EmptyState, Input, ListRow, ProgressBar, ProgressRing,
  ScreenHeader, SegmentedControl, Sheet, Stepper, SkeletonBlock, SkeletonLine, SkeletonRow, StatTile, TextArea, Toast,
  ToastHost, showToast, SectionTitle, WeekDayIcon, BadgeTile,
} from '../../src/components/ui'
import { PlanTile } from '../../src/features/today/PlanTile'
import { RivalLadder, type RivalRow } from '../../src/features/today/RivalLadder'
import { TrophyIcon } from '../../src/features/today/TrophyIcon'
import { CompetitionHero } from '../../src/features/bellashuv/CompetitionHero'
import { Podium } from '../../src/features/bellashuv/Podium'

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
  const [levelUp, setLevelUp] = useState(false)
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
        <Phase75 />

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
            <IconButton icon={Star} accessibilityLabel="Faol" active onPress={noop} />
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

        <Section title="Level-up (Lottie)">
          <Button label="Level-up koʻrsatish" variant="secondary" onPress={() => setLevelUp(true)} />
          <LevelUpOverlay visible={levelUp} newLevel={8} onDismiss={() => setLevelUp(false)} />
        </Section>

        <Section title="EmptyState">
          <EmptyState icon={Settings2} title="Hali hech narsa yoʻq" body="Birinchi kartochka toʻplamini yarating." action={{ label: 'Yaratish', onPress: noop }} />
        </Section>
      </View>
    </View>
  )
}

// ── Phase 7.5 (v2 mockups) ──────────────────────────────────────────────────

const LADDER: RivalRow[] = [
  { id: 1, name: 'Abror', rank: 22, xp: 489 },
  { id: 2, name: 'Sahifalab', rank: 23, xp: 467, isMe: true },
  { id: 3, name: 'Diyora', rank: 24, xp: 451 },
]

function Phase75() {
  const { colors } = useTheme()
  const [ladder, setLadder] = useState(LADDER)
  const noop = () => {}
  const swap = () => setLadder(rows => {
    // You pass Abror: +30 XP and the ranks trade places.
    const me = rows.find(r => r.isMe)!
    const above = rows.find(r => r.rank === me.rank - 1)
    if (!above) return LADDER
    return rows
      .map(r => r.isMe ? { ...r, rank: r.rank - 1, xp: r.xp + 30 } : r.id === above.id ? { ...r, rank: r.rank + 1 } : r)
      .sort((a, b) => a.rank - b.rank)
  })
  return (
    <>
      <Section title="Phase 7.5 · SectionTitle">
        <SectionTitle title="Bugungi reja" meta="2 / 4" />
        <SectionTitle title="Haftalik reyting" link={{ label: 'Hammasi', onPress: noop }} />
      </Section>

      <Section title="Phase 7.5 · WeekDayIcon">
        <View style={styles.week}>
          {(['done', 'frozen', 'missed', 'today', 'future'] as const).map((st, i) => (
            <View key={st} style={styles.weekDay}>
              <WeekDayIcon state={st} day={['Du', 'Se', 'Ch', 'Pa', 'Ju'][i]} />
              <Text style={[typeScale.small, { color: colors.textMuted }]}>{st}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Phase 7.5 · PlanTile">
        <View style={styles.grid}>
          <View style={styles.cell}><PlanTile variant="next" icon={Layers} tint="orange" value="48 ta" title="Kartalar" sub="~6 daqiqa" onPress={noop} /></View>
          <View style={styles.cell}><PlanTile variant="default" icon={GraduationCap} tint="violet" value="3-dars" title="Mnemonika" progress={0.3} status={<Text style={[typeScale.small, tabular, { color: colors.textMuted }]}>30%</Text>} onPress={noop} /></View>
          <View style={styles.cell}><PlanTile variant="done" icon={Timer} tint="orange" value="180 daq" title="Fokus" sub="Maqsad 10 daq" onPress={noop} /></View>
          <View style={styles.cell}><PlanTile variant="done" icon={CircleHelp} tint="blue" value="5/5" title="5 Savol #12" sub="#10-oʻrin bugun" onPress={noop} /></View>
        </View>
      </Section>

      <Section title="Phase 7.5 · RivalLadder">
        <Card>
          <RivalLadder
            rows={ladder}
            footer={
              <>
                <TrophyIcon />
                <Text style={[typeScale.callout, styles.flex, { color: colors.text }]}>
                  <Text style={{ fontFamily: typeScale.tileValue.fontFamily }}>22 XP</Text> — Abrorni quvib oʻtasiz.{'\n'}
                  <Text style={{ color: colors.textMuted }}>Taxminan 5 daqiqa fokus</Text>
                </Text>
                <ChevronRight size={18} color={colors.textMuted} />
              </>
            }
          />
        </Card>
        <Button label="Reytingni almashtirish" variant="secondary" size="sm" onPress={swap} />
      </Section>

      <Section title="Phase 7.5 · CompetitionHero">
        <CompetitionHero title="Sahifalab: Fokus Marafoni" coverUrl="https://picsum.photos/seed/marafon/300/300" status="Faol · 5 kun qoldi" live>
          <ProgressBar value={0.71} thickness="thick" accessibilityLabel="Top 10 gacha" />
          <Button label="Fokusni boshlash" size="lg" fullWidth onPress={noop} />
        </CompetitionHero>
      </Section>

      <Section title="Phase 7.5 · Podium">
        <Card>
          <Podium entries={[
            { id: 11, rank: 1, name: 'Nigora', xp: 4107 },
            { id: 12, rank: 2, name: 'Feruza', xp: 3116 },
            { id: 13, rank: 3, name: 'Ali_07_khan', xp: 3039 },
          ]} />
        </Card>
      </Section>

      <Section title="Phase 7.5 · BadgeTile">
        <View style={styles.badges}>
          <BadgeTile name="Sehrli daraxt" icon={TreePine} tint="green" />
          <BadgeTile name="Better me" icon={Star} tint="orange" />
          <BadgeTile name="Tungi mutolaa" icon={Moon} tint="violet" />
          <BadgeTile name="Vaqtga qarshi" icon={Timer} tint="blue" />
          <BadgeTile name="Grandmaster" icon={Trophy} tint="gold" />
          <BadgeTile name="Jamoaviy sprint" icon={Users} tint="teal" />
          <BadgeTile name="XP legendi" icon={Zap} tint="pink" />
          <BadgeTile name="7 kunda 7 soat" icon={CalendarCheck} tint="orange" locked />
        </View>
      </Section>
    </>
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
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: space.xxs + 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.cardGap },
  cell: { width: '47%', flexGrow: 1 },
  flex: { flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'space-between' },
})

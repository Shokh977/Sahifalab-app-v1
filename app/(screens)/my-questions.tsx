/**
 * Mening savollarim — every question the user sent to 5 Savol, newest
 * first, with its status in plain words (the server's label): Koʻrib
 * chiqilmoqda · Qabul qilindi · [sana] kuni chiqadi · Nashr etildi (#, sana)
 * · Bu savol allaqachon bazamizda bor · Bu safar qoʻshilmadi. A rejection
 * reason is never shown and never pushed. This list is what makes
 * contributing feel real between sending and publication.
 */
import React, { useCallback, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Lightbulb, Plus, WifiOff } from 'lucide-react-native'
import { questions as questionsApi, type MyQuestionSubmission, type QuestionSubmissionStatus } from '../../lib/api'
import { useTheme } from '../../src/design/ThemeProvider'
import { layout, space } from '../../src/design/spacing'
import { type as typeScale } from '../../src/design/typography'
import { Badge, Button, Card, EmptyState, ScreenHeader, SkeletonBlock, type BadgeStatus } from '../../src/components/ui'
import { COPY, CTA } from '../../src/features/questions/questionForm'

const BADGE: Record<QuestionSubmissionStatus, BadgeStatus> = {
  pending_review: 'neutral',
  approved: 'accent',
  scheduled: 'accent',
  published: 'success',
  duplicate: 'neutral',
  rejected: 'neutral',
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function MyQuestionsScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [items, setItems] = useState<MyQuestionSubmission[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setFailed(false)
    try {
      setItems((await questionsApi.mine()).submissions)
    } catch {
      setFailed(true)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const add = () => router.push('/(screens)/submit-question' as any)

  let body: React.ReactNode
  if (failed && !items) {
    body = <EmptyState icon={WifiOff} title="Yuklab boʻlmadi" body="Internet aloqasini tekshirib, qayta urinib koʻring." action={{ label: 'Qayta urinish', onPress: load }} />
  } else if (!items) {
    body = <View style={styles.content}>{[0, 1, 2].map(i => <SkeletonBlock key={i} height={space.huge * 2} />)}</View>
  } else if (items.length === 0) {
    body = <EmptyState icon={Lightbulb} title={CTA.title} body={COPY.intro} action={{ label: COPY.title, onPress: add }} />
  } else {
    body = (
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {items.map(s => (
          <Card key={s.id} style={styles.card}>
            <View style={styles.row}>
              <Badge kind="status" status={BADGE[s.status] ?? 'neutral'} label={s.status_label} />
              <Text style={[typeScale.callout, { color: colors.textMuted }]}>{fmtDate(s.created_at)}</Text>
            </View>
            <Text style={[typeScale.body, { color: colors.text }]}>{s.question_text}</Text>
            <Text style={[typeScale.callout, { color: colors.successText }]} numberOfLines={1}>
              ✓ {s.options[s.correct_index]}
            </Text>
            {s.status === 'published' && s.reward_tanga ? (
              <Text style={[typeScale.callout, { color: colors.accentText }]}>+{s.reward_tanga} tanga</Text>
            ) : null}
            {s.is_anonymous && <Text style={[typeScale.small, { color: colors.textMuted }]}>Ismsiz yuborilgan</Text>}
          </Card>
        ))}
        <Button label={COPY.title} icon={Plus} variant="secondary" onPress={add} fullWidth />
      </ScrollView>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={COPY.mine} actions={[{ icon: Plus, accessibilityLabel: COPY.title, onPress: add }]} />
      {body}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.sm, gap: space.sm },
  card: { gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
})

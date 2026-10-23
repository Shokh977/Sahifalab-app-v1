/**
 * "Siz ham savol yuboring" — write a whole 5 Savol question on one screen:
 * the question, the correct answer FIRST (say what you know before
 * inventing wrong answers), three wrong answers (with the optional
 * "Notoʻgʻri javoblarni AI tayyorlasin" — app_config assist_in_ui, off by
 * default; it only fills empty fields and every suggestion stays editable),
 * then an optional explanation and source, "Ismimni koʻrsatmang", and the
 * day's allowance. The server validates, limits and decides everything.
 *
 * States: first time (two-line explainer), daily / pending limit reached,
 * offline, a failed send (the form keeps what was typed), AI assist failure
 * (silently back to manual entry), and the thank-you after sending.
 */
import React, { useCallback, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, ChevronDown, ChevronUp, CircleCheck, ListChecks, Sparkles, Square, SquareCheck, WifiOff } from 'lucide-react-native'
import { questions as questionsApi, type QuestionLimits } from '../../lib/api'
import { useOnline } from '../../hooks/useOnline'
import { useTheme } from '../../src/design/ThemeProvider'
import { iconSize, iconStroke, layout, radius, space } from '../../src/design/spacing'
import { type as typeScale } from '../../src/design/typography'
import {
  Button, Card, EmptyState, Input, Pressable, ScreenHeader, SkeletonBlock, TextArea, ToastHost, showToast,
} from '../../src/components/ui'
import {
  COPY, DEFAULT_REWARD, NOTE_MAX, OPTION_MAX, QUESTION_MAX, canAssist, draftErrors, fillWrong, toSubmitBody,
  type QuestionDraft,
} from '../../src/features/questions/questionForm'

const EMPTY: QuestionDraft = { question: '', correct: '', wrong: ['', '', ''], explanation: '', source: '' }

function untilLabel(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function SubmitQuestionScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const online = useOnline()

  const [limits, setLimits] = useState<QuestionLimits | null>(null)
  const [firstTime, setFirstTime] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [draft, setDraft] = useState<QuestionDraft>(EMPTY)
  const [anonymous, setAnonymous] = useState(false)
  const [usedAssist, setUsedAssist] = useState(false)
  const [assisting, setAssisting] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const [tried, setTried] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const load = useCallback(async () => {
    setLoadFailed(false)
    try {
      const [l, mine] = await Promise.all([questionsApi.limits(), questionsApi.mine()])
      setLimits(l)
      setFirstTime(mine.submissions.length === 0)
    } catch {
      setLoadFailed(true)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const errors = tried ? draftErrors(draft) : {}
  const reward = limits?.reward_tanga ?? DEFAULT_REWARD
  const set = (patch: Partial<QuestionDraft>) => setDraft(d => ({ ...d, ...patch }))
  const setWrong = (i: number, v: string) => setDraft(d => {
    const wrong = [...d.wrong] as QuestionDraft['wrong']
    wrong[i] = v
    return { ...d, wrong }
  })

  async function assist() {
    if (!canAssist(draft) || assisting) return
    setAssisting(true)
    try {
      const res = await questionsApi.assistDistractors(draft.question, draft.correct)
      setDraft(d => ({ ...d, wrong: fillWrong(d.wrong, res.distractors) }))
      setUsedAssist(true)
      setLimits(l => (l ? { ...l, assist_remaining: res.assist_remaining } : l))
    } catch {
      // Silent fallback (brief): the user just types the options.
    } finally {
      setAssisting(false)
    }
  }

  async function send() {
    setTried(true)
    if (Object.keys(draftErrors(draft)).length > 0 || sending) return
    setSending(true)
    try {
      const res = await questionsApi.submit(toSubmitBody(draft, anonymous, usedAssist))
      setLimits(l => (l ? { ...l, remaining_today: res.remaining_today, pending: l.pending + 1 } : l))
      setSent(true)
    } catch (e: any) {
      showToast('error', e?.message ?? 'Yuborib boʻlmadi. Qayta urinib koʻring.')
      if (e?.code === 'daily_limit' || e?.code === 'pending_limit') load()
    } finally {
      setSending(false)
    }
  }

  function reset() {
    setDraft(EMPTY)
    setAnonymous(false)
    setUsedAssist(false)
    setTried(false)
    setShowExplanation(false)
    setShowSource(false)
    setSent(false)
    load()
  }

  const header = (
    <ScreenHeader
      title={COPY.title}
      actions={[{ icon: ListChecks, accessibilityLabel: COPY.mine, onPress: () => router.push('/(screens)/my-questions' as any) }]}
    />
  )

  let body: React.ReactNode
  if (loadFailed && !limits) {
    body = <EmptyState icon={WifiOff} title="Yuklab boʻlmadi" body="Internet aloqasini tekshirib, qayta urinib koʻring." action={{ label: 'Qayta urinish', onPress: load }} />
  } else if (!limits) {
    body = (
      <View style={styles.content}>
        <SkeletonBlock height={space.huge * 2} />
        <SkeletonBlock height={space.huge} />
        <SkeletonBlock height={space.huge} />
      </View>
    )
  } else if (sent) {
    body = (
      <View style={[styles.content, styles.center]}>
        <View style={[styles.doneIcon, { backgroundColor: colors.greenSoft }]}>
          <CircleCheck size={iconSize.md + 8} color={colors.successText} strokeWidth={iconStroke} />
        </View>
        <Text style={[typeScale.title2, styles.centerText, { color: colors.text }]}>{COPY.thanksTitle}</Text>
        <Text style={[typeScale.body, styles.centerText, { color: colors.textMuted }]}>{COPY.thanksBody(reward)}</Text>
        <Text style={[typeScale.callout, styles.centerText, { color: colors.textMuted }]}>{COPY.remaining(limits.remaining_today)}</Text>
        <View style={styles.doneActions}>
          {limits.remaining_today > 0 && <Button label={COPY.another} onPress={reset} fullWidth />}
          <Button label={COPY.mine} variant="secondary" onPress={() => router.replace('/(screens)/my-questions' as any)} fullWidth />
        </View>
      </View>
    )
  } else if (!limits.enabled) {
    body = <EmptyState icon={Sparkles} title={COPY.disabled} />
  } else if (limits.remaining_today <= 0) {
    body = (
      <EmptyState
        icon={Check}
        title={COPY.limitTitle}
        body={COPY.limitBody(untilLabel(limits.next_slot_at))}
        action={{ label: COPY.mine, onPress: () => router.push('/(screens)/my-questions' as any) }}
      />
    )
  } else if (limits.pending >= limits.max_pending) {
    body = (
      <EmptyState
        icon={ListChecks}
        title={COPY.pendingFullTitle}
        body={COPY.pendingFullBody}
        action={{ label: COPY.mine, onPress: () => router.push('/(screens)/my-questions' as any) }}
      />
    )
  } else {
    const assistVisible = limits.assist_enabled && limits.assist_remaining > 0
    body = (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {firstTime && (
            <Card>
              <Text style={[typeScale.body, { color: colors.text }]}>{COPY.intro}</Text>
            </Card>
          )}
          {!online && (
            <View style={[styles.banner, { backgroundColor: colors.surfaceRaised }]}>
              <WifiOff size={iconSize.sm - 4} color={colors.textMuted} strokeWidth={iconStroke} />
              <Text style={[typeScale.callout, styles.flex, { color: colors.textMuted }]}>{COPY.offline}</Text>
            </View>
          )}

          <TextArea
            label={COPY.questionLabel}
            placeholder={COPY.questionPlaceholder}
            value={draft.question}
            onChangeText={v => set({ question: v })}
            maxLength={QUESTION_MAX}
            counter
            error={errors.question}
          />

          <Input
            label={COPY.correctLabel}
            icon={Check}
            placeholder={COPY.correctPlaceholder}
            value={draft.correct}
            onChangeText={v => set({ correct: v })}
            maxLength={OPTION_MAX}
            error={errors.correct}
          />

          <View style={styles.group}>
            <Text style={[typeScale.callout, { color: colors.textMuted }]}>{COPY.wrongLabel}</Text>
            {draft.wrong.map((w, i) => (
              <Input
                key={i}
                placeholder={COPY.wrongPlaceholder(i + 1)}
                value={w}
                onChangeText={v => setWrong(i, v)}
                maxLength={OPTION_MAX}
                error={errors[`wrong${i}` as 'wrong0']}
                accessibilityLabel={COPY.wrongPlaceholder(i + 1)}
              />
            ))}
            {assistVisible && (
              <Button
                label={COPY.assist}
                icon={Sparkles}
                variant="secondary"
                size="sm"
                loading={assisting}
                disabled={!canAssist(draft) || draft.wrong.every(w => w.trim())}
                onPress={assist}
              />
            )}
          </View>

          <Collapsible label={COPY.explanationLabel} open={showExplanation || !!draft.explanation} onToggle={() => setShowExplanation(o => !o)}>
            <TextArea
              placeholder={COPY.explanationPlaceholder}
              value={draft.explanation}
              onChangeText={v => set({ explanation: v })}
              maxLength={NOTE_MAX}
              error={errors.explanation}
              accessibilityLabel={COPY.explanationLabel}
            />
          </Collapsible>
          <Collapsible label={COPY.sourceLabel} open={showSource || !!draft.source} onToggle={() => setShowSource(o => !o)}>
            <Input
              placeholder={COPY.sourcePlaceholder}
              value={draft.source}
              onChangeText={v => set({ source: v })}
              maxLength={NOTE_MAX}
              error={errors.source}
              accessibilityLabel={COPY.sourceLabel}
            />
          </Collapsible>

          <Pressable
            noFeedback
            onPress={() => setAnonymous(a => !a)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: anonymous }}
            accessibilityLabel={COPY.anonymous}
            style={styles.checkRow}
          >
            {anonymous
              ? <SquareCheck size={iconSize.sm} color={colors.accent} strokeWidth={iconStroke} />
              : <Square size={iconSize.sm} color={colors.textMuted} strokeWidth={iconStroke} />}
            <Text style={[typeScale.body, { color: colors.text }]}>{COPY.anonymous}</Text>
          </Pressable>

          <Text style={[typeScale.callout, { color: colors.textMuted }]}>{COPY.remaining(limits.remaining_today)}</Text>
          <Button label={COPY.submit} onPress={send} loading={sending} disabled={!online} fullWidth size="lg" />
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {header}
      {body}
      <ToastHost />
    </View>
  )
}

function Collapsible({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  const { colors } = useTheme()
  const Icon = open ? ChevronUp : ChevronDown
  return (
    <View style={styles.group}>
      <Pressable noFeedback onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.collapseRow}>
        <Text style={[typeScale.callout, styles.flex, { color: colors.textMuted }]}>{label}</Text>
        <Icon size={iconSize.sm - 4} color={colors.textMuted} strokeWidth={iconStroke} />
      </Pressable>
      {open && children}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.sm, gap: space.lg },
  center: { alignItems: 'center', paddingTop: space.xxl },
  centerText: { textAlign: 'center' },
  doneIcon: { width: 72, height: 72, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  doneActions: { alignSelf: 'stretch', gap: space.sm, marginTop: space.md },
  group: { gap: space.xs },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.xs, borderRadius: radius.md, padding: space.sm },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: layout.minTouch },
  collapseRow: { flexDirection: 'row', alignItems: 'center', minHeight: layout.minTouch },
})

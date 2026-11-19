/**
 * Fokus rejimi on the Fokus screen (design B, C, D, E, F, I): the quiet row
 * with the switch, which becomes the "Fokus rejimi yoqilgan · Chiqish" status
 * while the mode is on; the first-time sheet; Moslash; the Pro upsell once
 * the free try is spent; and the "Qaytarish" toast after turning it off (no
 * confirmation: turning off is safe and undoable).
 *
 * The exit lives here because Fokus is the one tab that can't be hidden.
 */
import React, { useEffect, useState } from 'react'
import { StyleSheet, Switch, Text, View } from 'react-native'
import Animated, { FadeInDown, FadeOutDown, ReduceMotion } from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { ArrowDown, Check, ChevronRight, CircleAlert, Info, Leaf, Lock, X } from 'lucide-react-native'
import { useShallow } from 'zustand/react/shallow'
import { useTheme } from '../../design/ThemeProvider'
import { durations, easing } from '../../design/motion'
import { avatarSize, controlHeight, iconSize, iconStroke, layout, radius, space } from '../../design/spacing'
import { onImage, proGold } from '../../design/tokens'
import { fonts, tabular, type as typeScale } from '../../design/typography'
import { haptics } from '../../lib/haptics'
import { Button, Pressable, Sheet } from '../../components/ui'
import { useMyLookStore } from '../../../stores/myLookStore'
import { useMinuteClock } from '../today/useMinuteClock'
import { PRO_PURCHASE_ENABLED } from '../pro/flags'
import {
  ALL_TABS, MAX_TABS, MIN_TABS, PRESET, TRIAL_MS, focusAccess, todayMs, useFocusModeStore, type FocusTab,
} from './focusModeStore'
import { MiniBar } from './MiniBar'
import { TAB_META } from './tabMeta'

type SheetKind = 'intro' | 'custom' | 'upsell' | null
const UNDO_MS = 4000
/** Inline icons beside callout text. */
const SMALL_ICON = 16

const samePreset = (keep: FocusTab[]) => keep.length === PRESET.length && PRESET.every(t => keep.includes(t))

function formatMinutes(ms: number) {
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'Hozirgina yoqildi'
  const h = Math.floor(m / 60)
  const rest = m % 60
  return `Bugun ${h ? `${h} soat ` : ''}${rest || !h ? `${rest} daqiqa` : ''}`.trim()
}

export function FocusModeControls() {
  const { colors } = useTheme()
  const router = useRouter()
  const now = useMinuteClock()
  const isPro = useMyLookStore(s => s.isPro)
  const s = useFocusModeStore(useShallow(st => ({
    on: st.on, keep: st.keep, introSeen: st.introSeen, onSince: st.onSince, day: st.day, dayMs: st.dayMs,
    trialStartedAt: st.trialStartedAt, trialUsed: st.trialUsed,
  })))
  const access = focusAccess(s, isPro, now)
  const [sheet, setSheet] = useState<SheetKind>(null)
  /** Moslash was opened from the intro: saving turns the mode on. */
  const [enableOnSave, setEnableOnSave] = useState(false)
  const [undo, setUndo] = useState<{ keep: FocusTab[]; trial: boolean; canUndo: boolean } | null>(null)

  useEffect(() => {
    if (!undo) return
    const t = setTimeout(() => setUndo(null), UNDO_MS)
    return () => clearTimeout(t)
  }, [undo])

  const turnOn = () => {
    if (access === 'trialUsed') { setSheet('upsell'); return }
    if (access !== 'pro' || !s.introSeen) { setSheet('intro'); return }
    haptics.selection()
    useFocusModeStore.getState().enable()
  }

  const turnOff = () => {
    const prev = useFocusModeStore.getState().disable()
    if (!prev) return
    haptics.selection()
    const after = focusAccess(useFocusModeStore.getState(), isPro)
    setUndo({ ...prev, canUndo: after !== 'trialUsed' })
  }

  const openDetails = () => {
    // Pro, and a free user during their try (the try is the full feature).
    if (access === 'pro' || (access === 'trialActive' && s.on)) { setEnableOnSave(false); setSheet('custom') }
    else if (access === 'trialUsed') setSheet('upsell')
    else if (!s.on) setSheet('intro')
  }

  const subtitle = (() => {
    if (s.on) {
      if (access === 'trialActive' && s.trialStartedAt != null) {
        const left = Math.max(1, Math.ceil((s.trialStartedAt + TRIAL_MS - now) / 3600000))
        return { chip: 'Bepul', text: `${left} soat qoldi`, a11y: `Bepul sinov, ${left} soat qoldi` }
      }
      return { chip: null, text: formatMinutes(todayMs(s, now)) }
    }
    if (access === 'free') return { chip: 'PRO', text: '1 marta bepul' }
    if (access === 'trialUsed') return { chip: 'PRO', text: 'Pro bilan ochiladi' }
    return { chip: null, text: samePreset(s.keep) ? 'Fokus va Bellashuv qoladi' : `${s.keep.length} ta boʻlim qoladi` }
  })()

  return (
    <>
      <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.icon, { backgroundColor: s.on ? colors.accent : colors.surfaceRaised }]}>
          <Leaf size={iconSize.sm} color={s.on ? colors.onAccent : colors.textMuted} strokeWidth={iconStroke} />
        </View>
        <Pressable
          onPress={openDetails}
          style={styles.text}
          accessibilityRole="button"
          accessibilityLabel={`${s.on ? 'Fokus rejimi yoqilgan' : 'Fokus rejimi'}, ${subtitle.a11y ?? `${subtitle.chip ?? ''} ${subtitle.text}`}`}
          accessibilityHint={access === 'pro' || access === 'trialActive' ? 'Qaysi boʻlimlar qolishini tanlash' : undefined}
        >
          <Text style={[typeScale.headline, { color: colors.text }]} numberOfLines={1}>
            {s.on ? 'Fokus rejimi yoqilgan' : 'Fokus rejimi'}
          </Text>
          <View style={styles.subRow}>
            {subtitle.chip && (
              <View style={[styles.chip, { backgroundColor: proGold.fill }]}>
                <Text style={[styles.chipText, { color: proGold.ink }]}>{subtitle.chip}</Text>
              </View>
            )}
            <Text style={[typeScale.callout, tabular, { color: colors.textMuted }]} numberOfLines={1}>{subtitle.text}</Text>
          </View>
        </Pressable>
        {s.on ? (
          <Pressable
            onPress={turnOff}
            style={[styles.exit, { backgroundColor: colors.surfaceRaised }]}
            accessibilityRole="button"
            accessibilityLabel="Fokus rejimidan chiqish"
          >
            <X size={SMALL_ICON} color={colors.text} strokeWidth={iconStroke} />
            <Text style={[typeScale.callout, { color: colors.text, fontFamily: fonts.semibold }]}>Chiqish</Text>
          </Pressable>
        ) : (
          <Switch
            value={false}
            onValueChange={v => { if (v) turnOn() }}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={onImage}
            ios_backgroundColor={colors.border}
            accessibilityLabel="Fokus rejimi"
          />
        )}
      </View>

      {undo && (
        <Animated.View
          entering={FadeInDown.duration(durations.fade).easing(easing.standard).reduceMotion(ReduceMotion.System)}
          exiting={FadeOutDown.duration(durations.fade).easing(easing.exit).reduceMotion(ReduceMotion.System)}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[styles.toast, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
        >
          <Leaf size={iconSize.sm} color={colors.textMuted} strokeWidth={iconStroke} />
          <Text style={[typeScale.body, styles.flex, { color: colors.text }]}>Fokus rejimi oʻchirildi</Text>
          {undo.canUndo && (
            <Pressable
              onPress={() => {
                useFocusModeStore.getState().enable(undo.keep, { trial: undo.trial })
                setUndo(null)
              }}
              style={styles.undoBtn}
              accessibilityRole="button"
            >
              <Text style={[typeScale.body, { color: colors.accentText, fontFamily: fonts.semibold }]}>Qaytarish</Text>
            </Pressable>
          )}
        </Animated.View>
      )}

      <IntroSheet
        visible={sheet === 'intro'}
        trial={access !== 'pro'}
        onClose={() => setSheet(null)}
        onPreset={() => {
          const st = useFocusModeStore.getState()
          st.markIntroSeen()
          st.enable(PRESET, { trial: access !== 'pro' })
          haptics.selection()
          setSheet(null)
        }}
        onCustom={() => { setEnableOnSave(true); setSheet('custom') }}
      />
      <CustomSheet
        visible={sheet === 'custom'}
        initial={s.keep}
        onClose={() => setSheet(null)}
        onSave={keep => {
          const st = useFocusModeStore.getState()
          if (enableOnSave) {
            st.markIntroSeen()
            st.enable(keep, { trial: access !== 'pro' })
            haptics.selection()
          } else st.setKeep(keep)
          setSheet(null)
        }}
      />
      <UpsellSheet
        visible={sheet === 'upsell'}
        onClose={() => setSheet(null)}
        onPro={() => { setSheet(null); router.push('/(screens)/pro' as any) }}
      />
    </>
  )
}

// ── C · first time ───────────────────────────────────────────────────────────

function IntroSheet({ visible, trial, onClose, onPreset, onCustom }: {
  visible: boolean
  trial: boolean
  onClose: () => void
  onPreset: () => void
  onCustom: () => void
}) {
  const { colors } = useTheme()
  const [choice, setChoice] = useState<'preset' | 'custom'>('preset')
  useEffect(() => { if (visible) setChoice('preset') }, [visible])
  const previewW = 300
  // The free try is the whole feature, choosing tabs included.
  const choices = [
    { id: 'preset' as const, title: 'Faqat Fokus va Bellashuv', sub: 'Tavsiya etiladi' },
    { id: 'custom' as const, title: 'Oʻzim tanlayman', sub: 'Qaysi boʻlimlar qolishini belgilang' },
  ]
  const cta = choice === 'custom' ? 'Davom etish' : trial ? 'Bepul sinab koʻrish' : 'Yoqish'
  return (
    <Sheet visible={visible} onClose={onClose} title="Ilova soddalashadi">
      <View style={styles.sheetBody}>
        <Text style={[typeScale.body, { color: colors.textMuted }]}>
          Oʻqishga kerakli boʻlimlar qoladi. Qolganlari va ularning bildirishnomalari koʻrinmaydi.
        </Text>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel="Tab bar oʻzgarishi: 5 ta boʻlimdan 2 tasiga"
          style={[styles.preview, { backgroundColor: colors.surfaceRaised }]}
        >
          <MiniBar tabs={ALL_TABS} width={previewW} />
          <ArrowDown size={iconSize.sm} color={colors.textMuted} strokeWidth={iconStroke} />
          <MiniBar tabs={PRESET} width={previewW} />
        </View>
        <View accessibilityRole="radiogroup" style={styles.choices}>
          {choices.map(c => {
            const sel = choice === c.id
            return (
              <Pressable
                key={c.id}
                onPress={() => setChoice(c.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: sel }}
                style={[
                  styles.choice,
                  { backgroundColor: sel ? colors.accentSoft : colors.surfaceRaised, borderColor: sel ? colors.accent : 'transparent' },
                ]}
              >
                <View style={[styles.radio, { borderColor: sel ? colors.accent : colors.textMuted }]}>
                  {sel && <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />}
                </View>
                <View style={styles.flex}>
                  <Text style={[typeScale.headline, { color: colors.text }]}>{c.title}</Text>
                  <Text style={[typeScale.callout, { color: colors.textMuted }]}>{c.sub}</Text>
                </View>
                {c.id === 'custom' && <ChevronRight size={iconSize.sm} color={colors.textMuted} strokeWidth={iconStroke} />}
              </Pressable>
            )
          })}
        </View>
        <View style={styles.note}>
          <Info size={SMALL_ICON} color={colors.textMuted} strokeWidth={iconStroke} />
          <Text style={[typeScale.callout, styles.flex, { color: colors.textMuted }]}>
            {trial
              ? 'Bu safar bepul: oʻchirguningizcha yoki 24 soat davomida. Istalgan payt Fokus ekranidan oʻchirishingiz mumkin.'
              : 'Istalgan payt Fokus ekranidan oʻchirishingiz mumkin'}
          </Text>
        </View>
        <View style={styles.actions}>
          <Button label={cta} size="lg" fullWidth onPress={choice === 'custom' ? onCustom : onPreset} />
          <Button label="Hozir emas" variant="ghost" fullWidth onPress={onClose} />
        </View>
      </View>
    </Sheet>
  )
}

// ── D · Moslash ──────────────────────────────────────────────────────────────

function CustomSheet({ visible, initial, onClose, onSave }: {
  visible: boolean
  initial: FocusTab[]
  onClose: () => void
  onSave: (keep: FocusTab[]) => void
}) {
  const { colors } = useTheme()
  const [draft, setDraft] = useState<FocusTab[]>(initial)
  const [msg, setMsg] = useState<'hint' | 'min' | 'max'>('hint')
  useEffect(() => { if (visible) { setDraft(initial); setMsg('hint') } }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (name: FocusTab, value: boolean) => {
    const next = value ? [...draft, name] : draft.filter(t => t !== name)
    if (next.length < MIN_TABS) { setMsg('min'); haptics.error(); return }
    if (next.length > MAX_TABS) { setMsg('max'); haptics.error(); return }
    setMsg('hint')
    setDraft(ALL_TABS.filter(t => next.includes(t)))
  }

  const msgText = msg === 'min' ? 'Kamida 2 ta boʻlim tanlang' : msg === 'max' ? 'Koʻpi bilan 4 ta boʻlim tanlash mumkin' : '2 tadan 4 tagacha boʻlim tanlash mumkin'
  return (
    <Sheet visible={visible} onClose={onClose} title="Moslash">
      <View style={styles.sheetBody}>
        <Text style={[typeScale.body, { color: colors.textMuted }]}>Fokus rejimida qaysi boʻlimlar koʻrinsin?</Text>
        <View style={[styles.preview, { backgroundColor: colors.surfaceRaised }]} accessibilityLiveRegion="polite">
          <MiniBar tabs={draft} width={300} />
          <Text style={[typeScale.callout, { color: colors.textMuted }]}>Shunday koʻrinadi · {draft.length} ta boʻlim</Text>
        </View>
        <View style={[styles.list, { backgroundColor: colors.surfaceRaised }]}>
          {TAB_META.map((t, i) => {
            const locked = t.name === 'study'
            const value = draft.includes(t.name)
            return (
              <View key={t.name} style={[styles.listRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                <t.Icon size={iconSize.sm} color={colors.textMuted} strokeWidth={iconStroke} />
                <Text style={[typeScale.headline, styles.flex, { color: colors.text }]}>{t.label}</Text>
                {locked ? (
                  <View style={styles.locked}>
                    <Lock size={SMALL_ICON} color={colors.textMuted} strokeWidth={iconStroke} />
                    <Text style={[typeScale.callout, { color: colors.textMuted }]}>Doim koʻrinadi</Text>
                  </View>
                ) : (
                  <Switch
                    value={value}
                    onValueChange={v => toggle(t.name, v)}
                    trackColor={{ false: colors.border, true: colors.accent }}
                    thumbColor={onImage}
                    ios_backgroundColor={colors.border}
                    accessibilityLabel={t.label}
                  />
                )}
              </View>
            )
          })}
        </View>
        <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.note}>
          {msg !== 'hint' && <CircleAlert size={SMALL_ICON} color={colors.dangerText} strokeWidth={iconStroke} />}
          <Text style={[typeScale.callout, { color: msg === 'hint' ? colors.textMuted : colors.dangerText }]}>{msgText}</Text>
        </View>
        <Button label="Saqlash" size="lg" fullWidth onPress={() => onSave(draft)} />
      </View>
    </Sheet>
  )
}

// ── I · the free try is spent ────────────────────────────────────────────────

function UpsellSheet({ visible, onClose, onPro }: { visible: boolean; onClose: () => void; onPro: () => void }) {
  const { colors } = useTheme()
  const perks = [
    'Bir tegishda yoqiladi',
    'Qaysi boʻlimlar qolishini oʻzingiz tanlaysiz',
    'Yashirilgan boʻlimlar bildirishnoma yubormaydi',
  ]
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.sheetBody}>
        <View style={[styles.chip, styles.chipLg, { backgroundColor: proGold.fill }]}>
          <Text style={[styles.chipText, { color: proGold.ink }]}>PRO</Text>
        </View>
        <Text style={[typeScale.title2, { color: colors.text }]} accessibilityRole="header">Fokus rejimi Pro bilan</Text>
        <Text style={[typeScale.body, { color: colors.textMuted }]}>
          Sinab koʻrdingiz. Endi uni xohlagan paytda yoqing va oʻzingizga moslang.
        </Text>
        <View style={[styles.perks, { backgroundColor: colors.surfaceRaised }]}>
          <MiniBar tabs={PRESET} width={200} />
          {perks.map(p => (
            <View key={p} style={styles.perk}>
              <Check size={SMALL_ICON} color={colors.successText} strokeWidth={iconStroke} />
              <Text style={[typeScale.callout, styles.flex, { color: colors.text }]}>{p}</Text>
            </View>
          ))}
        </View>
        <Text style={[typeScale.callout, { color: colors.textMuted }]}>
          1, 3 yoki 12 oy · bir martalik toʻlov, avtomatik yangilanmaydi
        </Text>
        <View style={styles.actions}>
          <Pressable
            onPress={onPro}
            disabled={!PRO_PURCHASE_ENABLED}
            haptic="light"
            accessibilityRole="button"
            style={[styles.proBtn, { backgroundColor: proGold.fill, opacity: PRO_PURCHASE_ENABLED ? 1 : 0.5 }]}
          >
            <Text style={[typeScale.headline, { color: proGold.ink, fontFamily: fonts.bold }]}>
              {PRO_PURCHASE_ENABLED ? 'Pro bilan oching' : 'Tez orada'}
            </Text>
          </Pressable>
          <Button label="Hozircha emas" variant="ghost" fullWidth onPress={onClose} />
        </View>
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    marginHorizontal: layout.gutter, marginTop: space.sm, minHeight: 64, borderRadius: radius.lg, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', paddingLeft: space.sm, paddingRight: space.xs, gap: space.sm,
  },
  icon: { width: avatarSize.row, height: avatarSize.row, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minHeight: 64, justifyContent: 'center' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: space.xxs + 2 },
  chip: { borderRadius: space.xxs + 2, paddingHorizontal: space.xxs + 2, height: 18, justifyContent: 'center' },
  chipLg: { alignSelf: 'flex-start', height: 24, paddingHorizontal: space.xs + 1, borderRadius: radius.sm },
  chipText: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.6 },
  exit: {
    height: 36, borderRadius: radius.full, paddingLeft: space.xs + 2, paddingRight: space.sm,
    flexDirection: 'row', alignItems: 'center', gap: space.xxs + 2, minWidth: controlHeight.md,
  },
  toast: {
    position: 'absolute', left: layout.gutter, right: layout.gutter, bottom: space.md, minHeight: 52, zIndex: 10, elevation: 2,
    borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center',
    paddingLeft: space.md, paddingRight: space.xxs, gap: space.sm,
  },
  undoBtn: { minHeight: controlHeight.md, paddingHorizontal: space.sm, justifyContent: 'center' },
  sheetBody: { gap: space.md, paddingBottom: space.md },
  preview: { borderRadius: radius.lg, paddingVertical: space.sm, alignItems: 'center', gap: space.xxs + 2 },
  choices: { gap: space.xs },
  choice: {
    minHeight: 64, borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: space.sm,
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs },
  actions: { gap: space.xxs },
  list: { borderRadius: radius.lg, paddingLeft: space.sm, paddingRight: space.xxs },
  listRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingRight: space.xs },
  locked: { flexDirection: 'row', alignItems: 'center', gap: space.xxs + 2, minHeight: controlHeight.md },
  perks: { borderRadius: radius.lg, padding: space.sm, gap: space.sm, alignItems: 'stretch' },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  proBtn: { minHeight: controlHeight.lg, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
})

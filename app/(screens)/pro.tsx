/**
 * Sahifalab Pro — the one-time pass (1 / 3 / 12 months). A live hero (the
 * Oltin soat banner and Oltin halqa on your avatar), what Pro opens, the
 * three passes, then "Proʼga oʻtish": the app asks for a PAY-XXXX-YYYY code,
 * copies it and opens the pay bot, as course purchases do. The admin gives
 * Pro after checking the receipt; this screen then shows "Pro faol".
 * Lists only what Pro opens today — the AI benefits come when they exist.
 */
import React, { useCallback, useState } from 'react'
import { Linking, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
import { useFocusEffect, useIsFocused } from 'expo-router'
import { Check, Copy, Palette, Send, Sparkles, TreePine, Image as ImageIcon, CircleDot, type LucideIcon } from 'lucide-react-native'
import { pro as proApi, type ProPlan, type ProStatus } from '../../lib/api'
import { track } from '../../lib/analytics'
import { useAuthStore } from '../../stores/authStore'
import { useTheme } from '../../src/design/ThemeProvider'
import { layout, radius, space } from '../../src/design/spacing'
import { fonts, tabular, type as typeScale } from '../../src/design/typography'
import { Button, Pressable, ScreenHeader, SkeletonBlock, ToastHost, showToast } from '../../src/components/ui'
import { BannerScene } from '../../src/features/profile/cosmetics/BannerScene'
import { AvatarRing } from '../../src/features/profile/cosmetics/AvatarRing'
import { groupDigits } from '../../src/features/courses/courses'
import { uzText } from '../../src/features/today/today'

const HERO_H = 180
const GOLD = ['#F6E3A8', '#E4BE68', '#C99A3E'] as const

const BENEFITS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Palette, title: 'Mavzular', body: 'Tun, Zumrad va Sakura — butun ilova yangi rangda' },
  { icon: ImageIcon, title: 'Jonli bannerlar', body: 'Tun va Oltin soat — profilingiz tepasida' },
  { icon: CircleDot, title: 'Avatar halqalari', body: 'Shabnam, Kometa va Oltin halqa' },
  { icon: TreePine, title: 'Daraxt koʻrinishlari', body: 'Sakura va Oltin daraxt — seriyangiz daraxti' },
]

const STEPS = [
  'Ilova sizga toʻlov kodini beradi',
  'Telegram botda toʻlab, chek rasmini yuborasiz',
  'Tasdiqlangach Pro ochiladi va xabar keladi',
] as const

function monthsLabel(m: number) {
  return m === 12 ? '12 oy' : `${m} oy`
}

function dateLabel(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
}

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : ''
  if (/tadan ortiq/i.test(msg)) return msg
  return 'Kod olinmadi. Qayta urinib koʻring.'
}

export default function ProScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const focused = useIsFocused()
  const { width } = useWindowDimensions()
  const user = useAuthStore(s => s.user)
  const [plans, setPlans] = useState<ProPlan[] | null>(null)
  const [status, setStatus] = useState<ProStatus | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [months, setMonths] = useState<number>(12)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    proApi.plans().then(r => setPlans(r.plans)).catch(() => {})
    proApi.status()
      .then(s => { setStatus(s); setUnavailable(false); if (s.pending) setMonths(s.pending.months) })
      .catch((e: any) => { if (e?.status === 503) setUnavailable(true) })
  }, [])
  useFocusEffect(useCallback(() => { load() }, [load]))

  const name = uzText(user?.first_name ?? '')
  const heroW = width - layout.gutter * 2
  const pending = status?.pending ?? null

  async function buy() {
    setBusy(true)
    try {
      const code = await proApi.requestCode(months)
      await Clipboard.setStringAsync(code.reference_code).catch(() => {})
      track('purchase_start', { product: 'pro', months, price: code.amount })
      showToast('info', `${code.reference_code} nusxalandi — botga yuboring`)
      Linking.openURL(code.telegram_bot_url).catch(() => {})
      load()
    } catch (e) {
      showToast('error', friendlyError(e))
    }
    setBusy(false)
  }

  async function copyCode() {
    if (!pending) return
    await Clipboard.setStringAsync(pending.reference_code).catch(() => {})
    showToast('success', 'Kod nusxalandi')
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScreenHeader title="Sahifalab Pro" />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.xxl }]}>
        {/* Hero: the Afsonaviy look, live */}
        <View style={[styles.hero, { height: HERO_H }]}>
          <BannerScene kind="oltin" width={heroW} height={HERO_H} animated={focused} />
          <View style={styles.heroContent}>
            <AvatarRing kind="oltin" size={84} name={name} id={user?.telegram_id} uri={user?.photo_url} bg="#2A1B0E" animated={focused} />
            <View style={styles.flex}>
              <View style={styles.proPill}><Text style={styles.proPillText}>PRO</Text></View>
              <Text style={styles.heroTitle}>Profilingizni ajralib turadigan qiling</Text>
            </View>
          </View>
        </View>

        {/* Your Pro / open request */}
        {status?.is_pro && (
          <View style={[styles.state, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.stateIcon, { backgroundColor: colors.greenSoft }]}>
              <Check size={18} color={colors.successText} strokeWidth={3} />
            </View>
            <View style={styles.flex}>
              <Text style={[typeScale.headline, { color: colors.text }]}>Pro faol · {status.days_left} kun qoldi</Text>
              <Text style={[typeScale.callout, { color: colors.textMuted }]}>{dateLabel(status.pro_until)} gacha. Uzaytirsangiz, kunlar ustiga qoʻshiladi.</Text>
            </View>
          </View>
        )}
        {pending && (
          <View style={[styles.state, { backgroundColor: colors.surface, borderColor: colors.orangeLine }]}>
            <View style={styles.flex}>
              <Text style={[typeScale.headline, { color: colors.text }]}>
                {pending.status === 'paid' ? 'Chek tekshirilmoqda' : 'Toʻlov kutilmoqda'} · {monthsLabel(pending.months)}
              </Text>
              <Text style={[typeScale.callout, { color: colors.textMuted }]}>
                {pending.status === 'paid'
                  ? 'Odatda 5–30 daqiqa. Tasdiqlangach Pro ochiladi va xabar keladi.'
                  : `Kodni botga yuboring, ${groupDigits(pending.amount)} soʻm toʻlab, chek rasmini joʻnating.`}
              </Text>
              <Pressable onPress={copyCode} accessibilityLabel={`Kodni nusxalash: ${pending.reference_code}`} style={[styles.code, { backgroundColor: colors.surfaceRaised }]}>
                <Text style={[styles.codeText, tabular, { color: colors.text }]}>{pending.reference_code}</Text>
                <Copy size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>
        )}

        {/* What Pro opens */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[typeScale.overline, { color: colors.textMuted }]}>Pro bilan ochiladi</Text>
          {BENEFITS.map(b => (
            <View key={b.title} style={styles.benefit}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.accentSoft }]}>
                <b.icon size={18} color={colors.accentText} />
              </View>
              <View style={styles.flex}>
                <Text style={[typeScale.label, { color: colors.text }]}>{b.title}</Text>
                <Text style={[typeScale.callout, { color: colors.textMuted }]}>{b.body}</Text>
              </View>
            </View>
          ))}
          <Text style={[typeScale.callout, { color: colors.textMuted }]}>
            Seriya, bosqich, XP va nishonlar sotilmaydi — hamma uchun teng. Yangi imkoniyatlar qoʻshilib boradi.
          </Text>
        </View>

        {/* Passes */}
        {unavailable ? (
          <Text style={[typeScale.body, styles.center, { color: colors.textMuted }]}>Pro tez orada ochiladi.</Text>
        ) : !plans ? (
          <View style={styles.plans}>{[0, 1, 2].map(i => <SkeletonBlock key={i} height={86} borderRadius={18} />)}</View>
        ) : (
          <View style={styles.plans}>
            {[...plans].reverse().map(plan => {
              const on = plan.months === months
              return (
                <Pressable
                  key={plan.months}
                  onPress={() => setMonths(plan.months)}
                  accessibilityLabel={`${monthsLabel(plan.months)}, ${groupDigits(plan.price)} soʻm`}
                  accessibilityState={{ selected: on }}
                  style={[styles.plan, { backgroundColor: colors.surface, borderColor: on ? colors.accent : colors.border, borderWidth: on ? 2 : 1 }]}
                >
                  <View style={[styles.radio, { borderColor: on ? colors.accent : colors.border }]}>
                    {on && <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />}
                  </View>
                  <View style={styles.flex}>
                    <View style={styles.planTitleRow}>
                      <Text style={[typeScale.headline, { color: colors.text }]}>{monthsLabel(plan.months)}</Text>
                      {plan.months === 12 && (
                        <View style={styles.best}><Text style={styles.bestText}>Eng foydali</Text></View>
                      )}
                    </View>
                    <Text style={[typeScale.callout, { color: colors.textMuted }]}>
                      {plan.months > 1 ? `oyiga ${groupDigits(plan.per_month)} soʻm` : 'Sinab koʻrish uchun'}
                      {plan.saving_percent > 0 ? ` · ${plan.saving_percent}% tejaysiz` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.price, tabular, { color: colors.text }]}>{groupDigits(plan.price)} soʻm</Text>
                </Pressable>
              )
            })}
          </View>
        )}

        {!unavailable && (
          <>
            <Button
              label={status?.is_pro ? 'Muddatni uzaytirish' : 'Proʼga oʻtish'}
              icon={Send}
              size="lg"
              fullWidth
              loading={busy}
              disabled={!plans}
              onPress={buy}
            />
            <Text style={[typeScale.callout, styles.center, { color: colors.textMuted }]}>
              Bir martalik toʻlov — avtomatik yechilmaydi
            </Text>
            <View style={styles.steps}>
              {STEPS.map((s, i) => (
                <View key={s} style={styles.step}>
                  <View style={[styles.stepNum, { backgroundColor: colors.surfaceRaised }]}>
                    <Text style={[typeScale.caption, { color: colors.text }]}>{i + 1}</Text>
                  </View>
                  <Text style={[typeScale.callout, styles.flex, { color: colors.textMuted }]}>{s}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        <View style={styles.footNote}>
          <Sparkles size={14} color={colors.textMuted} />
          <Text style={[typeScale.caption, { color: colors.textMuted }]}>
            Bepul imkoniyatlar bepulligicha qoladi
          </Text>
        </View>
      </ScrollView>
      <ToastHost />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center' },
  body: { paddingHorizontal: layout.gutter, gap: space.md },
  hero: { borderRadius: 24, overflow: 'hidden' },
  heroContent: { position: 'absolute', left: space.md, right: space.md, bottom: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md },
  proPill: { alignSelf: 'flex-start', backgroundColor: GOLD[1], borderRadius: 7, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 4 },
  proPillText: { color: '#3A2A00', fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.8 },
  heroTitle: {
    color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 19, lineHeight: 24,
    textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  state: { flexDirection: 'row', gap: space.sm, borderRadius: 20, borderWidth: 1, padding: space.md },
  stateIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  code: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm, borderRadius: radius.md, paddingHorizontal: space.sm, paddingVertical: space.xs + 2 },
  codeText: { fontFamily: fonts.bold, fontSize: 17, letterSpacing: 1 },
  card: { borderRadius: 20, borderWidth: 1, padding: space.md, gap: space.sm + 2 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  benefitIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  plans: { gap: space.sm },
  plan: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: 18, padding: space.md },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  best: { backgroundColor: GOLD[1], borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  bestText: { color: '#3A2A00', fontFamily: fonts.extrabold, fontSize: 11 },
  price: { fontFamily: fonts.extrabold, fontSize: 16 },
  steps: { gap: space.xs, marginTop: space.xs },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  footNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: space.xs },
})

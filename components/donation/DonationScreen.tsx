import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ArrowLeft, ArrowClockwise } from 'phosphor-react-native'
import { useSharedValue } from 'react-native-reanimated'
import { typography } from '../../lib/constants'
import { donation as donationApi, type PaymentMethod } from '../../lib/api'
import CardDeck from './CardDeck'
import PageIndicator from './PageIndicator'
import CopyRow from './CopyRow'
import TransparencyNote from './TransparencyNote'
import EmptyMethods from './EmptyMethods'
import { donationColors as dc, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS } from './donationTheme'

const CACHE_KEY = 'donation_methods_cache_v1'
const BOT_URL = 'https://t.me/Sahifalab_hub_bot'

function track(event_type: string, meta: Record<string, unknown> = {}) {
  // Best-effort, fire-and-forget — a failed analytics beacon must never
  // affect the donation flow itself.
  import('../../lib/api').then(({ request }) =>
    request('/api/analytics/track', {
      method: 'POST',
      body: JSON.stringify({ events: [{ event_type, target_id: 0, meta: { ...meta, surface: 'app' } }] }),
    }).catch(() => {}),
  ).catch(() => {})
}

type LoadState = 'loading' | 'ready' | 'empty' | 'error'

export default function DonationScreen() {
  const router = useRouter()
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [active, setActive] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const trackedView = useRef(false)
  const sheenTrigger = useSharedValue(0)

  const load = useCallback(async () => {
    setState('loading')
    try {
      const res = await donationApi.methods()
      const list = res.methods ?? []
      setMethods(list)
      setActive(0)
      setState(list.length ? 'ready' : 'empty')
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(list)).catch(() => {})
    } catch {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY)
        if (cached) {
          const list: PaymentMethod[] = JSON.parse(cached)
          setMethods(list)
          setActive(0)
          setState(list.length ? 'ready' : 'empty')
          return
        }
      } catch { /* fall through to error */ }
      setState('error')
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (state === 'ready' && !trackedView.current) {
      trackedView.current = true
      track('donation_screen_view')
    }
  }, [state])

  function handleActiveChange(index: number) {
    setActive(index)
    const m = methods[index]
    if (m) track('donation_card_swiped', { index, methodId: m.id })
  }

  function handleCopied() {
    const m = methods[active]
    if (m) track('donation_number_copied', { methodId: m.id, numberType: m.numberType })
    sheenTrigger.value = sheenTrigger.value + 1
  }

  const activeMethod = methods[Math.min(active, methods.length - 1)]

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      {/* Nav row */}
      <View style={s.navRow}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))}
          hitSlop={10}
          style={s.backBtn}
        >
          <ArrowLeft size={18} color={dc.navy} weight="bold" />
        </Pressable>
        <Pressable onPress={() => Linking.openURL(BOT_URL)} style={s.helpPill}>
          <Text style={s.helpPillText}>Savol bormi?</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={s.title} maxFontSizeMultiplier={1.3}>Qo'llab-quvvatlash</Text>
        <Text style={s.body}>
          Sahifalab har kuni minglab o'quvchi uchun bepul. Xohlagan miqdorda qo'shilishingiz — ilovani tirik saqlaydi.
        </Text>

        {state === 'loading' && <LoadingBlock />}

        {state === 'error' && (
          <View style={s.placeholderWrap}>
            <Text style={s.errorTitle}>Ma'lumot yuklanmadi</Text>
            <Pressable onPress={load} style={s.retryBtn}>
              <ArrowClockwise size={15} color="#fff" weight="bold" />
              <Text style={s.retryBtnText}>Qayta urinish</Text>
            </Pressable>
          </View>
        )}

        {state === 'empty' && <EmptyMethods />}

        {state === 'ready' && (
          <>
            <View style={s.sectionLabelRow}>
              <Text style={s.sectionLabel} allowFontScaling={false}>TO'LOV USULI</Text>
              <View style={s.hr} />
              {methods.length > 1 && (
                <Text style={s.counter} allowFontScaling={false}>{active + 1} / {methods.length}</Text>
              )}
            </View>

            <CardDeck
              methods={methods}
              activeIndex={active}
              onActiveChange={handleActiveChange}
              disabled={swiping}
              sheenTrigger={sheenTrigger}
            />

            <View style={{ marginTop: 12, marginBottom: 16 }}>
              <PageIndicator count={methods.length} active={active} />
            </View>

            {activeMethod && (
              <CopyRow method={activeMethod} swiping={swiping} onCopied={handleCopied} />
            )}

            <View style={{ marginTop: 20 }}>
              <TransparencyNote />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function LoadingBlock() {
  return (
    <View style={s.placeholderWrap}>
      <View style={[s.shimmerCard, { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: CARD_RADIUS }]} />
      <View style={[s.shimmerCard, { width: '100%', maxWidth: 340, height: 76, borderRadius: 22, marginTop: 16 }]} />
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: dc.screenBg },
  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 14, backgroundColor: dc.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  helpPill: {
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: dc.surface2,
  },
  helpPillText: { fontSize: 11, fontFamily: typography.fontFamily.semibold, color: dc.textMuted },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 27, fontFamily: typography.fontFamily.extrabold, letterSpacing: -0.03 * 27, color: dc.navy, marginTop: 8 },
  body: { marginTop: 8, fontSize: 13.5, lineHeight: 13.5 * 1.6, fontFamily: typography.fontFamily.medium, color: dc.textBody, maxWidth: 340 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 28, marginBottom: 14 },
  sectionLabel: { fontSize: 9.5, fontFamily: typography.fontFamily.bold, letterSpacing: 0.16 * 9.5, color: dc.textFaint },
  hr: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: dc.hairline },
  counter: { fontSize: 10, fontFamily: typography.fontFamily.mono, fontWeight: '700', color: dc.textFaint },
  placeholderWrap: { alignItems: 'center', marginTop: 32 },
  shimmerCard: { backgroundColor: dc.surface2 },
  errorTitle: { fontSize: 14, fontFamily: typography.fontFamily.bold, color: dc.navy, marginBottom: 14 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: dc.accent,
    borderRadius: 999, paddingVertical: 12, paddingHorizontal: 20,
  },
  retryBtnText: { color: '#fff', fontSize: 13, fontFamily: typography.fontFamily.bold },
})

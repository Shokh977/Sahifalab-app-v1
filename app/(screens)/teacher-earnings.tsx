import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, TextInput, Modal, Alert,
  KeyboardAvoidingView, Platform, RefreshControl, Animated,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  ArrowLeft, Wallet, TrendingDown, CheckCircle2,
  Clock, XCircle, ChevronRight, X,
} from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { wallet as walletApi, type WalletBalance, type PayoutRequest } from '../../lib/api'
import { typography, spacing, radius } from '../../lib/constants'

const PLATFORM_FEE  = 0.30
const MIN_WITHDRAW  = 50_000
const MAX_WITHDRAW  = 10_000_000

function fmtUzs(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(n)) + ' UZS'
}

function relDate(iso: string) {
  const d    = new Date(iso)
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Bugun'
  if (days === 1) return 'Kecha'
  if (days  < 7) return `${days} kun oldin`
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function StatusChip({ status, c }: { status: PayoutRequest['status']; c: any }) {
  const cfg = {
    pending:  { label: "Ko'rib chiqilmoqda", color: '#f59e0b', Icon: Clock      },
    approved: { label: 'Tasdiqlandi',        color: '#4ade80', Icon: CheckCircle2 },
    rejected: { label: 'Rad etildi',         color: '#f87171', Icon: XCircle     },
  }[status]
  return (
    <View style={[chip.root, { backgroundColor: `${cfg.color}18` }]}>
      <cfg.Icon size={11} color={cfg.color} strokeWidth={2} />
      <Text style={[chip.label, { color: cfg.color, fontFamily: typography.fontFamily.medium }]}>
        {cfg.label}
      </Text>
    </View>
  )
}
const chip = StyleSheet.create({
  root:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  label: { fontSize: 11 },
})

// ── Withdraw modal ─────────────────────────────────────────────────────────────

function WithdrawModal({
  visible, available, onClose, onSuccess, c,
}: {
  visible:   boolean
  available: number
  onClose:   () => void
  onSuccess: () => void
  c:         any
}) {
  const insets = useSafeAreaInsets()
  const [amount,     setAmount]     = useState('')
  const [card,       setCard]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mounted,    setMounted]    = useState(visible)
  const backdropAnim = useRef(new Animated.Value(0)).current
  const slideAnim    = useRef(new Animated.Value(500)).current

  useEffect(() => {
    if (visible) {
      setMounted(true)
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim,    { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim,    { toValue: 500, duration: 200, useNativeDriver: true }),
      ]).start(() => { setMounted(false); slideAnim.setValue(500) })
    }
  }, [visible])

  function formatCard(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 16)
    return digits.replace(/(.{4})/g, '$1 ').trim()
  }

  async function submit() {
    const amt = parseFloat(amount.replace(/\s/g, ''))
    const cardDigits = card.replace(/\s/g, '')
    if (isNaN(amt) || amt < MIN_WITHDRAW) {
      Alert.alert('Xato', `Minimal miqdor: ${fmtUzs(MIN_WITHDRAW)}`)
      return
    }
    if (amt > available) {
      Alert.alert('Xato', "Balansingizdan ko'p miqdor kiritdingiz")
      return
    }
    if (cardDigits.length < 8) {
      Alert.alert('Xato', "To'g'ri karta raqamini kiriting")
      return
    }
    setSubmitting(true)
    try {
      await walletApi.withdraw(amt, card)
      onSuccess()
      onClose()
      setAmount('')
      setCard('')
    } catch (e: any) {
      Alert.alert('Xatolik', e.message ?? 'So\'rov yuborishda xatolik')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[modal.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={modal.overlay}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[modal.sheet, { backgroundColor: c.bgSecondary, paddingBottom: (insets.bottom || 0) + 24, transform: [{ translateY: slideAnim }] }]}
        >
            <View style={[modal.handle, { backgroundColor: c.border }]} />

            <View style={modal.header}>
              <Text style={[modal.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
                Pul yechish
              </Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <X size={20} color={c.textMuted} />
              </Pressable>
            </View>

            <Text style={[modal.balanceNote, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              Mavjud balans: <Text style={{ color: c.textPrimary, fontFamily: typography.fontFamily.semibold }}>{fmtUzs(available)}</Text>
            </Text>

            <Text style={[modal.label, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
              Miqdor (UZS)
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder={`Min: ${fmtUzs(MIN_WITHDRAW)}`}
              placeholderTextColor={c.textDisabled}
              style={[modal.input, { color: c.textPrimary, backgroundColor: c.bgTertiary, fontFamily: typography.fontFamily.regular }]}
            />

            <Text style={[modal.label, { color: c.textSecondary, fontFamily: typography.fontFamily.medium, marginTop: spacing.base }]}>
              Karta raqami
            </Text>
            <TextInput
              value={card}
              onChangeText={t => setCard(formatCard(t))}
              keyboardType="numeric"
              placeholder="8600 1234 5678 9012"
              placeholderTextColor={c.textDisabled}
              style={[modal.input, { color: c.textPrimary, backgroundColor: c.bgTertiary, fontFamily: typography.fontFamily.regular }]}
            />

            <Text style={[modal.hint, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
              Platforma ulushi 30% chegirilib, qolgan 70% kartangizga o'tkaziladi. So'rov admin tomonidan ko'rib chiqiladi.
            </Text>

            <Pressable
              onPress={submit}
              disabled={submitting}
              style={[modal.btn, { backgroundColor: c.accentPrimary, opacity: submitting ? 0.6 : 1 }]}
            >
              {submitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={[modal.btnText, { fontFamily: typography.fontFamily.semibold }]}>
                    So'rov yuborish
                  </Text>
              }
            </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const modal = StyleSheet.create({
  backdrop:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  overlay:     { flex: 1, justifyContent: 'flex-end' },
  sheet:       { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.base },
  handle:      { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.base },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.base },
  title:       { fontSize: 18 },
  balanceNote: { fontSize: 13, marginBottom: spacing.base },
  label:       { fontSize: 13, marginBottom: 6 },
  input: {
    borderRadius:      radius.input,
    paddingHorizontal: spacing.sm,
    paddingVertical:   10,
    fontSize:          15,
  },
  hint:    { fontSize: 12, lineHeight: 17, marginTop: spacing.base, marginBottom: spacing.base },
  btn:     { borderRadius: radius.full, paddingVertical: 13, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15 },
})

// ── Main screen ────────────────────────────────────────────────────────────────

export default function TeacherEarningsScreen() {
  const { c }  = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [balance,    setBalance]    = useState<WalletBalance | null>(null)
  const [history,    setHistory]    = useState<PayoutRequest[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showModal,  setShowModal]  = useState(false)

  const load = useCallback(async () => {
    try {
      const [bal, hist] = await Promise.all([
        walletApi.balance(),
        walletApi.history(),
      ])
      setBalance(bal)
      setHistory(hist.history)
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [])

  const onRefresh = useCallback(() => { setRefreshing(true); load() }, [load])

  const available = balance?.available_balance ?? 0

  return (
    <View style={[s.root, { backgroundColor: c.bgPrimary }]}>
      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <ArrowLeft size={22} color={c.textPrimary} />
        </Pressable>
        <Text style={[s.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Daromad
        </Text>
        <View style={{ width: 34 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.accentPrimary} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accentPrimary} colors={[c.accentPrimary]} />}
        >
          {/* ── Balance cards ── */}
          <View style={s.cardsRow}>
            <View style={[s.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
              <View style={[s.cardIcon, { backgroundColor: 'rgba(74,222,128,0.12)' }]}>
                <Wallet size={18} color="#4ade80" strokeWidth={1.8} />
              </View>
              <Text style={[s.cardLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                Mavjud balans
              </Text>
              <Text style={[s.cardValue, { color: '#4ade80', fontFamily: typography.fontFamily.bold }]}>
                {fmtUzs(available)}
              </Text>
            </View>

            <View style={[s.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
              <View style={[s.cardIcon, { backgroundColor: 'rgba(251,191,36,0.12)' }]}>
                <Clock size={18} color="#f59e0b" strokeWidth={1.8} />
              </View>
              <Text style={[s.cardLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                Kutilmoqda
              </Text>
              <Text style={[s.cardValue, { color: '#f59e0b', fontFamily: typography.fontFamily.bold }]}>
                {fmtUzs(balance?.pending_withdrawal ?? 0)}
              </Text>
            </View>

            <View style={[s.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
              <View style={[s.cardIcon, { backgroundColor: 'rgba(148,163,184,0.12)' }]}>
                <TrendingDown size={18} color="#94a3b8" strokeWidth={1.8} />
              </View>
              <Text style={[s.cardLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                Yechib olindi
              </Text>
              <Text style={[s.cardValue, { color: c.textSecondary, fontFamily: typography.fontFamily.bold }]}>
                {fmtUzs(balance?.withdrawn_total ?? 0)}
              </Text>
            </View>
          </View>

          {/* ── Fee breakdown ── */}
          <View style={[s.section, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
              Daromad ulushi
            </Text>
            <View style={s.feeRow}>
              <Text style={[s.feeLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Platforma ulushi
              </Text>
              <Text style={[s.feeVal, { color: '#f87171', fontFamily: typography.fontFamily.medium }]}>
                30%
              </Text>
            </View>
            <View style={[s.feeDivider, { backgroundColor: c.border }]} />
            <View style={s.feeRow}>
              <Text style={[s.feeLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Sizning ulushingiz
              </Text>
              <Text style={[s.feeVal, { color: '#4ade80', fontFamily: typography.fontFamily.semibold }]}>
                70%
              </Text>
            </View>
            <Text style={[s.feeNote, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
              Minimal yechib olish miqdori: {fmtUzs(MIN_WITHDRAW)}
            </Text>
          </View>

          {/* ── History ── */}
          <Text style={[s.histTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            So'rovlar tarixi
          </Text>

          {history.length === 0 ? (
            <View style={s.emptyWrap}>
              <Wallet size={40} color={c.textDisabled} strokeWidth={1.5} />
              <Text style={[s.emptyText, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
                Hali hech qanday so'rov yo'q
              </Text>
            </View>
          ) : (
            <View style={[s.histList, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
              {history.map((item, idx) => (
                <View key={item.id}>
                  {idx > 0 && <View style={[s.histDivider, { backgroundColor: c.border }]} />}
                  <View style={s.histRow}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[s.histAmount, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                        {fmtUzs(item.amount)}
                      </Text>
                      <Text style={[s.histCard, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                        {item.card_number}
                      </Text>
                      {item.admin_note ? (
                        <Text style={[s.histNote, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
                          {item.admin_note}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <StatusChip status={item.status} c={c} />
                      <Text style={[s.histDate, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
                        {relDate(item.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Fixed withdraw button ── */}
      {!loading && (
        <View style={[s.bottomBar, { paddingBottom: insets.bottom + spacing.sm, borderTopColor: c.border, backgroundColor: c.bgPrimary }]}>
          <Pressable
            onPress={() => setShowModal(true)}
            disabled={available < MIN_WITHDRAW}
            style={[s.withdrawBtn, { backgroundColor: available >= MIN_WITHDRAW ? c.accentPrimary : c.bgTertiary }]}
          >
            <Wallet size={18} color={available >= MIN_WITHDRAW ? '#fff' : c.textDisabled} />
            <Text style={[s.withdrawBtnText, {
              color:      available >= MIN_WITHDRAW ? '#fff' : c.textDisabled,
              fontFamily: typography.fontFamily.semibold,
            }]}>
              {available >= MIN_WITHDRAW ? 'Pul yechish' : `Min. ${fmtUzs(MIN_WITHDRAW)} kerak`}
            </Text>
          </Pressable>
        </View>
      )}

      <WithdrawModal
        visible={showModal}
        available={available}
        onClose={() => setShowModal(false)}
        onSuccess={load}
        c={c}
      />
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom:     spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 34, alignItems: 'flex-start' },
  title:   { fontSize: 18 },

  cardsRow: {
    flexDirection:     'row',
    gap:               spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.base,
  },
  card: {
    flex:          1,
    borderRadius:  radius['2xl'],
    borderWidth:   1,
    padding:       spacing.sm,
    gap:           4,
    alignItems:    'center',
  },
  cardIcon:  { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  cardLabel: { fontSize: 11, textAlign: 'center' },
  cardValue: { fontSize: 13, textAlign: 'center' },

  section: {
    marginHorizontal: spacing.base,
    marginTop:        spacing.base,
    borderRadius:     radius['2xl'],
    borderWidth:      1,
    padding:          spacing.base,
    gap:              10,
  },
  sectionTitle: { fontSize: 14, marginBottom: 2 },
  feeRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feeLabel:     { fontSize: 13 },
  feeVal:       { fontSize: 14 },
  feeDivider:   { height: StyleSheet.hairlineWidth },
  feeNote:      { fontSize: 11, marginTop: 2 },

  histTitle: {
    fontSize:          15,
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.base,
    paddingBottom:     spacing.sm,
  },
  histList: {
    marginHorizontal: spacing.base,
    borderRadius:     radius['2xl'],
    borderWidth:      1,
    overflow:         'hidden',
  },
  histRow: {
    flexDirection:     'row',
    alignItems:        'flex-start',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm + 2,
    gap:               spacing.sm,
  },
  histDivider: { height: StyleSheet.hairlineWidth },
  histAmount:  { fontSize: 14 },
  histCard:    { fontSize: 12 },
  histNote:    { fontSize: 11 },
  histDate:    { fontSize: 11 },

  emptyWrap: { alignItems: 'center', gap: spacing.sm, paddingVertical: 40 },
  emptyText: { fontSize: 14 },

  bottomBar: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.sm,
    borderTopWidth:    StyleSheet.hairlineWidth,
  },
  withdrawBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing.sm,
    borderRadius:   radius.full,
    paddingVertical: 14,
  },
  withdrawBtnText: { fontSize: 15 },
})

import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, RefreshControl, Modal,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, Snowflake, Info, X } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { streaks as streaksApi } from '../../lib/api'
import type { StreakDetail, StreakCalendarDay, StreakMilestone } from '../../lib/api'
import { FreezeSheet } from '../../components/streak/FreezeSheet'
import { StreakLostModal } from '../../components/streak/StreakLostModal'
import { TreeStage, treeStageFromStreak } from '../../components/ui/TreeStage'
import { useAuthStore } from '../../stores/authStore'
import { useDashboardStore } from '../../stores/dashboardStore'



const MILESTONE_DAYS = [3, 7, 14, 30, 60, 100, 200, 365]
const MILESTONE_EMOJI: Record<number, string> = {
  3: '🌱', 7: '🌿', 14: '🌳', 30: '🏆', 60: '🎖️', 100: '💎', 200: '👑', 365: '🌟',
}
const MILESTONE_NAMES: Record<number, string> = {
  3:   "Birinchi unish",
  7:   "Haftalik o'sish",
  14:  "Ikki haftalik daraxt",
  30:  "Oylik muvaffaqiyat",
  60:  "Ikki oylik qoʻrgʻon",
  100: "Yuz kunlik afsonaviy",
  200: "Ikki yuz kunlik legenda",
  365: "Yillik ulug' daraxt",
}

const WEEKDAY_LABELS = ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sh', 'Ya']

const XP_ROWS = [
  { label: '⏱ Fokus taymer',      value: '1.66 XP/daq', sub: '≈ 100 XP / soat' },
  { label: '📝 Test topshirish',   value: '+25 XP',      sub: 'Kunlik limit: 100 XP' },
  { label: '🎓 Kurs tugatish',     value: '+200 XP',     sub: 'Bir marta, har kurs' },
  { label: '🔥 7 kunlik streak',   value: '+50 XP',      sub: 'Bonus' },
  { label: '⚡ 14 kunlik streak',  value: '+120 XP',     sub: 'Bonus' },
  { label: '🏆 30 kunlik streak',  value: '+300 XP',     sub: 'Bonus' },
  { label: '👑 100 kunlik streak', value: '+1000 XP',    sub: 'Afsonaviy bonus' },
]

// ── Calendar colours ─────────────────────────────────────────────────────────
const CAL = {
  studied: { cell: '#0d2c18', num: '#4ade80', conn: '#166534' },
  frozen:  { cell: '#0a1a3a', num: '#60a5fa', conn: '#1e3a8a' },
  missed:  { cell: '#2c0a0a', num: '#f87171', conn: null      },
  future:  { cell: null,      num: null,      conn: null      },
}

// ── Calendar cell ─────────────────────────────────────────────────────────────
function CalCell({
  day, c, isToday, connectLeft, connectRight,
}: {
  day:          StreakCalendarDay | null
  c:            ReturnType<typeof useTheme>['c']
  isToday:      boolean
  connectLeft:  boolean
  connectRight: boolean
}) {
  if (!day) {
    return <View style={styles.calSlot} />
  }

  const dayNum = new Date(day.date).getDate()
  const pal    = CAL[day.status as keyof typeof CAL] ?? CAL.future

  const cellBg   = pal.cell ?? c.bgTertiary
  const numColor = pal.num  ?? c.textMuted
  const connBg   = pal.conn ?? 'transparent'

  return (
    <View style={styles.calSlot}>
      <View style={[styles.connHalf, { backgroundColor: connectLeft ? connBg : 'transparent' }]} />

      <View style={[
        styles.calCell,
        { backgroundColor: cellBg },
        isToday && { borderWidth: 2, borderColor: c.accentPrimary },
      ]}>
        <Text style={[styles.calNum, { color: numColor, fontFamily: typography.fontFamily.bold }]}>
          {dayNum}
        </Text>
      </View>

      <View style={[styles.connHalf, { backgroundColor: connectRight ? connBg : 'transparent' }]} />
    </View>
  )
}

// ── Milestone row ─────────────────────────────────────────────────────────────
function MilestoneRow({
  m, isNext, isLast, streakDays, c,
}: {
  m: StreakMilestone
  isNext: boolean
  isLast: boolean
  streakDays: number
  c: ReturnType<typeof useTheme>['c']
}) {
  const emoji = MILESTONE_EMOJI[m.days] ?? '🏅'
  const name  = MILESTONE_NAMES[m.days] ?? `${m.days} kun`
  const stage = treeStageFromStreak(m.days)

  return (
    <View style={styles.milestoneRow}>
      {/* Connector line */}
      {!isLast && (
        <View style={[styles.connectorLine, { backgroundColor: m.earned ? '#34d399' : c.bgTertiary }]} />
      )}

      {/* Tree icon with optional ring */}
      <View style={[
        styles.milestoneTreeWrap,
        m.earned   && { borderColor: '#34d399', borderWidth: 2 },
        isNext     && { borderColor: c.accentPrimary, borderWidth: 2 },
        !m.earned && !isNext && { borderColor: c.border, borderWidth: 1 },
      ]}>
        <TreeStage stage={stage} health={m.earned ? 'healthy' : isNext ? 'healthy' : 'wilting'} size={44} />
      </View>

      {/* Text */}
      <View style={styles.milestoneInfo}>
        <View style={styles.milestoneHeader}>
          <Text style={[styles.milestoneName, { color: m.earned ? c.textPrimary : isNext ? c.textPrimary : c.textMuted, fontFamily: typography.fontFamily.semibold }]}>
            {emoji} {name}
          </Text>
          {m.earned
            ? <Text style={[styles.earnedBadge, { color: '#34d399', fontFamily: typography.fontFamily.bold }]}>✓ Olindi</Text>
            : <Text style={[styles.pctText, { color: isNext ? c.accentPrimary : c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                {m.days} kun
              </Text>
          }
        </View>

        {/* Progress bar only for "next" milestone */}
        {isNext && !m.earned && (
          <View>
            <View style={[styles.milestoneTrack, { backgroundColor: c.bgTertiary }]}>
              <View style={[styles.milestoneFill, { width: `${m.pct}%` as any, backgroundColor: c.accentPrimary }]} />
            </View>
            <Text style={[styles.progressHint, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              {streakDays} / {m.days} kun · {m.pct}%
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function StreakDetailScreen() {
  const { c, theme } = useTheme()
  const isDark  = theme === 'dark'
  const router  = useRouter()
  const insets  = useSafeAreaInsets()
  const user    = useAuthStore(s => s.user)
  const dashData = useDashboardStore(s => s.data)

  const [data, setData]               = useState<StreakDetail | null>(null)
  const [loading, setLoading]         = useState(true)
  const [refreshing, setRefreshing]   = useState(false)
  const [loadError, setLoadError]     = useState<string | null>(null)
  const [showFreeze, setShowFreeze]         = useState(false)
  const [showMilestones, setShowMilestones] = useState(false)
  const [showLostModal, setShowLostModal]   = useState(false)
  const [prevStreakDays, setPrevStreakDays] = useState(0)
  const hasShownLostRef = useRef(false)
  const [localXp, setLocalXp]         = useState(user?.total_xp ?? 0)
  const [localFreeze, setLocalFreeze] = useState(
    () => dashData?.focusStats.freeze_count ?? 0
  )

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    setLoadError(null)
    try {
      const telegramId = useAuthStore.getState().user?.telegram_id
      const res = await streaksApi.detail(telegramId)
      setLocalFreeze(res.freeze_count)
      // Show streak-lost modal once per session when streak is broken
      if (!isRefresh && !hasShownLostRef.current && !res.is_active && res.streak_days > 0) {
        hasShownLostRef.current = true
        setPrevStreakDays(res.streak_days)
        // Display 0 in the hero — the streak is gone; keep the raw value in prevStreakDays for the modal
        setData({ ...res, streak_days: 0 })
        setTimeout(() => setShowLostModal(true), 500)
      } else {
        setData(res)
      }
    } catch (e: any) {
      const msg = e?.message ?? "Serverdan ma'lumot olishda xatolik"
      console.error('[StreakDetail] load error:', e)
      setLoadError(msg)
    } finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { setLocalXp(user?.total_xp ?? 0) }, [user?.total_xp])

  function handlePurchased(newXp: number, newFreezeCount: number) {
    setLocalXp(newXp)
    setLocalFreeze(newFreezeCount)
    if (data) setData({ ...data, freeze_count: newFreezeCount })
  }

  async function handleUseFreeze() {
    try {
      const res = await streaksApi.useFreeze()
      setLocalFreeze(res.freeze_count)
      if (data) setData({ ...data, freeze_count: res.freeze_count, is_active: true })
      setShowLostModal(false)
      load(true)
    } catch {
      setShowLostModal(false)
    }
  }

  // Prefer API data; fall back to dashboardStore → authStore for key fields
  const streakDays    = data?.streak_days    ?? dashData?.focusStats.streak_days    ?? user?.streak_days ?? 0
  const longestStreak = data?.longest_streak ?? dashData?.focusStats.longest_streak ?? streakDays
  const weekDays      = data?.week_days      ?? 0
  const freezeCount   = data?.freeze_count   ?? localFreeze

  const stage  = treeStageFromStreak(streakDays)
  const health = data ? (data.is_active ? 'healthy' : 'frost') : 'healthy'

  // Calendar: today string for comparison
  const todayStr = new Date().toISOString().split('T')[0]

  // Group calendar by week rows (7 cells per row), padded to Monday alignment
  const calRows: (StreakCalendarDay | null)[][] = []
  if (data?.calendar.length) {
    const firstDate = new Date(data.calendar[0].date)
    const firstDow  = (firstDate.getDay() + 6) % 7   // 0=Mon … 6=Sun
    const padded: (StreakCalendarDay | null)[] = [
      ...Array(firstDow).fill(null),
      ...data.calendar,
    ]
    for (let i = 0; i < padded.length; i += 7) {
      const row = padded.slice(i, i + 7)
      while (row.length < 7) row.push(null)
      calRows.push(row)
    }
  }

  // Find "next" milestone index
  const nextMilestoneIdx = data
    ? data.milestones.findIndex(m => !m.earned)
    : -1

  // Hero gradient colors
  const heroGradient: [string, string] = isDark
    ? ['#1a2a1a', '#0f1a0f']
    : ['#e8f5e9', '#f1f8e9']

  if (loading) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: c.bgPrimary }]}>
        <ActivityIndicator color={c.brand} />
      </View>
    )
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.topBar, { borderBottomColor: c.border, paddingTop: insets.top + spacing.xs }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={c.textPrimary} />
        </Pressable>
        <Text style={[styles.topTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Seriya
        </Text>
        <Pressable
          style={[styles.freezeChip, { backgroundColor: '#60a5fa22', borderColor: '#60a5fa55' }]}
          onPress={() => setShowFreeze(true)}
        >
          <Snowflake size={14} color="#60a5fa" />
          <Text style={[styles.freezeChipText, { color: '#60a5fa', fontFamily: typography.fontFamily.bold }]}>
            {freezeCount}
          </Text>
        </Pressable>
      </View>

      {/* API error banner — partial data from local stores is still shown */}
      {loadError && (
        <View style={[styles.errorBanner, { backgroundColor: '#ff453a22', borderColor: '#ff453a44' }]}>
          <Text style={[styles.errorBannerText, { color: '#ff453a', fontFamily: typography.fontFamily.regular }]}>
            ⚠️ {loadError}
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true) }}
            tintColor={c.brand}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={heroGradient}
          style={styles.hero}
        >
          {/* Milestones info button */}
          <Pressable
            style={[styles.heroInfoBtn, { backgroundColor: c.bgTertiary, borderColor: c.border }]}
            onPress={() => setShowMilestones(true)}
            hitSlop={8}
          >
            <Info size={14} color={c.textMuted} />
          </Pressable>

          <TreeStage stage={stage} health={health} size={160} />

          <View style={styles.heroTextRow}>
            <Text style={styles.heroFlame}>🔥</Text>
            <Text style={[styles.heroNum, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              {streakDays}
            </Text>
          </View>
          <Text style={[styles.heroLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            kunlik seriya
          </Text>

          {health === 'frost' && (
            <View style={[styles.inactivePill, { backgroundColor: c.errorMuted }]}>
              <Text style={[styles.inactiveText, { color: c.error, fontFamily: typography.fontFamily.medium }]}>
                Bugun o'qilmagan
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <Text style={[styles.statNum, { color: c.brand, fontFamily: typography.fontFamily.bold }]}>
              {longestStreak}
            </Text>
            <Text style={[styles.statLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              Eng uzun
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <Text style={[styles.statNum, { color: '#34d399', fontFamily: typography.fontFamily.bold }]}>
              {weekDays}/7
            </Text>
            <Text style={[styles.statLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              Bu hafta
            </Text>
          </View>
          <Pressable
            style={[styles.statCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}
            onPress={() => setShowFreeze(true)}
          >
            <Text style={[styles.statNum, { color: '#60a5fa', fontFamily: typography.fontFamily.bold }]}>
              {freezeCount}
            </Text>
            <Text style={[styles.statLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              Freeze
            </Text>
          </Pressable>
        </View>

        {/* ── Calendar ──────────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            So'nggi 30 kun
          </Text>

          {/* Day-of-week header */}
          <View style={styles.calRow}>
            {WEEKDAY_LABELS.map(d => (
              <Text key={d} style={[styles.calDayLabel, { color: c.textMuted, fontFamily: typography.fontFamily.medium }]}>
                {d}
              </Text>
            ))}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            {[
              { cell: CAL.studied.cell!, num: CAL.studied.num!, label: "O'qildi" },
              { cell: CAL.frozen.cell!,  num: CAL.frozen.num!,  label: 'Muzlatildi' },
              { cell: CAL.missed.cell!,  num: CAL.missed.num!,  label: "O'tkazildi" },
            ].map(({ cell, num, label }) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: cell }]}>
                  <View style={[styles.legendDotInner, { backgroundColor: num }]} />
                </View>
                <Text style={[styles.legendText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                  {label}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          {calRows.map((row, ri) => (
            <View key={ri} style={styles.calRow}>
              {row.map((day, i) => {
                const active = (d: StreakCalendarDay | null | undefined) =>
                  d?.status === 'studied' || d?.status === 'frozen'
                return (
                  <CalCell
                    key={day ? day.date : `pad-${ri}-${i}`}
                    day={day}
                    c={c}
                    isToday={day?.date === todayStr}
                    connectLeft={active(day) && i > 0 && active(row[i - 1])}
                    connectRight={active(day) && i < row.length - 1 && active(row[i + 1])}
                  />
                )
              })}
            </View>
          ))}
        </View>

        {/* ── Freeze section ────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: '#60a5fa11', borderColor: '#60a5fa33' }]}>
          <View style={styles.freezeHeader}>
            <Text style={styles.freezeIce}>🧊</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.freezeTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                Seriya muzlatish
              </Text>
              <Text style={[styles.freezeSub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                {freezeCount > 0
                  ? `Sizda ${freezeCount} ta freeze mavjud`
                  : 'Hech qanday freeze yo\'q'}
              </Text>
            </View>
          </View>

          {/* Rule hint */}
          <Text style={[styles.freezeRule, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            💡 Har kuni o'qisangiz seriya davom etadi. 1 kun o'tkazib yuborsangiz — hali xavfsiz. 2-kun o'tmasdan freeze ishlatib saqlab qoling.
          </Text>

          <View style={styles.freezeBtnRow}>
            {!data?.is_active && freezeCount > 0 && (
              <Pressable
                style={[styles.freezeUseBtn, { borderColor: '#60a5fa88' }]}
                onPress={handleUseFreeze}
              >
                <Text style={[styles.freezeBtnText, { color: '#60a5fa', fontFamily: typography.fontFamily.semibold }]}>
                  🧊 Freeze ishlatish
                </Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.freezeBtn, { backgroundColor: '#60a5fa', borderRadius: radius.lg }]}
              onPress={() => setShowFreeze(true)}
            >
              <Text style={[styles.freezeBtnText, { fontFamily: typography.fontFamily.semibold }]}>
                Sotib olish
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── XP breakdown ─────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            💡 XP qanday hisoblanadi?
          </Text>
          <View style={{ gap: 0 }}>
            {XP_ROWS.map((r, i) => (
              <View
                key={r.label}
                style={[
                  styles.xpRow,
                  { borderBottomColor: c.border },
                  i === XP_ROWS.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <Text style={[styles.xpLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                  {r.label}
                </Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.xpValue, { color: c.accentPrimary, fontFamily: typography.fontFamily.semibold }]}>
                    {r.value}
                  </Text>
                  <Text style={[styles.xpSub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                    {r.sub}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <FreezeSheet
        visible={showFreeze}
        currentXp={localXp}
        freezeCount={freezeCount}
        packages={data?.freeze_packages ?? []}
        onClose={() => setShowFreeze(false)}
        onPurchased={handlePurchased}
      />

      <StreakLostModal
        visible={showLostModal}
        prevStreak={prevStreakDays}
        freezeCount={freezeCount}
        onClose={() => setShowLostModal(false)}
        onUseFreeze={freezeCount > 0 ? handleUseFreeze : undefined}
      />

      {/* ── Milestones modal ──────────────────────────────────────────── */}
      <Modal
        transparent
        visible={showMilestones}
        animationType="fade"
        onRequestClose={() => setShowMilestones(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: c.overlay }]}
          onPress={() => setShowMilestones(false)}
        >
          <Pressable
            style={[styles.modalSheet, { backgroundColor: c.bgSecondary, borderColor: c.border }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
                O'sish bosqichlari
              </Text>
              <Pressable
                style={[styles.modalCloseBtn, { backgroundColor: c.bgTertiary }]}
                onPress={() => setShowMilestones(false)}
                hitSlop={8}
              >
                <X size={16} color={c.textMuted} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.milestoneList}>
                {data?.milestones.map((m, idx) => (
                  <MilestoneRow
                    key={m.days}
                    m={m}
                    isNext={idx === nextMilestoneIdx}
                    isLast={idx === (data.milestones.length - 1)}
                    streakDays={streakDays}
                    c={c}
                  />
                ))}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.xs },
  topTitle: { fontSize: typography.size.base, flex: 1 },
  freezeChip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: spacing.sm,
    paddingVertical:   4,
    borderRadius:      radius.full,
    borderWidth:       1,
  },
  freezeChipText: { fontSize: typography.size.sm },

  scroll: {
    paddingBottom: spacing['2xl'],
    gap:           spacing.md,
  },

  // Hero
  hero: {
    alignItems:    'center',
    paddingTop:    spacing.xl,
    paddingBottom: spacing.xl,
    gap:           spacing.xs,
    minHeight:     280,
  },
  heroInfoBtn: {
    position:       'absolute',
    top:            spacing.sm,
    right:          spacing.sm,
    width:          30,
    height:         30,
    borderRadius:   15,
    borderWidth:    StyleSheet.hairlineWidth,
    alignItems:     'center',
    justifyContent: 'center',
  },
  heroTextRow: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    gap:           6,
    marginTop:     spacing.sm,
  },
  heroFlame: { fontSize: 32, lineHeight: 50 },
  heroNum: {
    fontSize:   52,
    lineHeight: 56,
  },
  heroLabel: {
    fontSize: typography.size.base,
  },
  inactivePill: {
    paddingHorizontal: spacing.md,
    paddingVertical:   4,
    borderRadius:      radius.full,
    marginTop:         spacing.xs,
  },
  inactiveText: { fontSize: typography.size.xs },

  // Stats
  statsRow: {
    flexDirection:     'row',
    gap:               spacing.sm,
    paddingHorizontal: spacing.base,
  },
  statCard: {
    flex:           1,
    alignItems:     'center',
    paddingVertical: spacing.md,
    borderRadius:   radius.xl,
    borderWidth:    StyleSheet.hairlineWidth,
    gap:            2,
  },
  statNum:   { fontSize: typography.size.xl },
  statLabel: { fontSize: typography.size.xs },

  // Section card
  section: {
    marginHorizontal:  spacing.base,
    borderRadius:      radius.xl,
    borderWidth:       StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    gap:               spacing.sm,
  },
  sectionTitle: { fontSize: typography.size.base },

  // Calendar
  calDayLabel: {
    flex:      1,
    textAlign: 'center',
    fontSize:  10,
  },
  legend: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: {
    width: 14, height: 14, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  legendDotInner: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: typography.size.xs },

  // No gap — spacing comes from the connector half-views inside each slot
  calRow: { flexDirection: 'row' },

  // Each slot: [connHalf] [circle] [connHalf]
  calSlot: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
  },
  connHalf: {
    flex:         1,
    height:       3,
    borderRadius: 2,
  },
  calCell: {
    width:          32,
    aspectRatio:    1,
    borderRadius:   16,
    alignItems:     'center',
    justifyContent: 'center',
  },
  calNum: { fontSize: 10, lineHeight: 13 },

  // Milestones
  milestoneList: { gap: 0 },
  milestoneRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.sm,
    position:      'relative',
    paddingVertical: spacing.xs,
  },
  connectorLine: {
    position: 'absolute',
    left:     27,
    top:      54,
    width:    2,
    height:   '70%',
    zIndex:   0,
  },
  milestoneTreeWrap: {
    width:          56,
    height:         56,
    borderRadius:   28,
    alignItems:     'center',
    justifyContent: 'center',
    overflow:       'hidden',
    zIndex:         1,
  },
  milestoneInfo:  { flex: 1, paddingTop: 4, gap: 4 },
  milestoneHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  milestoneName: { fontSize: typography.size.sm, flex: 1 },
  earnedBadge:   { fontSize: typography.size.xs, color: '#34d399' },
  pctText:       { fontSize: typography.size.xs },
  milestoneTrack: {
    height:       5,
    borderRadius: 3,
    overflow:     'hidden',
    backgroundColor: '#e5e7eb',
  },
  milestoneFill: { height: 5, borderRadius: 3 },
  progressHint:  { fontSize: typography.size.xs },

  // Freeze
  freezeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  freezeIce:    { fontSize: 28 },
  freezeTitle:  { fontSize: typography.size.base },
  freezeSub:    { fontSize: typography.size.xs, marginTop: 2 },
  freezeRule:   { fontSize: typography.size.xs, lineHeight: 17 },
  freezeBtnRow: { flexDirection: 'row', gap: spacing.sm },
  freezeBtn: {
    flex:            1,
    paddingVertical: spacing.sm,
    alignItems:      'center',
    borderRadius:    radius.lg,
  },
  freezeUseBtn: {
    flex:            1,
    paddingVertical: spacing.sm,
    alignItems:      'center',
    borderRadius:    radius.lg,
    borderWidth:     1,
  },
  freezeBtnText: { color: '#fff', fontSize: typography.size.base },

  // XP breakdown
  xpRow: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingVertical:   10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  xpLabel: { fontSize: typography.size.sm, flex: 1 },
  xpValue: { fontSize: typography.size.sm },
  xpSub:   { fontSize: typography.size.xs },

  errorBanner: {
    marginHorizontal: spacing.base,
    marginTop:        spacing.xs,
    borderRadius:     radius.lg,
    borderWidth:      1,
    paddingVertical:  spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  errorBannerText: { fontSize: typography.size.xs },

  // Milestones modal
  modalOverlay: {
    flex:            1,
    justifyContent:  'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius:  radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth:          StyleSheet.hairlineWidth,
    paddingHorizontal:    spacing.base,
    paddingVertical:      spacing.md,
    maxHeight:            '75%',
    gap:                  spacing.md,
  },
  modalHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  modalTitle:    { fontSize: typography.size.base },
  modalCloseBtn: {
    width:          30,
    height:         30,
    borderRadius:   15,
    alignItems:     'center',
    justifyContent: 'center',
  },
})

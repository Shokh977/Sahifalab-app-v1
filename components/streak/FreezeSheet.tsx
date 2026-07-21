import React, { useEffect, useRef, useState } from 'react'
import {
  Modal, View, Text, Pressable, StyleSheet,
  Animated, Easing, ActivityIndicator, ScrollView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Info, X } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { streaks as streaksApi } from '../../lib/api'
import type { FreezePackage } from '../../lib/api'

interface Props {
  visible:      boolean
  currentXp:    number
  freezeCount:  number
  packages:     FreezePackage[]
  onClose:      () => void
  onPurchased:  (newXp: number, newFreezeCount: number) => void
}

const INFO_LINES = [
  {
    emoji: '🧊',
    title: 'Seriya muzlatish nima?',
    body:  "O'qiy olmagan kuningizda seriyangizni saqlab qolish vositasi. Muzlatgich ishlatilganda, o'tkazib yuborgan kun \"❄️ muzlatilgan\" deb belgilanadi — seriyangiz uzilmaydi.",
  },
  {
    emoji: '✅',
    title: 'Qachon foydali?',
    body:  "Safar, ish safari, kasallik yoki kutilmagan holatlarda seriyangizni yo'qotmaslik uchun.",
  },
  {
    emoji: '💡',
    title: 'Paketlar qanchalik tejamkor?',
    body:  "1 ta — 200 XP  ·  3 ta — 500 XP (17% tejasiz)  ·  5 ta — 750 XP (25% tejasiz). Bir vaqtda ko'pi bilan 5 ta freeze saqlash mumkin.",
  },
]

export function FreezeSheet({ visible, currentXp, freezeCount, packages, onClose, onPurchased }: Props) {
  const { c }   = useTheme()
  const insets  = useSafeAreaInsets()
  const slideAnim   = useRef(new Animated.Value(500)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  const [loading,   setLoading]   = useState(false)
  const [selected,  setSelected]  = useState<number | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const [showInfo,  setShowInfo]  = useState(false)

  useEffect(() => {
    if (visible) {
      setError(null)
      setSelected(null)
      setShowInfo(false)
      Animated.parallel([
        Animated.timing(slideAnim,   { toValue: 0,   duration: 300, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(opacityAnim, { toValue: 1,   duration: 200, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(slideAnim,   { toValue: 500, duration: 250, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
        Animated.timing(opacityAnim, { toValue: 0,   duration: 200, useNativeDriver: true }),
      ]).start()
    }
  }, [visible])

  // Mirrors the server-side cap (streaks.py MAX_FREEZE_COUNT) — kept here
  // only for a friendlier pre-purchase UI; the server is the actual guard.
  const MAX_FREEZE_COUNT = 5

  const selectedPkg = packages.find(p => p.count === selected)
  const canAfford   = selectedPkg ? currentXp >= selectedPkg.xp_cost : true
  const fitsCap     = selectedPkg ? freezeCount + selectedPkg.count <= MAX_FREEZE_COUNT : true
  const btnDisabled = !selected || !canAfford || !fitsCap || loading

  async function handlePurchase() {
    if (btnDisabled) return
    setLoading(true)
    setError(null)
    try {
      const res = await streaksApi.purchaseFreeze(selected!)
      onPurchased(res.total_xp, res.freeze_count)
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  const sheetPaddingBottom = Math.max(insets.bottom, spacing.md) + spacing.sm

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <View style={styles.overlay}>
        <Animated.View style={[
          styles.sheet,
          { backgroundColor: c.bgSecondary, borderColor: c.border, paddingBottom: sheetPaddingBottom, transform: [{ translateY: slideAnim }] },
        ]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: c.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>🧊</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
                Seriya muzlatish
              </Text>
              <Text style={[styles.headerSub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                Kutilmagan hollarda seriyangizni saqlang
              </Text>
            </View>

            {/* Info toggle */}
            <Pressable
              style={[styles.infoBtn, { backgroundColor: showInfo ? '#60a5fa22' : c.bgTertiary, borderColor: showInfo ? '#60a5fa66' : c.border }]}
              onPress={() => setShowInfo(v => !v)}
              hitSlop={8}
            >
              {showInfo
                ? <X size={15} color="#60a5fa" />
                : <Info size={15} color={c.textMuted} />
              }
            </Pressable>
          </View>

          {/* Info panel */}
          {showInfo && (
            <View style={[styles.infoPanel, { backgroundColor: '#60a5fa0d', borderColor: '#60a5fa33' }]}>
              {INFO_LINES.map(line => (
                <View key={line.title} style={styles.infoRow}>
                  <Text style={styles.infoEmoji}>{line.emoji}</Text>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.infoTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                      {line.title}
                    </Text>
                    <Text style={[styles.infoBody, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                      {line.body}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Current state */}
          <View style={[styles.currentRow, { backgroundColor: c.bgTertiary, borderColor: c.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: c.accentPrimary, fontFamily: typography.fontFamily.bold }]}>
                {currentXp.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                Mavjud XP
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: '#60a5fa', fontFamily: typography.fontFamily.bold }]}>
                {freezeCount}
              </Text>
              <Text style={[styles.statLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                Freeze
              </Text>
            </View>
          </View>

          {/* Package options */}
          <View style={styles.packages}>
            {packages.map(pkg => {
              const isSelected = selected === pkg.count
              const affordable = currentXp >= pkg.xp_cost
              const withinCap  = freezeCount + pkg.count <= MAX_FREEZE_COUNT
              const selectable = affordable && withinCap
              return (
                <Pressable
                  key={pkg.count}
                  style={[
                    styles.pkgCard,
                    {
                      backgroundColor: isSelected ? '#60a5fa22' : c.bgTertiary,
                      borderColor:     isSelected ? '#60a5fa'   : c.border,
                      opacity:         selectable ? 1 : 0.4,
                    },
                  ]}
                  onPress={() => selectable && setSelected(pkg.count)}
                >
                  <Text style={styles.iceEmoji}>🧊</Text>
                  <Text style={[styles.pkgCount, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
                    ×{pkg.count}
                  </Text>
                  <Text style={[styles.pkgCost, { color: c.accentPrimary, fontFamily: typography.fontFamily.semibold }]}>
                    {pkg.xp_cost} XP
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {error && (
            <Text style={[styles.errorText, { color: c.error, fontFamily: typography.fontFamily.regular }]}>
              {error}
            </Text>
          )}

          {selected && !canAfford && (
            <Text style={[styles.errorText, { color: c.warning, fontFamily: typography.fontFamily.regular }]}>
              Yetarli XP yo'q. Ko'proq XP yig'ing!
            </Text>
          )}

          {/* Purchase button */}
          <Pressable
            style={[styles.buyBtn, { backgroundColor: btnDisabled ? c.bgTertiary : '#60a5fa' }]}
            onPress={handlePurchase}
            disabled={btnDisabled}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : (
                <Text style={[styles.buyBtnText, { color: btnDisabled ? c.textMuted : '#fff', fontFamily: typography.fontFamily.bold }]}>
                  {selected
                    ? `${selected} freeze sotib olish — ${selectedPkg?.xp_cost} XP`
                    : 'Paket tanlang'}
                </Text>
              )
            }
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  overlay: {
    flex:           1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius:  radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth:          StyleSheet.hairlineWidth,
    paddingHorizontal:    spacing.base,
    gap:                  spacing.md,
  },
  handle: {
    width:        40,
    height:       4,
    borderRadius: 2,
    alignSelf:    'center',
    marginTop:    spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  headerEmoji:  { fontSize: 26 },
  headerTitle:  { fontSize: typography.size.base },
  headerSub:    { fontSize: typography.size.xs, marginTop: 2 },

  infoBtn: {
    width:        30,
    height:       30,
    borderRadius: 15,
    borderWidth:  1,
    alignItems:   'center',
    justifyContent: 'center',
  },

  infoPanel: {
    borderRadius: radius.lg,
    borderWidth:  1,
    padding:      spacing.sm,
    gap:          spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    alignItems:    'flex-start',
  },
  infoEmoji: { fontSize: 16, marginTop: 1 },
  infoTitle: { fontSize: typography.size.sm },
  infoBody:  { fontSize: typography.size.xs, lineHeight: 18 },

  currentRow: {
    flexDirection:     'row',
    alignItems:        'center',
    borderRadius:      radius.lg,
    borderWidth:       StyleSheet.hairlineWidth,
    paddingVertical:   spacing.md,
    paddingHorizontal: spacing.base,
  },
  statItem:  { flex: 1, alignItems: 'center', gap: 2 },
  statNum:   { fontSize: typography.size.lg },
  statLabel: { fontSize: typography.size.xs },
  divider:   { width: 1, height: 32, marginHorizontal: spacing.sm },

  packages: { flexDirection: 'row', gap: spacing.sm },
  pkgCard: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: spacing.md,
    borderRadius:    radius.lg,
    borderWidth:     1,
    gap:             3,
  },
  iceEmoji: { fontSize: 22 },
  pkgCount: { fontSize: typography.size.lg },
  pkgCost:  { fontSize: typography.size.xs },

  errorText: { fontSize: typography.size.xs, textAlign: 'center' },

  buyBtn: {
    paddingVertical: spacing.md,
    borderRadius:    radius.lg,
    alignItems:      'center',
  },
  buyBtnText: { fontSize: typography.size.base },
})

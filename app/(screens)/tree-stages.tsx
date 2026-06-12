import React from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ChevronLeft, Lock } from 'lucide-react-native'
import { MagicTree } from '../../components/streak/MagicTree'
import { TREE_STAGES, stageFromStreak } from '../../lib/treeTheme'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { useAuthStore } from '../../stores/authStore'
import { useDashboardStore } from '../../stores/dashboardStore'

export default function TreeStagesScreen() {
  const { c }    = useTheme()
  const router   = useRouter()
  const insets   = useSafeAreaInsets()
  const user     = useAuthStore(s => s.user)
  const dashData = useDashboardStore(s => s.data)

  const streakDays   = dashData?.focusStats.streak_days ?? user?.streak_days ?? 0
  const currentStage = stageFromStreak(streakDays)
  const currentMeta  = TREE_STAGES[currentStage - 1]

  return (
    <View style={[styles.screen, { backgroundColor: c.bgPrimary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={c.textPrimary} />
        </Pressable>
        <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Daraxt yo'li
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          Seriyangizni oshiring — barcha 10 shaklni oching.
        </Text>

        <View style={styles.grid}>
          {TREE_STAGES.map(s => {
            const unlocked  = s.id <= currentStage
            const isCurrent = s.id === currentStage
            const locked    = !unlocked

            return (
              <View
                key={s.id}
                style={[
                  styles.cell,
                  {
                    backgroundColor: locked
                      ? c.bgPrimary
                      : isCurrent
                      ? 'rgba(70,192,138,0.08)'
                      : c.bgSecondary,
                    borderColor: isCurrent
                      ? '#46c08a'
                      : locked
                      ? c.border
                      : c.border,
                    borderWidth: isCurrent ? 1.5 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={[
                  styles.numChip,
                  { backgroundColor: isCurrent ? '#46c08a' : c.bgTertiary },
                ]}>
                  <Text style={[
                    styles.numText,
                    { color: isCurrent ? '#06231a' : c.textMuted, fontFamily: typography.fontFamily.bold },
                  ]}>
                    {s.id}
                  </Text>
                </View>

                <View style={[styles.treeBox, locked && styles.lockedTree]}>
                  <MagicTree
                    stage={s.id}
                    state={locked ? 'dead' : 'alive'}
                    size="thumb"
                    uid={`ts_${s.id}`}
                    animate={false}
                  />
                  {locked && (
                    <View style={styles.lockOverlay}>
                      <Lock size={16} color={c.textMuted} />
                    </View>
                  )}
                </View>

                <Text
                  style={[
                    styles.cap,
                    {
                      color: locked ? c.textMuted : isCurrent ? c.textPrimary : c.textSecondary,
                      fontFamily: typography.fontFamily.medium,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {s.short}
                </Text>

                <Text style={[
                  styles.days,
                  { color: locked ? c.textMuted : '#46c08a', fontFamily: typography.fontFamily.regular },
                ]}>
                  {s.days}
                </Text>
              </View>
            )
          })}
        </View>

        <View style={[styles.hint, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <Text style={[styles.hintText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Hozirda{' '}
            <Text style={{ color: '#f97316', fontFamily: typography.fontFamily.semibold }}>
              Bosqich {currentStage} · {currentMeta.name}
            </Text>
          </Text>
          {currentStage < 10 && (
            <Text style={[styles.hintSub, { color: '#f97316', fontFamily: typography.fontFamily.regular }]}>
              Keyingisi: {TREE_STAGES[currentStage].name} — {TREE_STAGES[currentStage].days}dan
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingBottom:     spacing.sm,
  },
  backBtn: { padding: spacing.xs, width: 38 },
  title:   { flex: 1, textAlign: 'center', fontSize: 17 },

  scroll: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.sm,
    gap:               spacing.md,
  },

  sub: {
    fontSize:   13,
    textAlign:  'center',
    lineHeight: 18,
  },

  grid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           10,
  },

  cell: {
    width:           '47%',
    borderRadius:    16,
    alignItems:      'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap:             6,
    overflow:        'hidden',
  },

  numChip: {
    width:          22,
    height:         22,
    borderRadius:   11,
    alignItems:     'center',
    justifyContent: 'center',
  },
  numText: { fontSize: 11, lineHeight: 14 },

  treeBox: {
    width:    80,
    height:   100,
    position: 'relative',
  },
  lockedTree:  { opacity: 0.35 },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems:     'center',
    justifyContent: 'center',
  },

  cap:  { fontSize: 12, textAlign: 'center' },
  days: { fontSize: 11, textAlign: 'center' },

  hint: {
    borderWidth:        StyleSheet.hairlineWidth,
    borderRadius:       radius.lg,
    paddingVertical:    14,
    paddingHorizontal:  spacing.base,
    alignItems:         'center',
    gap:                4,
  },
  hintText: { fontSize: 14, textAlign: 'center' },
  hintSub:  { fontSize: 12, textAlign: 'center' },
})

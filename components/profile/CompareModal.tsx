import React, { useEffect, useRef } from 'react'
import {
  Modal, View, Text, Pressable, StyleSheet,
  Animated, Easing, ScrollView,
} from 'react-native'
import { X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../hooks/useTheme'
import { Avatar } from '../ui/Avatar'
import { typography, spacing, radius } from '../../lib/constants'

export interface CompareUser {
  name:             string
  photo_url:        string | null
  level:            number
  total_xp:         number
  longest_streak:   number
  focus_hours:      number
  courses_completed: number
}

interface Props {
  visible:  boolean
  me:       CompareUser
  them:     CompareUser
  onClose:  () => void
}

interface Metric {
  label:  string
  emoji:  string
  me:     number
  them:   number
  fmt:    (v: number) => string
}

function buildMetrics(me: CompareUser, them: CompareUser): Metric[] {
  return [
    {
      label: 'Daraja',
      emoji: '⭐',
      me:    me.level,
      them:  them.level,
      fmt:   v => `${v}`,
    },
    {
      label: 'Umumiy XP',
      emoji: '⚡',
      me:    me.total_xp,
      them:  them.total_xp,
      fmt:   v => v.toLocaleString(),
    },
    {
      label: 'Eng uzun seriya',
      emoji: '🔥',
      me:    me.longest_streak,
      them:  them.longest_streak,
      fmt:   v => `${v} kun`,
    },
    {
      label: 'Diqqat vaqti',
      emoji: '⏱',
      me:    me.focus_hours,
      them:  them.focus_hours,
      fmt:   v => `${v.toFixed(1)} s`,
    },
    {
      label: 'Tugatilgan kurslar',
      emoji: '📚',
      me:    me.courses_completed,
      them:  them.courses_completed,
      fmt:   v => `${v} ta`,
    },
  ]
}

export function CompareModal({ visible, me, them, onClose }: Props) {
  const { c }   = useTheme()
  const insets  = useSafeAreaInsets()
  const slideAnim   = useRef(new Animated.Value(600)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim,   { toValue: 0,   duration: 320, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(opacityAnim, { toValue: 1,   duration: 220, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(slideAnim,   { toValue: 600, duration: 260, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
        Animated.timing(opacityAnim, { toValue: 0,   duration: 200, useNativeDriver: true }),
      ]).start()
    }
  }, [visible])

  const metrics = buildMetrics(me, them)

  // count wins
  let myWins   = 0
  let theirWins = 0
  metrics.forEach(m => {
    if (m.me > m.them) myWins++
    else if (m.them > m.me) theirWins++
  })

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim, backgroundColor: c.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View style={[
          styles.sheet,
          {
            backgroundColor: c.bgSecondary,
            borderColor:     c.border,
            paddingBottom:   Math.max(insets.bottom, spacing.md) + spacing.sm,
            transform:       [{ translateY: slideAnim }],
          },
        ]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: c.border }]} />

          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              Taqqoslash
            </Text>
            <Pressable onPress={onClose} hitSlop={12} style={[styles.closeBtn, { backgroundColor: c.bgTertiary }]}>
              <X size={16} color={c.textMuted} />
            </Pressable>
          </View>

          {/* VS row */}
          <View style={styles.vsRow}>
            <UserColumn name={me.name}   photo={me.photo_url}   wins={myWins}    c={c} isMe />
            <View style={[styles.vsBadge, { backgroundColor: c.bgTertiary, borderColor: c.border }]}>
              <Text style={[styles.vsText, { color: c.textMuted, fontFamily: typography.fontFamily.bold }]}>VS</Text>
            </View>
            <UserColumn name={them.name} photo={them.photo_url} wins={theirWins} c={c} />
          </View>

          {/* Metric rows */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>
            <View style={[styles.metricsCard, { backgroundColor: c.bgPrimary, borderColor: c.border }]}>
              {metrics.map((m, i) => (
                <MetricRow
                  key={m.label}
                  metric={m}
                  c={c}
                  isLast={i === metrics.length - 1}
                />
              ))}
            </View>
          </ScrollView>

          {/* Overall result */}
          <ResultBanner myWins={myWins} theirWins={theirWins} meName={me.name} themName={them.name} c={c} />
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

function UserColumn({
  name, photo, wins, c, isMe,
}: {
  name: string; photo: string | null; wins: number; c: any; isMe?: boolean
}) {
  return (
    <View style={styles.userCol}>
      <Avatar uri={photo} name={name} size={52} />
      <Text
        numberOfLines={1}
        style={[
          styles.userName,
          { color: c.textPrimary, fontFamily: typography.fontFamily.semibold },
        ]}
      >
        {isMe ? 'Men' : name}
      </Text>
      <View style={[
        styles.winsBadge,
        { backgroundColor: wins > 0 ? c.accentPrimary + '22' : c.bgTertiary, borderColor: wins > 0 ? c.accentPrimary + '55' : c.border },
      ]}>
        <Text style={[
          styles.winsText,
          { color: wins > 0 ? c.accentPrimary : c.textMuted, fontFamily: typography.fontFamily.semibold },
        ]}>
          {wins} ta yutuq
        </Text>
      </View>
    </View>
  )
}

function MetricRow({ metric, c, isLast }: { metric: Metric; c: any; isLast: boolean }) {
  const meWins   = metric.me > metric.them
  const themWins = metric.them > metric.me
  const tie      = metric.me === metric.them

  return (
    <View style={[styles.metricRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
      {/* Me value */}
      <View style={[
        styles.metricVal,
        meWins && { backgroundColor: '#F5A62318' },
        { borderRadius: radius.md },
      ]}>
        <Text style={[
          styles.metricNum,
          { color: meWins ? '#F5A623' : c.textPrimary, fontFamily: meWins ? typography.fontFamily.bold : typography.fontFamily.regular },
        ]}>
          {metric.fmt(metric.me)}
        </Text>
      </View>

      {/* Center label */}
      <View style={styles.metricCenter}>
        <Text style={styles.metricEmoji}>{metric.emoji}</Text>
        <Text style={[styles.metricLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
          {metric.label}
        </Text>
        {tie && (
          <Text style={[styles.tieText, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
            teng
          </Text>
        )}
      </View>

      {/* Them value */}
      <View style={[
        styles.metricVal,
        themWins && { backgroundColor: '#60a5fa18' },
        { borderRadius: radius.md },
      ]}>
        <Text style={[
          styles.metricNum,
          { color: themWins ? '#60a5fa' : c.textPrimary, fontFamily: themWins ? typography.fontFamily.bold : typography.fontFamily.regular },
        ]}>
          {metric.fmt(metric.them)}
        </Text>
      </View>
    </View>
  )
}

function ResultBanner({
  myWins, theirWins, meName, themName, c,
}: {
  myWins: number; theirWins: number; meName: string; themName: string; c: any
}) {
  let emoji: string
  let text:  string
  let color: string

  if (myWins > theirWins) {
    emoji = '🏆'; text = "Siz oldinda!"; color = '#F5A623'
  } else if (theirWins > myWins) {
    emoji = '💪'; text = `${themName} oldinda — quvib yeting!`; color = '#60a5fa'
  } else {
    emoji = '🤝'; text = "Teng kurash!"; color = c.textSecondary
  }

  return (
    <View style={[styles.result, { backgroundColor: color + '18', borderColor: color + '44' }]}>
      <Text style={styles.resultEmoji}>{emoji}</Text>
      <Text style={[styles.resultText, { color, fontFamily: typography.fontFamily.semibold }]}>
        {text}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
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
    maxHeight:            '85%',
  },
  handle: {
    width:        40,
    height:       4,
    borderRadius: 2,
    alignSelf:    'center',
    marginTop:    spacing.sm,
  },
  headerRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: typography.size.lg },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },

  vsRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  userCol: {
    flex:       1,
    alignItems: 'center',
    gap:        spacing.xs,
  },
  userName: { fontSize: typography.size.sm, textAlign: 'center', maxWidth: 100 },
  winsBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical:   2,
    borderRadius:      radius.full,
    borderWidth:       1,
  },
  winsText: { fontSize: 11 },

  vsBadge: {
    width:          36,
    height:         36,
    borderRadius:   18,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  vsText: { fontSize: 12 },

  metricsCard: {
    borderRadius: radius.lg,
    borderWidth:  StyleSheet.hairlineWidth,
    overflow:     'hidden',
    marginBottom: spacing.xs,
  },
  metricRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   10,
    paddingHorizontal: spacing.sm,
    gap:               spacing.xs,
  },
  metricVal: {
    flex:           1,
    alignItems:     'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  metricNum:  { fontSize: typography.size.sm },
  metricCenter: {
    width:      110,
    alignItems: 'center',
    gap:        2,
  },
  metricEmoji: { fontSize: 16 },
  metricLabel: { fontSize: 11, textAlign: 'center' },
  tieText:     { fontSize: 10 },

  result: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               spacing.xs,
    borderRadius:      radius.lg,
    borderWidth:       1,
    paddingVertical:   spacing.sm,
    paddingHorizontal: spacing.base,
  },
  resultEmoji: { fontSize: 20 },
  resultText:  { fontSize: typography.size.sm },
})

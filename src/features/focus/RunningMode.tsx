/**
 * The quiet full-screen running state: only the ring, the time, the round,
 * pause/resume and stop — plus a keep-the-screen-awake toggle. Android back
 * (or the chevron) minimises it; the timer keeps running underneath.
 */
import React, { useEffect, useState } from 'react'
import { Modal, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { ChevronDown, Pause, Play, Square, Sun, SunDim } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { layout, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Button, IconButton } from '../../components/ui'
import { FocusRing } from './FocusRing'
import { TimerText } from './TimerText'
import type { StrokeTone } from './timerMath'

const KEEP_AWAKE_KEY = 'sahifalab_focus_keep_awake'
const KEEP_AWAKE_TAG = 'fokus'
/** Ring diameter as a share of the screen width, capped. */
const RING_SHARE = 0.78
const RING_MAX = 320

export interface RunningModeProps {
  visible: boolean
  status: 'idle' | 'active' | 'paused'
  phase: 'focus' | 'break'
  getRemainingMs: () => number
  totalMs: number
  tone: StrokeTone
  syncKey: string | number
  round: { current: number; total: number }
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onMinimize: () => void
  /** The XP fly etc. rendered above the ring. */
  overlay?: React.ReactNode
}

export function RunningMode({
  visible, status, phase, getRemainingMs, totalMs, tone, syncKey, round, onPause, onResume, onStop, onMinimize, overlay,
}: RunningModeProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const [awake, setAwake] = useState(false)
  const size = Math.min(RING_MAX, Math.round(width * RING_SHARE))

  useEffect(() => {
    AsyncStorage.getItem(KEEP_AWAKE_KEY).then(v => setAwake(v === '1')).catch(() => {})
  }, [])

  // Hold the screen on only while this mode is up and the clock runs.
  useEffect(() => {
    if (!(visible && awake && status === 'active')) return
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {})
    return () => { deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {}) }
  }, [visible, awake, status])

  const toggleAwake = () => {
    const next = !awake
    setAwake(next)
    AsyncStorage.setItem(KEEP_AWAKE_KEY, next ? '1' : '0').catch(() => {})
  }

  const label = phase === 'break' ? 'Tanaffus' : status === 'paused' ? 'Toʻxtatildi' : 'Fokus vaqti'

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onMinimize}>
      <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.top}>
          <IconButton icon={ChevronDown} accessibilityLabel="Kichraytirish" onPress={onMinimize} />
          <IconButton
            icon={awake ? Sun : SunDim}
            accessibilityLabel={awake ? 'Ekran yoniq qoladi' : 'Ekranni yoniq saqlash'}
            onPress={toggleAwake}
          />
        </View>

        <View style={styles.center}>
          <FocusRing
            size={size}
            status={status}
            getRemainingMs={getRemainingMs}
            totalMs={totalMs}
            tone={tone}
            complete={false}
            syncKey={syncKey}
          >
            <TimerText getRemainingMs={getRemainingMs} status={status} syncKey={syncKey} />
            <Text style={[typeScale.callout, { color: phase === 'break' ? colors.successText : colors.textMuted }]}>
              {label}{round.total > 1 ? ` · ${round.current}/${round.total}` : ''}
            </Text>
          </FocusRing>
          {overlay}
        </View>

        <View style={styles.controls}>
          {status === 'paused' ? (
            <Button label="Davom ettirish" icon={Play} size="lg" onPress={onResume} style={styles.flex} />
          ) : (
            <Button label="Pauza" icon={Pause} size="lg" variant="secondary" onPress={onPause} style={styles.flex} />
          )}
          <Button label="Tugatish" icon={Square} size="lg" variant="ghost" onPress={onStop} style={styles.flex} />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: layout.gutter },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  controls: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1, alignSelf: 'auto' },
})

import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  withRepeat, withSequence,
} from 'react-native-reanimated'
import {
  CloudRain, Coffee, Leaf, Flame, Waves, Wind, Moon,
  Music, VolumeX, Volume1, Volume2, Trees,
} from 'lucide-react-native'

import { ambientSounds, type AmbientSound } from '../../lib/api'
import { useTheme } from '../../hooks/useTheme'
import { typography, radius } from '../../lib/constants'

// ── Safe expo-audio import ─────────────────────────────────────────────────────
let AudioModule: any = null
try { AudioModule = require('expo-audio') } catch {}
const AV_AVAILABLE = AudioModule !== null

// ── Singleton audio state ──────────────────────────────────────────────────────
// Only one player lives at a time. `_stopCurrent` is async so the native
// audio session can settle before we allocate a new player — this is what
// prevents the freeze after 2-3 rapid switches.

let _player:    any  = null
let _audioReady      = false
let _switching       = false

async function _ensureAudioMode() {
  if (_audioReady || !AudioModule?.setAudioModeAsync) return
  try {
    await AudioModule.setAudioModeAsync({
      playsInSilentModeIOS:       true,
      staysActiveInBackground:    true,
      shouldDuckAndroid:          false,
      playThroughEarpieceAndroid: false,
    })
    _audioReady = true
  } catch {}
}

async function _stopCurrent() {
  const p = _player
  _player = null               // null out immediately so nothing else touches it
  if (!p) return
  try { p.pause() }  catch {}
  try { p.remove() } catch {}
  // Give the native audio session ~80 ms to release resources before the
  // next allocation. Without this pause expo-audio freezes after 2-3 switches.
  await new Promise<void>(r => setTimeout(r, 80))
}

async function _playUrl(url: string, volume: number): Promise<boolean> {
  if (!AudioModule?.createAudioPlayer) return false
  await _stopCurrent()         // wait for session to free
  await _ensureAudioMode()
  try {
    const p = AudioModule.createAudioPlayer({ uri: url })
    p.loop   = true
    p.volume = volume
    p.play()
    _player = p
    return true
  } catch {
    _player = null
    return false
  }
}

// ── Icon mapping ───────────────────────────────────────────────────────────────
type IconCmp = React.ComponentType<{ size: number; color: string; strokeWidth?: number }>

function resolveIcon(emoji: string): IconCmp {
  if (/🌧|🌦|☔|🌨/.test(emoji))      return CloudRain
  if (/☕|🍵|🫖|🧋/.test(emoji))      return Coffee
  if (/🌲|🌳|🌿|🍃|🌱/.test(emoji))  return Trees
  if (/🔥|🕯|🪵/.test(emoji))         return Flame
  if (/🌊|🏖|🌀|🏄/.test(emoji))      return Waves
  if (/💨|🌬/.test(emoji))             return Wind
  if (/🌙|🌃|✨|⭐/.test(emoji))       return Moon
  return Music
}

// ── AmbientPlayer ──────────────────────────────────────────────────────────────

export function AmbientPlayer({ visible = true }: { visible?: boolean }) {
  const { c } = useTheme()

  const [sounds,    setSounds]    = useState<AmbientSound[]>([])
  const [fetching,  setFetching]  = useState(true)
  const [activeId,  setActiveId]  = useState<number | null>(null)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [volume,    setVolume]    = useState(0.4)

  const volumeRef  = useRef(0.4)
  const mountedRef = useRef(true)

  const isPlaying = activeId !== null && loadingId === null

  useEffect(() => {
    ambientSounds.list()
      .then(setSounds)
      .finally(() => setFetching(false))
  }, [])

  useEffect(() => {
    volumeRef.current = volume
    if (_player) { try { _player.volume = volume } catch {} }
  }, [volume])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      // fire-and-forget; component is gone so we just need native cleanup
      _stopCurrent()
    }
  }, [])

  // ── Select a sound ─────────────────────────────────────────────────────────
  const handleSelect = async (s: AmbientSound) => {
    if (_switching) return

    // Tap the active sound → stop it
    if (activeId === s.id) {
      setActiveId(null)
      await _stopCurrent()
      return
    }

    _switching = true
    setActiveId(s.id)
    setLoadingId(s.id)

    let ok = false
    try {
      ok = await _playUrl(s.url, volumeRef.current)
    } finally {
      // Always release the lock, even if _playUrl throws for any reason
      _switching = false
    }

    if (!mountedRef.current) {
      if (ok) await _stopCurrent()
      return
    }
    setLoadingId(null)
    if (!ok) setActiveId(null)
  }

  const handleOff = async () => {
    if (_switching) return
    setActiveId(null)
    setLoadingId(null)
    await _stopCurrent()
  }

  if (!visible) return null

  return (
    <View style={styles.root}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Volume1 size={13} color={c.textSecondary} strokeWidth={1.8} />
          <Text style={[styles.label, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
            Muhit tovushi
          </Text>
        </View>
        {isPlaying && <PlayingDot color={c.accentPrimary} />}
      </View>

      {/* ── Chips (flex-wrap — no horizontal scroll, no pager conflict) ──────── */}
      {!AV_AVAILABLE ? (
        <Text style={[styles.unavailable, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
          Audio faqat production build'da ishlaydi
        </Text>
      ) : fetching ? (
        <ActivityIndicator size="small" color={c.accentPrimary} style={{ marginTop: 4 }} />
      ) : (
        <View style={styles.chipWrap}>
          <SoundChip
            icon={VolumeX}
            name="Jim"
            active={activeId === null && loadingId === null}
            loading={false}
            onPress={handleOff}
            c={c}
          />
          {sounds.map(s => (
            <SoundChip
              key={s.id}
              icon={resolveIcon(s.emoji)}
              name={s.name}
              active={activeId === s.id}
              loading={loadingId === s.id}
              onPress={() => handleSelect(s)}
              c={c}
            />
          ))}
        </View>
      )}

      {/* ── Volume bar ──────────────────────────────────────────────────────── */}
      {isPlaying && (
        <VolumeBar value={volume} onChange={setVolume} c={c} />
      )}
    </View>
  )
}

// ── Animated playing dot ───────────────────────────────────────────────────────

function PlayingDot({ color }: { color: string }) {
  const opacity = useSharedValue(1)

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 650 }),
        withTiming(1,   { duration: 650 }),
      ),
      -1,
    )
  }, [])

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />
}

// ── Sound chip ─────────────────────────────────────────────────────────────────

function SoundChip({
  icon: Icon, name, active, loading, onPress, c,
}: {
  icon: IconCmp; name: string
  active: boolean; loading: boolean
  onPress: () => void; c: any
}) {
  const scale  = useSharedValue(1)
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const handlePress = () => {
    scale.value = withSpring(0.88, { damping: 10, stiffness: 400 }, () => {
      scale.value = withSpring(1,    { damping: 12, stiffness: 300 })
    })
    onPress()
  }

  const iconColor = active ? c.accentPrimary : c.textMuted

  return (
    <Animated.View style={aStyle}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.chip,
          {
            backgroundColor: active ? c.accentPrimaryMuted : 'transparent',
            borderColor:     active ? c.accentPrimary + 'AA' : c.border,
          },
        ]}
      >
        {loading
          ? <ActivityIndicator size="small" color={c.accentPrimary} style={{ width: 13, height: 13 }} />
          : <Icon size={13} color={iconColor} strokeWidth={1.8} />
        }
        <Text
          style={[
            styles.chipLabel,
            {
              color:      active ? c.accentPrimary : c.textSecondary,
              fontFamily: active ? typography.fontFamily.semibold : typography.fontFamily.regular,
            },
          ]}
          numberOfLines={1}
        >
          {name}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

// ── Volume bar ─────────────────────────────────────────────────────────────────

const VOL_STEPS = [0.15, 0.3, 0.5, 0.7, 1.0]

function VolumeBar({ value, onChange, c }: { value: number; onChange: (v: number) => void; c: any }) {
  const activeIdx = VOL_STEPS.reduce(
    (best, v, i) => Math.abs(v - value) < Math.abs(VOL_STEPS[best] - value) ? i : best,
    0,
  )

  return (
    <View style={styles.volRow}>
      <VolumeX size={12} color={c.textDisabled} strokeWidth={1.5} />
      <View style={styles.volBars}>
        {VOL_STEPS.map((v, i) => (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            hitSlop={6}
            style={[
              styles.volBar,
              {
                height:          6 + i * 5,
                backgroundColor: i <= activeIdx ? c.accentPrimary : c.bgTertiary,
                borderRadius:    2,
              },
            ]}
          />
        ))}
      </View>
      <Volume2 size={12} color={c.textDisabled} strokeWidth={1.5} />
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { gap: 10 },

  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label:      { fontSize: typography.size.xs, letterSpacing: 0.2 },
  dot:        { width: 6, height: 6, borderRadius: 3 },
  unavailable:{ fontSize: 11, marginTop: 2 },

  // Chips in a wrapping row — no horizontal scroll, no pager conflict
  chipWrap: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           6,
  },
  chip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    paddingVertical:   6,
    paddingHorizontal: 10,
    borderRadius:      radius.lg,
    borderWidth:       StyleSheet.hairlineWidth,
  },
  chipLabel: { fontSize: 11 },

  volRow:  { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 2 },
  volBars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingBottom: 1 },
  volBar:  { flex: 1 },
})

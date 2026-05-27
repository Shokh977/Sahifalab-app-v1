/**
 * AmbientPlayer — fetches ambient sounds from the backend and lets the user
 * pick one to loop quietly during a study session.
 *
 * Uses expo-av Audio singleton so playback survives re-renders.
 * Volume slider only shown when a sound is active.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated'

import { ambientSounds, type AmbientSound } from '../../lib/api'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'

// ── Safe expo-av import (not available in Expo Go) ────────────────────────────
let _Audio: typeof import('expo-av').Audio | null = null
try {
  _Audio = require('expo-av').Audio
} catch {}

const AV_AVAILABLE = _Audio !== null

// ── Singleton sound object ─────────────────────────────────────────────────────
let _sound: any = null

async function _stopCurrent() {
  if (_sound) {
    try { await _sound.stopAsync(); await _sound.unloadAsync() } catch {}
    _sound = null
  }
}

async function _play(url: string): Promise<any> {
  if (!_Audio) return null
  await _stopCurrent()
  try {
    await _Audio.setAudioModeAsync({
      playsInSilentModeIOS:       true,
      staysActiveInBackground:    true,
      shouldDuckAndroid:          false,
      playThroughEarpieceAndroid: false,
    })
    const { sound } = await _Audio.Sound.createAsync(
      { uri: url },
      { isLooping: true, volume: 0.4, shouldPlay: true },
    )
    _sound = sound
    return sound
  } catch {
    return null
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  /** When false the player is hidden but keeps any running sound alive */
  visible?: boolean
}

export function AmbientPlayer({ visible = true }: Props) {
  const { c } = useTheme()
  const [sounds,      setSounds]      = useState<AmbientSound[]>([])
  const [loading,     setLoading]     = useState(true)
  const [activeId,    setActiveId]    = useState<number | null>(null)
  const [isPlaying,   setIsPlaying]   = useState(false)
  const [volume,      setVolume]      = useState(0.4)
  const volumeRef     = useRef(volume)

  // Load sound list once
  useEffect(() => {
    ambientSounds.list().then(list => {
      setSounds(list)
      setLoading(false)
    })
  }, [])

  // Sync volume to currently playing sound
  useEffect(() => {
    volumeRef.current = volume
    if (_sound) _sound.setVolumeAsync(volume).catch(() => {})
  }, [volume])

  // Stop playback when component unmounts
  useEffect(() => () => { _stopCurrent() }, [])

  const handleSelect = useCallback(async (s: AmbientSound) => {
    if (activeId === s.id && isPlaying) {
      // Tap active → stop
      await _stopCurrent()
      setActiveId(null)
      setIsPlaying(false)
      return
    }
    setActiveId(s.id)
    setIsPlaying(false)
    const sound = await _play(s.url)
    if (sound) {
      await sound.setVolumeAsync(volumeRef.current)
      setIsPlaying(true)
    }
  }, [activeId, isPlaying])

  const handleSilence = useCallback(async () => {
    await _stopCurrent()
    setActiveId(null)
    setIsPlaying(false)
  }, [])

  if (!visible) return null

  if (!AV_AVAILABLE) {
    return (
      <View style={styles.wrap}>
        <Text style={[styles.sectionLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
          🎵 Muhit ovozi
        </Text>
        <Text style={[styles.unavailableText, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
          Audio Expo Go'da mavjud emas. Development build talab qilinadi.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
        🎵 Muhit ovozi
      </Text>

      {loading ? (
        <ActivityIndicator color={c.accentPrimary} style={{ marginTop: 8 }} />
      ) : (
        <View style={styles.grid}>
          {/* Silence button */}
          <SoundChip
            label="🔇"
            name="Jim"
            active={activeId === null}
            onPress={handleSilence}
            c={c}
          />
          {sounds.map(s => (
            <SoundChip
              key={s.id}
              label={s.emoji}
              name={s.name}
              active={activeId === s.id}
              loading={activeId === s.id && !isPlaying}
              onPress={() => handleSelect(s)}
              c={c}
            />
          ))}
        </View>
      )}

      {/* Volume row — only when playing */}
      {isPlaying && (
        <VolumeRow volume={volume} onChange={setVolume} c={c} />
      )}
    </View>
  )
}

// ── Sound chip ─────────────────────────────────────────────────────────────────

function SoundChip({
  label, name, active, loading = false, onPress, c,
}: {
  label: string; name: string; active: boolean
  loading?: boolean; onPress: () => void; c: any
}) {
  const scale = useSharedValue(1)
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const handlePress = () => {
    scale.value = withSpring(0.88, { damping: 8, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 10, stiffness: 300 })
    })
    onPress()
  }

  return (
    <Animated.View style={style}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.chip,
          {
            backgroundColor: active ? c.accentPrimaryMuted : c.bgTertiary,
            borderColor:     active ? c.accentPrimary      : c.border,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={c.accentPrimary} />
        ) : (
          <Text style={styles.chipEmoji}>{label}</Text>
        )}
        <Text
          style={[
            styles.chipName,
            {
              color:      active ? c.accentPrimary : c.textSecondary,
              fontFamily: typography.fontFamily.medium,
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

// ── Volume row ─────────────────────────────────────────────────────────────────

function VolumeRow({ volume, onChange, c }: { volume: number; onChange: (v: number) => void; c: any }) {
  const STEPS = [0.1, 0.25, 0.4, 0.6, 0.8, 1.0]
  return (
    <View style={styles.volumeRow}>
      <Text style={[styles.volumeLabel, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
        🔈
      </Text>
      <View style={styles.volumeSteps}>
        {STEPS.map(v => {
          const active = Math.abs(volume - v) < 0.01
          return (
            <Pressable
              key={v}
              onPress={() => onChange(v)}
              style={[
                styles.volumeStep,
                {
                  backgroundColor: active ? c.accentPrimary : c.bgTertiary,
                  height:          8 + v * 16,
                },
              ]}
            />
          )
        })}
      </View>
      <Text style={[styles.volumeLabel, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
        🔊
      </Text>
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: spacing.sm },

  sectionLabel:    { fontSize: typography.size.sm, paddingHorizontal: 2 },
  unavailableText: { fontSize: typography.size.xs, paddingHorizontal: 2, marginTop: 4 },

  grid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.sm,
  },

  chip: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            6,
    paddingVertical:   8,
    paddingHorizontal: 12,
    borderRadius:   radius.full,
    borderWidth:    1,
    minWidth:       72,
  },
  chipEmoji: { fontSize: 18 },
  chipName:  { fontSize: typography.size.xs },

  volumeRow: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    gap:           spacing.sm,
    marginTop:     spacing.xs,
  },
  volumeLabel: { fontSize: 16, marginBottom: 2 },
  volumeSteps: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'flex-end',
    gap:           4,
  },
  volumeStep: {
    flex:         1,
    borderRadius: 3,
  },
})

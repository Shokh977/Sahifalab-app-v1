import React, { useEffect, useCallback, useState, useRef } from 'react'
import {
  View, Text, Pressable, StyleSheet, Dimensions, Linking, ActivityIndicator,
} from 'react-native'
import { typography, spacing } from '../../lib/constants'

// expo-video (SDK 55) — lazy-require so web/Expo Go don't crash
let useVideoPlayer: ((src: any, setup?: (p: any) => void) => any) | null = null
let VideoView: any = null
try {
  const mod = require('expo-video')
  useVideoPlayer = mod.useVideoPlayer ?? null
  VideoView      = mod.VideoView      ?? null
} catch {}

// react-native-webview — lazy-require
let WebView: any = null
try { WebView = require('react-native-webview').WebView } catch {}

const { width: SCREEN_W } = Dimensions.get('window')
const PLAYER_H = Math.round(SCREEN_W * 9 / 16)

const SPEEDS = [1, 1.25, 1.5, 2] as const
type Speed = typeof SPEEDS[number]

const POSITION_INTERVAL = 10  // seconds between onPositionUpdate calls

interface Props {
  uri?:               string | null
  embedUrl?:          string | null
  title?:             string
  initialPosition?:   number
  onComplete?:        () => void
  onPlayingChange?:   (playing: boolean) => void
  onPositionUpdate?:  (seconds: number) => void
}

// ── Native expo-video player ───────────────────────────────────────────────────
function ExpoVideoPlayer({
  uri, initialPosition, onComplete, onPlayingChange, onPositionUpdate,
}: {
  uri: string
  initialPosition?: number
  onComplete?: () => void
  onPlayingChange?: (playing: boolean) => void
  onPositionUpdate?: (seconds: number) => void
}) {
  const [isPlaying,   setIsPlaying]   = useState(true)
  const [isBuffering, setIsBuffering] = useState(true)
  const [hasError,    setHasError]    = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration,    setDuration]    = useState(0)
  const [speed,       setSpeed]       = useState<Speed>(1)

  const lastReportedRef = useRef(0)
  const seekedRef       = useRef(false)
  const videoViewRef    = useRef<any>(null)

  const player = useVideoPlayer!(uri, (p: any) => { p.play() })

  useEffect(() => {
    const subs = [
      player.addListener('playToEnd', () => { onComplete?.() }),
      player.addListener('playingChange', ({ isPlaying: ip }: any) => {
        setIsPlaying(ip)
        onPlayingChange?.(ip)
      }),
      player.addListener('statusChange', ({ status }: any) => {
        setIsBuffering(status === 'loading')
        if (status === 'error') setHasError(true)
        if (status === 'readyToPlay') {
          setIsBuffering(false)
          if (!seekedRef.current && initialPosition && initialPosition > 5) {
            seekedRef.current = true
            player.seekBy(initialPosition)
          }
        }
      }),
      player.addListener('timeUpdate', ({ currentTime: ct }: any) => {
        const t = ct ?? 0
        setCurrentTime(t)
        if (onPositionUpdate && t - lastReportedRef.current >= POSITION_INTERVAL) {
          lastReportedRef.current = t
          onPositionUpdate(t)
        }
      }),
      player.addListener('sourceLoad', ({ duration: d }: any) => setDuration(d ?? 0)),
    ]
    return () => subs.forEach(s => s.remove())
  }, [player])

  const togglePlay = useCallback(() => {
    if (isPlaying) player.pause()
    else           player.play()
  }, [isPlaying, player])

  const seek = useCallback((delta: number) => { player.seekBy(delta) }, [player])

  const cycleSpeed = useCallback(() => {
    setSpeed(prev => {
      const idx  = SPEEDS.indexOf(prev)
      const next = SPEEDS[(idx + 1) % SPEEDS.length]
      player.playbackRate = next
      return next
    })
  }, [player])

  const enterFullscreen = useCallback(() => {
    videoViewRef.current?.enterFullscreen?.()
  }, [])

  const progress = duration > 0 ? currentTime / duration : 0
  const fmtTime  = (sec: number) => {
    const s = Math.floor(sec), m = Math.floor(s / 60), h = Math.floor(m / 60)
    if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
    return `${m}:${String(s % 60).padStart(2, '0')}`
  }

  if (hasError) {
    const isLocal = uri.startsWith('file://')
    return (
      <View style={[styles.fallback, { height: PLAYER_H }]}>
        <Text style={{ fontSize: 36 }}>⚠️</Text>
        <Text style={styles.fallbackText}>
          {isLocal ? 'Yuklab olish buzilgan. Qayta yuklab oling.' : 'Video ijro etilmadi'}
        </Text>
        {!isLocal && (
          <Pressable onPress={() => Linking.openURL(uri)} style={styles.fallbackBtn}>
            <Text style={styles.fallbackBtnText}>Brauzerda ochish ↗</Text>
          </Pressable>
        )}
      </View>
    )
  }

  return (
    <View style={[styles.container, { height: PLAYER_H }]}>
      <VideoView
        ref={videoViewRef}
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
        allowsFullscreen
      />
      {isBuffering && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator color="#fff" size="large" />
        </View>
      )}
      <View style={styles.controls}>
        <View style={styles.centreRow} pointerEvents="box-none">
          <Pressable onPress={() => seek(-10)} hitSlop={14} style={styles.seekBtn}>
            <Text style={styles.seekLabel}>-10s</Text>
          </Pressable>
          <Pressable onPress={togglePlay} style={styles.playBtn}>
            <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
          </Pressable>
          <Pressable onPress={() => seek(10)} hitSlop={14} style={styles.seekBtn}>
            <Text style={styles.seekLabel}>+10s</Text>
          </Pressable>
        </View>
        <View style={styles.bottomBar}>
          <Text style={styles.timeText}>{fmtTime(currentTime)}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.timeText}>{fmtTime(duration)}</Text>
          <Pressable onPress={cycleSpeed} style={styles.ctrlChip} hitSlop={8}>
            <Text style={styles.ctrlChipText}>{speed}x</Text>
          </Pressable>
          <Pressable onPress={enterFullscreen} style={styles.ctrlChip} hitSlop={8}>
            <Text style={styles.ctrlChipText}>⛶</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

// ── Bunny / embed WebView player ───────────────────────────────────────────────
function EmbedWebPlayer({
  embedUrl, initialPosition, onComplete, onPositionUpdate,
}: {
  embedUrl:          string
  initialPosition?:  number
  onComplete?:       () => void
  onPositionUpdate?: (seconds: number) => void
}) {
  const lastReportedRef = useRef(0)
  const separator = embedUrl.includes('?') ? '&' : '?'
  const src = `${embedUrl}${separator}autoplay=true&responsive=true&preload=true`

  // Injected JS: waits for <video>, seeks to saved position, reports timeupdate every 10s
  const injectedJS = `
    (function() {
      var _lastReported = 0;
      var _seekPos = ${Math.floor(initialPosition ?? 0)};
      var _seekDone = false;
      var _INTERVAL = ${POSITION_INTERVAL};

      function trySeek(video) {
        if (!_seekDone && _seekPos > 5 && video.readyState >= 1) {
          video.currentTime = _seekPos;
          _seekDone = true;
        }
      }

      function tick(video) {
        var t = video.currentTime || 0;
        if (video.ended) {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ended' }));
          return;
        }
        trySeek(video);
        if (t - _lastReported >= _INTERVAL) {
          _lastReported = t;
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'timeupdate', time: t }));
        }
      }

      var tries = 0;
      var findInterval = setInterval(function() {
        var video = document.querySelector('video');
        if (video) {
          clearInterval(findInterval);
          video.addEventListener('loadedmetadata', function() { trySeek(video); });
          video.addEventListener('ended', function() {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ended' }));
          });
          setInterval(function() { tick(video); }, 3000);
        }
        if (++tries > 40) clearInterval(findInterval);
      }, 500);
    })();
    true;
  `

  const handleMessage = useCallback((e: any) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data)
      if (msg.type === 'ended') {
        onComplete?.()
      } else if (msg.type === 'timeupdate' && onPositionUpdate) {
        onPositionUpdate(msg.time)
      }
    } catch {}
  }, [onComplete, onPositionUpdate])

  return (
    <View style={[styles.container, { height: PLAYER_H }]}>
      <WebView
        source={{ uri: src }}
        style={styles.webview}
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        injectedJavaScript={injectedJS}
        onMessage={handleMessage}
      />
    </View>
  )
}

// ── Public component ───────────────────────────────────────────────────────────
export function VideoPlayer({
  uri, embedUrl, title, initialPosition, onComplete, onPlayingChange, onPositionUpdate,
}: Props) {
  const isLocal = uri?.startsWith('file://')

  if (isLocal && uri && useVideoPlayer && VideoView) {
    return (
      <ExpoVideoPlayer
        uri={uri}
        initialPosition={initialPosition}
        onComplete={onComplete}
        onPlayingChange={onPlayingChange}
        onPositionUpdate={onPositionUpdate}
      />
    )
  }

  if (embedUrl && WebView) {
    return (
      <EmbedWebPlayer
        embedUrl={embedUrl}
        initialPosition={initialPosition}
        onComplete={onComplete}
        onPositionUpdate={onPositionUpdate}
      />
    )
  }

  if (uri && useVideoPlayer && VideoView) {
    return (
      <ExpoVideoPlayer
        uri={uri}
        initialPosition={initialPosition}
        onComplete={onComplete}
        onPlayingChange={onPlayingChange}
        onPositionUpdate={onPositionUpdate}
      />
    )
  }

  const openUrl = (uri && !uri.startsWith('file://')) ? uri : embedUrl
  return (
    <View style={[styles.fallback, { height: PLAYER_H }]}>
      <Text style={{ fontSize: 36 }}>🎬</Text>
      <Text style={styles.fallbackText}>Video ijro uchun ilovani yangilang</Text>
      {openUrl ? (
        <Pressable
          onPress={() => { Linking.openURL(openUrl); onComplete?.() }}
          style={styles.fallbackBtn}
        >
          <Text style={styles.fallbackBtnText}>Brauzerda ochish ↗</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { width: '100%', backgroundColor: '#000', position: 'relative' },
  webview:   { flex: 1, backgroundColor: '#000' },
  overlay:   { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  controls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent:  'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding:         spacing.sm,
  },
  centreRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing.xl,
    marginBottom:   spacing.sm,
  },
  seekBtn:   { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  seekLabel: { color: '#fff', fontSize: typography.size.sm, fontWeight: '700' },
  playBtn: {
    width:           56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems:      'center', justifyContent: 'center',
  },
  playIcon:  { color: '#fff', fontSize: 24 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  timeText: {
    color: '#fff', fontSize: typography.size.xs, fontWeight: '600',
    minWidth: 36, textAlign: 'center',
  },
  progressTrack: {
    flex: 1, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#e8792f', borderRadius: 2 },
  ctrlChip: {
    paddingHorizontal: 5,
    paddingVertical:   2,
    borderRadius:      4,
    backgroundColor:   'rgba(255,255,255,0.2)',
  },
  ctrlChipText: { color: '#fff', fontSize: typography.size.xs, fontWeight: '700' },
  fallback: {
    width: '100%', backgroundColor: '#111',
    alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, padding: spacing.base,
  },
  fallbackText: { color: 'rgba(255,255,255,0.6)', fontSize: typography.size.sm, textAlign: 'center' },
  fallbackBtn: {
    marginTop: spacing.xs, paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm, borderRadius: 20, backgroundColor: '#e8792f',
  },
  fallbackBtnText: { color: '#fff', fontSize: typography.size.sm, fontWeight: '600' },
})

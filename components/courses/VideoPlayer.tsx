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

// expo-screen-capture — lazy-require so web/Expo Go don't crash
let preventScreenCaptureAsync: ((tag?: string) => Promise<void>) | null = null
let allowScreenCaptureAsync:   ((tag?: string) => Promise<void>) | null = null
try {
  const scMod = require('expo-screen-capture')
  preventScreenCaptureAsync = scMod.preventScreenCaptureAsync ?? null
  allowScreenCaptureAsync   = scMod.allowScreenCaptureAsync   ?? null
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
  websiteUrl?:        string | null  // fallback link shown when video can't play
  initialPosition?:   number
  onComplete?:        () => void
  onPlayingChange?:   (playing: boolean) => void
  onPositionUpdate?:  (seconds: number) => void
}

// ── Native expo-video player ───────────────────────────────────────────────────
function ExpoVideoPlayer({
  uri, embedUrl, websiteUrl, initialPosition, onComplete, onPlayingChange, onPositionUpdate,
}: {
  uri: string
  embedUrl?: string | null
  websiteUrl?: string | null
  initialPosition?: number
  onComplete?: () => void
  onPlayingChange?: (playing: boolean) => void
  onPositionUpdate?: (seconds: number) => void
}) {
  const [isPlaying,       setIsPlaying]       = useState(true)
  const [isBuffering,     setIsBuffering]      = useState(true)
  const [hasError,        setHasError]         = useState(false)
  const [fallbackToEmbed, setFallbackToEmbed] = useState(false)
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
        if (status === 'error') {
          if (embedUrl && WebView) setFallbackToEmbed(true)
          else setHasError(true)
        }
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

  if (fallbackToEmbed && embedUrl) {
    return (
      <EmbedWebPlayer
        embedUrl={embedUrl}
        initialPosition={initialPosition}
        onComplete={onComplete}
        onPositionUpdate={onPositionUpdate}
      />
    )
  }

  if (hasError) {
    const isLocal = uri.startsWith('file://')
    const errFallbackUrl = websiteUrl ?? (!isLocal ? uri : null)
    return (
      <View style={[styles.fallback, { height: PLAYER_H }]}>
        <Text style={{ fontSize: 36 }}>⚠️</Text>
        <Text style={styles.fallbackText}>
          {isLocal ? 'Yuklab olish buzilgan. Qayta yuklab oling.' : 'Video ijro etilmadi'}
        </Text>
        {errFallbackUrl && (
          <Pressable onPress={() => Linking.openURL(errFallbackUrl)} style={styles.fallbackBtn}>
            <Text style={styles.fallbackBtnText}>Saytda ko'rish ↗</Text>
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

// ── YouTube helpers ───────────────────────────────────────────────────────────

function isYouTubeUrl(url: string) {
  return /youtube\.com|youtu\.be/i.test(url)
}

/** Extract 11-char video ID from any YouTube URL format. */
function extractYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  )
  return m ? m[1] : null
}

// ── YouTube HTML-iframe wrapper ───────────────────────────────────────────────
// Loading the embed URL *directly* in WebView triggers YouTube's WebView block.
// Wrapping it in an <iframe> inside a local HTML page replicates exactly what
// the sahifalab.uz website does, and YouTube treats it as a normal browser embed.
function YouTubeWebPlayer({
  embedUrl, onComplete,
}: {
  embedUrl: string
  onComplete?: () => void
}) {
  const videoId = extractYouTubeId(embedUrl)
  const src = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`
    : embedUrl

  const html = `<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
    <style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:#000;overflow:hidden}iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none}</style>
  </head><body>
    <iframe
      src="${src}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowfullscreen
      frameborder="0"
    ></iframe>
  </body></html>`

  return (
    <View style={[styles.container, { height: PLAYER_H }]}>
      <WebView
        source={{ html, baseUrl: 'https://www.sahifalab.uz' }}
        style={styles.webview}
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
        scrollEnabled={false}
      />
    </View>
  )
}

// ── Bunny / other embed WebView player ────────────────────────────────────────
function EmbedWebPlayer({
  embedUrl, initialPosition, onComplete, onPositionUpdate,
}: {
  embedUrl:          string
  initialPosition?:  number
  onComplete?:       () => void
  onPositionUpdate?: (seconds: number) => void
}) {
  const lastReportedRef = useRef(0)

  // YouTube → dedicated HTML-iframe player (no direct-URI loading)
  if (isYouTubeUrl(embedUrl)) {
    return <YouTubeWebPlayer embedUrl={embedUrl} onComplete={onComplete} />
  }

  const sep = embedUrl.includes('?') ? '&' : '?'
  const src = `${embedUrl}${sep}autoplay=true&responsive=true&preload=true`

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
      if (msg.type === 'ended') onComplete?.()
      else if (msg.type === 'timeupdate' && onPositionUpdate) onPositionUpdate(msg.time)
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
        originWhitelist={['*']}
        mixedContentMode="always"
        scrollEnabled={false}
        injectedJavaScript={injectedJS}
        onMessage={handleMessage}
      />
    </View>
  )
}

// ── Public component ───────────────────────────────────────────────────────────
export function VideoPlayer({
  uri, embedUrl, title, websiteUrl, initialPosition, onComplete, onPlayingChange, onPositionUpdate,
}: Props) {
  const isLocal = uri?.startsWith('file://')

  useEffect(() => {
    if (!preventScreenCaptureAsync || !allowScreenCaptureAsync) return
    preventScreenCaptureAsync('video-player')
    return () => { allowScreenCaptureAsync!('video-player') }
  }, [])

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
        embedUrl={embedUrl}
        websiteUrl={websiteUrl}
        initialPosition={initialPosition}
        onComplete={onComplete}
        onPlayingChange={onPlayingChange}
        onPositionUpdate={onPositionUpdate}
      />
    )
  }

  const fallbackUrl = websiteUrl ?? ((uri && !uri.startsWith('file://')) ? uri : embedUrl)
  return (
    <View style={[styles.fallback, { height: PLAYER_H }]}>
      <Text style={{ fontSize: 36 }}>🎬</Text>
      <Text style={styles.fallbackText}>Video ijro etilmadi</Text>
      {fallbackUrl ? (
        <Pressable
          onPress={() => { Linking.openURL(fallbackUrl); onComplete?.() }}
          style={styles.fallbackBtn}
        >
          <Text style={styles.fallbackBtnText}>Saytda ko'rish ↗</Text>
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

import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  Animated, StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { WebView } from 'react-native-webview'
import { ChevronLeft, Settings2, X, Minus, Plus } from 'lucide-react-native'
import { useTheme } from '../../../hooks/useTheme'
import { typography, spacing, radius } from '../../../lib/constants'
import { request } from '../../../lib/api'

// ── Reader themes ─────────────────────────────────────────────────────────────

const THEMES = {
  light: { bg: '#ffffff', text: '#1a1a1a', ui: '#f0f0f0', label: 'Yorug\'' },
  sepia: { bg: '#f8f0e3', text: '#3b2a1a', ui: '#ede0cc', label: 'Sepia'  },
  dark:  { bg: '#1c1c1e', text: '#e5e5ea', ui: '#2c2c2e', label: 'Qorongʻu' },
} as const
type ThemeKey = keyof typeof THEMES

// ── Font options ──────────────────────────────────────────────────────────────

const FONTS = [
  { key: 'sans',  label: 'Sans',  css: 'Arial, Helvetica, sans-serif'             },
  { key: 'serif', label: 'Serif', css: 'Georgia, "Times New Roman", Times, serif' },
  { key: 'mono',  label: 'Mono',  css: '"Courier New", Courier, monospace'         },
] as const
type FontKey = 'sans' | 'serif' | 'mono'

const FONT_SIZES = [13, 15, 17, 19, 22]

// ── EPUB shell — loads epub.js from CDN, receives book URL via postMessage ────

const EPUB_SHELL = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#fff}
#viewer{position:fixed;top:0;left:0;right:0;bottom:0}
#loader{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-family:sans-serif;font-size:14px;color:#888;text-align:center}
iframe{border:none!important}
</style>
</head>
<body>
<div id="viewer"></div>
<div id="loader">Yuklanmoqda...</div>
<script src="https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js"></script>
<script>
(function(){
  var rendition,book;
  window.onerror=function(m){rn({type:'error',msg:String(m)});};
  function rn(obj){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(obj));}
  function applyTheme(fs,fc,bg,tc){
    if(!rendition)return;
    rendition.themes.default({
      body:{'font-size':fs+'px!important','font-family':fc+'!important',
            'color':tc+'!important','background':bg+'!important',
            'line-height':'1.75!important','padding':'20px 16px!important'},
      p:{'margin-bottom':'0.9em!important'},
      'h1,h2,h3,h4':{'color':tc+'!important','margin-bottom':'0.5em!important'}
    });
    document.body.style.background=bg;
    document.documentElement.style.background=bg;
    try{rendition.views().forEach(function(v){
      if(v.iframe&&v.iframe.contentDocument)v.iframe.contentDocument.body.style.background=bg;
    });}catch(_){}
  }
  window.addEventListener('message',function(e){
    try{
      var msg=JSON.parse(e.data);
      if(msg.action==='load'){
        document.body.style.background=msg.bgColor||'#fff';
        document.documentElement.style.background=msg.bgColor||'#fff';
        book=ePub(msg.url);
        rendition=book.renderTo('viewer',{width:window.innerWidth,height:window.innerHeight,spread:'none',flow:'paginated'});
        rendition.display().then(function(){
          document.getElementById('loader').style.display='none';
          applyTheme(msg.fontSize,msg.fontCss,msg.bgColor,msg.textColor);
          rn({type:'ready'});
        }).catch(function(err){rn({type:'error',msg:String(err)});});
        rendition.on('relocated',function(loc){
          rn({type:'progress',percent:Math.round((loc.start.percentage||0)*100)});
        });
      }
      else if(msg.action==='next'&&rendition) rendition.next();
      else if(msg.action==='prev'&&rendition) rendition.prev();
      else if(msg.action==='theme') applyTheme(msg.fontSize,msg.fontCss,msg.bgColor,msg.textColor);
    }catch(_){}
  });
})();
</script>
</body></html>`

// ── Component ─────────────────────────────────────────────────────────────────

type Phase = 'loading' | 'reading' | 'error'

export default function BookReaderScreen() {
  const { id, title, file_url } = useLocalSearchParams<{
    id: string; title?: string; file_url?: string
  }>()
  const { c }  = useTheme()
  const router = useRouter()
  const wvRef  = useRef<any>(null)

  const [phase,     setPhase]     = useState<Phase>('loading')
  const [bookUrl,   setBookUrl]   = useState('')
  const [fileType,  setFileType]  = useState<'epub' | 'pdf'>('epub')
  const [epubReady, setEpubReady] = useState(false)
  const [readPct,   setReadPct]   = useState(0)
  const [showPanel, setShowPanel] = useState(false)
  const [errMsg,    setErrMsg]    = useState('')

  const [themeKey, setThemeKey] = useState<ThemeKey>('light')
  const [fontKey,  setFontKey]  = useState<FontKey>('sans')
  const [sizeIdx,  setSizeIdx]  = useState(1)

  const theme    = THEMES[themeKey]
  const font     = FONTS.find(f => f.key === fontKey) ?? FONTS[0]
  const fontSize = FONT_SIZES[sizeIdx]

  const panelAnim = useRef(new Animated.Value(0)).current

  // ── Resolve book URL (no file system — stream directly from signed URL) ──────

  useEffect(() => { loadBook() }, [])

  async function loadBook() {
    setPhase('loading')
    setErrMsg('')

    const urlHint = (file_url ?? '').toLowerCase().split('?')[0]
    const ext     = urlHint.endsWith('.pdf') ? 'pdf' : 'epub'
    setFileType(ext as 'epub' | 'pdf')

    try {
      let url: string

      try {
        const res = await request<{ download_url: string }>(
          `/api/books/${id}/download`, { auth: true }
        )
        url = res.download_url
      } catch (e: any) {
        const msg = String(e?.message ?? '')
        if (msg.includes('402') || msg.includes('Purchase') || msg.includes('403')) {
          setErrMsg("Bu kitobni o'qish uchun avval xarid qiling.")
          setPhase('error'); return
        }
        if (file_url && file_url.startsWith('http')) {
          url = file_url
        } else {
          setErrMsg("Bu kitobda fayl mavjud emas.")
          setPhase('error'); return
        }
      }

      setBookUrl(url)
      setPhase('reading')
    } catch (e: any) {
      const msg = String(e?.message ?? '')
      if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch'))
        setErrMsg("Internet aloqasini tekshiring.")
      else
        setErrMsg(msg.slice(0, 120) || "Kitobni ochishda xatolik yuz berdi.")
      setPhase('error')
    }
  }

  // ── Send settings to epub.js once shell + URL are ready ──────────────────────

  useEffect(() => {
    if (epubReady && bookUrl && fileType === 'epub') {
      sendToEpub({ action: 'load', url: bookUrl,
        fontSize, fontCss: font.css, bgColor: theme.bg, textColor: theme.text })
    }
  }, [epubReady, bookUrl])

  function sendToEpub(msg: Record<string, unknown>) {
    wvRef.current?.postMessage(JSON.stringify(msg))
  }

  function pushTheme(tk: ThemeKey, fk: FontKey, si: number) {
    if (fileType !== 'epub') return
    const t = THEMES[tk]
    const f = FONTS.find(x => x.key === fk) ?? FONTS[0]
    sendToEpub({ action: 'theme', fontSize: FONT_SIZES[si], fontCss: f.css,
      bgColor: t.bg, textColor: t.text })
  }

  // ── Settings ──────────────────────────────────────────────────────────────────

  function openPanel() {
    setShowPanel(true)
    Animated.spring(panelAnim, { toValue: 1, useNativeDriver: true, damping: 24, stiffness: 200 }).start()
  }
  function closePanel() {
    Animated.timing(panelAnim, { toValue: 0, duration: 220, useNativeDriver: true })
      .start(() => setShowPanel(false))
  }
  function onTheme(key: ThemeKey) { setThemeKey(key); pushTheme(key, fontKey, sizeIdx) }
  function onFont(key: FontKey)   { setFontKey(key);  pushTheme(themeKey, key, sizeIdx) }
  function onSize(dir: 1 | -1) {
    const next = Math.max(0, Math.min(FONT_SIZES.length - 1, sizeIdx + dir))
    setSizeIdx(next); pushTheme(themeKey, fontKey, next)
  }

  // ── WebView message handler ───────────────────────────────────────────────────

  function onMessage(e: any) {
    try {
      const msg = JSON.parse(e.nativeEvent.data)
      if (msg.type === 'ready')    setEpubReady(true)
      if (msg.type === 'progress') setReadPct(msg.percent ?? 0)
      if (msg.type === 'error')    console.warn('epub.js:', msg.msg)
    } catch {}
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const uiBg = phase === 'reading' ? theme.ui : c.bgSecondary
  const body  = phase === 'reading' ? theme.bg : c.bgPrimary
  const ink   = phase === 'reading' ? theme.text : c.textPrimary

  return (
    <View style={[styles.root, { backgroundColor: body }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar
        barStyle={themeKey === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={uiBg}
      />

      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: uiBg }}>
        <View style={[styles.header, { backgroundColor: uiBg }]}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
            <ChevronLeft size={22} color={ink} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: ink, fontFamily: typography.fontFamily.semibold }]}
            numberOfLines={1}>
            {title ?? 'Kitob'}
          </Text>
          {phase === 'reading'
            ? <Pressable onPress={openPanel} hitSlop={10} style={styles.iconBtn}>
                <Settings2 size={20} color={ink} />
              </Pressable>
            : <View style={styles.iconBtn} />
          }
        </View>
      </SafeAreaView>

      {/* Loading */}
      {phase === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.brand} />
          <Text style={[styles.dlLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            Tayyorlanmoqda...
          </Text>
        </View>
      )}

      {/* Error */}
      {phase === 'error' && (
        <View style={styles.center}>
          <Text style={[styles.errText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {errMsg || 'Kitobni ochishda xatolik yuz berdi.'}
          </Text>
          <Pressable onPress={loadBook} style={[styles.retryBtn, { backgroundColor: c.brand }]}>
            <Text style={[styles.retryLabel, { fontFamily: typography.fontFamily.semibold }]}>
              Qayta urinish
            </Text>
          </Pressable>
        </View>
      )}

      {/* EPUB reader */}
      {phase === 'reading' && fileType === 'epub' && (
        <WebView
          ref={wvRef}
          source={{ html: EPUB_SHELL, baseUrl: '' }}
          style={[styles.webview, { backgroundColor: theme.bg }]}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          mixedContentMode="always"
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          onMessage={onMessage}
        />
      )}

      {/* PDF reader — loads directly from https URL */}
      {phase === 'reading' && fileType === 'pdf' && bookUrl !== '' && (
        <WebView
          source={{ uri: bookUrl }}
          style={[styles.webview, { backgroundColor: theme.bg }]}
          originWhitelist={['*']}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Progress bar (EPUB) */}
      {phase === 'reading' && fileType === 'epub' && (
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: uiBg }}>
          <View style={[styles.progressRow, { backgroundColor: uiBg }]}>
            <View style={[styles.progressTrack, { backgroundColor: theme.text + '20' }]}>
              <View style={[styles.progressFill, { backgroundColor: c.brand,
                width: `${readPct}%` as any }]} />
            </View>
            <Text style={[styles.progressPct, { color: theme.text + 'aa',
              fontFamily: typography.fontFamily.regular }]}>
              {readPct}%
            </Text>
          </View>
        </SafeAreaView>
      )}

      {/* Settings panel */}
      {showPanel && (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={closePanel} />
          <Animated.View style={[
            styles.panel, { backgroundColor: theme.ui },
            { transform: [{ translateY: panelAnim.interpolate(
                { inputRange: [0, 1], outputRange: [500, 0] }) }] },
          ]}>
            <View style={[styles.panelHandle, { backgroundColor: theme.text + '30' }]} />
            <Pressable onPress={closePanel} hitSlop={8} style={styles.panelClose}>
              <X size={18} color={theme.text} />
            </Pressable>

            {fileType === 'epub' && (
              <>
                <Text style={[styles.sectionLabel, { color: theme.text + 'aa',
                  fontFamily: typography.fontFamily.semibold }]}>
                  O'lcham
                </Text>
                <View style={styles.sizeRow}>
                  <Pressable onPress={() => onSize(-1)} disabled={sizeIdx === 0}
                    style={[styles.sizeCircle, { backgroundColor: theme.bg, opacity: sizeIdx === 0 ? 0.35 : 1 }]}>
                    <Minus size={16} color={theme.text} />
                  </Pressable>
                  <Text style={[styles.sizeLabel, { color: theme.text, fontFamily: typography.fontFamily.bold }]}>
                    {fontSize}px
                  </Text>
                  <Pressable onPress={() => onSize(1)} disabled={sizeIdx === FONT_SIZES.length - 1}
                    style={[styles.sizeCircle, { backgroundColor: theme.bg,
                      opacity: sizeIdx === FONT_SIZES.length - 1 ? 0.35 : 1 }]}>
                    <Plus size={16} color={theme.text} />
                  </Pressable>
                </View>

                <Text style={[styles.sectionLabel, { color: theme.text + 'aa',
                  fontFamily: typography.fontFamily.semibold }]}>
                  Shrift
                </Text>
                <View style={styles.fontRow}>
                  {FONTS.map(f => {
                    const active = fontKey === f.key
                    return (
                      <Pressable key={f.key} onPress={() => onFont(f.key)}
                        style={[styles.fontChip, {
                          backgroundColor: active ? c.brand : theme.bg,
                          borderColor:     active ? c.brand : theme.text + '25',
                        }]}>
                        <Text style={[styles.fontChipText, {
                          color: active ? '#fff' : theme.text,
                          fontFamily: typography.fontFamily.medium,
                          fontStyle:  f.key === 'serif' ? 'italic' : 'normal',
                        }]}>
                          {f.label}
                        </Text>
                        <Text style={[styles.fontPreview, {
                          color: active ? '#fff' : theme.text + '99',
                          fontFamily: typography.fontFamily.regular,
                          fontStyle:  f.key === 'serif' ? 'italic' : 'normal',
                        }]}>
                          Aa
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </>
            )}

            <Text style={[styles.sectionLabel, { color: theme.text + 'aa',
              fontFamily: typography.fontFamily.semibold }]}>
              {fileType === 'epub' ? 'Fon' : 'Rang sxemasi'}
            </Text>
            <View style={styles.themeRow}>
              {(Object.entries(THEMES) as [ThemeKey, typeof THEMES[ThemeKey]][]).map(([key, t]) => {
                const active = themeKey === key
                return (
                  <Pressable key={key} onPress={() => onTheme(key)}
                    style={[styles.themeChip, {
                      backgroundColor: t.bg,
                      borderColor:     active ? c.brand : theme.text + '25',
                      borderWidth:     active ? 2.5 : 1,
                    }]}>
                    <View style={[styles.themeCircle, { backgroundColor: t.text }]} />
                    <Text style={[styles.themeLabel, {
                      color:      t.text,
                      fontFamily: active ? typography.fontFamily.semibold : typography.fontFamily.regular,
                    }]}>
                      {t.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <SafeAreaView edges={['bottom']} />
          </Animated.View>
        </>
      )}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    { flex: 1 },
  webview: { flex: 1 },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.xs,
    paddingVertical:   spacing.sm,
    gap:               spacing.xs,
  },
  iconBtn: {
    width:          44,
    height:         44,
    alignItems:     'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex:      1,
    fontSize:  typography.size.md,
    textAlign: 'center',
  },

  center: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    gap:               spacing.base,
    paddingHorizontal: spacing.xl,
  },
  dlLabel: {
    fontSize: typography.size.sm,
  },
  errText: {
    fontSize:   typography.size.base,
    lineHeight: 24,
    textAlign:  'center',
  },
  retryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.sm + 2,
    borderRadius:      radius.full,
  },
  retryLabel: {
    color:    '#fff',
    fontSize: typography.size.sm,
  },

  progressRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   8,
    gap:               spacing.sm,
  },
  progressTrack: {
    flex:         1,
    height:       3,
    borderRadius: 2,
    overflow:     'hidden',
  },
  progressFill: {
    height:       3,
    borderRadius: 2,
  },
  progressPct: {
    fontSize:  11,
    minWidth:  32,
    textAlign: 'right',
  },

  panel: {
    position:             'absolute',
    bottom:               0,
    left:                 0,
    right:                0,
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    paddingHorizontal:    spacing.base,
    paddingTop:           spacing.sm,
    paddingBottom:        spacing.lg,
    gap:                  spacing.sm,
    shadowColor:          '#000',
    shadowOffset:         { width: 0, height: -6 },
    shadowOpacity:        0.12,
    shadowRadius:         16,
    elevation:            20,
  },
  panelHandle: {
    width:        40,
    height:       4,
    borderRadius: 2,
    alignSelf:    'center',
    marginBottom: spacing.xs,
  },
  panelClose: {
    position: 'absolute',
    top:      spacing.base + 4,
    right:    spacing.base,
    padding:  4,
  },
  sectionLabel: {
    fontSize:      10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop:     spacing.xs,
  },

  sizeRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xl,
  },
  sizeCircle: {
    width:          44,
    height:         44,
    borderRadius:   22,
    alignItems:     'center',
    justifyContent: 'center',
  },
  sizeLabel: {
    fontSize: typography.size.xl,
    minWidth: 60,
    textAlign: 'center',
  },

  fontRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
  },
  fontChip: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: spacing.sm + 2,
    borderRadius:    radius.xl,
    borderWidth:     1,
    gap:             2,
  },
  fontChipText: { fontSize: typography.size.sm },
  fontPreview:  { fontSize: 18 },

  themeRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
  },
  themeChip: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: spacing.base,
    borderRadius:    radius.xl,
    gap:             spacing.xs,
  },
  themeCircle: {
    width:        16,
    height:       16,
    borderRadius: 8,
  },
  themeLabel: { fontSize: typography.size.xs },
})

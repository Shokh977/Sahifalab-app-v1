import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator,
  Share, Linking, Alert, Image,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import * as FileSystem from 'expo-file-system'
import { useTheme } from '../../../hooks/useTheme'
import { certificates, type CertificateDetail } from '../../../lib/api'
import { typography, spacing, radius } from '../../../lib/constants'

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch { return iso }
}

// ── Certificate card ──────────────────────────────────────────────────────────
function CertCard({ cert, c }: { cert: CertificateDetail; c: any }) {
  return (
    <View style={[styles.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
      {/* Logo */}
      <Image
        source={require('../../../assets/images/icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Title */}
      <Text style={[styles.certTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
        SERTIFIKAT
      </Text>

      {/* Decorative line */}
      <View style={[styles.decorLine, { backgroundColor: c.accentPrimary }]} />

      {/* Recipient */}
      <Text style={[styles.recipientName, { color: c.accentPrimary, fontFamily: typography.fontFamily.bold }]}>
        {cert.recipient_name}
      </Text>
      <Text style={[styles.completedText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        ushbu kursni muvaffaqiyatli yakunladi:
      </Text>

      {/* Course */}
      <Text style={[styles.courseTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
        {cert.course_title}
      </Text>

      {/* Meta */}
      <Text style={[styles.metaText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        O'qituvchi: {cert.teacher_name}
      </Text>
      <Text style={[styles.metaText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        Natija: {Math.round(cert.score_pct)}%
      </Text>
      <Text style={[styles.metaText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        Sana: {fmtDate(cert.issued_at)}
      </Text>

      {/* Decorative line */}
      <View style={[styles.decorLine, { backgroundColor: c.accentPrimary }]} />

      {/* Code */}
      <Text style={[styles.certCode, { color: c.textDisabled }]}>
        {cert.certificate_id}
      </Text>

      {/* QR code */}
      {cert.qr_url ? (
        <Image
          source={{ uri: cert.qr_url }}
          style={styles.qrCode}
          resizeMode="contain"
        />
      ) : null}
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CertificateScreen() {
  const { code } = useLocalSearchParams<{ code: string }>()
  const { c }    = useTheme()
  const router   = useRouter()
  const insets   = useSafeAreaInsets()

  const [cert,    setCert]    = useState<CertificateDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    certificates.get(code).then(data => {
      setCert(data)
    }).catch(() => {
      setError("Sertifikat topilmadi.")
    }).finally(() => setLoading(false))
  }, [code])

  const saveImage = useCallback(async () => {
    if (!cert?.image_url) {
      Alert.alert("Rasm yo'q", "Sertifikat rasmi hali tayyor emas.")
      return
    }
    setSaving(true)
    try {
      const dest = FileSystem.cacheDirectory + `cert_${code}.png`
      const { uri } = await FileSystem.downloadAsync(cert.image_url, dest)
      // Share the downloaded image (expo-media-library not available, use Share instead)
      await Share.share({
        url:     uri,
        message: `Men ${cert.course_title} kursini sahifalab.uz da muvaffaqiyatli tamomladim! #sahifalab\nhttps://sahifalab.uz/cert/${cert.certificate_id}`,
        title:   'Sahifalab Sertifikat',
      })
    } catch (e: any) {
      if (e?.message !== 'User did not share') {
        Alert.alert('Xatolik', 'Rasm saqlanmadi.')
      }
    } finally {
      setSaving(false)
    }
  }, [cert, code])

  const shareCard = useCallback(async () => {
    if (!cert) return
    try {
      await Share.share({
        message: `Men ${cert.course_title} kursini sahifalab.uz da muvaffaqiyatli tamomladim! #sahifalab\nTasdiqlash: https://sahifalab.uz/cert/${cert.certificate_id}`,
        title:   'Sahifalab Sertifikat',
      })
    } catch {}
  }, [cert])

  const openPdf = useCallback(() => {
    if (!cert?.pdf_url) {
      Alert.alert("PDF yo'q", "PDF hali tayyor emas.")
      return
    }
    Linking.openURL(cert.pdf_url)
  }, [cert])

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: c.bgPrimary }]}>
        <ActivityIndicator color={c.accentPrimary} size="large" />
      </View>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error || !cert) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: c.bgPrimary }]}>
        <Text style={[styles.errorText, { color: c.textSecondary }]}>{error ?? 'Xatolik yuz berdi'}</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: c.border }]}>
          <Text style={{ color: c.textPrimary, fontFamily: typography.fontFamily.medium }}>Orqaga</Text>
        </Pressable>
      </View>
    )
  }

  const isPublic = !cert.is_mine

  return (
    <View style={[styles.root, { backgroundColor: c.bgPrimary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backPressable}>
          <Text style={[styles.backText, { color: c.accentPrimary, fontFamily: typography.fontFamily.medium }]}>
            ← Orqaga
          </Text>
        </Pressable>
        <Text style={[styles.topTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          Sertifikat
        </Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        {/* Verified badge for public view */}
        {isPublic && (
          <View style={[styles.verifiedBanner, { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: '#22c55e' }]}>
            <Text style={[styles.verifiedText, { color: '#22c55e', fontFamily: typography.fontFamily.semibold }]}>
              ✓ Tasdiqlangan sertifikat
            </Text>
          </View>
        )}

        {/* Certificate card */}
        <CertCard cert={cert} c={c} />

        {/* Action buttons — only for owner */}
        {!isPublic && (
          <View style={styles.actions}>
            <Pressable
              onPress={saveImage}
              disabled={saving}
              style={[styles.actionBtn, { backgroundColor: c.accentPrimary }]}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={[styles.actionBtnText, { fontFamily: typography.fontFamily.semibold }]}>
                    Rasmni saqlash
                  </Text>
              }
            </Pressable>

            <Pressable
              onPress={shareCard}
              style={[styles.actionBtn, styles.actionBtnOutlined, {
                borderColor: c.accentPrimary,
              }]}
            >
              <Text style={[styles.actionBtnText, { color: c.accentPrimary, fontFamily: typography.fontFamily.semibold }]}>
                Ulashish
              </Text>
            </Pressable>

            <Pressable onPress={openPdf} style={{ alignItems: 'center', marginTop: spacing.xs }}>
              <Text style={[styles.pdfLink, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                PDF yuklash
              </Text>
            </Pressable>
          </View>
        )}

        {/* Public CTA */}
        {isPublic && (
          <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
            <Text style={[styles.publicCta, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              Sahifalab ilovasini yuklab, o'z sertifikatingizni oling!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.base },

  // Top bar
  topBar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom:     spacing.sm,
    borderBottomWidth: 1,
  },
  backPressable: { width: 64 },
  backText:      { fontSize: typography.size.sm },
  topTitle:      { fontSize: typography.size.base },

  content: { paddingHorizontal: spacing.base, paddingTop: spacing.base, gap: spacing.base },

  // Verified banner
  verifiedBanner: {
    paddingVertical:   spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius:      radius.card,
    borderWidth:       1,
    alignItems:        'center',
  },
  verifiedText: { fontSize: typography.size.sm },

  // Certificate card
  card: {
    borderRadius: 16,
    borderWidth:  1,
    padding:      24,
    alignItems:   'center',
    gap:          8,
    shadowColor:  '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity:0.12,
    shadowRadius: 12,
    elevation:    6,
  },
  logo: {
    width: 80, height: 40,
    marginBottom: 8,
  },
  certTitle: {
    fontSize:      24,
    letterSpacing: 3,
    textAlign:     'center',
  },
  decorLine: {
    width: 60, height: 2, borderRadius: 1,
    marginVertical: 12,
  },
  recipientName: {
    fontSize:   20,
    textAlign:  'center',
    marginBottom: 4,
  },
  completedText: {
    fontSize:  typography.size.sm,
    textAlign: 'center',
  },
  courseTitle: {
    fontSize:   17,
    textAlign:  'center',
    marginTop:  spacing.base,
    lineHeight: 24,
  },
  metaText: {
    fontSize:  typography.size.sm,
    textAlign: 'center',
    marginTop: 4,
  },
  certCode: {
    fontFamily: 'Courier New',
    fontSize:   11,
    textAlign:  'center',
    letterSpacing: 1,
  },
  qrCode: {
    width: 80, height: 80,
    marginTop: spacing.sm,
  },

  // Actions
  actions: { gap: 12, marginTop: spacing.sm },
  actionBtn: {
    paddingVertical: 16,
    borderRadius:    radius.full,
    alignItems:      'center',
  },
  actionBtnOutlined: {
    backgroundColor: 'transparent',
    borderWidth:     1.5,
  },
  actionBtnText: {
    color:    '#fff',
    fontSize: typography.size.base,
  },
  pdfLink: {
    fontSize:           typography.size.sm,
    textDecorationLine: 'underline',
  },

  // Misc
  errorText: { fontSize: typography.size.base, textAlign: 'center' },
  backBtn: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1,
  },
  publicCta: { fontSize: typography.size.sm, textAlign: 'center', lineHeight: 22 },
})

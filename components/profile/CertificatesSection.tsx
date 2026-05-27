import React from 'react'
import { View, Text, StyleSheet, Pressable, Share, Linking } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { formatTime } from '../../lib/utils'
import { WEB_URL } from '../../lib/constants'
import { typography, spacing, radius } from '../../lib/constants'
import type { ProfileCertificate } from '../../lib/types'

interface Props {
  certificates: ProfileCertificate[]
}

export function CertificatesSection({ certificates }: Props) {
  const { c } = useTheme()

  if (certificates.length === 0) return null

  async function handleShare(cert: ProfileCertificate) {
    if (!cert.share_token) return
    const url = `${WEB_URL}/certificates/${cert.share_token}`
    try {
      await Share.share({
        message: `Sahifalab sertifikatim: ${cert.course_title}\n${url}`,
        url,
      })
    } catch {}
  }

  async function handleView(cert: ProfileCertificate) {
    if (!cert.share_token) return
    const url = `${WEB_URL}/certificates/${cert.share_token}`
    Linking.openURL(url)
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
        Sertifikatlar
      </Text>
      {certificates.map(cert => (
        <Pressable
          key={cert.id}
          onPress={() => handleView(cert)}
          style={[styles.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}
        >
          {/* Left accent */}
          <View style={[styles.accent, { backgroundColor: c.brand }]} />

          <View style={styles.cardBody}>
            <View style={styles.cardTop}>
              <Text style={{ fontSize: 28 }}>🏆</Text>
              <View style={styles.cardInfo}>
                <Text
                  numberOfLines={2}
                  style={[styles.courseTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}
                >
                  {cert.course_title || 'Kurs sertifikati'}
                </Text>
                {cert.issued_at && (
                  <Text style={[styles.date, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                    {formatTime(cert.issued_at)}
                  </Text>
                )}
              </View>
            </View>

            {/* Skill tags */}
            {(cert.skill_tags ?? []).length > 0 && (
              <View style={styles.tags}>
                {cert.skill_tags.slice(0, 3).map((tag, i) => (
                  <View key={i} style={[styles.tag, { backgroundColor: c.brandSubtle }]}>
                    <Text style={[styles.tagText, { color: c.brand, fontFamily: typography.fontFamily.medium }]}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Actions */}
            {cert.share_token && (
              <View style={styles.cardActions}>
                <Pressable
                  onPress={() => handleShare(cert)}
                  style={[styles.shareBtn, { backgroundColor: c.brandSubtle }]}
                >
                  <Text style={[styles.shareBtnText, { color: c.brand, fontFamily: typography.fontFamily.semibold }]}>
                    📤 Ulashish
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.base,
  },
  sectionTitle: {
    fontSize:     typography.size.lg,
    marginBottom: spacing.sm,
  },
  card: {
    flexDirection:  'row',
    borderRadius:   radius.md,
    borderWidth:    1,
    marginBottom:   spacing.sm,
    overflow:       'hidden',
  },
  accent: {
    width:  4,
  },
  cardBody: {
    flex:    1,
    padding: spacing.sm,
    gap:     spacing.xs,
  },
  cardTop: {
    flexDirection: 'row',
    gap:           spacing.sm,
    alignItems:    'flex-start',
  },
  cardInfo: {
    flex: 1,
    gap:  2,
  },
  courseTitle: {
    fontSize:   typography.size.md,
    lineHeight: 20,
  },
  date: {
    fontSize: typography.size.xs,
  },
  tags: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical:   2,
    borderRadius:      radius.full,
  },
  tagText: {
    fontSize: 11,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop:     spacing.xs,
  },
  shareBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.xs,
    borderRadius:      radius.full,
  },
  shareBtnText: {
    fontSize: typography.size.sm,
  },
})

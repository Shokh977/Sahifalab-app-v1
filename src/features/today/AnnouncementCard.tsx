/**
 * Admin-managed announcement (hero.get()), kept from the old Home as a
 * small dismissible card at the bottom. Same dismiss key as before, so a
 * banner dismissed in the old layout stays dismissed.
 */
import React, { useEffect, useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Image } from 'expo-image'
import { X } from 'lucide-react-native'
import { hero, type HeroContent } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { radius, space, tileSize } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Card, IconButton } from '../../components/ui'
import { uzText } from './today'

const dismissKey = (id: number) => `sahifalab_hero_dismissed_${id}`

export function AnnouncementCard() {
  const { colors } = useTheme()
  const [content, setContent] = useState<HeroContent | null>(null)

  useEffect(() => {
    let cancelled = false
    hero.get().then(async c => {
      if (!c || cancelled) return
      const dismissed = await AsyncStorage.getItem(dismissKey(c.id)).catch(() => null)
      if (!dismissed && !cancelled) setContent(c)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!content) return null

  const dismiss = () => {
    AsyncStorage.setItem(dismissKey(content.id), '1').catch(() => {})
    setContent(null)
  }
  const open = content.cta_link ? () => { Linking.openURL(content.cta_link!).catch(() => {}) } : undefined

  return (
    <Card variant={open ? 'pressable' : 'plain'} onPress={open} accessibilityLabel={content.title}>
      <View style={styles.row}>
        {content.image_url && (
          <Image
            source={{ uri: content.image_url }}
            style={[styles.image, { backgroundColor: colors.surfaceRaised }]}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        )}
        <View style={styles.text}>
          <Text style={[typeScale.headline, { color: colors.text }]} numberOfLines={2}>{uzText(content.title)}</Text>
          {content.subtitle ? (
            <Text style={[typeScale.callout, { color: colors.textMuted }]} numberOfLines={2}>{uzText(content.subtitle)}</Text>
          ) : null}
          {content.cta_text ? (
            <Text style={[typeScale.callout, { color: colors.accentText }]}>{uzText(content.cta_text)}</Text>
          ) : null}
        </View>
        <IconButton icon={X} accessibilityLabel="Yopish" onPress={dismiss} style={styles.close} />
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  image: { width: tileSize, height: tileSize, borderRadius: radius.sm },
  text: { flex: 1, gap: 2 },
  close: { marginRight: -space.sm, marginVertical: -space.sm },
})

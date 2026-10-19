/**
 * Avatar — photo (expo-image, memory+disk cache) with an initials fallback,
 * optional level ring and level number. Initials (whenever the photo is
 * missing or fails): two letters, round(size × 0.38) extra bold, white on
 * the user's colour from avatarColor(id) (Phase 7.5 A5).
 */
import React, { useState } from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { Image } from 'expo-image'
import { useTheme } from '../../design/ThemeProvider'
import { avatarSize, radius, space } from '../../design/spacing'
import { initialsFont, tabular, type as typeScale } from '../../design/typography'
import { onAvatar } from '../../design/tokens'
import { avatarColor } from './avatarColor'
import { initials } from './initials'

export type AvatarSize = keyof typeof avatarSize

export interface AvatarProps {
  name: string
  /** The user's id: picks their initials colour (falls back to the name). */
  id?: number | string | null
  uri?: string | null
  size?: AvatarSize
  /** Draws the accent ring and a small level number. */
  level?: number
  style?: StyleProp<ViewStyle>
}

const RING = 2

export function Avatar({ name, id, uri, size = 'md', level, style }: AvatarProps) {
  const { colors } = useTheme()
  const [failed, setFailed] = useState(false)
  const d = avatarSize[size]
  const ringed = level != null
  const inner = ringed ? d - (RING * 2 + RING * 2) : d
  const showImage = !!uri && !failed

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={ringed ? `${name}, ${level}-daraja` : name}
      style={[
        { width: d, height: d, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
        ringed && { borderWidth: RING, borderColor: colors.accent },
        style,
      ]}
    >
      <View style={{ width: inner, height: inner, borderRadius: radius.full, overflow: 'hidden', backgroundColor: showImage ? colors.surfaceRaised : avatarColor(id ?? name), alignItems: 'center', justifyContent: 'center' }}>
        {showImage ? (
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
            onError={() => setFailed(true)}
          />
        ) : (
          <Text style={[initialsFont(inner), { color: onAvatar }]} numberOfLines={1} allowFontScaling={false}>{initials(name)}</Text>
        )}
      </View>
      {ringed && size !== 'sm' && (
        <View style={[styles.level, { backgroundColor: colors.accent, borderColor: colors.bg }]}>
          <Text style={[typeScale.levelBadge, tabular, { color: colors.onAccent }]}>{level}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  level: {
    position: 'absolute',
    right: -space.xxs,
    bottom: -space.xxs,
    minWidth: space.lg,
    paddingHorizontal: space.xxs,
    borderRadius: radius.full,
    borderWidth: RING,
    alignItems: 'center',
  },
})

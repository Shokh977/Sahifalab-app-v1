import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { useTheme } from '../../hooks/useTheme'
import { getLevelTier, typography } from '../../lib/constants'

interface Props {
  uri?:         string | null
  name?:        string | null
  size?:        20 | 28 | 32 | 48 | 64 | 80
  level?:       number
  borderWidth?: number
}

export const Avatar = React.memo(function Avatar({ uri, name, size = 32, level, borderWidth = 2 }: Props) {
  const { c } = useTheme()

  const tier        = level ? getLevelTier(level) : null
  const borderColor = tier ? tier.border : c.border
  const initials    = name
    ? name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const containerStyle = {
    width:        size,
    height:       size,
    borderRadius: size / 2,
    borderWidth:  tier ? borderWidth : 1,
    borderColor,
  }

  const fontSize = size <= 28 ? 10 : size <= 48 ? 14 : 20

  return (
    <View style={[styles.container, containerStyle, { backgroundColor: c.bgTertiary }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size - borderWidth * 2, height: size - borderWidth * 2, borderRadius: size / 2 }}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <Text style={[styles.initials, { fontSize, color: c.textSecondary, fontFamily: typography.fontFamily.semibold }]}>
          {initials}
        </Text>
      )}
    </View>
  )
})

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials:  {},
})

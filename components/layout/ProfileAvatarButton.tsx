import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../stores/authStore'
import { useTheme } from '../../hooks/useTheme'
import { typography, getLevelTier } from '../../lib/constants'

/**
 * Top-bar avatar button that opens Profil. Profil was removed from the
 * bottom tab bar (replaced by Musobaqalar, step-22) — every screen must
 * carry this so Profil stays reachable from anywhere in the app.
 */
export function ProfileAvatarButton({ size = 32 }: { size?: number }) {
  const { c }  = useTheme()
  const router = useRouter()
  const user   = useAuthStore(s => s.user)
  const tier   = getLevelTier(user?.level ?? 1)

  return (
    <Pressable onPress={() => router.push('/(tabs)/profile' as any)} hitSlop={8}>
      {user?.photo_url ? (
        <Image
          source={{ uri: user.photo_url }}
          style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, borderColor: tier.border }]}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[
          styles.avatar, styles.fallback,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: c.accentPrimary },
        ]}>
          <Text style={[styles.initials, { fontSize: size * 0.45, fontFamily: typography.fontFamily.bold }]}>
            {user?.first_name?.slice(0, 1).toUpperCase() ?? '?'}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  avatar:   { borderWidth: 1.5 },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff' },
})

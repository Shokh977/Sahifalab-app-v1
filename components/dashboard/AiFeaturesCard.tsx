import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Sparkle, NotePencil, CaretRight } from 'phosphor-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'

/**
 * Dashboard discovery surface for the two 088/089 Tanga+AI features
 * (flashcard generation, weekly review) — always rendered, unlike
 * ContextualActionRow's state-driven chips. Matches ChallengeDashboardCard's
 * "one dedicated always-there card per feature area" pattern rather than
 * routing through the orphaned SmartActionCards.tsx (never mounted anywhere
 * in the app — dead code, not this feature's fault).
 */
export function AiFeaturesCard() {
  const { c }  = useTheme()
  const router = useRouter()

  const items = [
    {
      id:    'ai-flashcards',
      title: 'AI bilan flashcard yaratish',
      sub:   "Matn yoki rasmdan to'plam yarating",
      Icon:  Sparkle,
      color: '#A855F7',
      route: '/(screens)/ai-flashcard-generate',
    },
    {
      id:    'weekly-review',
      title: 'Haftalik sharh',
      sub:   'Shaxsiy AI tahlili — bepul',
      Icon:  NotePencil,
      color: '#22C55E',
      route: '/(screens)/weekly-review',
    },
  ] as const

  return (
    <View style={{ gap: spacing.sm, marginHorizontal: spacing.screenMargin }}>
      {items.map(item => (
        <Pressable
          key={item.id}
          onPress={() => router.push(item.route as any)}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: c.bgSecondary, borderColor: c.border, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: item.color + '1a' }]}>
            <item.Icon size={18} color={item.color} weight="fill" />
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
              {item.title}
            </Text>
            <Text numberOfLines={1} style={[styles.sub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              {item.sub}
            </Text>
          </View>
          <CaretRight size={16} color={c.textMuted} />
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: radius.lg, borderWidth: 1.5, padding: spacing.sm,
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 14 },
  sub:   { fontSize: 12, marginTop: 1 },
})

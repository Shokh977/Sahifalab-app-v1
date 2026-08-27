import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Sparkles } from 'lucide-react-native'
import { useTheme } from '../../../hooks/useTheme'
import { typography, radius } from '../../../lib/constants'
import { GridCard } from './GridCard'

const PURPLE = '#8B5CF6'

export function AiFlashcardGridCard({ staggerIndex }: { staggerIndex: number }) {
  const { c, theme } = useTheme()
  const router = useRouter()
  const purple = theme === 'dark' ? '#B497FF' : PURPLE

  return (
    <GridCard
      staggerIndex={staggerIndex}
      bg={c.bgSecondary}
      borderColor={c.border}
      onPress={() => router.push('/(screens)/ai-flashcard-generate' as any)}
      accessibilityLabel="AI flashcard, matn yoki rasmdan to'plam yaratish"
    >
      <View style={[styles.iconTile, { backgroundColor: purple + '22' }]}>
        <Sparkles size={16} color={purple} />
      </View>

      <View>
        <Text numberOfLines={2} style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          AI flashcard
        </Text>
        <Text numberOfLines={1} style={[styles.sub, { color: c.textMuted, fontFamily: typography.fontFamily.medium }]}>
          Matn yoki rasmdan to'plam
        </Text>
      </View>

      <View style={[styles.chip, { backgroundColor: purple + '1a', marginTop: 'auto' }]}>
        <Text style={[styles.chipText, { color: purple, fontFamily: typography.fontFamily.bold }]}>Yaratish →</Text>
      </View>
    </GridCard>
  )
}

const styles = StyleSheet.create({
  iconTile: { width: 32, height: 32, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14 },
  sub: { fontSize: 11, marginTop: 1 },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  chipText: { fontSize: 10 },
})

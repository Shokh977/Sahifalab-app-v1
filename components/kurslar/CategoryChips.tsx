import React from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { typography, radius as radiusTokens } from '../../lib/constants'
import { coursesStrings as s } from '../../lib/coursesStrings'
import type { Category } from '../../lib/api'
import type { PremiumTheme } from '../../lib/premiumTheme'

interface Props {
  categories: Category[]
  active:     string | null   // null = "Hammasi"
  onChange:   (slug: string | null) => void
  t:          PremiumTheme
}

export function CategoryChips({ categories, active, onChange, t }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <Chip label={s.categoryAll} isActive={active === null} onPress={() => onChange(null)} t={t} />
      {categories.map(cat => (
        <Chip
          key={cat.id}
          label={cat.name}
          isActive={active === cat.slug}
          onPress={() => onChange(active === cat.slug ? null : cat.slug)}
          t={t}
        />
      ))}
    </ScrollView>
  )
}

function Chip({ label, isActive, onPress, t }: { label: string; isActive: boolean; onPress: () => void; t: PremiumTheme }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        isActive
          ? { backgroundColor: t.segmentActiveBg, borderColor: t.segmentActiveBorder, borderWidth: t.segmentActiveBorder === 'transparent' ? 0 : 1 }
          : { backgroundColor: t.field, borderColor: t.hairline, borderWidth: 1 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          { color: isActive ? t.segmentActiveLabel : t.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    gap: 7,
    paddingHorizontal: 16,
  },
  chip: {
    flexShrink: 0,
    borderRadius: radiusTokens.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  label: {
    fontSize: 12.5,
    fontFamily: typography.fontFamily.bold,
  },
})

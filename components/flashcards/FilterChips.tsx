/**
 * FilterChips — horizontal chip row with optional counts. Used by both
 * Kartalar tabs: Mening kartalarim's Barchasi/Takrorlash/Yangi filter, and
 * Ommaviy to'plamlar's category chips (no counts there — just omit `count`).
 */
import React from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { typography, radius } from '../../lib/constants'
import { kartalarColorsFor } from './subjectTheme'
import { useTheme } from '../../hooks/useTheme'

export interface FilterChipOption<K extends string> {
  key:   K
  label: string
  count?: number
}

export function FilterChips<K extends string>({ options, active, onChange }: {
  options: FilterChipOption<K>[]
  active:  K
  onChange: (key: K) => void
}) {
  const { theme } = useTheme()
  const kc = kartalarColorsFor(theme)

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.outer} contentContainerStyle={styles.row}>
      {options.map(opt => {
        const selected = opt.key === active
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.chip,
              selected
                ? { backgroundColor: kc.accent }
                : { backgroundColor: kc.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: kc.hairline },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: selected ? kc.onAccent : kc.textMuted,
                  fontFamily: selected ? typography.fontFamily.bold : typography.fontFamily.semibold,
                },
              ]}
              numberOfLines={1}
            >
              {opt.count != null ? `${opt.label} ${opt.count}` : opt.label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  outer: { flexGrow: 0, flexShrink: 0 },
  row:   { flexDirection: 'row', gap: 8 },
  chip: {
    borderRadius:      radius.full,
    paddingVertical:   6,
    paddingHorizontal: 11,
  },
  label: { fontSize: 11 },
})

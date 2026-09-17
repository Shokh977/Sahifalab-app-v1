import React from 'react'
import { Pressable, Text, StyleSheet } from 'react-native'
import { Search } from 'lucide-react-native'
import { typography } from '../../lib/constants'
import { coursesStrings as s } from '../../lib/coursesStrings'
import type { PremiumTheme } from '../../lib/premiumTheme'

interface Props {
  t: PremiumTheme
  onPress: () => void
}

/** Not a live TextInput — tapping pushes a dedicated search screen (spec:
 * "do not inline-expand"). */
export function SearchField({ t, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.field, { backgroundColor: t.field, borderColor: t.hairline }]}
      accessibilityRole="search"
    >
      <Search size={17} color={t.textTertiary} strokeWidth={2} />
      <Text style={[styles.placeholder, { color: t.textTertiary }]} numberOfLines={1}>
        {s.searchPlaceholder}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  placeholder: {
    fontSize: 13.5,
    fontFamily: typography.fontFamily.medium,
    flex: 1,
  },
})

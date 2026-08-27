/**
 * SegmentedTabs — the Kartalar screen's Mening kartalarim / Ommaviy
 * to'plamlar switch. Generic over any 2+ segment set.
 */
import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { typography, radius } from '../../lib/constants'
import { kartalarColorsFor, kartalarRaisedShadow } from './subjectTheme'
import { useTheme } from '../../hooks/useTheme'

export interface SegmentedTabOption<K extends string> {
  key:   K
  label: string
}

export function SegmentedTabs<K extends string>({ options, active, onChange }: {
  options: SegmentedTabOption<K>[]
  active:  K
  onChange: (key: K) => void
}) {
  const { theme } = useTheme()
  const kc = kartalarColorsFor(theme)
  const raisedShadow = kartalarRaisedShadow(theme)

  return (
    <View style={[styles.track, { backgroundColor: kc.segmentTrackBg }]}>
      {options.map(opt => {
        const selected = opt.key === active
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[
              styles.segment,
              selected && { backgroundColor: kc.surfaceRaised, ...raisedShadow },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: selected ? kc.textPrimary : kc.textMuted,
                  fontFamily: selected ? typography.fontFamily.bold : typography.fontFamily.semibold,
                },
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius:  radius['2xl'],
    padding:       3,
  },
  segment: {
    flex:           1,
    borderRadius:   radius.xl - 3,
    paddingVertical: 9,
    alignItems:     'center',
    justifyContent: 'center',
  },
  label: { fontSize: 12.5 },
})

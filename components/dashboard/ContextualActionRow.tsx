import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { BookOpen, GraduationCap, ChartBar } from 'phosphor-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import type { DashboardData } from '../../stores/dashboardStore'

interface Chip {
  id:      string
  label:   string
  Icon:    React.ComponentType<any>
  color:   string
  bg:      string
  route:   string
  primary: boolean
}

function buildChips(data: DashboardData, c: any): Chip[] {
  const goalDone = (data.focusStats.today_minutes ?? 0) >= (data.focusStats.daily_goal ?? 20)

  if (!goalDone) {
    // Priority 1: goal not met — start studying
    const chips: Chip[] = [{
      id:      'study',
      label:   "O'qishni boshlash",
      Icon:    BookOpen,
      color:   c.accentPrimary,
      bg:      c.accentPrimaryMuted,
      route:   '/(tabs)/study',
      primary: true,
    }]
    if (data.enrolled.length > 0) {
      chips.push({
        id:      'course',
        label:   data.enrolled[0].courses?.title ?? 'Kurs',
        Icon:    BookOpen,
        color:   c.textSecondary,
        bg:      c.bgTertiary,
        route:   `/(screens)/course/${data.enrolled[0].course_id}`,
        primary: false,
      })
    }
    return chips
  }

  // Priority 4: goal met — show explore + stats chips
  const chips: Chip[] = []
  if (data.recommended.length > 0) {
    chips.push({
      id:      'new-course',
      label:   'Yangi kurs',
      Icon:    GraduationCap,
      color:   c.accentSecondary,
      bg:      'rgba(77,166,255,0.10)',
      route:   `/(screens)/course/${data.recommended[0].id}`,
      primary: false,
    })
  }
  chips.push({
    id:      'stats',
    label:   'Statistika',
    Icon:    ChartBar,
    color:   c.textSecondary,
    bg:      c.bgTertiary,
    route:   '/(tabs)/study',
    primary: false,
  })
  return chips
}

export function ContextualActionRow({ data }: { data: DashboardData }) {
  const { c }  = useTheme()
  const router = useRouter()
  const chips  = buildChips(data, c)

  if (chips.length === 0) return null

  return (
    <View style={[styles.row, { paddingHorizontal: spacing.screenMargin }]}>
      {chips.map(chip => (
        <Pressable
          key={chip.id}
          onPress={() => router.push(chip.route as any)}
          style={({ pressed }) => [
            styles.chip,
            chip.primary ? styles.chipPrimary : styles.chipSecondary,
            { backgroundColor: chip.bg, borderColor: chip.color + (chip.primary ? 'CC' : '44') },
            pressed && { opacity: 0.8 },
          ]}
        >
          <chip.Icon size={15} color={chip.color} weight={chip.primary ? 'fill' : 'regular'} />
          <Text
            style={[
              styles.chipText,
              { color: chip.color, fontFamily: chip.primary ? typography.fontFamily.semibold : typography.fontFamily.regular },
            ]}
            numberOfLines={1}
          >
            {chip.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap:           spacing.sm,
    flexWrap:      'wrap',
  },
  chip: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            6,
    paddingVertical:   8,
    paddingHorizontal: spacing.base,
    borderRadius:   radius.full,
    borderWidth:    1,
  },
  chipPrimary: {
    flex: 1,
    justifyContent: 'center',
  },
  chipSecondary: {},
  chipText: {
    fontSize: typography.size.sm,
  },
})

/**
 * Daraxt yoʻli — the ten tree stages on their own screen, opened from
 * Seriya's map button. They used to sit at the bottom of Seriya, which made
 * that screen heavy to scroll. `?days=` carries Seriya's streak; without it
 * the dashboard / profile value is used.
 */
import React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../../stores/authStore'
import { useDashboardStore } from '../../stores/dashboardStore'
import { useTheme } from '../../src/design/ThemeProvider'
import { layout, space } from '../../src/design/spacing'
import { ScreenHeader } from '../../src/components/ui'
import { TreeStagesSection } from '../../src/features/streak/TreeStagesSection'

export default function TreeStagesScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { days } = useLocalSearchParams<{ days?: string }>()
  const dashDays = useDashboardStore(s => s.data?.focusStats.streak_days)
  const userDays = useAuthStore(s => s.user?.streak_days)
  const parsed = Number(days)
  const streakDays = Number.isFinite(parsed) && days != null ? parsed : dashDays ?? userDays ?? 0

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenHeader title="Daraxt yoʻli" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <TreeStagesSection streakDays={streakDays} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.sm },
})

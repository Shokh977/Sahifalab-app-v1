import React from 'react'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { stageFromStreak, TREE_STAGES } from './treeTheme'

export async function syncWidget(streakDays: number) {
  if (Platform.OS !== 'android') return
  try {
    const stage     = stageFromStreak(streakDays)
    const stageName = TREE_STAGES[stage - 1]?.short ?? "Urug'"

    await Promise.all([
      AsyncStorage.setItem('widget_streak_days', String(streakDays)),
      AsyncStorage.setItem('widget_stage',       String(stage)),
      AsyncStorage.setItem('widget_stage_name',  stageName),
    ])

    const { requestWidgetUpdate } = await import('react-native-android-widget')
    const { StreakWidget }        = await import('../widgets/StreakWidget')

    await requestWidgetUpdate({
      widgetName:   'Streak',
      renderWidget: () => React.createElement(StreakWidget, { streakDays, stage, stageName }),
      widgetNotFound: () => {},
    })
  } catch {}
}

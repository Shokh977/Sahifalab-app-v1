import React from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { WidgetTaskHandlerProps } from 'react-native-android-widget'
import { StreakWidget } from './StreakWidget'

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const streakDays = parseInt((await AsyncStorage.getItem('widget_streak_days')) ?? '0', 10)
      const stage      = parseInt((await AsyncStorage.getItem('widget_stage'))       ?? '1', 10)
      const stageName  = (await AsyncStorage.getItem('widget_stage_name')) ?? "Urug'"

      props.renderWidget(
        React.createElement(StreakWidget, { streakDays, stage, stageName })
      )
      break
    }
    default:
      break
  }
}

/**
 * A tab screen that Fokus rejimi may hide. While it's hidden the screen
 * isn't rendered at all: nothing flashes if the navigator lands on it for a
 * frame (cold start, before the tab bar sends you to Fokus), and a hidden
 * tab does no work (fetches, clocks) in the background. Turning the mode off
 * mounts it again.
 */
import React from 'react'
import { View } from 'react-native'
import { useTheme } from '../../design/ThemeProvider'
import { useFocusModeStore, type FocusTab } from './focusModeStore'

export function hideInFocusMode<P extends object>(Screen: React.ComponentType<P>, tab: FocusTab) {
  function Hideable(props: P) {
    const hidden = useFocusModeStore(s => s.on && !s.keep.includes(tab))
    const { colors } = useTheme()
    if (hidden) return <View style={{ flex: 1, backgroundColor: colors.bg }} />
    return <Screen {...props} />
  }
  Hideable.displayName = `hideInFocusMode(${Screen.displayName ?? Screen.name ?? tab})`
  return Hideable
}

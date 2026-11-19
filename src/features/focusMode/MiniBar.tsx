/**
 * A still picture of the tab bar for the given tabs: the normal five-tab bar,
 * or Fokus rejimi's capsule. For the intro and Moslash sheets ("Shunday
 * koʻrinadi"); not interactive, hidden from screen readers (the sheet says
 * the same in words).
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../design/ThemeProvider'
import { iconSize, iconStroke, radius, space, tabBar } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { ALL_TABS, type FocusTab } from './focusModeStore'
import { capsule, tabMeta } from './tabMeta'

export function MiniBar({ tabs, width, active = 'study' }: { tabs: FocusTab[]; width: number; active?: FocusTab }) {
  const { colors, scheme, elevation } = useTheme()
  const full = tabs.length >= ALL_TABS.length
  const n = tabs.length
  const itemW = full ? width / n : capsule.itemW(n)
  const boxW = full ? width : capsule.width(n)
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.wrap, { width, height: tabBar.height }]}
    >
      <View
        style={[
          styles.box,
          full
            ? { width: boxW, backgroundColor: colors.tabBar, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }
            : [
                { width: boxW, borderRadius: tabBar.height / 2, padding: capsule.pad, gap: capsule.gap },
                { backgroundColor: scheme === 'light' ? colors.surface : colors.surfaceRaised, borderWidth: 1.5, borderColor: colors.accent + '80' },
                elevation,
              ],
        ]}
      >
        {tabs.map(name => {
          const { label, Icon } = tabMeta(name)
          const on = name === active
          const color = on ? colors.accentText : colors.textMuted
          return (
            <View
              key={name}
              style={[
                styles.item,
                { width: itemW },
                full ? null : { height: capsule.itemH, borderRadius: radius.xl, backgroundColor: on ? colors.accentSoft : 'transparent' },
              ]}
            >
              {full && on && <View style={[styles.fullPill, { backgroundColor: colors.accentSoft }]} />}
              <Icon size={iconSize.sm} color={color} strokeWidth={iconStroke} />
              <Text style={[typeScale.caption, { color }]} numberOfLines={1}>{label}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  box: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: tabBar.height, overflow: 'hidden' },
  item: { alignItems: 'center', justifyContent: 'center', gap: space.xxs - 2 },
  fullPill: {
    position: 'absolute', top: space.xxs, width: tabBar.pillWidth, height: tabBar.pillHeight,
    borderRadius: radius.full, alignSelf: 'center',
  },
})

/**
 * Input and TextArea — optional label, leading icon, character counter;
 * default, focused (accent border), error (danger border + message),
 * disabled.
 */
import React, { useState } from 'react'
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { controlHeight, iconSize, iconStroke, radius, space, textAreaMinHeight } from '../../design/spacing'
import { stateOpacity } from '../../design/tokens'
import { tabular, type as typeScale } from '../../design/typography'

export interface InputProps extends Omit<TextInputProps, 'style' | 'editable'> {
  label?: string
  icon?: LucideIcon
  error?: string
  disabled?: boolean
  /** Shows "n / maxLength" under the field (needs maxLength). */
  counter?: boolean
  style?: StyleProp<ViewStyle>
}

function Field({ multiline, label, icon: Icon, error, disabled, counter, style, onFocus, onBlur, ...rest }: InputProps) {
  const { colors } = useTheme()
  const [focused, setFocused] = useState(false)
  const border = error ? colors.danger : focused ? colors.accent : colors.border
  const length = rest.value?.length ?? 0
  const showCounter = counter && rest.maxLength != null

  return (
    <View style={[styles.wrap, disabled && { opacity: stateOpacity.disabled }, style]}>
      {label ? <Text style={[typeScale.callout, { color: colors.textMuted }]}>{label}</Text> : null}
      <View
        style={[
          styles.box,
          multiline ? styles.multi : styles.single,
          { backgroundColor: colors.surface, borderColor: border },
        ]}
      >
        {Icon && <Icon size={iconSize.sm} color={colors.textMuted} strokeWidth={iconStroke} style={multiline ? styles.iconTop : undefined} />}
        <TextInput
          {...rest}
          multiline={multiline}
          editable={!disabled}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.accent}
          onFocus={e => { setFocused(true); onFocus?.(e) }}
          onBlur={e => { setFocused(false); onBlur?.(e) }}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          accessibilityHint={error}
          style={[typeScale.body, styles.input, multiline && styles.inputMulti, { color: colors.text }]}
        />
      </View>
      {(error || showCounter) && (
        <View style={styles.footer}>
          <Text style={[typeScale.callout, styles.flex, { color: colors.dangerText }]} accessibilityLiveRegion="polite">
            {error ?? ''}
          </Text>
          {showCounter && (
            <Text style={[typeScale.callout, tabular, { color: colors.textMuted }]}>{length} / {rest.maxLength}</Text>
          )}
        </View>
      )}
    </View>
  )
}

export function Input(props: InputProps) {
  return <Field {...props} multiline={false} />
}

export function TextArea(props: InputProps) {
  return <Field textAlignVertical="top" {...props} multiline />
}

const styles = StyleSheet.create({
  wrap: { gap: space.xxs + 2 },
  box: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.sm + 2, gap: space.xs },
  single: { height: controlHeight.md, alignItems: 'center' },
  multi: { minHeight: textAreaMinHeight, alignItems: 'flex-start', paddingVertical: space.sm },
  iconTop: { marginTop: 1 },
  input: { flex: 1, padding: 0 },
  inputMulti: { minHeight: textAreaMinHeight - space.sm * 2 },
  footer: { flexDirection: 'row', gap: space.xs },
  flex: { flex: 1 },
})

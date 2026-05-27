import React, { useState } from 'react'
import {
  View, TextInput, Text, Pressable, StyleSheet,
  type TextInputProps, type ViewStyle,
} from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, radius, spacing } from '../../lib/constants'

interface Props extends TextInputProps {
  label?:       string
  error?:       string
  rightElement?: React.ReactNode
  containerStyle?: ViewStyle
  isPassword?:  boolean
}

export function Input({
  label, error, rightElement, containerStyle, isPassword, style, ...rest
}: Props) {
  const { c } = useTheme()
  const [showPw, setShowPw] = useState(false)

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
          {label}
        </Text>
      )}
      <View style={[
        styles.inputWrap,
        { backgroundColor: c.bgTertiary, borderColor: error ? c.error : c.border },
      ]}>
        <TextInput
          {...rest}
          secureTextEntry={isPassword && !showPw}
          placeholderTextColor={c.textMuted}
          style={[
            styles.input,
            { color: c.textPrimary, fontFamily: typography.fontFamily.regular },
            style,
          ]}
        />
        {isPassword && (
          <Pressable onPress={() => setShowPw(v => !v)} style={styles.eyeBtn}>
            <Text style={{ color: c.textMuted, fontSize: 18 }}>
              {showPw ? '🙈' : '👁'}
            </Text>
          </Pressable>
        )}
        {!isPassword && rightElement}
      </View>
      {error && (
        <Text style={[styles.error, { color: c.error, fontFamily: typography.fontFamily.regular }]}>
          {error}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper:   { marginBottom: spacing.md },
  label:     { fontSize: typography.size.sm, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md,
    height: 50,
  },
  input:     { flex: 1, fontSize: typography.size.base },
  eyeBtn:    { padding: spacing.xs, marginLeft: spacing.xs },
  error:     { fontSize: typography.size.xs, marginTop: 4 },
})

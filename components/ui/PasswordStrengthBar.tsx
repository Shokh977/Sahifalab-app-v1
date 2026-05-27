import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { checkPassword } from '../../lib/validators'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing } from '../../lib/constants'

export function PasswordStrengthBar({ password }: { password: string }) {
  const { c } = useTheme()
  const { score, label, color, errors } = checkPassword(password)

  if (!password) return null

  return (
    <View style={styles.wrapper}>
      {/* Bar segments */}
      <View style={styles.segments}>
        {[1, 2, 3, 4].map(n => (
          <View
            key={n}
            style={[
              styles.segment,
              { backgroundColor: n <= score ? color : c.bgTertiary },
            ]}
          />
        ))}
      </View>

      {/* Label */}
      <Text style={[styles.label, { color, fontFamily: typography.fontFamily.medium }]}>
        {label}
      </Text>

      {/* Errors */}
      {errors.length > 0 && (
        <View style={styles.errors}>
          {errors.map(e => (
            <Text key={e} style={[styles.errorItem, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              • {e}
            </Text>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper:   { marginTop: spacing.xs },
  segments:  { flexDirection: 'row', gap: 4, marginBottom: 4 },
  segment:   { flex: 1, height: 4, borderRadius: 2 },
  label:     { fontSize: typography.size.xs },
  errors:    { marginTop: 6 },
  errorItem: { fontSize: typography.size.xs, lineHeight: 18 },
})

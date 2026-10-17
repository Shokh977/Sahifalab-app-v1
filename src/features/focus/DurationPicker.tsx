/**
 * Duration chips 15 / 25 / 45 / 60 / Boshqa. "Boshqa" opens a Sheet with a
 * 5–180 minute input.
 */
import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { space } from '../../design/spacing'
import { Button, Chip, Input, Sheet } from '../../components/ui'
import { CUSTOM_MAX, CUSTOM_MIN, validCustomMinutes } from './timerMath'

const PRESETS = [15, 25, 45, 60] as const

export function DurationPicker({ value, onChange, disabled }: {
  value: number
  onChange: (minutes: number) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const custom = !PRESETS.includes(value as (typeof PRESETS)[number])
  const parsed = validCustomMinutes(text)

  const confirm = () => {
    if (parsed == null) return
    onChange(parsed)
    setOpen(false)
    setText('')
  }

  return (
    <>
      <View style={styles.row} accessibilityRole="radiogroup">
        {PRESETS.map(m => (
          <Chip
            key={m}
            variant="choice"
            label={`${m} daq`}
            selected={value === m}
            disabled={disabled}
            onPress={() => onChange(m)}
          />
        ))}
        <Chip
          variant="choice"
          label={custom ? `${value} daq` : 'Boshqa'}
          selected={custom}
          disabled={disabled}
          onPress={() => setOpen(true)}
        />
      </View>

      <Sheet visible={open} onClose={() => { setOpen(false); setText('') }} title="Vaqtni kiriting">
        <View style={styles.sheet}>
          <Input
            label={`Daqiqa (${CUSTOM_MIN}–${CUSTOM_MAX})`}
            value={text}
            onChangeText={setText}
            keyboardType="number-pad"
            placeholder="Masalan, 40"
            maxLength={3}
            error={text.length > 0 && parsed == null ? `${CUSTOM_MIN} dan ${CUSTOM_MAX} gacha son kiriting` : undefined}
            autoFocus
          />
          <Button label="Tasdiqlash" size="lg" fullWidth disabled={parsed == null} onPress={confirm} />
        </View>
      </Sheet>
    </>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.xs },
  sheet: { gap: space.md },
})

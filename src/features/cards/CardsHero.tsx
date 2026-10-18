/**
 * Kartalar hero: "{n} ta karta bugun · ~{m} daqiqa" and one primary
 * "Takrorlashni boshlash". With nothing due: "Bugun takrorlash yoʻq" and
 * a secondary action to add cards.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Layers } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Button, Card } from '../../components/ui'
import { heroCopy } from './cards'

export function CardsHero({ due, capped, mastered, total, onStart, onAdd }: {
  due: number
  /** Today's review cap bit: "Bugun 150 ta · qolganlari ertaga". */
  capped?: boolean
  mastered: number
  total: number
  onStart: () => void
  onAdd: () => void
}) {
  const { colors } = useTheme()
  return (
    <Card variant="hero">
      <View style={styles.gap}>
        <Text style={[typeScale.overline, { color: colors.textMuted }]}>Bugungi takrorlash</Text>
        {due > 0 ? (
          <>
            <Text style={[typeScale.title2, { color: colors.text }]}>{heroCopy(due, capped)}</Text>
            <Text style={[typeScale.callout, { color: colors.textMuted }]}>
              {mastered} / {total} karta oʻrganildi
            </Text>
            <Button label="Takrorlashni boshlash" icon={Layers} size="lg" fullWidth onPress={onStart} style={styles.cta} />
          </>
        ) : (
          <>
            <Text style={[typeScale.title2, { color: colors.text }]}>Bugun takrorlash yoʻq</Text>
            <Text style={[typeScale.callout, { color: colors.textMuted }]}>
              Yangi kartalar qoʻshing yoki ommaviy toʻplamdan nusxa oling.
            </Text>
            <Button label="Yangi kartalar" variant="secondary" size="lg" fullWidth onPress={onAdd} style={styles.cta} />
          </>
        )}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  gap: { gap: space.xs },
  cta: { marginTop: space.sm },
})

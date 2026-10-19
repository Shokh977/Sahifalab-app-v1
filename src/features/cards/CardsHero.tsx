/**
 * Kartalar hero: "{n} ta karta bugun · ~{m} daqiqa" and one primary
 * "Takrorlashni boshlash". With nothing due: "Bugun takrorlash yoʻq" and
 * a secondary action to add cards. When today's new-card limit is used up
 * and a deck still has unseen cards: "Yana 20 ta yangi karta" (Phase 7.5).
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Layers, Plus } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Button, Card } from '../../components/ui'
import { heroCopy } from './cards'
import { EXTRA_NEW } from '../flashcards/queueMath'

export function CardsHero({ due, capped, mastered, total, onStart, onAdd, onMoreNew }: {
  due: number
  /** Today's review cap bit: "Bugun 150 ta · qolganlari ertaga". */
  capped?: boolean
  mastered: number
  total: number
  onStart: () => void
  onAdd: () => void
  /** Set when a deck's new-card limit for today is reached (today only, +20). */
  onMoreNew?: () => void
}) {
  const more = onMoreNew ? (
    <Button label={`Yana ${EXTRA_NEW} ta yangi karta`} icon={Plus} variant={due > 0 ? 'ghost' : 'primary'} size="lg" fullWidth onPress={onMoreNew} />
  ) : null
  const { colors } = useTheme()
  return (
    <Card variant="hero">
      <View style={styles.gap}>
        <Text style={[typeScale.overline, { color: colors.textMuted }]}>Bugungi takrorlash</Text>
        {due > 0 ? (
          <>
            <Text numberOfLines={2} style={[typeScale.title2, { color: colors.text }]}>{heroCopy(due, capped)}</Text>
            <Text style={[typeScale.callout, { color: colors.textMuted }]}>
              {mastered} / {total} karta oʻrganildi
            </Text>
            <Button label="Takrorlashni boshlash" icon={Layers} size="lg" fullWidth onPress={onStart} style={styles.cta} />
            {more}
          </>
        ) : (
          <>
            <Text numberOfLines={2} style={[typeScale.title2, { color: colors.text }]}>Bugun takrorlash yoʻq</Text>
            <Text style={[typeScale.callout, { color: colors.textMuted }]}>
              {more
                ? 'Bugungi yangi kartalar tugadi. Xohlasangiz, yana qoʻshing.'
                : 'Yangi kartalar qoʻshing yoki ommaviy toʻplamdan nusxa oling.'}
            </Text>
            {more ? <View style={styles.cta}>{more}</View> : (
              <Button label="Yangi kartalar" variant="secondary" size="lg" fullWidth onPress={onAdd} style={styles.cta} />
            )}
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

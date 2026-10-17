/**
 * Long-press actions for a deck row: Tahrirlash, Ulashish, Oʻchirish.
 */
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Pencil, Share2, Trash2 } from 'lucide-react-native'
import type { FlashcardDeck } from '../../../lib/types'
import { space } from '../../design/spacing'
import { ListRow, Sheet } from '../../components/ui'
import { uzText } from '../today/today'

export function DeckActionsSheet({ deck, onClose, onEdit, onShare, onDelete }: {
  deck: FlashcardDeck | null
  onClose: () => void
  onEdit: (d: FlashcardDeck) => void
  onShare: (d: FlashcardDeck) => void
  onDelete: (d: FlashcardDeck) => void
}) {
  const run = (fn: (d: FlashcardDeck) => void) => () => { if (deck) { onClose(); fn(deck) } }
  return (
    <Sheet visible={!!deck} onClose={onClose} title={deck ? uzText(deck.title) : undefined}>
      <View style={styles.list}>
        <ListRow title="Tahrirlash" leading={{ kind: 'icon', icon: Pencil }} onPress={run(onEdit)} />
        <ListRow title="Ulashish" leading={{ kind: 'icon', icon: Share2 }} onPress={run(onShare)} />
        <ListRow title="Oʻchirish" leading={{ kind: 'icon', icon: Trash2 }} onPress={run(onDelete)} />
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  list: { paddingBottom: space.md },
})

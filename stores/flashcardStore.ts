import { create } from 'zustand'
import { flashcards as flashcardsApi } from '../lib/api'
import type { FlashcardDeck, Flashcard, FlashcardStats } from '../lib/types'

interface FlashcardState {
  decks:        FlashcardDeck[]
  stats:        FlashcardStats | null
  loading:      boolean
  statsLoading: boolean
  error:        string | null
  statsError:   string | null

  fetchDecks:    () => Promise<void>
  fetchStats:    () => Promise<void>
  addDeck:       (deck: FlashcardDeck) => void
  updateDeck:    (deck: FlashcardDeck) => void
  removeDeck:    (id: number) => void
  patchDeckCard: (deckId: number, delta: { card_count?: number; mastered_count?: number; due_count?: number }) => void
}

export const useFlashcardStore = create<FlashcardState>((set, get) => ({
  decks:        [],
  stats:        null,
  loading:      false,
  statsLoading: false,
  error:        null,
  statsError:   null,

  fetchDecks: async () => {
    if (get().loading) return
    set({ loading: true, error: null })
    try {
      const decks = await flashcardsApi.listDecks()
      set({ decks })
    } catch (e: any) {
      set({ error: e?.message ?? 'Xatolik yuz berdi' })
    } finally { set({ loading: false }) }
  },

  fetchStats: async () => {
    if (get().statsLoading) return
    set({ statsLoading: true, statsError: null })
    try {
      const stats = await flashcardsApi.getStats()
      set({ stats })
    } catch (e: any) {
      set({ statsError: e?.message ?? 'Xatolik yuz berdi' })
    } finally { set({ statsLoading: false }) }
  },

  addDeck: (deck) => set(s => ({ decks: [deck, ...s.decks] })),

  updateDeck: (deck) =>
    set(s => ({ decks: s.decks.map(d => d.id === deck.id ? deck : d) })),

  removeDeck: (id) =>
    set(s => ({ decks: s.decks.filter(d => d.id !== id) })),

  patchDeckCard: (deckId, delta) =>
    set(s => ({
      decks: s.decks.map(d =>
        d.id === deckId ? { ...d, ...delta } : d
      ),
    })),
}))

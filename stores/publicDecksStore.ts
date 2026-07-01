import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { flashcards as flashcardsApi } from '../lib/api'
import type {
  PublicDeckItem, PublicDeckDetail, DeckCategory, DeckSort, DeckReportReason, FlashcardDeck,
} from '../lib/types'

const RATE_QUEUE_KEY   = 'sahifalab_deck_rate_queue'
const REPORT_QUEUE_KEY = 'sahifalab_deck_report_queue'
const PAGE_SIZE = 20

interface RateQueueItem   { deckId: number; rating: number; comment?: string; queuedAt: number }
interface ReportQueueItem { deckId: number; reason: DeckReportReason; details?: string; queuedAt: number }

interface Filters {
  category: DeckCategory | 'all'
  sort:     DeckSort
  search:   string
}

interface PublicDecksState {
  publicDecks:   PublicDeckItem[]
  featuredDecks: PublicDeckItem[]
  previewDeck:   PublicDeckDetail | null
  filters:       Filters
  page:          number
  total:         number
  loading:       boolean
  loadingMore:   boolean
  rateQueue:     RateQueueItem[]
  reportQueue:   ReportQueueItem[]

  setFilters:       (filters: Partial<Filters>) => void
  fetchPublicDecks: (page?: number) => Promise<void>
  fetchFeatured:    () => Promise<void>
  fetchDeckPreview: (id: number) => Promise<void>
  cloneDeck:        (id: number) => Promise<FlashcardDeck & { already_cloned: boolean }>
  rateDeck:         (id: number, rating: number, comment?: string) => Promise<void>
  reportDeck:       (id: number, reason: DeckReportReason, details?: string) => Promise<void>
  publishDeck:      (id: number, isAnonymous: boolean, category: string) => Promise<FlashcardDeck>
  unpublishDeck:    (id: number) => Promise<FlashcardDeck>

  loadQueuesFromStorage: () => Promise<void>
  flushQueues:           () => Promise<void>
}

async function persistQueue(key: string, queue: unknown[]) {
  try { await AsyncStorage.setItem(key, JSON.stringify(queue)) } catch {}
}

export const usePublicDecksStore = create<PublicDecksState>((set, get) => ({
  publicDecks:   [],
  featuredDecks: [],
  previewDeck:   null,
  filters:       { category: 'all', sort: 'popular', search: '' },
  page:          1,
  total:         0,
  loading:       false,
  loadingMore:   false,
  rateQueue:     [],
  reportQueue:   [],

  setFilters: (patch) => set(s => ({ filters: { ...s.filters, ...patch } })),

  fetchPublicDecks: async (page = 1) => {
    const { filters } = get()
    set(page === 1 ? { loading: true } : { loadingMore: true })
    try {
      const res = await flashcardsApi.listPublicDecks({
        category: filters.category, sort: filters.sort, search: filters.search.trim() || undefined,
        page, limit: PAGE_SIZE,
      })
      set(s => ({
        publicDecks: page === 1 ? res.decks : [...s.publicDecks, ...res.decks],
        total: res.total,
        page,
      }))
    } catch {}
    finally { set({ loading: false, loadingMore: false }) }
  },

  fetchFeatured: async () => {
    try {
      const featuredDecks = await flashcardsApi.getFeaturedDecks()
      set({ featuredDecks })
    } catch {}
  },

  fetchDeckPreview: async (id) => {
    set({ previewDeck: null })
    try {
      const previewDeck = await flashcardsApi.getPublicDeck(id)
      set({ previewDeck })
    } catch {}
  },

  // Cloning needs a server-side copy — it cannot be queued offline. The UI
  // should check connectivity (useOnline()) and disable the clone button with
  // "Internet aloqasi kerak" instead of calling this while offline.
  cloneDeck: (id) => flashcardsApi.cloneDeck(id),

  rateDeck: async (id, rating, comment) => {
    try {
      const result = await flashcardsApi.rateDeck(id, { rating, comment })
      set(s => s.previewDeck && s.previewDeck.id === id
        ? { previewDeck: { ...s.previewDeck, rating_avg: result.rating_avg, rating_count: result.rating_count } }
        : {})
    } catch (e) {
      // Only a genuine network failure (fetch() never reached the server) is
      // safe to queue. A real HTTP error response (rate-limited, not cloned
      // yet, etc.) must surface to the user instead of retrying forever.
      if (!(e instanceof TypeError)) throw e
      const item: RateQueueItem = { deckId: id, rating, comment, queuedAt: Date.now() }
      const next = [...get().rateQueue, item]
      set({ rateQueue: next })
      await persistQueue(RATE_QUEUE_KEY, next)
    }
  },

  reportDeck: async (id, reason, details) => {
    try {
      await flashcardsApi.reportDeck(id, { reason, details })
    } catch (e) {
      if (!(e instanceof TypeError)) throw e
      const item: ReportQueueItem = { deckId: id, reason, details, queuedAt: Date.now() }
      const next = [...get().reportQueue, item]
      set({ reportQueue: next })
      await persistQueue(REPORT_QUEUE_KEY, next)
    }
  },

  publishDeck: (id, isAnonymous, category) =>
    flashcardsApi.publishDeck(id, { is_anonymous: isAnonymous, category }),

  unpublishDeck: (id) => flashcardsApi.unpublishDeck(id),

  loadQueuesFromStorage: async () => {
    try {
      const [rateRaw, reportRaw] = await Promise.all([
        AsyncStorage.getItem(RATE_QUEUE_KEY),
        AsyncStorage.getItem(REPORT_QUEUE_KEY),
      ])
      set({
        rateQueue:   rateRaw   ? (JSON.parse(rateRaw)   as RateQueueItem[])   : [],
        reportQueue: reportRaw ? (JSON.parse(reportRaw) as ReportQueueItem[]) : [],
      })
    } catch {}
  },

  flushQueues: async () => {
    // One at a time. A network failure (still offline) stops the loop — the
    // item stays queued for next time. Any other failure (e.g. the deck got
    // removed, or a rate limit) means the item can never succeed, so it's
    // dropped rather than blocking everything queued behind it.
    while (get().rateQueue.length > 0) {
      const item = get().rateQueue[0]
      try {
        await flashcardsApi.rateDeck(item.deckId, { rating: item.rating, comment: item.comment })
      } catch (e) {
        if (e instanceof TypeError) break
      }
      const remaining = get().rateQueue.slice(1)
      set({ rateQueue: remaining })
      await persistQueue(RATE_QUEUE_KEY, remaining)
    }
    while (get().reportQueue.length > 0) {
      const item = get().reportQueue[0]
      try {
        await flashcardsApi.reportDeck(item.deckId, { reason: item.reason, details: item.details })
      } catch (e) {
        if (e instanceof TypeError) break
      }
      const remaining = get().reportQueue.slice(1)
      set({ reportQueue: remaining })
      await persistQueue(REPORT_QUEUE_KEY, remaining)
    }
  },
}))

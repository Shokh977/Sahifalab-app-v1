import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { flashcards as flashcardsApi } from '../lib/api'
import type {
  PublicDeckItem, PublicDeckDetail, DeckCategory, DeckSort, DeckReportReason, FlashcardDeck,
} from '../lib/types'

const RATE_QUEUE_KEY    = 'sahifalab_deck_rate_queue'
const REPORT_QUEUE_KEY  = 'sahifalab_deck_report_queue'
const PUB_CACHE_KEY     = 'sahifalab_pub_decks_v1'
const FEATURED_CACHE_KEY = 'sahifalab_featured_decks_v1'
const PUB_CACHE_TTL     = 5  * 60 * 1000   // 5 min — public list
const FEATURED_CACHE_TTL = 30 * 60 * 1000  // 30 min — featured changes rarely
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
  error:         string | null
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
  error:         null,
  rateQueue:     [],
  reportQueue:   [],

  setFilters: (patch) => set(s => ({ filters: { ...s.filters, ...patch } })),

  fetchPublicDecks: async (page = 1) => {
    const { filters } = get()
    const isDefault = page === 1
      && filters.category === 'all'
      && filters.sort === 'popular'
      && !filters.search.trim()

    // For the default first-page view, serve cached data instantly and skip
    // the network if the cache is still fresh (< 5 min).
    if (isDefault && get().publicDecks.length === 0) {
      try {
        const raw = await AsyncStorage.getItem(PUB_CACHE_KEY)
        if (raw) {
          const entry: { data: PublicDeckItem[]; total: number; cachedAt: number } = JSON.parse(raw)
          set({ publicDecks: entry.data, total: entry.total })
          if (Date.now() - entry.cachedAt < PUB_CACHE_TTL) return
        }
      } catch {}
    }

    // Only show the full-page spinner when there's nothing to display yet
    const hasData = get().publicDecks.length > 0
    set(page === 1
      ? { loading: !hasData, error: null }
      : { loadingMore: true }
    )
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
      if (isDefault) {
        AsyncStorage.setItem(PUB_CACHE_KEY, JSON.stringify({
          data: res.decks, total: res.total, cachedAt: Date.now(),
        })).catch(() => {})
      }
    } catch (e: any) {
      if (page === 1 && !hasData) set({ error: e?.message ?? 'Xatolik yuz berdi' })
    } finally { set({ loading: false, loadingMore: false }) }
  },

  fetchFeatured: async () => {
    // Serve cached featured decks and only re-fetch when the cache is stale.
    if (get().featuredDecks.length === 0) {
      try {
        const raw = await AsyncStorage.getItem(FEATURED_CACHE_KEY)
        if (raw) {
          const entry: { data: PublicDeckItem[]; cachedAt: number } = JSON.parse(raw)
          set({ featuredDecks: entry.data })
          if (Date.now() - entry.cachedAt < FEATURED_CACHE_TTL) return
        }
      } catch {}
    }
    try {
      const featuredDecks = await flashcardsApi.getFeaturedDecks()
      set({ featuredDecks })
      AsyncStorage.setItem(FEATURED_CACHE_KEY, JSON.stringify({
        data: featuredDecks, cachedAt: Date.now(),
      })).catch(() => {})
    } catch {}
  },

  fetchDeckPreview: async (id) => {
    try {
      const previewDeck = await flashcardsApi.getPublicDeck(id)
      set({ previewDeck })
    } catch {
      // Genuine failure (deleted/not found) — clear so the "not found" UI can react.
      set({ previewDeck: null })
    }
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

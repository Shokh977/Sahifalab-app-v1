import { create } from 'zustand'
import { social } from '../lib/api'
import type { Post } from '../lib/types'

type Tab = 'feed' | 'explore'

interface FeedState {
  // per-tab data
  feedItems:    Post[]
  exploreItems: Post[]
  feedPage:     number
  explorePage:  number
  feedHasMore:  boolean
  exploreHasMore: boolean
  feedLoading:  boolean
  exploreLoading: boolean
  feedError:    boolean
  exploreError: boolean

  activeTab: Tab
  composerOpen: boolean

  setActiveTab:    (tab: Tab) => void
  openComposer:    () => void
  closeComposer:   () => void

  // load first page (or refresh)
  loadFeed:    () => Promise<void>
  loadExplore: () => Promise<void>

  // load next page
  loadMoreFeed:    () => Promise<void>
  loadMoreExplore: () => Promise<void>

  // optimistic mutations
  toggleLike:   (postId: number) => void
  toggleRepost: (postId: number) => void
  toggleSave:   (postId: number) => void
  prependPost:  (post: Post) => void
  removePost:   (postId: number) => void
  updatePost:   (post: Post) => void
}

function applyMutation(items: Post[], postId: number, fn: (p: Post) => Post): Post[] {
  return items.map(p => (p.id === postId ? fn(p) : p))
}

export const useFeedStore = create<FeedState>((set, get) => ({
  feedItems:      [],
  exploreItems:   [],
  feedPage:       0,
  explorePage:    0,
  feedHasMore:    true,
  exploreHasMore: true,
  feedLoading:    false,
  exploreLoading: false,
  feedError:      false,
  exploreError:   false,
  activeTab:    'feed',
  composerOpen: false,

  setActiveTab:  (tab) => set({ activeTab: tab }),
  openComposer:  ()    => set({ composerOpen: true }),
  closeComposer: ()    => set({ composerOpen: false }),

  loadFeed: async () => {
    if (get().feedLoading) return
    set({ feedLoading: true, feedError: false })
    try {
      const res = await social.getFeed(1, 20)
      const items = res.items ?? (res as any).posts ?? []
      set({ feedItems: items, feedPage: 1, feedHasMore: res.has_more ?? false })
    } catch {
      set({ feedError: true, feedHasMore: false })
    }
    finally { set({ feedLoading: false }) }
  },

  loadExplore: async () => {
    if (get().exploreLoading) return
    set({ exploreLoading: true, exploreError: false })
    try {
      const res = await social.getExplore(1, 20)
      const items = res.items ?? (res as any).posts ?? []
      set({ exploreItems: items, explorePage: 1, exploreHasMore: res.has_more ?? false })
    } catch {
      set({ exploreError: true, exploreHasMore: false })
    }
    finally { set({ exploreLoading: false }) }
  },

  loadMoreFeed: async () => {
    const { feedLoading, feedHasMore, feedPage, feedItems } = get()
    if (feedLoading || !feedHasMore) return
    set({ feedLoading: true })
    try {
      const res = await social.getFeed(feedPage + 1, 20)
      const newItems = res.items ?? (res as any).posts ?? []
      set({ feedItems: [...feedItems, ...newItems], feedPage: feedPage + 1, feedHasMore: res.has_more ?? false })
    } catch {
      set({ feedHasMore: false })
    }
    finally { set({ feedLoading: false }) }
  },

  loadMoreExplore: async () => {
    const { exploreLoading, exploreHasMore, explorePage, exploreItems } = get()
    if (exploreLoading || !exploreHasMore) return
    set({ exploreLoading: true })
    try {
      const res = await social.getExplore(explorePage + 1, 20)
      const newItems = res.items ?? (res as any).posts ?? []
      set({ exploreItems: [...exploreItems, ...newItems], explorePage: explorePage + 1, exploreHasMore: res.has_more ?? false })
    } catch {
      set({ exploreHasMore: false })
    }
    finally { set({ exploreLoading: false }) }
  },

  toggleLike: (postId) => {
    set(s => {
      const inFeed    = s.feedItems.some(p => p.id === postId)
      const inExplore = s.exploreItems.some(p => p.id === postId)
      const mutate = (items: Post[]) =>
        applyMutation(items, postId, p => ({
          ...p,
          is_liked:    !p.is_liked,
          likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1,
        }))
      return {
        ...(inFeed    && { feedItems:    mutate(s.feedItems) }),
        ...(inExplore && { exploreItems: mutate(s.exploreItems) }),
      }
    })
  },

  toggleRepost: (postId) => {
    set(s => {
      const inFeed    = s.feedItems.some(p => p.id === postId)
      const inExplore = s.exploreItems.some(p => p.id === postId)
      const mutate = (items: Post[]) =>
        applyMutation(items, postId, p => ({
          ...p,
          is_reposted:   !p.is_reposted,
          reposts_count: p.is_reposted ? p.reposts_count - 1 : p.reposts_count + 1,
        }))
      return {
        ...(inFeed    && { feedItems:    mutate(s.feedItems) }),
        ...(inExplore && { exploreItems: mutate(s.exploreItems) }),
      }
    })
  },

  toggleSave: (postId) => {
    set(s => {
      const inFeed    = s.feedItems.some(p => p.id === postId)
      const inExplore = s.exploreItems.some(p => p.id === postId)
      const mutate = (items: Post[]) =>
        applyMutation(items, postId, p => ({
          ...p,
          is_saved:    !p.is_saved,
          saves_count: p.is_saved ? p.saves_count - 1 : p.saves_count + 1,
        }))
      return {
        ...(inFeed    && { feedItems:    mutate(s.feedItems) }),
        ...(inExplore && { exploreItems: mutate(s.exploreItems) }),
      }
    })
  },

  prependPost: (post) =>
    set(s => ({ feedItems: [post, ...s.feedItems] })),

  removePost: (postId) =>
    set(s => ({
      feedItems:    s.feedItems.filter(p => p.id !== postId),
      exploreItems: s.exploreItems.filter(p => p.id !== postId),
    })),

  updatePost: (post) => {
    const patch = (items: Post[]) => items.map(p => p.id === post.id ? post : p)
    set(s => ({ feedItems: patch(s.feedItems), exploreItems: patch(s.exploreItems) }))
  },
}))

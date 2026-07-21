import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, TextInput, Image,
  Animated, Dimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack, useRouter, useLocalSearchParams } from 'expo-router'
import { ChevronLeft, Search, X, UserCircle2 } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { profile as profileApi, connections as connApi } from '../../lib/api'
import { typography, spacing, radius } from '../../lib/constants'
import { RoleBadge } from '../../components/ui/RoleBadge'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'connections' | 'followers' | 'following'

const TABS: { key: Tab; label: string }[] = [
  { key: 'connections', label: 'Aloqa'       },
  { key: 'followers',   label: 'Kuzatuvchi'  },
  { key: 'following',   label: 'Kuzatilgan'  },
]

const W = Dimensions.get('window').width

interface PersonRow {
  id:          number
  name:        string
  username:    string | null
  photoUrl:    string | null
  headline:    string | null
  role:        string | null
  accountType: string | null
}

// ── Normalise raw API shapes ──────────────────────────────────────────────────

function normalise(raw: any, tab: Tab, isOwnConns = false): PersonRow[] {
  if (!Array.isArray(raw)) return []
  if (tab === 'connections' && isOwnConns) {
    return raw.map((item: any) => ({
      id:          item.user?.id           ?? 0,
      name:        item.user?.name         ?? '',
      username:    item.user?.username     ?? null,
      photoUrl:    item.user?.avatar_url   ?? null,
      headline:    item.user?.headline     ?? null,
      role:        item.user?.role         ?? null,
      accountType: item.user?.account_type ?? null,
    }))
  }
  return raw.map((item: any) => ({
    id:          item.user?.telegram_id  ?? 0,
    name:        item.user?.full_name    ?? '',
    username:    item.user?.username     ?? null,
    photoUrl:    item.user?.photo_url    ?? null,
    headline:    item.user?.headline     ?? null,
    role:        item.user?.role         ?? null,
    accountType: item.user?.account_type ?? null,
  }))
}

// ── Person row ────────────────────────────────────────────────────────────────

function PersonRow({ person, onPress }: { person: PersonRow; onPress: () => void }) {
  const { c } = useTheme()
  const initials = person.name.trim()
    ? person.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.75 : 1 }]}
    >
      {person.photoUrl ? (
        <Image source={{ uri: person.photoUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: c.brandSubtle, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: c.brand, fontSize: 16, fontFamily: typography.fontFamily.bold }}>
            {initials}
          </Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text numberOfLines={1} style={[styles.name, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold, flexShrink: 1 }]}>
            {person.name}
          </Text>
          <RoleBadge role={person.role} accountType={person.accountType} size={14} />
        </View>
        {person.username ? (
          <Text numberOfLines={1} style={[styles.sub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            @{person.username}
          </Text>
        ) : null}
        {person.headline ? (
          <Text numberOfLines={1} style={[styles.sub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {person.headline}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

// ── Tab page ──────────────────────────────────────────────────────────────────

function TabPage({
  rows, loading, error, onRetry, query, onQueryChange, onPressPerson,
}: {
  rows:           PersonRow[]
  loading:        boolean
  error:          boolean
  onRetry:        () => void
  query:          string
  onQueryChange:  (q: string) => void
  onPressPerson:  (p: PersonRow) => void
}) {
  const { c } = useTheme()
  const filtered = query.trim()
    ? rows.filter(r => r.name.toLowerCase().includes(query.toLowerCase()) ||
        (r.username ?? '').toLowerCase().includes(query.toLowerCase()))
    : rows

  return (
    <View style={{ width: W, flex: 1 }}>
      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: c.bgTertiary, marginHorizontal: spacing.base, marginVertical: spacing.sm }]}>
        <Search size={15} color={c.textMuted} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Qidirish..."
          placeholderTextColor={c.textMuted}
          style={[styles.searchInput, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}
        />
        {query.length > 0 && (
          <Pressable onPress={() => onQueryChange('')} hitSlop={8}>
            <X size={14} color={c.textMuted} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={c.brand} style={{ marginTop: spacing['2xl'] }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <PersonRow person={item} onPress={() => onPressPerson(item)} />}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          windowSize={10}
          maxToRenderPerBatch={10}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <UserCircle2 size={40} color={c.textMuted} />
              <Text style={[styles.emptyText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                {error ? "Yuklab bo'lmadi. Internetni tekshiring." : query ? 'Topilmadi' : 'Hozircha hech kim yo\'q'}
              </Text>
              {error && (
                <Pressable onPress={onRetry} style={{ marginTop: spacing.sm }}>
                  <Text style={{ color: c.brand, fontFamily: typography.fontFamily.semibold, fontSize: typography.size.sm }}>
                    Qayta urinish
                  </Text>
                </Pressable>
              )}
            </View>
          }
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ConnectionsScreen() {
  const { c }    = useTheme()
  const router   = useRouter()
  const params   = useLocalSearchParams<{
    targetId:     string
    initialTab:   Tab
    isOwnProfile: string
    name:         string
  }>()

  const targetId     = Number(params.targetId ?? 0)
  const isOwnProfile = params.isOwnProfile === 'true'
  const initialTab   = (params.initialTab ?? 'followers') as Tab
  const initialIdx   = TABS.findIndex(t => t.key === initialTab)

  // ── Pager state ─────────────────────────────────────────────────────────────
  const pagerRef   = useRef<any>(null)
  const scrollX    = useRef(new Animated.Value(initialIdx * W)).current
  const [activeIdx, setActiveIdx] = useState(initialIdx)

  // Indicator position driven directly from scrollX
  const indicatorX = scrollX.interpolate({
    inputRange:  TABS.map((_, i) => i * W),
    outputRange: TABS.map((_, i) => (i * W) / TABS.length),
    extrapolate: 'clamp',
  })

  // ── Data ────────────────────────────────────────────────────────────────────
  const [rows, setRows] = useState<Record<Tab, PersonRow[]>>({
    connections: [], followers: [], following: [],
  })
  const [loading, setLoading] = useState<Record<Tab, boolean>>({
    connections: true, followers: true, following: true,
  })
  const [errors, setErrors] = useState<Record<Tab, boolean>>({
    connections: false, followers: false, following: false,
  })
  const [queries, setQueries] = useState<Record<Tab, string>>({
    connections: '', followers: '', following: '',
  })

  const fetchTab = useCallback(async (tab: Tab) => {
    setErrors(prev => ({ ...prev, [tab]: false }))
    try {
      let raw: any
      if (tab === 'connections') {
        raw = isOwnProfile ? await connApi.listOwn() : await profileApi.getConnections(targetId)
      } else if (tab === 'followers') {
        raw = await profileApi.getFollowers(targetId)
      } else {
        raw = await profileApi.getFollowing(targetId)
      }
      setRows(prev => ({
        ...prev,
        [tab]: normalise(raw, tab, tab === 'connections' && isOwnProfile),
      }))
    } catch {
      // Previously swallowed entirely, so a failed fetch rendered the same
      // "Hozircha hech kim yo'q" empty state as a genuinely empty list —
      // FollowListModal (same data, different screen) already distinguishes
      // the two; this brings connections.tsx in line with it.
      setErrors(prev => ({ ...prev, [tab]: true }))
    }
    finally {
      setLoading(prev => ({ ...prev, [tab]: false }))
    }
  }, [targetId, isOwnProfile])

  // Fetch all tabs in parallel on mount
  useEffect(() => {
    TABS.forEach(t => fetchTab(t.key))
  }, [fetchTab])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function goToTab(idx: number) {
    pagerRef.current?.scrollTo({ x: idx * W, animated: true })
    setActiveIdx(idx)
  }

  function onMomentumScrollEnd(e: NativeSyntheticEvent<any>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W)
    setActiveIdx(idx)
  }

  function handlePressPerson(person: PersonRow) {
    router.push(`/(screens)/profile/${person.id}` as any)
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bgPrimary }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <ChevronLeft size={24} color={c.textPrimary} />
        </Pressable>
        <Text
          numberOfLines={1}
          style={[styles.headerTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}
        >
          {params.name ?? 'Profil'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: c.border }]}>
        {TABS.map((tab, i) => {
          const active = activeIdx === i
          return (
            <Pressable key={tab.key} onPress={() => goToTab(i)} style={styles.tabItem}>
              <Text style={[
                styles.tabLabel,
                {
                  color:      active ? c.textPrimary : c.textMuted,
                  fontFamily: active ? typography.fontFamily.semibold : typography.fontFamily.regular,
                },
              ]}>
                {tab.label}
              </Text>
            </Pressable>
          )
        })}

        {/* Animated underline indicator */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            { backgroundColor: c.textPrimary, width: W / TABS.length, transform: [{ translateX: indicatorX }] },
          ]}
        />
      </View>

      {/* Horizontal pager */}
      <Animated.ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true },
        )}
        onMomentumScrollEnd={onMomentumScrollEnd}
        contentOffset={{ x: initialIdx * W, y: 0 }}
        style={{ flex: 1 }}
      >
        {TABS.map(tab => (
          <TabPage
            key={tab.key}
            rows={rows[tab.key]}
            loading={loading[tab.key]}
            error={errors[tab.key]}
            onRetry={() => fetchTab(tab.key)}
            query={queries[tab.key]}
            onQueryChange={q => setQueries(prev => ({ ...prev, [tab.key]: q }))}
            onPressPerson={handlePressPerson}
          />
        ))}
      </Animated.ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn:     { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: typography.size.md, textAlign: 'center' },

  tabBar: {
    flexDirection:     'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    position:          'relative',
  },
  tabItem: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: spacing.sm + 2,
  },
  tabLabel: { fontSize: typography.size.sm },
  indicator: {
    position: 'absolute',
    bottom:   0,
    height:   2,
    left:     0,
  },

  searchWrap: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.xs,
    borderRadius:      radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.xs + 2,
  },
  searchInput: { flex: 1, fontSize: typography.size.sm, padding: 0 },

  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm + 2,
    gap:               spacing.sm,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  name:   { fontSize: typography.size.md },
  sub:    { fontSize: typography.size.xs, marginTop: 1 },

  emptyWrap: {
    alignItems:      'center',
    paddingVertical: 60,
    gap:             spacing.sm,
  },
  emptyText: { fontSize: typography.size.sm },
})

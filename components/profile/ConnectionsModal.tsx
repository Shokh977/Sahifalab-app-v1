import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, Modal, Pressable, FlatList,
  Image, ActivityIndicator, TextInput,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '../../hooks/useTheme'
import { profile as profileApi, connections as connApi } from '../../lib/api'
import type { SocialUser } from '../../lib/api'
import { typography, spacing, radius } from '../../lib/constants'
import { RoleBadge } from '../ui/RoleBadge'

type Tab = 'connections' | 'followers' | 'following'

interface Props {
  visible:        boolean
  initialTab:     Tab
  targetId:       number
  isOwnProfile:   boolean
  onClose:        () => void
  onCountLoaded?: (tab: Tab, count: number) => void
}

/** Normalised row — same shape regardless of which endpoint we called */
interface PersonRow {
  id:          number
  name:        string
  username:    string | null
  photoUrl:    string | null
  headline:    string | null
  role:        string | null
  accountType: string | null
}

function normalize(raw: any, tab: Tab, isOwnConnections = false): PersonRow[] {
  if (!Array.isArray(raw)) return []

  if (tab === 'connections' && isOwnConnections) {
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

function PersonItem({ person, onPress }: { person: PersonRow; onPress: () => void }) {
  const { c } = useTheme()
  const initials = person.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <Pressable onPress={onPress} style={[styles.personRow, { borderBottomColor: c.border }]}>
      {person.photoUrl ? (
        <Image source={{ uri: person.photoUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: c.brandSubtle, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: c.brand, fontSize: 15, fontFamily: typography.fontFamily.bold }}>
            {initials}
          </Text>
        </View>
      )}
      <View style={styles.personInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text numberOfLines={1} style={[styles.personName, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold, flexShrink: 1 }]}>
            {person.name}
          </Text>
          <RoleBadge role={person.role} accountType={person.accountType} size={14} />
        </View>
        {person.username && (
          <Text style={[styles.personSub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            @{person.username}
          </Text>
        )}
        {person.headline ? (
          <Text numberOfLines={1} style={[styles.personSub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {person.headline}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

export function ConnectionsModal({ visible, initialTab, targetId, isOwnProfile, onClose, onCountLoaded }: Props) {
  const { c }    = useTheme()
  const insets   = useSafeAreaInsets()
  const router   = useRouter()

  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [rows,      setRows]      = useState<PersonRow[]>([])
  const [loading,   setLoading]   = useState(false)
  const [query,     setQuery]     = useState('')

  const TABS: { key: Tab; label: string }[] = [
    { key: 'connections', label: 'Bog\'lanishlar'  },
    { key: 'followers',   label: 'Kuzatuvchilar'  },
    { key: 'following',   label: 'Kuzatilmoqda'   },
  ]

  useEffect(() => {
    if (visible) setActiveTab(initialTab)
  }, [visible, initialTab])

  useEffect(() => {
    if (!visible) return
    fetchTab(activeTab)
  }, [visible, activeTab, targetId])

  async function fetchTab(tab: Tab) {
    setLoading(true)
    setRows([])
    try {
      let normalized: PersonRow[]
      if (tab === 'connections') {
        if (isOwnProfile) {
          normalized = normalize(await connApi.listOwn(), tab, true)
        } else {
          normalized = normalize(await profileApi.getConnections(targetId), tab, false)
        }
      } else if (tab === 'followers') {
        normalized = normalize(await profileApi.getFollowers(targetId), tab)
      } else {
        normalized = normalize(await profileApi.getFollowing(targetId), tab)
      }
      setRows(normalized)
      onCountLoaded?.(tab, normalized.length)
    } catch {}
    finally { setLoading(false) }
  }

  const filtered = query.trim()
    ? rows.filter(r => r.name.toLowerCase().includes(query.toLowerCase()))
    : rows

  function handlePress(person: PersonRow) {
    onClose()
    router.push(`/(screens)/profile/${person.id}` as any)
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={[styles.sheet, { backgroundColor: c.bgSecondary, paddingBottom: insets.bottom }]}>
        {/* Handle */}
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: c.borderStrong }]} />
        </View>

        {/* Tabs */}
        <View style={[styles.tabBar, { borderBottomColor: c.border }]}>
          {TABS.map(tab => {
            const active = activeTab === tab.key
            return (
              <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={styles.tabItem}>
                <Text style={[styles.tabLabel, {
                  color:      active ? c.brand : c.textMuted,
                  fontFamily: active ? typography.fontFamily.semibold : typography.fontFamily.regular,
                }]}>
                  {tab.label}
                </Text>
                {active && <View style={[styles.tabIndicator, { backgroundColor: c.brand }]} />}
              </Pressable>
            )
          })}
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Text style={{ color: c.textMuted, fontSize: 20 }}>✕</Text>
          </Pressable>
        </View>

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: c.bgTertiary }]}>
          <Text style={{ fontSize: 14, opacity: 0.5 }}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Qidirish..."
            placeholderTextColor={c.textMuted}
            style={[styles.searchInput, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Text style={{ color: c.textMuted }}>✕</Text>
            </Pressable>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={c.brand} style={{ marginTop: spacing.xl }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => `${activeTab}-${item.id}`}
            renderItem={({ item }) => <PersonItem person={item} onPress={() => handlePress(item)} />}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                {query ? 'Topilmadi' : 'Hozircha hech kim yo\'q'}
              </Text>
            }
            contentContainerStyle={{ paddingBottom: spacing.xl }}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    maxHeight:            '75%',
    borderTopLeftRadius:  radius.lg,
    borderTopRightRadius: radius.lg,
  },
  handleRow: { alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.xs },
  handle:    { width: 40, height: 4, borderRadius: 2 },
  tabBar: {
    flexDirection:     'row',
    alignItems:        'center',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: spacing.sm,
    position:        'relative',
  },
  tabLabel:     { fontSize: typography.size.sm },
  tabIndicator: {
    position: 'absolute', bottom: 0,
    left: '15%', right: '15%',
    height: 2, borderRadius: 1,
  },
  closeBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  searchWrap: {
    flexDirection:     'row',
    alignItems:        'center',
    margin:            spacing.sm,
    borderRadius:      radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.xs + 2,
    gap:               spacing.xs,
  },
  searchInput: { flex: 1, fontSize: typography.size.sm, padding: 0 },
  personRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    gap:               spacing.sm,
    borderBottomWidth: 1,
  },
  avatar:     { width: 44, height: 44, borderRadius: 22 },
  personInfo: { flex: 1, gap: 1 },
  personName: { fontSize: typography.size.md },
  personSub:  { fontSize: typography.size.xs },
  empty: {
    textAlign:       'center',
    paddingVertical: spacing.xl,
    fontSize:        typography.size.sm,
    fontStyle:       'italic',
  },
})

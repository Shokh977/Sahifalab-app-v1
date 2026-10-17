/**
 * Nishonlar — every badge in one grid (redesign Phase 5): Bellashuv,
 * Bosqichlar, Yutuqlar and Unvonlar, with category filters. Earned first,
 * then locked ones as readable silhouettes.
 */
import React, { useCallback, useState } from 'react'
import { StyleSheet, View, useWindowDimensions } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { FlashList } from '@shopify/flash-list'
import { Award, WifiOff } from 'lucide-react-native'
import { profile as profileApi, type BadgeGroups } from '../../lib/api'
import { LEVEL_TITLES } from '../../lib/levelTitles'
import { useAuthStore } from '../../stores/authStore'
import { useProfileStore } from '../../stores/profileStore'
import { useTheme } from '../../src/design/ThemeProvider'
import { layout, space } from '../../src/design/spacing'
import { Chip, EmptyState, ScreenHeader, SkeletonBlock } from '../../src/components/ui'
import {
  CATEGORY_LABEL, CATEGORY_ORDER, allBadges, earnedFirst, filterBy, summary,
  type BadgeCategory, type ProfileBadge,
} from '../../src/features/profile/badges'
import { BadgeCell } from '../../src/features/profile/BadgeCell'
import { BadgeSheet } from '../../src/features/profile/BadgeSheet'

const COLS = 4

export default function BadgesScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const profileLevel = useProfileStore(s => s.ownProfile?.level)
  const authLevel = useAuthStore(s => s.user?.level)
  const level = profileLevel ?? authLevel ?? 1

  const [groups, setGroups] = useState<BadgeGroups['groups'] | null>(null)
  const [failed, setFailed] = useState(false)
  const [filter, setFilter] = useState<BadgeCategory | 'all'>('all')
  const [selected, setSelected] = useState<ProfileBadge | null>(null)

  const load = useCallback(() => {
    profileApi.getMyBadges()
      .then(r => { setGroups(r.groups); setFailed(false) })
      .catch(() => setFailed(true))
  }, [])
  useFocusEffect(useCallback(() => { load() }, [load]))

  const all = allBadges(groups, level, LEVEL_TITLES)
  const counts = summary(all)
  const shown = earnedFirst(filterBy(all, filter))
  const cell = Math.floor((width - layout.gutter * 2 - space.sm * (COLS - 1)) / COLS)
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile' as any))

  const filters = (
    <View style={styles.chips}>
      <Chip label={`Hammasi · ${counts.label}`} variant="choice" selected={filter === 'all'} onPress={() => setFilter('all')} />
      {CATEGORY_ORDER.map(c => {
        const s = summary(filterBy(all, c))
        return (
          <Chip key={c} label={`${CATEGORY_LABEL[c]} · ${s.earned}`} variant="choice" selected={filter === c} onPress={() => setFilter(c)} />
        )
      })}
    </View>
  )

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={`Nishonlar · ${counts.label}`} onBack={back} />
      {failed && !groups ? (
        <EmptyState
          icon={WifiOff}
          title="Nishonlar yuklanmadi"
          body="Unvonlar koʻrinadi, qolganlari uchun qayta urinib koʻring."
          action={{ label: 'Qayta urinish', onPress: load }}
        />
      ) : null}
      {!groups && !failed ? (
        <View style={[styles.grid, styles.pad]}>
          {Array.from({ length: COLS * 3 }, (_, i) => <SkeletonBlock key={i} width={cell} height={cell} />)}
        </View>
      ) : (
        <FlashList
          data={shown}
          numColumns={COLS}
          keyExtractor={b => b.key}
          ListHeaderComponent={filters}
          ListEmptyComponent={
            <EmptyState icon={Award} title="Bu turkumda hali nishon yoʻq" />
          }
          renderItem={({ item }) => (
            <View style={styles.cellWrap}>
              <BadgeCell badge={item} width={cell} onPress={() => setSelected(item)} />
            </View>
          )}
          contentContainerStyle={styles.pad}
          showsVerticalScrollIndicator={false}
        />
      )}
      <BadgeSheet badge={selected} onClose={() => setSelected(null)} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { paddingHorizontal: layout.gutter, paddingBottom: space.xxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, paddingBottom: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cellWrap: { alignItems: 'center', paddingBottom: space.md },
})

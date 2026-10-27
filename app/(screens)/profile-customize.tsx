/**
 * Profilni bezash — pick your app theme, banner, avatar ring, tree look (Claude Design
 * "6-qadam" §5) and, on the Ism tab, your name colour and badge ("9-qadam" §5). A live preview on top updates on every tap, even for
 * locked items (try before you unlock); the bottom bar says how a locked
 * item opens. Saving sends only unlocked choices — the server checks them
 * again (PUT /api/profile/me/look). A saved theme applies to the whole app
 * at once; the preview card shows the chosen one before saving.
 * Opens with ?slot=ring&item=kometa to preselect an item.
 */
import React, { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router'
import { Check, RotateCcw, Sparkles } from 'lucide-react-native'
import { profile as profileApi, type MyLook } from '../../lib/api'
import { MagicTree } from '../../components/streak/MagicTree'
import { useThemeStore } from '../../stores/themeStore'
import { useMyLookStore } from '../../stores/myLookStore'
import { useDevLookStore } from '../../stores/devLookStore'
import { type ThemeId } from '../../src/design/themes'
import type { TreeLook } from '../../lib/treeLooks'
import { useAuthStore } from '../../stores/authStore'
import { useProfileStore } from '../../stores/profileStore'
import { ThemeProvider, useTheme } from '../../src/design/ThemeProvider'
import { layout, radius, space } from '../../src/design/spacing'
import { fonts, type as typeScale } from '../../src/design/typography'
import {
  Button, EmptyState, Pressable, ScreenHeader, SegmentedControl, SkeletonBlock, ToastHost, showToast,
} from '../../src/components/ui'
import { uzText } from '../../src/features/today/today'
import { BannerScene } from '../../src/features/profile/cosmetics/BannerScene'
import { AvatarRing } from '../../src/features/profile/cosmetics/AvatarRing'
import {
  BANNERS, RARITY_COLOR, RARITY_LABEL, RINGS, SEASON_LABEL, THEME_ITEMS, TREES, bannerKind, ringKind, themeKind, treeLookKind, unlockHint,
  type BannerKind, type CosmeticItem, type LookSlot, type RingKind,
} from '../../src/features/profile/cosmetics/cosmetics'
import { PRO_PURCHASE_ENABLED } from '../../src/features/pro/flags'
import { LinearGradient } from 'expo-linear-gradient'
import type { Scheme } from '../../src/design/tokens'
import { nameStyleKind, type NameStyleId } from '../../src/features/profile/names/nameStyles'
import { useBadgeDef } from '../../src/features/profile/names/badgeCatalog'
import { BadgeGrid, NamePreviewCard, NameStyleGrid, nameBottom } from '../../src/features/profile/names/NameStylePicker'

type Slot = LookSlot
const SLOTS: Slot[] = ['theme', 'banner', 'ring', 'tree']
const TAB_LABELS = ['Mavzu', 'Banner', 'Halqa', 'Daraxt', 'Ism'] as const
/** The Ism tab: name colour + badge, its own grids. */
const NAME_TAB = 4
type SaveSlot = Slot | 'name_style' | 'badge'
const SAVE_SLOTS: SaveSlot[] = [...SLOTS, 'name_style', 'badge']
const TREE_TILE = { w: 92, h: 112 }
const PREVIEW_STAGE = 6
const COLS = 3
const PREVIEW_H = 204
const PREVIEW_BANNER = 104
const PREVIEW_RING = 88
const THUMB = 84

type Choice = { theme: ThemeId; banner: BannerKind; ring: RingKind; tree: TreeLook; name_style: NameStyleId; badge: string }
const DEFAULT_CHOICE: Choice = { theme: 'standart', banner: 'plain', ring: 'oddiy', tree: 'tabiiy', name_style: 'oddiy', badge: 'none' }

/** The chip on a thumbnail: what the item is for you. */
function stateChip(item: CosmeticItem, unlocked: boolean): { label: string; kind: 'owned' | 'pro' | 'glass' } {
  const u = item.unlock
  if (u.kind === 'free') return { label: 'Sizda', kind: 'owned' }
  if (u.kind === 'achievement') return unlocked ? { label: 'Yutuq', kind: 'owned' } : { label: `Yutuq · ${u.streakDays} kun`, kind: 'glass' }
  if (u.kind === 'seasonal') return { label: `Mavsumiy · ${SEASON_LABEL[u.season]}`, kind: unlocked ? 'owned' : 'glass' }
  return unlocked ? { label: 'Sizda', kind: 'owned' } : { label: 'PRO', kind: 'pro' }
}

export default function ProfileCustomize() {
  const { colors, scheme } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const focused = useIsFocused()
  const { width } = useWindowDimensions()
  const params = useLocalSearchParams<{ slot?: string; item?: string }>()
  const authUser = useAuthStore(s => s.user)
  const ownProfile = useProfileStore(s => s.ownProfile)
  const loadOwnProfile = useProfileStore(s => s.loadOwnProfile)

  const [look, setLook] = useState<MyLook | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [choice, setChoice] = useState<Choice>(DEFAULT_CHOICE)
  // Ism tab: preview the light or the dark value of the name colour.
  const [nameMode, setNameMode] = useState<Scheme>(scheme)
  const setThemeId = useThemeStore(st => st.setThemeId)
  const setMyLook = useMyLookStore(st => st.set)
  const [tab, setTab] = useState(
    params.slot === 'name_style' || params.slot === 'badge' ? NAME_TAB : Math.max(0, SLOTS.indexOf(params.slot as Slot)),
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    profileApi.getMyLook()
      .then(l => {
        setLook(l)
        const saved = {
          theme: themeKind(l.effective.theme), banner: bannerKind(l.effective.banner),
          ring: ringKind(l.effective.ring), tree: treeLookKind(l.effective.tree),
          name_style: nameStyleKind(l.effective.name_style), badge: l.effective.badge ?? 'none',
        }
        if (params.slot === 'banner' && params.item) saved.banner = bannerKind(params.item)
        if (params.slot === 'ring' && params.item) saved.ring = ringKind(params.item)
        if (params.slot === 'tree' && params.item) saved.tree = treeLookKind(params.item)
        if (params.slot === 'theme' && params.item) saved.theme = themeKind(params.item)
        if (params.slot === 'name_style' && params.item) saved.name_style = nameStyleKind(params.item)
        if (params.slot === 'badge' && params.item) saved.badge = params.item
        setChoice(saved)
      })
      // 503: migration 106 not applied; 404: a server without looks yet.
      .catch((e: any) => setError(
        e?.status === 503 || e?.status === 404 ? 'Bezaklar tez orada ochiladi' : 'Yuklanmadi. Qayta urinib koʻring.',
      ))
  }, [params.slot, params.item])

  const nameTab = tab === NAME_TAB
  const slot = SLOTS[Math.min(tab, SLOTS.length - 1)]
  const catalog: Record<string, CosmeticItem> =
    slot === 'theme' ? THEME_ITEMS : slot === 'banner' ? BANNERS : slot === 'ring' ? RINGS : TREES
  const selectedId = choice[slot]
  const selected = catalog[selectedId]
  const isUnlocked = (s: SaveSlot, id: string) => !!look?.unlocked[s]?.[id]
  const lockedElsewhere = SAVE_SLOTS.some(s => s !== slot && !isUnlocked(s, choice[s]))
  const dirty = !!look && SAVE_SLOTS.some(s => isUnlocked(s, choice[s]) && choice[s] !== (look.effective[s] ?? DEFAULT_CHOICE[s]))
  const badgeDef = useBadgeDef(choice.badge)

  const name = uzText(ownProfile?.first_name ?? authUser?.first_name ?? '')
  const streak = look?.best_streak ?? 0
  const cardW = width - layout.gutter * 2
  const cellW = (cardW - space.sm * (COLS - 1)) / COLS

  const save = async () => {
    if (!look) return
    const body: Partial<Choice> = {}
    for (const s of SAVE_SLOTS) if (isUnlocked(s, choice[s])) (body as Record<SaveSlot, string>)[s] = choice[s]
    setSaving(true)
    try {
      const saved = await profileApi.updateMyLook(body)
      // Apply at once: the app theme, and your ring / tree look everywhere.
      setThemeId(themeKind(saved.effective.theme))
      setMyLook({
        banner: saved.effective.banner, ring: saved.effective.ring, tree: saved.effective.tree,
        nameStyle: saved.effective.name_style ?? 'oddiy', badge: saved.effective.badge ?? 'none',
      })
      // A DEV "Bannerni / Halqani sinash" override would hide what was just saved.
      useDevLookStore.getState().clear()
      await loadOwnProfile()
      showToast('success', 'Saqlandi')
      router.back()
    } catch (e: any) {
      showToast('error', e?.message ?? 'Saqlanmadi')
    }
    setSaving(false)
  }

  const reset = () => setChoice(DEFAULT_CHOICE)

  const bottom = useMemo(() => {
    if (!look) return null
    if (nameTab) {
      const b = nameBottom({ look, nameStyle: choice.name_style, badge: choice.badge, badgeDef })
      if (b.action === 'save') {
        const otherLocked = SLOTS.some(s => !isUnlocked(s, choice[s]))
        return {
          info: otherLocked ? 'Boshqa tanlovingizda qulflangan bezak bor — faqat ochiqlari saqlanadi' : b.info,
          button: <Button label="Saqlash" size="lg" fullWidth onPress={save} loading={saving} disabled={!dirty} />,
        }
      }
      if (b.action === 'pro' && PRO_PURCHASE_ENABLED) {
        return { info: b.info, button: <GoldButton label="Pro bilan oching" onPress={() => router.push('/(screens)/pro' as any)} /> }
      }
      return { info: b.info, button: <Button label={b.action === 'pro' ? 'Tez orada' : 'Mavsum boshlanganda'} size="lg" fullWidth disabled onPress={() => {}} /> }
    }
    if (isUnlocked(slot, selectedId)) {
      return {
        info: lockedElsewhere ? 'Boshqa tanlovingizda qulflangan bezak bor — faqat ochiqlari saqlanadi' : `${selected.name} · ${RARITY_LABEL[selected.rarity]}`,
        button: <Button label="Saqlash" size="lg" fullWidth onPress={save} loading={saving} disabled={!dirty} />,
      }
    }
    const hint = unlockHint(selected, look.best_streak)
    const u = selected.unlock
    if (u.kind === 'pro' && PRO_PURCHASE_ENABLED) {
      return {
        info: `${selected.name} · ${RARITY_LABEL[selected.rarity]} — Pro bilan ochiladi`,
        button: <Button label="Pro bilan oching" size="lg" fullWidth onPress={() => router.push('/(screens)/pro' as any)} />,
      }
    }
    const label = u.kind === 'pro'
      ? 'Tez orada'
      : u.kind === 'achievement' ? `${u.streakDays - look.best_streak} kun qoldi` : 'Mavsum boshlanganda'
    return {
      info: `${selected.name} · ${hint}`,
      button: <Button label={label} size="lg" fullWidth disabled onPress={() => {}} />,
    }
    // save closes over the latest choice; recomputing on these is enough
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [look, slot, selectedId, lockedElsewhere, dirty, saving, choice, nameTab, badgeDef])

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScreenHeader
        title="Profilni bezash"
        actions={[{ icon: RotateCcw, accessibilityLabel: 'Asl holiga', onPress: reset }]}
      />

      {error ? (
        <EmptyState icon={Sparkles} title={error} body="Profilingiz hozircha oddiy koʻrinishda." action={{ label: 'Orqaga', onPress: () => router.back() }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: space.xxl }]}>
          {nameTab ? (
            // Ism: the light / dark value of the colour, on that mode's surface.
            <ThemeProvider themeId="standart" scheme={nameMode}>
              <NamePreviewCard
                name={name} username={ownProfile?.username} ring={choice.ring} nameStyle={choice.name_style} badge={choice.badge}
                id={authUser?.telegram_id} uri={ownProfile?.photo_url ?? authUser?.photo_url} animated={focused}
              />
            </ThemeProvider>
          ) : (
            // Live preview, in the chosen theme
            <ThemeProvider themeId={choice.theme}>
              <PreviewCard
                choice={choice} width={cardW} animated={focused} name={name} streak={streak}
                id={authUser?.telegram_id} uri={ownProfile?.photo_url ?? authUser?.photo_url} username={ownProfile?.username}
              />
            </ThemeProvider>
          )}

          <SegmentedControl segments={TAB_LABELS} index={tab} onChange={setTab} size="md" />

          {look && nameTab ? (
            <>
              <SegmentedControl
                segments={MODE_LABELS} index={nameMode === 'light' ? 0 : 1}
                onChange={i => setNameMode(i === 0 ? 'light' : 'dark')} style={styles.modeToggle}
              />
              <ThemeProvider themeId="standart" scheme={nameMode}>
                <NameStyleGrid
                  value={choice.name_style} onChange={id => setChoice(c => ({ ...c, name_style: id }))}
                  unlocked={id => isUnlocked('name_style', id)} sample={firstWord(name) || 'Nigora'} width={cardW}
                />
                <BadgeGrid
                  value={choice.badge} onChange={id => setChoice(c => ({ ...c, badge: id }))}
                  unlocked={id => isUnlocked('badge', id)} width={cardW}
                />
              </ThemeProvider>
            </>
          ) : !look ? (
            <View style={styles.grid}>
              {Array.from({ length: 6 }, (_, i) => <SkeletonBlock key={i} width={cellW} height={cellW + 52} borderRadius={18} />)}
            </View>
          ) : (
            <View style={styles.grid}>
              {Object.entries(catalog).map(([id, item]) => {
                const unlocked = isUnlocked(slot, id)
                const chip = stateChip(item, unlocked)
                const on = id === selectedId
                return (
                  <Pressable
                    key={id}
                    onPress={() => setChoice(c => ({ ...c, [slot]: id }))}
                    accessibilityLabel={`${item.name}, ${RARITY_LABEL[item.rarity]}${unlocked ? '' : `, ${chip.label}`}`}
                    accessibilityState={{ selected: on }}
                    style={[
                      styles.cell,
                      { width: cellW, backgroundColor: colors.surface, borderColor: on ? colors.accent : colors.border, borderWidth: on ? 2 : 1 },
                    ]}
                  >
                    <View style={[styles.thumb, { backgroundColor: colors.surfaceRaised }]}>
                      {slot === 'theme' ? (
                        <ThemeProvider themeId={id as ThemeId}><ThemeSwatch width={cellW - 12} /></ThemeProvider>
                      ) : slot === 'banner' ? (
                        <BannerScene kind={id as BannerKind} width={cellW - 12} height={THUMB} animated={false} />
                      ) : slot === 'ring' ? (
                        <AvatarRing kind={id as RingKind} size={60} name={name} id={authUser?.telegram_id} bg={colors.surfaceRaised} animated={false} />
                      ) : (
                        <MiniTree look={id as TreeLook} width={THUMB * 0.8} height={THUMB} animate={false} uid={`thumb-${id}`} />
                      )}
                      <View style={[styles.chip, chipStyle(chip.kind)]}>
                        <Text style={[styles.chipText, { color: chip.kind === 'pro' ? '#3A2A00' : '#FFFFFF' }]} numberOfLines={1}>{chip.label}</Text>
                      </View>
                      {on && (
                        <View style={[styles.check, { backgroundColor: colors.accent }]}>
                          <Check size={14} color={colors.onAccent} strokeWidth={3} />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.cellName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.rarity}>
                      <View style={[styles.dot, { backgroundColor: RARITY_COLOR[scheme][item.rarity] }]} />
                      <Text style={[typeScale.callout, { color: RARITY_COLOR[scheme][item.rarity] }]}>{RARITY_LABEL[item.rarity]}</Text>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          )}
        </ScrollView>
      )}

      {bottom && !error && (
        <View style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + space.sm }]}>
          <Text style={[typeScale.callout, { color: colors.textMuted }]} numberOfLines={2}>{bottom.info}</Text>
          {bottom.button}
        </View>
      )}
      <ToastHost />
    </View>
  )
}

const MODE_LABELS = ['Yorugʻ', 'Qorongʻi'] as const

function firstWord(s: string) {
  return s.trim().split(/\s+/)[0] ?? ''
}

/** The gold "Pro bilan oching" button (the Pro items' call to action). */
function GoldButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.gold}>
      <LinearGradient colors={['#F6E3A8', '#E4BE68', '#C99A3E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Text style={styles.goldText}>{label}</Text>
    </Pressable>
  )
}

/** The preview card: banner, ring, name, streak and tree in the surrounding theme. */
function PreviewCard({ choice, width, animated, name, streak, id, uri, username }: {
  choice: Choice; width: number; animated: boolean; name: string; streak: number
  id?: number | null; uri?: string | null; username?: string | null
}) {
  const { colors } = useTheme()
  return (
    <View style={[styles.preview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <BannerScene kind={choice.banner} width={width} height={PREVIEW_BANNER} animated={animated} />
      <View style={[styles.live, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>JONLI</Text>
      </View>
      <View style={styles.previewRow}>
        <AvatarRing kind={choice.ring} size={PREVIEW_RING} name={name} id={id} uri={uri} bg={colors.surface} animated={animated} />
        <View style={styles.flex}>
          <Text style={[styles.previewName, { color: colors.text }]} numberOfLines={1}>{name}</Text>
          {username ? <Text style={[typeScale.label, { color: colors.accentText }]}>@{username}</Text> : null}
          <View style={[styles.pill, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[typeScale.callout, { color: colors.text }]}>{streak} kun</Text>
          </View>
        </View>
        <View style={[styles.treeTile, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
          <MiniTree look={choice.tree} width={TREE_TILE.w} height={TREE_TILE.h} animate={false} uid="customize-preview" />
        </View>
      </View>
    </View>
  )
}

/** A theme thumbnail: its background, a card with an accent bar and text lines. */
function ThemeSwatch({ width }: { width: number }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.swatch, { width, backgroundColor: colors.bg }]}>
      <View style={[styles.swatchCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.swatchBar, { backgroundColor: colors.accent }]} />
        <View style={[styles.swatchLine, { backgroundColor: colors.text, width: '70%' }]} />
        <View style={[styles.swatchLine, { backgroundColor: colors.textMuted, width: '45%' }]} />
      </View>
    </View>
  )
}

/** MagicTree at stage 6, scaled from its 160×200 card size to fit a tile. */
function MiniTree({ look, width, height, animate, uid }: { look: TreeLook; width: number; height: number; animate: boolean; uid: string }) {
  const scale = Math.min(width / 160, height / 200)
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
      <View style={{ width: 160, height: 200, marginBottom: -(200 - 200 * scale) / 2, transform: [{ scale }] }}>
        <MagicTree stage={PREVIEW_STAGE} size="card" look={look} animate={animate} uid={uid} />
      </View>
    </View>
  )
}

function chipStyle(kind: 'owned' | 'pro' | 'glass') {
  if (kind === 'owned') return { backgroundColor: '#1F8A4C' }
  if (kind === 'pro') return { backgroundColor: '#E4BE68' }
  return { backgroundColor: 'rgba(20,20,24,0.62)' }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  body: { paddingHorizontal: layout.gutter, gap: layout.sectionGap - space.xs },
  preview: { height: PREVIEW_H, borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  live: {
    position: 'absolute', top: space.sm, left: space.sm, flexDirection: 'row', alignItems: 'center',
    gap: space.xxs + 2, borderRadius: radius.full, paddingHorizontal: space.sm, height: 26,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  liveText: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.8 },
  previewRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: space.sm,
    marginTop: -PREVIEW_RING / 2, paddingHorizontal: space.md,
  },
  previewName: { fontFamily: fonts.extrabold, fontSize: 19 },
  swatch: { height: THUMB, padding: 8, justifyContent: 'center' },
  swatchCard: { borderRadius: 10, borderWidth: 1, padding: 8, gap: 5 },
  swatchBar: { height: 8, borderRadius: 4, width: '55%' },
  swatchLine: { height: 4, borderRadius: 2, opacity: 0.8 },
  treeTile: { width: TREE_TILE.w, height: TREE_TILE.h, borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginBottom: -space.xs },
  pill: {
    alignSelf: 'flex-start', borderWidth: 1, borderRadius: radius.full,
    paddingHorizontal: space.sm, paddingVertical: 3, marginTop: space.xxs,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: { borderRadius: 18, padding: 6, gap: 4, paddingBottom: space.sm },
  thumb: { height: THUMB, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  chip: { position: 'absolute', left: 4, bottom: 4, borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 2, maxWidth: '96%' },
  chipText: { fontFamily: fonts.extrabold, fontSize: 10 },
  check: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cellName: { fontFamily: fonts.bold, fontSize: 14, paddingHorizontal: 4 },
  rarity: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  bar: { borderTopWidth: 1, paddingHorizontal: layout.gutter, paddingTop: space.sm, gap: space.sm },
  modeToggle: { alignSelf: 'flex-end', width: 180 },
  gold: { height: 52, borderRadius: radius.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  goldText: { color: '#3A2A00', fontFamily: fonts.extrabold, fontSize: 16 },
})

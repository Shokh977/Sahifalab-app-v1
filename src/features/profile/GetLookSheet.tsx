/**
 * "Bu ko'rinishni oling" — opens when you tap someone else's banner,
 * avatar ring or tree look chip: the item animated on a dark stage, its name and rarity,
 * who is using it, and how it opens. If you can already use it,
 * "Menga ham qo'llash" opens Profilni bezash with it preselected.
 */
import React from 'react'
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { Canvas, RadialGradient, Rect, vec } from '@shopify/react-native-skia'
import { useTheme } from '../../design/ThemeProvider'
import { layout, radius, space } from '../../design/spacing'
import { fonts, type as typeScale } from '../../design/typography'
import { Avatar, Button, Sheet } from '../../components/ui'
import { MagicTree } from '../../../components/streak/MagicTree'
import type { TreeLook } from '../../../lib/treeLooks'
import { BannerScene } from './cosmetics/BannerScene'
import { AvatarRing } from './cosmetics/AvatarRing'
import {
  BANNERS, RARITY_COLOR, RARITY_LABEL, RINGS, TREES, unlockHint, type BannerKind, type LookSlot, type RingKind,
} from './cosmetics/cosmetics'
import { PRO_UPGRADE_ENABLED } from '../pro/flags'

const STAGE_H = 196

export interface LookTarget { slot: LookSlot; id: string }

export function GetLookSheet({ target, owner, unlockedForMe, onClose }: {
  target: LookTarget | null
  owner: { name: string; id: number; uri?: string | null }
  /** Whether the viewer can use this item now (null while unknown). */
  unlockedForMe: boolean | null
  onClose: () => void
}) {
  const { colors, scheme } = useTheme()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const stageW = width - layout.gutter * 2
  const item = !target ? null
    : target.slot === 'banner' ? BANNERS[target.id as BannerKind]
    : target.slot === 'ring' ? RINGS[target.id as RingKind]
    : TREES[target.id as TreeLook]

  const apply = () => {
    if (!target) return
    onClose()
    router.push(`/(screens)/profile-customize?slot=${target.slot}&item=${target.id}` as any)
  }

  const cta = () => {
    if (!item) return null
    if (unlockedForMe) return <Button label="Menga ham qoʻllash" size="lg" fullWidth onPress={apply} />
    const u = item.unlock
    if (u.kind === 'pro') {
      return <Button label={PRO_UPGRADE_ENABLED ? 'Pro bilan oling' : 'Tez orada'} size="lg" fullWidth disabled onPress={() => {}} />
    }
    if (u.kind === 'seasonal') return <Button label="Mavsum boshlanganda" size="lg" fullWidth disabled onPress={() => {}} />
    return <Button label="Seriyani davom ettiring" size="lg" fullWidth variant="secondary" onPress={onClose} />
  }

  return (
    <Sheet visible={!!target} onClose={onClose} title="Bu koʻrinishni oling">
      {target && item && (
        <View style={styles.body}>
          <View style={[styles.stage, { height: STAGE_H }]}>
            <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
              <Rect x={0} y={0} width={stageW} height={STAGE_H}>
                <RadialGradient c={vec(stageW / 2, STAGE_H / 2)} r={stageW * 0.6} colors={['#4A3A22', '#15120F']} />
              </Rect>
            </Canvas>
            {target.slot === 'banner' ? (
              <View style={styles.bannerWrap}>
                <BannerScene kind={target.id as BannerKind} width={stageW - space.lg * 2} height={(stageW - space.lg * 2) * 180 / 411} />
              </View>
            ) : target.slot === 'ring' ? (
              <AvatarRing kind={target.id as RingKind} size={140} name={owner.name} id={owner.id} uri={owner.uri} bg="#2A2118" />
            ) : (
              <MagicTree stage={8} size="card" look={target.id as TreeLook} uid={`sheet-${target.id}`} />
            )}
            <View style={styles.live}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>JONLI</Text>
            </View>
          </View>

          <View style={styles.titleRow}>
            <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
            <View style={[styles.rarityChip, { backgroundColor: colors.surfaceRaised }]}>
              <View style={[styles.dot, { backgroundColor: RARITY_COLOR[scheme][item.rarity] }]} />
              <Text style={[typeScale.callout, { color: colors.text }]}>{RARITY_LABEL[item.rarity]}</Text>
            </View>
          </View>
          <View style={styles.ownerRow}>
            <Avatar name={owner.name} id={owner.id} uri={owner.uri} diameter={24} />
            <Text style={[typeScale.callout, { color: colors.textMuted }]}>{owner.name} ishlatmoqda</Text>
          </View>
          {!unlockedForMe && (
            <Text style={[typeScale.body, { color: colors.textMuted }]}>{unlockHint(item)}</Text>
          )}
          <View style={styles.cta}>{cta()}</View>
        </View>
      )}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  body: { gap: space.sm, paddingBottom: space.md },
  stage: { borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  bannerWrap: { borderRadius: radius.lg, overflow: 'hidden' },
  live: {
    position: 'absolute', top: space.sm, left: space.sm, flexDirection: 'row', alignItems: 'center',
    gap: space.xxs + 2, borderRadius: radius.full, paddingHorizontal: space.sm, height: 26,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  liveText: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  itemName: { fontFamily: fonts.extrabold, fontSize: 20 },
  rarityChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.full, paddingHorizontal: space.sm, paddingVertical: 3 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  cta: { marginTop: space.sm },
})

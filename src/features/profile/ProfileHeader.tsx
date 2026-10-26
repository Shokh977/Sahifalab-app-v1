/**
 * Profile header (Claude Design "6-qadam"): the banner scene full-bleed
 * under the status bar, frosted nav buttons over it, then the ringed
 * avatar centred on the banner's bottom edge with the level chip on the
 * right. Shared by Profil (yours) and the public profile.
 */
import React from 'react'
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, Hexagon, MoreHorizontal, Settings, Share2, type LucideIcon } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { iconStroke, layout, radius, space } from '../../design/spacing'
import { fonts } from '../../design/typography'
import { Pressable } from '../../components/ui'
import { BannerScene } from './cosmetics/BannerScene'
import { AvatarRing } from './cosmetics/AvatarRing'
import { bannerIsDark, type BannerKind, type RingKind } from './cosmetics/cosmetics'

const BANNER = 150     // below the status bar
const AVATAR = 120
const NAV_BTN = 38
const HIT = 44

function NavButton({ icon: Icon, label, dark, onPress, disabled }: {
  icon: LucideIcon; label: string; dark: boolean; onPress: () => void; disabled?: boolean
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityLabel={label} style={styles.hit}>
      <View style={[styles.navBtn, dark ? styles.glassDark : styles.glassLight]}>
        <Icon size={20} color={dark ? '#FFFFFF' : '#1C2530'} strokeWidth={iconStroke + 0.2} />
      </View>
    </Pressable>
  )
}

export function ProfileHeader({
  banner, ring, name, id, uri, level, levelTitle, own, onBack, onShare, onMore, shareDisabled, animated = true,
}: {
  banner: BannerKind
  ring: RingKind
  name: string
  id?: number | null
  uri?: string | null
  level: number
  levelTitle: string
  /** Your own profile: ⚙ instead of ⋯. */
  own: boolean
  onBack: () => void
  onShare: () => void
  onMore: () => void
  shareDisabled?: boolean
  animated?: boolean
}) {
  const { colors, scheme } = useTheme()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const dark = bannerIsDark(banner, scheme)
  const height = insets.top + BANNER

  return (
    <View>
      <View style={{ height }}>
        <BannerScene kind={banner} width={width} height={height} animated={animated} />
        <View style={[styles.nav, { top: insets.top }]}>
          <NavButton icon={ChevronLeft} label="Orqaga" dark={dark} onPress={onBack} />
          <Text
            style={[styles.title, dark ? styles.titleDark : { color: '#1C2530' }]}
            accessibilityRole="header"
          >
            Profil
          </Text>
          <NavButton icon={Share2} label="Profilni ulashish" dark={dark} onPress={onShare} disabled={shareDisabled} />
          <NavButton icon={own ? Settings : MoreHorizontal} label={own ? 'Sozlamalar' : 'Boshqa amallar'} dark={dark} onPress={onMore} />
        </View>
      </View>

      <View style={styles.avatarRow}>
        <AvatarRing kind={ring} size={AVATAR} name={name} id={id} uri={uri} bg={colors.bg} animated={animated} />
        <View
          style={[styles.levelChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessible
          accessibilityLabel={`${level}-daraja, ${levelTitle}`}
        >
          <View style={styles.hex}>
            <Hexagon size={24} color={colors.accent} fill={colors.accent} strokeWidth={1} />
            <Text style={[styles.hexNum, { color: colors.onAccent }]}>{level}</Text>
          </View>
          <Text style={[styles.levelTitle, { color: colors.text }]} numberOfLines={1}>{levelTitle}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  nav: {
    position: 'absolute', left: 0, right: 0, height: HIT,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xs,
  },
  hit: { width: HIT, height: HIT, alignItems: 'center', justifyContent: 'center' },
  navBtn: {
    width: NAV_BTN, height: NAV_BTN, borderRadius: NAV_BTN / 2, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  glassDark: { backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.28)' },
  glassLight: { backgroundColor: 'rgba(255,255,255,0.55)', borderColor: 'rgba(255,255,255,0.75)' },
  title: { flex: 1, textAlign: 'center', fontFamily: fonts.bold, fontSize: 17 },
  titleDark: {
    color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  avatarRow: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    marginTop: -AVATAR / 2, paddingLeft: layout.gutter - 6, paddingRight: layout.gutter,
  },
  levelChip: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs, height: 34, borderRadius: radius.full,
    borderWidth: 1, paddingLeft: space.xxs + 2, paddingRight: space.sm, marginBottom: space.sm, maxWidth: '50%',
  },
  hex: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  hexNum: { position: 'absolute', fontFamily: fonts.extrabold, fontSize: 11 },
  levelTitle: { fontFamily: fonts.bold, fontSize: 14, flexShrink: 1 },
})

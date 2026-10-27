/**
 * Profilni bezash → "Ism" (9-qadam §5): a live preview of your name (the
 * profile header and a Reyting row), the name colour grid and the badge
 * grid. Everything previews on tap, locked items included; the screen's
 * bottom bar (nameBottom) says what saving does.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Ban, Check, Lock } from 'lucide-react-native'
import { Image } from 'expo-image'
import type { MyLook, NameBadgeDef } from '../../../../lib/api'
import { useTheme } from '../../../design/ThemeProvider'
import { radius, space } from '../../../design/spacing'
import { fonts, tabular, type as typeScale } from '../../../design/typography'
import { Pressable } from '../../../components/ui'
import { RingedAvatar } from '../cosmetics/RingedAvatar'
import { SEASON_LABEL } from '../cosmetics/cosmetics'
import { useBadgeCatalog } from './badgeCatalog'
import { ProName } from './ProName'
import { NAME_STYLES, NAME_STYLE_IDS, type NameStyleId } from './nameStyles'

const GOLD = '#E4BE68'

export function NamePreviewCard({ name, username, ring, nameStyle, badge, id, uri, animated }: {
  name: string
  username?: string | null
  ring: string
  nameStyle: NameStyleId
  badge: string
  id?: number | null
  uri?: string | null
  animated: boolean
}) {
  const { colors } = useTheme()
  return (
    <View style={[styles.preview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.previewHead}>
        <RingedAvatar ring={ring} diameter={58} name={name || '?'} id={id} uri={uri} animated={animated} />
        <View style={styles.flex}>
          <ProName
            text={name || 'Ismingiz'} nameStyle={nameStyle} badge={badge} context="profile" animated={animated}
            textStyle={{ fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, color: colors.text }}
          />
          {username ? <Text style={[typeScale.callout, { color: colors.textMuted }]} numberOfLines={1}>@{username}</Text> : null}
        </View>
      </View>
      <View style={[styles.miniRow, { backgroundColor: colors.surfaceRaised }]}>
        <Text style={[typeScale.label, tabular, { color: colors.accentText, fontFamily: fonts.extrabold }]}>4</Text>
        <View style={styles.flex}>
          <ProName
            text={name || 'Ismingiz'} nameStyle={nameStyle} badge={badge} context="list" animated={animated}
            textStyle={{ fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.text }}
          />
        </View>
        <Text style={[typeScale.label, tabular, { color: colors.textMuted }]}>1 240 XP</Text>
      </View>
    </View>
  )
}

export function NameStyleGrid({ value, onChange, unlocked, sample, width }: {
  value: NameStyleId
  onChange: (id: NameStyleId) => void
  unlocked: (id: string) => boolean
  sample: string
  width: number
}) {
  const { colors, scheme } = useTheme()
  const cellW = (width - space.sm * 2) / 3
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={[typeScale.overline, { color: colors.textMuted }]}>Rang</Text>
        <Text style={[typeScale.caption, { color: colors.textMuted }]}>{scheme === 'dark' ? 'qorongʻi mavzu qiymati' : 'yorugʻ mavzu qiymati'}</Text>
      </View>
      <View style={styles.grid}>
        {NAME_STYLE_IDS.map(id => {
          const on = id === value
          const style = NAME_STYLES[id]
          const pro = style.unlock.kind === 'pro' && !unlocked(id)
          return (
            <Pressable
              key={id}
              onPress={() => onChange(id)}
              accessibilityLabel={`${style.name} rang${pro ? ', Pro' : ''}`}
              accessibilityState={{ selected: on }}
              style={[
                styles.styleTile,
                { width: cellW, backgroundColor: colors.surface, borderColor: on ? colors.accent : colors.border, borderWidth: on ? 2 : 1 },
              ]}
            >
              <ProName
                text={sample} nameStyle={id} context="list" animated={false}
                textStyle={{ fontFamily: fonts.bold, fontSize: 15, lineHeight: 19, color: colors.text }}
              />
              <Text style={[styles.tileLabel, { color: colors.textMuted }]}>{style.name}</Text>
              {pro && <View style={styles.proChip}><Text style={styles.proText}>PRO</Text></View>}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export function BadgeGrid({ value, onChange, unlocked, width }: {
  value: string
  onChange: (id: string) => void
  unlocked: (id: string) => boolean
  width: number
}) {
  const { colors } = useTheme()
  const order = useBadgeCatalog(s => s.order)
  const byId = useBadgeCatalog(s => s.byId)
  const cols = 6
  const cellW = (width - space.xs * (cols - 1)) / cols
  const tile = (id: string, label: string, art: React.ReactNode, lock: 'pro' | 'season' | null) => {
    const on = id === value
    return (
      <Pressable
        key={id}
        onPress={() => onChange(id)}
        accessibilityLabel={`${label}${lock === 'pro' ? ', Pro' : lock === 'season' ? ', mavsumiy' : ''}`}
        accessibilityState={{ selected: on }}
        style={[
          styles.badgeTile,
          { width: cellW, backgroundColor: colors.surface, borderColor: on ? colors.accent : colors.border, borderWidth: on ? 2 : 1 },
        ]}
      >
        {art}
        <Text style={[styles.badgeLabel, { color: colors.textMuted }]} numberOfLines={1}>{label}</Text>
        {lock && (
          <View style={[styles.lock, { backgroundColor: lock === 'pro' ? GOLD : colors.textMuted }]}>
            <Lock size={8} color={lock === 'pro' ? '#3A2A00' : colors.surface} strokeWidth={3} />
          </View>
        )}
        {on && !lock && (
          <View style={[styles.lock, { backgroundColor: colors.accent }]}>
            <Check size={9} color={colors.onAccent} strokeWidth={3} />
          </View>
        )}
      </Pressable>
    )
  }
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={[typeScale.overline, { color: colors.textMuted }]}>Belgi</Text>
        <Text style={[typeScale.caption, { color: colors.textMuted }]}>ismdan keyin · 16 / 22 px</Text>
      </View>
      <View style={[styles.grid, { gap: space.xs }]}>
        {tile('none', 'Yoʻq', <Ban size={22} color={colors.textMuted} />, null)}
        {order.map(id => {
          const b = byId[id]
          const open = unlocked(id)
          return tile(
            id, b.title,
            <Image source={{ uri: b.static }} style={styles.badgeArt} contentFit="contain" />,
            open ? null : b.unlock === 'seasonal' ? 'season' : 'pro',
          )
        })}
      </View>
      {order.length === 0 && (
        <Text style={[typeScale.callout, { color: colors.textMuted }]}>Belgilar hali yuklanmadi — internetni tekshirib, qayta oching.</Text>
      )}
    </View>
  )
}

/** The bottom bar for the Ism tab: what saving does with this colour + badge. */
export function nameBottom({ look, nameStyle, badge, badgeDef }: {
  look: MyLook
  nameStyle: NameStyleId
  badge: string
  badgeDef: NameBadgeDef | null
}): { info: string; action: 'save' | 'pro' | 'season' } {
  const styleOpen = !!look.unlocked.name_style?.[nameStyle]
  const badgeOpen = badge === 'none' || !!look.unlocked.badge?.[badge]
  const styleName = `${NAME_STYLES[nameStyle].name} rang`
  const badgeName = badgeDef ? `${badgeDef.title} belgisi` : null
  if (!badgeOpen && badgeDef?.unlock === 'seasonal' && badgeDef.season) {
    const when = badgeDef.season === 'ramazon' ? 'Ramazon mavsumida' : `${SEASON_LABEL.navroz} oyida (Navroʻz)`
    return { info: `${badgeDef.title} · faqat ${when}`, action: 'season' }
  }
  if (!styleOpen || !badgeOpen) {
    const parts = [!styleOpen ? styleName : null, !badgeOpen ? badgeName : null].filter(Boolean)
    return { info: `${parts.join(' + ')} — Pro bilan ochiladi`, action: 'pro' }
  }
  if (nameStyle === 'oddiy' && badge === 'none') return { info: 'Oddiy ism — hamma uchun bepul', action: 'save' }
  return { info: [styleName, badgeName].filter(Boolean).join(' + '), action: 'save' }
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  preview: { minHeight: 138, borderRadius: 22, borderWidth: 1, padding: space.md, gap: space.sm },
  previewHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  miniRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radius.md, paddingHorizontal: space.sm, paddingVertical: space.xs + 2 },
  section: { gap: space.sm },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  styleTile: { height: 54, borderRadius: 14, paddingHorizontal: space.sm, justifyContent: 'center', gap: 1 },
  tileLabel: { fontFamily: fonts.medium, fontSize: 11 },
  proChip: { position: 'absolute', top: 5, right: 5, backgroundColor: GOLD, borderRadius: radius.full, paddingHorizontal: 5, paddingVertical: 1 },
  proText: { color: '#3A2A00', fontFamily: fonts.extrabold, fontSize: 8.5, letterSpacing: 0.5 },
  badgeTile: { height: 60, borderRadius: 13, alignItems: 'center', justifyContent: 'center', gap: 2 },
  badgeArt: { width: 26, height: 26 },
  badgeLabel: { fontFamily: fonts.medium, fontSize: 10.5, maxWidth: '92%' },
  lock: { position: 'absolute', top: 3, right: 3, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
})

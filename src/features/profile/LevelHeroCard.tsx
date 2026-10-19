/**
 * Profil level card (Phase 7.5 D2): a diagonal orange gradient (light
 * top-right, dark bottom-left, so all white text sits on the darker side),
 * concentric rings in the corner, the hexagon level emblem, "DARAJA 8 ·
 * UNVON", the title and the next title, then a white XP bar with
 * "21 028 / 24 300 XP" … "3 272 qoldi".
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg'
import { getLevelInfo, LEVEL_TITLES } from '../../../lib/levelTitles'
import { useTheme } from '../../design/ThemeProvider'
import { levelShadow, progressThickness, radius, space } from '../../design/spacing'
import { levelCard, onImage } from '../../design/tokens'
import { fonts, tabular, type as typeScale } from '../../design/typography'
import { uzText } from '../today/today'
import { groupThousands } from './profileFormat'

const EMBLEM = 76
const RINGS = 220
const CARD_RADIUS = 28

function Emblem({ level }: { level: number }) {
  return (
    <Svg width={EMBLEM} height={EMBLEM} viewBox="0 0 76 76">
      <Path d="M38 3 68 20v36L38 73 8 56V20z" fill={levelCard.emblemFill} stroke={onImage} strokeWidth={2} />
      <Path d="M38 14 58 25.5v25L38 62 18 50.5v-25z" fill={onImage} />
      <SvgText x="38" y="46" textAnchor="middle" fontFamily={fonts.extrabold} fontSize={22} fill={levelCard.emblemText}>
        {level}
      </SvgText>
    </Svg>
  )
}

export function LevelHeroCard({ level, xp, nextXp }: { level: number; xp: number; nextXp: number }) {
  const { scheme } = useTheme()
  const info = getLevelInfo(level)
  const next = LEVEL_TITLES.find(t => t.level === level + 1)
  const target = Math.max(nextXp, xp, 1)
  const left = Math.max(0, target - xp)
  const fraction = Math.min(1, Math.max(0, xp / target))

  return (
    <View
      accessible
      accessibilityLabel={`${level}-daraja, ${uzText(info.title)}. ${xp} dan ${target} XP, ${left} XP qoldi`}
      style={[styles.shadow, scheme === 'light' && levelShadow]}
    >
      {/* The shadow sits on the outer view; the inner one clips the rings. */}
      <View style={styles.card}>
      <LinearGradient
        colors={levelCard.fill}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.round]}
      />
      <Svg width={RINGS} height={RINGS} viewBox="0 0 220 220" style={styles.rings} pointerEvents="none">
        {[100, 70, 40].map(r => (
          <Circle key={r} cx="110" cy="110" r={r} fill="none" stroke={onImage} strokeWidth={2} strokeOpacity={levelCard.ringOpacity} />
        ))}
      </Svg>

      <View style={styles.row}>
        <Emblem level={level} />
        <View style={styles.text}>
          <Text style={[typeScale.levelLabel, { color: onImage }]} numberOfLines={1}>Daraja {level} · Unvon</Text>
          <Text style={[typeScale.levelTitle, { color: onImage }]} numberOfLines={1}>{uzText(info.title)}</Text>
          {next ? (
            <Text style={[typeScale.levelSub, { color: onImage }]} numberOfLines={1}>Keyingisi: {uzText(next.title)}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.progress}>
        <View style={[styles.track, { backgroundColor: levelCard.track }]}>
          <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: onImage }]} />
        </View>
        <View style={styles.numbers}>
          <Text style={[typeScale.levelNumbers, tabular, { color: onImage }]}>
            {groupThousands(xp)} / {groupThousands(target)} XP
          </Text>
          <Text style={[typeScale.levelNumbers, tabular, { color: onImage }]}>{groupThousands(left)} qoldi</Text>
        </View>
      </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  shadow: { borderRadius: CARD_RADIUS },
  card: { borderRadius: CARD_RADIUS, padding: space.lg, overflow: 'hidden' },
  round: { borderRadius: CARD_RADIUS },
  rings: { position: 'absolute', right: -60, top: -60 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  text: { flex: 1, gap: 2, minWidth: 0 },
  progress: { marginTop: space.md + 2, gap: space.xs },
  track: { height: progressThickness.hero, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },
  numbers: { flexDirection: 'row', justifyContent: 'space-between', gap: space.xs },
})

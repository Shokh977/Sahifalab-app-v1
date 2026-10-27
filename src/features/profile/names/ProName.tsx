/**
 * A display name in its owner's Pro style (9-qadam §1, §3): the name
 * colour for the theme's mode, then the badge. The name ellipsizes first;
 * the badge never shrinks.
 *
 * Plain and solid colours are ordinary RN text. Gradients and Yaltiroq are
 * drawn by Skia (a Paragraph in Onest used as a mask over a gradient), so
 * the gradient spans the name's own width. All Yaltiroq names share one
 * sheen clock, which runs only while at least one is on screen. On dark
 * themes Pro names get a soft glow in their first colour; light themes get
 * none. Pass the place's own typography as `textStyle`.
 */
import React, { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type TextStyle } from 'react-native'
import {
  Easing, cancelAnimation, makeMutable, useDerivedValue, useReducedMotion, withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated'
import {
  Blur, Canvas, Group, LinearGradient, Mask, Paint, Paragraph, Rect, Skia, vec, type SkParagraph, type SkTypefaceFontProvider,
} from '@shopify/react-native-skia'
import { useTheme } from '../../../design/ThemeProvider'
import { fonts } from '../../../design/typography'
import { NameBadge } from './NameBadge'
import { BADGE_SIZE, badgeGap, inkLead, nameInk, nameStyleKind, type NameContext, type NameInk } from './nameStyles'
import { SKIA_FAMILIES, useOnestProvider } from './onestSkia'

export function ProName({ text, nameStyle, badge, context, textStyle, animated = true, announceBadge, badgeSize }: {
  text: string
  nameStyle?: string | null
  badge?: string | null
  context: NameContext
  /** The place's typography (font family, size, line height). Its colour is the plain-name colour. */
  textStyle?: StyleProp<TextStyle>
  /** false: still badge and a parked sheen (grids, thumbnails). */
  animated?: boolean
  /** Announce the badge to screen readers (profile header). */
  announceBadge?: boolean
  badgeSize?: number
}) {
  const { colors, scheme } = useTheme()
  const flat = StyleSheet.flatten([{ fontFamily: fonts.bold, fontSize: 15, color: colors.text }, textStyle]) as TextStyle
  const fontSize = flat.fontSize ?? 15
  const ink = nameInk(nameStyleKind(nameStyle), scheme)
  const glow = scheme === 'dark' && ink.kind !== 'theme'
  const lead = inkLead(ink, (flat.color as string) ?? colors.text)
  const hasBadge = !!badge && badge !== 'none'

  return (
    <View style={styles.row}>
      {ink.kind === 'gradient' || ink.kind === 'sheen' ? (
        <InkText text={text} ink={ink} style={flat} glow={glow} lead={lead} animated={animated} />
      ) : (
        <Text
          style={[flat, styles.shrink, { color: lead }, glow && { textShadowColor: lead + '40', textShadowRadius: fontSize * 0.35 }]}
          numberOfLines={1}
        >
          {text}
        </Text>
      )}
      {hasBadge && (
        <View style={{ marginLeft: badgeGap(fontSize) }}>
          <NameBadge id={badge} size={badgeSize ?? BADGE_SIZE[context]} surface={scheme} animated={animated} announce={announceBadge} />
        </View>
      )}
    </View>
  )
}

// ── Skia-drawn names ─────────────────────────────────────────────────────────

/** Yaltiroq: one 5 s loop for every name — the band crosses in 1.3 s, then rests 3.7 s. */
const sheen = makeMutable(0)
let sheenUsers = 0

function useSheenClock(active: boolean) {
  useEffect(() => {
    if (!active) return
    if (sheenUsers++ === 0) {
      sheen.value = 0
      sheen.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1300, easing: Easing.bezier(0.45, 0, 0.25, 1) }),
          withDelay(3700, withTiming(0, { duration: 0 })),
        ),
        -1,
      )
    }
    return () => {
      if (--sheenUsers === 0) cancelAnimation(sheen)
    }
  }, [active])
}

function build(provider: SkTypefaceFontProvider, text: string, style: TextStyle, color: string): SkParagraph {
  const fontSize = style.fontSize ?? 15
  const family = SKIA_FAMILIES.includes(style.fontFamily ?? '') ? style.fontFamily! : fonts.bold
  return Skia.ParagraphBuilder.Make({ maxLines: 1, ellipsis: '…' }, provider)
    // Native side rejects undefined numbers: only set the optional ones when present.
    .pushStyle({
      color: Skia.Color(color),
      fontFamilies: [family],
      fontSize,
      ...(style.letterSpacing != null ? { letterSpacing: style.letterSpacing } : {}),
      ...(style.lineHeight ? { heightMultiplier: style.lineHeight / fontSize } : {}),
    })
    .addText(text)
    .build()
}

function InkText({ text, ink, style, glow, lead, animated }: {
  text: string
  ink: Extract<NameInk, { kind: 'gradient' | 'sheen' }>
  style: TextStyle
  glow: boolean
  lead: string
  animated: boolean
}) {
  const provider = useOnestProvider()
  const reduce = useReducedMotion()
  const moving = ink.kind === 'sheen' && animated && !reduce
  useSheenClock(moving)
  const [avail, setAvail] = useState<number | null>(null)
  const fontSize = style.fontSize ?? 15

  const measured = useMemo(() => {
    if (!provider) return null
    const mask = build(provider, text, style, '#FFFFFF')
    mask.layout(100000)
    const natural = Math.ceil(mask.getMaxIntrinsicWidth())
    return { mask, natural, height: Math.ceil(mask.getHeight()), glowP: glow ? build(provider, text, style, lead) : null }
  }, [provider, text, style.fontFamily, style.fontSize, style.lineHeight, style.letterSpacing, glow, lead]) // eslint-disable-line react-hooks/exhaustive-deps

  const width = measured ? Math.min(measured.natural, avail ?? measured.natural) : 0
  const textW = useMemo(() => {
    if (!measured) return 0
    measured.mask.layout(width)
    measured.glowP?.layout(width)
    return Math.min(measured.mask.getLongestLine(), width)
  }, [measured, width])

  const pad = glow ? Math.ceil(fontSize * 0.5) : 0
  const band = 3.2 * textW
  const dx = Math.cos((10 * Math.PI) / 180) * band / 2
  const dy = Math.sin((10 * Math.PI) / 180) * band / 2
  const sheenStart = useDerivedValue(() => {
    const t = moving ? sheen.value : 0.6
    const cx = pad + (-0.25 + 1.5 * t) * textW
    return vec(cx - dx, pad + (measured?.height ?? 0) / 2 - dy)
  })
  const sheenEnd = useDerivedValue(() => {
    const t = moving ? sheen.value : 0.6
    const cx = pad + (-0.25 + 1.5 * t) * textW
    return vec(cx + dx, pad + (measured?.height ?? 0) / 2 + dy)
  })

  // Font still loading: the name in its first colour, same metrics.
  if (!measured) {
    return <Text style={[style, styles.shrink, { color: lead }]} numberOfLines={1}>{text}</Text>
  }

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width)
    if (w !== avail && (w < measured.natural || avail !== null)) setAvail(w >= measured.natural ? null : w)
  }

  return (
    <View
      style={[styles.shrink, { width: measured.natural, height: measured.height }]}
      onLayout={onLayout}
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
    >
      <Canvas style={{ position: 'absolute', left: -pad, top: -pad, width: width + pad * 2, height: measured.height + pad * 2 }}>
        {measured.glowP && (
          <Group layer={<Paint opacity={0.25}><Blur blur={fontSize * 0.175} /></Paint>}>
            <Paragraph paragraph={measured.glowP} x={pad} y={pad} width={width} />
          </Group>
        )}
        <Mask mode="alpha" mask={<Paragraph paragraph={measured.mask} x={pad} y={pad} width={width} />}>
          <Rect x={pad} y={pad} width={width} height={measured.height}>
            {ink.kind === 'gradient' ? (
              <LinearGradient start={vec(pad, 0)} end={vec(pad + Math.max(1, textW), 0)} colors={[...ink.colors]} />
            ) : (
              <LinearGradient
                start={sheenStart}
                end={sheenEnd}
                colors={[ink.base, ink.base, ink.sheen, ink.base, ink.base]}
                positions={[0, 0.42, 0.5, 0.58, 1]}
              />
            )}
          </Rect>
        </Mask>
      </Canvas>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, minWidth: 0 },
  shrink: { flexShrink: 1, minWidth: 0 },
})

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { View, Text, Image, Pressable, ScrollView, StyleSheet, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Star } from 'lucide-react-native'
import { typography } from '../../lib/constants'
import { coursesStrings as s } from '../../lib/coursesStrings'
import { ImagePlaceholderMark } from './icons'
import type { Course } from '../../lib/api'
import type { PremiumTheme, PremiumThemeKey } from '../../lib/premiumTheme'

const { width: SCREEN_W } = Dimensions.get('window')
const SIDE_MARGIN = 16
const SLIDE_W = SCREEN_W - SIDE_MARGIN * 2
const MEDIA_H = 186
const AUTO_ADVANCE_MS = 6000
const DOTS_BG = '#141110'

interface Props {
  slides:  Course[]
  t:       PremiumTheme
  themeKey: PremiumThemeKey
  onPress: (id: number) => void
  reduceMotion: boolean
}

export function FeaturedCarousel({ slides, t, themeKey, onPress, reduceMotion }: Props) {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (reduceMotion || paused || slides.length <= 1) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setActive(prev => {
        const next = (prev + 1) % slides.length
        scrollRef.current?.scrollTo({ x: next * SLIDE_W, animated: true })
        return next
      })
    }, AUTO_ADVANCE_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [reduceMotion, paused, slides.length])

  const onMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActive(Math.round(e.nativeEvent.contentOffset.x / SLIDE_W))
  }, [])

  if (slides.length === 0) return null

  return (
    <View style={styles.wrap}>
      <View style={styles.mediaClip}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          onScrollBeginDrag={() => setPaused(true)}
          onMomentumScrollEnd={onMomentumEnd}
        >
          {slides.map(co => (
            <Pressable key={co.id} onPress={() => onPress(co.id)} style={styles.slide}>
              {co.thumbnail_url ? (
                <Image source={{ uri: co.thumbnail_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <LinearGradient colors={t.thumbPlaceholder} style={[StyleSheet.absoluteFill, styles.placeholderFill]}>
                  <ImagePlaceholderMark size={30} color={t.textTertiary} />
                </LinearGradient>
              )}
              <LinearGradient
                colors={['rgba(10,8,6,0)', 'rgba(10,8,6,.92)']}
                style={styles.scrim}
              />
              <View style={styles.overlay}>
                {!!co.categories?.name && (
                  <View style={styles.badgeRow}>
                    {themeKey === 'light' ? (
                      <LinearGradient colors={t.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.badge}>
                        <Text style={[styles.badgeText, { color: t.accentInk }]} numberOfLines={1}>{co.categories.name}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.badge, { backgroundColor: 'rgba(232,144,11,.14)', borderColor: 'rgba(232,144,11,.4)', borderWidth: 1 }]}>
                        <Text style={[styles.badgeText, { color: '#F7BC63' }]} numberOfLines={1}>{co.categories.name}</Text>
                      </View>
                    )}
                  </View>
                )}
                <Text numberOfLines={2} style={styles.title}>{co.title}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaLeft}>
                    {(co.rating ?? 0) > 0 && (
                      <View style={styles.ratingWrap}>
                        <Star size={12} color="#F9C97A" fill="#F9C97A" strokeWidth={0} />
                        <Text style={styles.ratingText}>{co.rating!.toFixed(1)}</Text>
                      </View>
                    )}
                    {co.enrolled_count > 0 && (
                      <Text style={styles.studentsText} numberOfLines={1}>{s.students(co.enrolled_count)}</Text>
                    )}
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceSerif} numberOfLines={1}>
                      {co.is_paid ? co.price.toLocaleString() : s.free}
                    </Text>
                    {co.is_paid && <Text style={styles.priceSuffix}>{s.somUnit}</Text>}
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {slides.length > 1 && (
        <View style={styles.dotsStrip}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === active
                  ? { width: 16, height: 4, backgroundColor: t.accent }
                  : { width: 4, height: 4, backgroundColor: 'rgba(255,255,255,.22)' },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: SIDE_MARGIN,
    borderRadius: 22,
    overflow: 'hidden',
  },
  mediaClip: { height: MEDIA_H },
  slide: { width: SLIDE_W, height: MEDIA_H },
  placeholderFill: { alignItems: 'center', justifyContent: 'center' },
  scrim: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 130,
  },
  overlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    padding: 16,
    gap: 6,
  },
  badgeRow: { flexDirection: 'row' },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 9.5,
    fontFamily: typography.fontFamily.extrabold,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 19,
    fontFamily: typography.fontFamily.extrabold,
    letterSpacing: -0.3,
    color: '#F7F3EC',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  metaLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 10, flexShrink: 1 },
  ratingWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 12, fontFamily: typography.fontFamily.bold, color: '#F7F3EC' },
  studentsText: { fontSize: 12, fontFamily: typography.fontFamily.semibold, color: 'rgba(247,243,236,.7)' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  priceSerif: { fontSize: 21, fontFamily: typography.fontFamily.serifDisplay, color: '#F7F3EC', fontVariant: ['tabular-nums'] },
  priceSuffix: { fontSize: 12, fontFamily: typography.fontFamily.bold, color: 'rgba(247,243,236,.7)' },

  dotsStrip: {
    height: 11,
    backgroundColor: DOTS_BG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  dot: { borderRadius: 2 },
})

/**
 * SmartActionCards — contextual action cards styled like StreakBanner.
 * Flat card: muted colour tint background + 1px accent border + dark text.
 */
import React from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { BookOpen, GraduationCap, Trophy, Timer, Cards, CaretRight } from 'phosphor-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import type { DashboardData } from '../../stores/dashboardStore'

const CARD_W = Dimensions.get('window').width - 80

interface ActionCard {
  id:      string
  title:   string
  sub:     string
  color:   string   // border + icon colour
  bgColor: string   // lighter tint for background
  Icon:    React.ComponentType<any>
  route:   string
}

function buildCards(data: DashboardData, c: any): ActionCard[] {
  const cards: ActionCard[] = []

  // Flashcard due-cards action — highest priority when cards are due
  if ((data as any).flashcardDueCount > 0) {
    const dueCount = (data as any).flashcardDueCount as number
    cards.push({
      id:      'flashcards',
      title:   'Kartochkalar',
      sub:     `${dueCount} ta karta kutmoqda`,
      color:   '#4DA6FF',
      bgColor: 'rgba(77,166,255,0.10)',
      Icon:    Cards,
      route:   '/(tabs)/flashcards',
    })
  }

  if (data.enrolled.length > 0) {
    cards.push({
      id:      'continue',
      title:   'Darsni davom ettiring',
      sub:     data.enrolled[0].courses?.title ?? 'Kursni oching',
      color:   c.accentPrimary,
      bgColor: c.accentPrimaryMuted,
      Icon:    BookOpen,
      route:   `/(screens)/course/${data.enrolled[0].course_id}`,
    })
  }

  if (data.focusStats.streak_days > 0) {
    cards.push({
      id:      'streak',
      title:   `${data.focusStats.streak_days} kunlik seriya`,
      sub:     'Fokus taymerini ishga tushiring',
      color:   '#FF4500',
      bgColor: 'rgba(255,69,0,0.10)',
      Icon:    Timer,
      route:   '/(tabs)/study',
    })
  }

  if (data.recommended.length > 0) {
    cards.push({
      id:      'explore',
      title:   'Yangi kurs',
      sub:     data.recommended[0].title,
      color:   c.accentSecondary,
      bgColor: 'rgba(77,166,255,0.10)',
      Icon:    GraduationCap,
      route:   `/(screens)/course/${data.recommended[0].id}`,
    })
  }

  if (data.leaderboard.length > 0) {
    cards.push({
      id:      'leaderboard',
      title:   'Haftalik reyting',
      sub:     data.myLeaderRank ? `Siz #${data.myLeaderRank} o'rinda` : 'Reytingga kiring',
      color:   c.warning,
      bgColor: c.warningMuted,
      Icon:    Trophy,
      route:   '/(screens)/leaderboard',
    })
  }

  if (cards.length === 0) {
    cards.push({
      id:      'start',
      title:   "O'qishni boshlang",
      sub:     'Birinchi kursni tanlang',
      color:   c.accentPrimary,
      bgColor: c.accentPrimaryMuted,
      Icon:    BookOpen,
      route:   '/(tabs)/courses',
    })
  }

  return cards
}

export function SmartActionCards({ data }: { data: DashboardData }) {
  const { c }  = useTheme()
  const router = useRouter()
  const cards  = buildCards(data, c)

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={CARD_W + spacing.sm}
      decelerationRate="fast"
      contentContainerStyle={styles.scroll}
    >
      {cards.map(card => (
        <Pressable
          key={card.id}
          onPress={() => router.push(card.route as any)}
          style={({ pressed }) => [
            styles.card,
            {
              width:           CARD_W,
              backgroundColor: card.bgColor,
              borderColor:     card.color,
              opacity:         pressed ? 0.85 : 1,
            },
          ]}
        >
          {/* Icon circle */}
          <View style={[styles.iconWrap, { backgroundColor: card.color + '28' }]}>
            <card.Icon size={22} color={card.color} weight="fill" />
          </View>

          {/* Text */}
          <View style={styles.text}>
            <Text
              style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}
              numberOfLines={1}
            >
              {card.title}
            </Text>
            <Text
              style={[styles.sub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}
              numberOfLines={1}
            >
              {card.sub}
            </Text>
          </View>

          <CaretRight size={16} color={card.color} weight="bold" />
        </Pressable>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.screenMargin,
    gap:               spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems:    'center',
    borderWidth:   1,
    borderRadius:  radius.cardLg,
    padding:       spacing.base,
    gap:           12,
  },
  iconWrap: {
    width:          40,
    height:         40,
    borderRadius:   20,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  text:  { flex: 1, gap: 3 },
  title: { fontSize: typography.size.base },
  sub:   { fontSize: typography.size.sm, lineHeight: 18 },
})

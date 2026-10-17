import { Easing } from 'react-native'
import { Tabs } from 'expo-router'
import { AnimatedTabBar } from '../../components/layout/AnimatedTabBar'
import { bezier, durations } from '../../src/design/motion'

// Tab switch (spec section 5): content crossfades in 220 ms, no sliding.
const TAB_FADE = {
  animation: 'fade' as const,
  transitionSpec: {
    animation: 'timing' as const,
    // react-navigation animates tabs with RN Animated, so the curve is RN Easing.
    config: { duration: durations.fade, easing: Easing.bezier(...bezier.standard) },
  },
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, ...TAB_FADE }}
      tabBar={(props) => <AnimatedTabBar {...props} />}
    >
      <Tabs.Screen name="index"         options={{ title: 'Bugun' }} />
      <Tabs.Screen name="study"         options={{ title: 'Fokus' }} />
      <Tabs.Screen name="courses"       options={{ title: 'Kurslar' }} />
      <Tabs.Screen name="flashcards"    options={{ title: 'Kartalar' }} />
      <Tabs.Screen name="musobaqalar"   options={{ title: 'Bellashuv' }} />
      {/* Hidden from the tab bar (see AnimatedTabBar's TAB_CONFIG) — still
          valid routes so the avatar (Profil) and the bell can push to them. */}
      <Tabs.Screen name="profile"       options={{ title: 'Profil' }} />
      <Tabs.Screen name="notifications" options={{ title: 'Bildirishnomalar' }} />
    </Tabs>
  )
}

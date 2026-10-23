import { Easing } from 'react-native'
import { Tabs } from 'expo-router'
import { AnimatedTabBar } from '../../components/layout/AnimatedTabBar'
import { bezier, durations } from '../../src/design/motion'

// Tab switch: content crossfades, no sliding. 150 ms (was 220): the
// system's own tab bars switch almost instantly, and a longer fade read as
// the app being slow to respond.
const TAB_FADE = {
  animation: 'fade' as const,
  transitionSpec: {
    animation: 'timing' as const,
    // react-navigation animates tabs with RN Animated, so the curve is RN Easing.
    config: { duration: durations.fast, easing: Easing.bezier(...bezier.standard) },
  },
}

export default function TabLayout() {
  return (
    <Tabs
      // freezeOnBlur: a tab you're not looking at stops re-rendering (Bugun's
      // minute clock, store updates from other screens) until you come back.
      screenOptions={{ headerShown: false, freezeOnBlur: true, ...TAB_FADE }}
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

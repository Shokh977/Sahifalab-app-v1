import { Animated, Easing } from 'react-native'
import { Tabs } from 'expo-router'
import { AnimatedTabBar } from '../../components/layout/AnimatedTabBar'
import { bezier, durations } from '../../src/design/motion'
import { space } from '../../src/design/spacing'

// Tab switch: the new screen fades in while shifting a little from the
// side the pill is moving to, so the content moves with the tab bar instead
// of cutting while the pill is still sliding (most visible in Fokus rejimi,
// where two tabs sit side by side). 220 ms, standard curve.
const SHIFT = space.xxl
const TAB_SHIFT = {
  animation: 'shift' as const,
  transitionSpec: {
    animation: 'timing' as const,
    // react-navigation animates tabs with RN Animated, so the curve is RN Easing.
    config: { duration: durations.fade, easing: Easing.bezier(...bezier.standard) },
  },
  sceneStyleInterpolator: ({ current }: { current: { progress: Animated.AnimatedInterpolation<number> } }) => ({
    sceneStyle: {
      opacity: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }),
      transform: [{ translateX: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [-SHIFT, 0, SHIFT] }) }],
    },
  }),
}

export default function TabLayout() {
  return (
    <Tabs
      // freezeOnBlur: a tab you're not looking at stops re-rendering (Bugun's
      // minute clock, store updates from other screens) until you come back.
      screenOptions={{ headerShown: false, freezeOnBlur: true, ...TAB_SHIFT }}
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

import { Tabs } from 'expo-router'
import { AnimatedTabBar } from '../../components/layout/AnimatedTabBar'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AnimatedTabBar {...props} />}
    >
      <Tabs.Screen name="index"         options={{ title: 'Bosh sahifa' }} />
      <Tabs.Screen name="study"         options={{ title: "O'qish" }} />
      <Tabs.Screen name="courses"       options={{ title: 'Kurslar' }} />
      <Tabs.Screen name="flashcards"    options={{ title: 'Kartalar' }} />
      <Tabs.Screen name="musobaqalar"   options={{ title: 'Bellashuv' }} />
      {/* Hidden from the tab bar (see AnimatedTabBar's TAB_CONFIG) — still
          valid routes so the top-bar avatar (every screen) and the
          notification bell can push to them. Declared last so the sliding
          active-tab dot's index-clamping keeps working (step-22: Profil
          replaced by Musobaqalar as a tab, kept as a route). */}
      <Tabs.Screen name="profile"       options={{ title: 'Profil' }} />
      <Tabs.Screen name="notifications" options={{ title: 'Bildirishnoma' }} />
    </Tabs>
  )
}

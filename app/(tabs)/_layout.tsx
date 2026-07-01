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
      <Tabs.Screen name="profile"       options={{ title: 'Profil' }} />
      {/* Hidden from the tab bar (see AnimatedTabBar's TAB_CONFIG) — still a
          valid route so the notification bell elsewhere can push to it. */}
      <Tabs.Screen name="notifications" options={{ title: 'Bildirishnoma' }} />
    </Tabs>
  )
}

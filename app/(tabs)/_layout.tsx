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
      <Tabs.Screen name="notifications" options={{ title: 'Bildirishnoma' }} />
      <Tabs.Screen name="profile"       options={{ title: 'Profil' }} />
    </Tabs>
  )
}

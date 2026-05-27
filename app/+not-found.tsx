import { View, Text, StyleSheet } from 'react-native'
import { Link } from 'expo-router'
import { useTheme } from '../hooks/useTheme'
import { typography } from '../lib/constants'

export default function NotFound() {
  const { c } = useTheme()
  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <Text style={{ color: c.textPrimary, fontFamily: typography.fontFamily.bold, fontSize: 48 }}>
        404
      </Text>
      <Text style={{ color: c.textSecondary, fontFamily: typography.fontFamily.regular, marginTop: 8 }}>
        Sahifa topilmadi
      </Text>
      <Link href="/(tabs)" style={{ color: c.brand, marginTop: 24, fontFamily: typography.fontFamily.semibold }}>
        Bosh sahifaga qaytish
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})

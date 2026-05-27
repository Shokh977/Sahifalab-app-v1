import React, { useEffect } from 'react'
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native'
import ReAnimated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { User, Settings, Wallet, HelpCircle, LogOut } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { useAuthStore } from '../../stores/authStore'
import { typography, spacing, radius } from '../../lib/constants'

interface Props {
  visible:      boolean
  onClose:      () => void
  anchorTop?:   number
  anchorRight?: number
}

const EASE = Easing.out(Easing.cubic)

export function AvatarMenu({ visible, onClose, anchorTop = 60, anchorRight = 12 }: Props) {
  const { c }           = useTheme()
  const { user, logout } = useAuthStore()
  const router          = useRouter()

  const opacity    = useSharedValue(0)
  const scale      = useSharedValue(0.95)
  const translateY = useSharedValue(-6)

  useEffect(() => {
    if (visible) {
      opacity.value    = withTiming(1,  { duration: 170, easing: EASE })
      scale.value      = withTiming(1,  { duration: 180, easing: EASE })
      translateY.value = withTiming(0,  { duration: 180, easing: EASE })
    }
  }, [visible])

  const animStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }))

  function navigate(path: string) {
    onClose()
    setTimeout(() => router.push(path as any), 50)
  }

  async function handleLogout() {
    onClose()
    await logout()
  }

  if (!visible) return null

  const MENU_ITEMS = [
    { icon: User,       label: "Profilni ko'rish", action: () => navigate('/(tabs)/profile')          },
    { icon: Settings,   label: 'Sozlamalar',        action: () => navigate('/(screens)/settings')      },
    { icon: Wallet,     label: 'Hamyon',            action: () => navigate('/(screens)/wallet' as any) },
    { icon: HelpCircle, label: 'Yordam',            action: () => navigate('/(screens)/help'   as any) },
  ]

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <ReAnimated.View
          style={[
            styles.panel,
            { backgroundColor: c.bgSecondary, borderColor: c.border, top: anchorTop, right: anchorRight },
            animStyle,
          ]}
        >
          {user && (
            <View style={[styles.userHeader, { borderBottomColor: c.border }]}>
              <Text style={[styles.userName, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
                {user.first_name}
              </Text>
              {user.username && (
                <Text style={[styles.userHandle, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                  @{user.username}
                </Text>
              )}
            </View>
          )}

          <View style={styles.menuSection}>
            {MENU_ITEMS.map(({ icon: Icon, label, action }) => (
              <Pressable
                key={label}
                onPress={action}
                style={({ pressed }) => [styles.menuItem, { backgroundColor: pressed ? c.bgTertiary : 'transparent' }]}
              >
                <Icon size={18} color={c.textSecondary} strokeWidth={1.8} />
                <Text style={[styles.menuLabel, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.logoutSection, { borderTopColor: c.border }]}>
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [styles.menuItem, { backgroundColor: pressed ? c.bgTertiary : 'transparent' }]}
            >
              <LogOut size={18} color={c.textMuted} strokeWidth={1.8} />
              <Text style={[styles.menuLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                Chiqish
              </Text>
            </Pressable>
          </View>
        </ReAnimated.View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  panel: {
    position:      'absolute',
    width:         240,
    borderRadius:  radius['2xl'],
    borderWidth:   1,
    overflow:      'hidden',
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius:  20,
    elevation:     14,
  },
  userHeader: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.md + 2,
    paddingBottom:     spacing.md,
    borderBottomWidth: 1,
    gap:               2,
  },
  userName:   { fontSize: typography.size.md },
  userHandle: { fontSize: typography.size.sm },
  menuSection: { paddingVertical: spacing.xs },
  menuItem: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm + 3,
  },
  menuLabel: { fontSize: typography.size.base },
  logoutSection: {
    borderTopWidth:  1,
    paddingVertical: spacing.xs,
  },
})

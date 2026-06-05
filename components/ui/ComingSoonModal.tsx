import React from 'react'
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native'
import { Clock } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'

interface Props {
  visible: boolean
  onClose: () => void
}

export function ComingSoonModal({ visible, onClose }: Props) {
  const { c } = useTheme()

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: c.brandSubtle }]}>
            <Clock size={32} color={c.brand} strokeWidth={1.75} />
          </View>

          <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            Tez orada!
          </Text>
          <Text style={[styles.body, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            To'lov tizimi yaqinda ishga tushadi.{'\n'}Sabr qiling — siz birinchilar orasida bo'lasiz!
          </Text>

          <Pressable
            onPress={onClose}
            style={[styles.btn, { backgroundColor: c.brand }]}
          >
            <Text style={[styles.btnText, { fontFamily: typography.fontFamily.semibold }]}>
              Tushunarli
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.size.xl,
    textAlign: 'center',
  },
  body: {
    fontSize: typography.size.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  btn: {
    width: '100%',
    height: 48,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  btnText: {
    color: '#fff',
    fontSize: typography.size.base,
  },
})

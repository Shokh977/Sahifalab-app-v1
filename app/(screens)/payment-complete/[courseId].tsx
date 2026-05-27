import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CheckCircle, XCircle } from 'lucide-react-native'
import { useTheme } from '../../../hooks/useTheme'
import { enrollments, courses, type Course } from '../../../lib/api'
import { typography, spacing, radius } from '../../../lib/constants'

type Status = 'loading' | 'success' | 'error'

export default function PaymentCompleteScreen() {
  const { c }      = useTheme()
  const insets     = useSafeAreaInsets()
  const router     = useRouter()
  const { courseId } = useLocalSearchParams<{ courseId: string }>()

  const [status, setStatus] = useState<Status>('loading')
  const [course, setCourse]  = useState<Course | null>(null)

  useEffect(() => {
    if (!courseId) { setStatus('error'); return }
    ;(async () => {
      try {
        const [check, courseData] = await Promise.all([
          enrollments.check(Number(courseId)),
          courses.get(Number(courseId)),
        ])
        setCourse(courseData)
        setStatus(check.enrolled ? 'success' : 'error')
      } catch {
        setStatus('error')
      }
    })()
  }, [courseId])

  return (
    <View style={[styles.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={c.accentPrimary} />
            <Text style={[styles.label, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              To'lov tekshirilmoqda…
            </Text>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={72} color="#22c55e" />
            <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              To'lov muvaffaqiyatli!
            </Text>
            {course && (
              <Text style={[styles.label, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                {course.title}
              </Text>
            )}
            <Pressable
              onPress={() => router.replace(`/(screens)/course/${courseId}` as any)}
              style={[styles.btn, { backgroundColor: c.accentPrimary }]}
            >
              <Text style={[styles.btnText, { color: c.textInverse, fontFamily: typography.fontFamily.semibold }]}>
                Kursga o'tish
              </Text>
            </Pressable>
            <Pressable onPress={() => router.replace('/(tabs)')} style={styles.link}>
              <Text style={[styles.linkText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Bosh sahifaga qaytish
              </Text>
            </Pressable>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={72} color={c.error ?? '#ef4444'} />
            <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              Xatolik yuz berdi
            </Text>
            <Text style={[styles.label, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              To'lov tasdiqlanmadi. Qaytadan urinib ko'ring yoki qo'llab-quvvatlash xizmatiga murojaat qiling.
            </Text>
            <Pressable onPress={() => router.back()} style={[styles.btn, { backgroundColor: c.bgTertiary }]}>
              <Text style={[styles.btnText, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                Orqaga
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  content: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing.base,
    padding:        spacing.xl,
  },
  title: {
    fontSize:  22,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  label: {
    fontSize:  14,
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    width:          '100%',
    height:         52,
    borderRadius:   radius['2xl'],
    alignItems:     'center',
    justifyContent: 'center',
    marginTop:      spacing.sm,
  },
  btnText: { fontSize: 15 },
  link:    { paddingVertical: spacing.sm },
  linkText:{ fontSize: 13 },
})

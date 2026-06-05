import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  Switch, ActivityIndicator, Alert, TextInput, Modal, Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { Appearance } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { useThemeStore } from '../../stores/themeStore'
import { useAuthStore } from '../../stores/authStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { account, onboarding, auth as authApi } from '../../lib/api'
import { TermsModal } from '../../components/ui/TermsModal'
import { typography, spacing, radius } from '../../lib/constants'

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const { c } = useTheme()
  return (
    <Text style={[s.sectionHeader, { color: c.textDisabled, fontFamily: typography.fontFamily.semibold }]}>
      {title}
    </Text>
  )
}

function SettingGroup({ children }: { children: React.ReactNode }) {
  const { c } = useTheme()
  return (
    <View style={[s.group, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
      {children}
    </View>
  )
}

function SettingRow({
  label, value, right, onPress, danger = false, isLast = false,
}: {
  label:   string
  value?:  string
  right?:  React.ReactNode
  onPress?: () => void
  danger?:  boolean
  isLast?:  boolean
}) {
  const { c } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        s.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
        pressed && onPress && { backgroundColor: c.bgTertiary },
      ]}
    >
      <Text style={[s.rowLabel, { color: danger ? c.error : c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
        {label}
      </Text>
      {value && !right && (
        <Text style={[s.rowValue, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          {value}
        </Text>
      )}
      {right}
      {onPress && !right && !value && (
        <Text style={[s.chevron, { color: c.textDisabled }]}>›</Text>
      )}
      {onPress && value && (
        <Text style={[s.chevron, { color: c.textDisabled }]}>›</Text>
      )}
    </Pressable>
  )
}

// ── Goal Picker Modal ─────────────────────────────────────────────────────────

function GoalPickerModal({
  visible, current, onClose, onSelect, c,
}: {
  visible:  boolean
  current:  number
  onClose:  () => void
  onSelect: (min: number) => void
  c:        any
}) {
  const GOALS = [10, 20, 40, 60, 90, 120]
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.modalOverlay} onPress={onClose} />
      <View style={[s.modalSheet, { backgroundColor: c.bgSecondary }]}>
        <View style={[s.modalHandle, { backgroundColor: c.border }]} />
        <Text style={[s.modalTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Kunlik maqsad
        </Text>
        {GOALS.map(min => (
          <Pressable
            key={min}
            onPress={() => { onSelect(min); onClose() }}
            style={[s.modalOption, { borderBottomColor: c.border }]}
          >
            <Text style={[s.modalOptionText, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
              {min} daqiqa
            </Text>
            {current === min && (
              <Text style={[{ color: c.accentPrimary, fontSize: 18 }]}>✓</Text>
            )}
          </Pressable>
        ))}
        <Pressable onPress={onClose} style={[s.modalCancel, { backgroundColor: c.bgTertiary }]}>
          <Text style={[{ color: c.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: 15 }]}>Bekor</Text>
        </Pressable>
      </View>
    </Modal>
  )
}

// ── Delete Confirmation Modal ──────────────────────────────────────────────────

function DeleteAccountModal({
  visible, onClose, onConfirm, c,
}: {
  visible:   boolean
  onClose:   () => void
  onConfirm: () => void
  c:         any
}) {
  const [step,    setStep]    = useState<1 | 2>(1)
  const [typed,   setTyped]   = useState('')
  const [loading, setLoading] = useState(false)
  const TARGET = "O'CHIRISH"

  const handleClose = () => { setStep(1); setTyped(''); onClose() }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={s.modalOverlay}>
        <View style={[s.alertBox, { backgroundColor: c.bgSecondary }]}>
          {step === 1 ? (
            <>
              <Text style={[s.alertTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
                Hisobni o'chirasizmi?
              </Text>
              <Text style={[s.alertBody, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Bu qaytarilmas! Barcha ma'lumotlaringiz o'chib ketadi.
              </Text>
              <View style={s.alertBtns}>
                <Pressable onPress={handleClose} style={[s.alertBtn, { borderColor: c.border, borderWidth: 1 }]}>
                  <Text style={[{ color: c.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: 15 }]}>Bekor</Text>
                </Pressable>
                <Pressable onPress={() => setStep(2)} style={[s.alertBtn, { backgroundColor: c.error }]}>
                  <Text style={[{ color: '#fff', fontFamily: typography.fontFamily.semibold, fontSize: 15 }]}>Ha, o'chirish</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={[s.alertTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
                Tasdiqlash
              </Text>
              <Text style={[s.alertBody, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Tasdiqlash uchun quyidagini kiriting:
              </Text>
              <Text style={[{ color: c.error, fontFamily: typography.fontFamily.bold, fontSize: 15, textAlign: 'center', marginBottom: 12 }]}>
                {TARGET}
              </Text>
              <TextInput
                value={typed}
                onChangeText={setTyped}
                placeholder={TARGET}
                placeholderTextColor={c.textDisabled}
                autoCapitalize="characters"
                style={[s.deleteInput, { backgroundColor: c.bgTertiary, borderColor: c.border, color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}
              />
              <View style={s.alertBtns}>
                <Pressable onPress={handleClose} style={[s.alertBtn, { borderColor: c.border, borderWidth: 1 }]}>
                  <Text style={[{ color: c.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: 15 }]}>Bekor</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    if (typed !== TARGET) return
                    setLoading(true)
                    await onConfirm()
                    setLoading(false)
                  }}
                  disabled={typed !== TARGET || loading}
                  style={[s.alertBtn, { backgroundColor: c.error, opacity: typed !== TARGET ? 0.4 : 1 }]}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={[{ color: '#fff', fontFamily: typography.fontFamily.semibold, fontSize: 15 }]}>O'chirish</Text>
                  }
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}

// ── Link Email Modal (for Telegram users) ─────────────────────────────────────

function LinkEmailModal({
  visible, onClose, onSuccess, c,
}: {
  visible:   boolean
  onClose:   () => void
  onSuccess: () => void
  c:         any
}) {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const handleClose = () => { setEmail(''); setError(null); onClose() }

  const handleSubmit = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed.includes('@')) { setError("To'g'ri email kiriting"); return }
    setLoading(true); setError(null)
    try {
      await authApi.linkEmail(trimmed)
      handleClose()
      onSuccess()
    } catch (e: any) {
      setError(e.message ?? 'Xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={s.modalOverlay} onPress={handleClose} />
      <View style={[s.modalSheet, { backgroundColor: c.bgSecondary }]}>
        <View style={[s.modalHandle, { backgroundColor: c.border }]} />
        <Text style={[s.modalTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Email bog'lash
        </Text>
        <Text style={[{ color: c.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: spacing.sm, fontFamily: typography.fontFamily.regular }]}>
          Eski email hisobingizdagi ma'lumotlarni (XP, kurslar, sertifikatlar) bu akkauntga o'tkazish uchun emailingizni kiriting.
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          placeholderTextColor={c.textDisabled}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={[s.deleteInput, { backgroundColor: c.bgTertiary, borderColor: c.border, color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}
        />
        {error && (
          <Text style={[{ color: c.error, fontSize: 13, textAlign: 'center', fontFamily: typography.fontFamily.regular }]}>
            {error}
          </Text>
        )}
        <View style={s.alertBtns}>
          <Pressable onPress={handleClose} style={[s.alertBtn, { borderColor: c.border, borderWidth: 1 }]}>
            <Text style={[{ color: c.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: 15 }]}>Bekor</Text>
          </Pressable>
          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={[s.alertBtn, { backgroundColor: c.accentPrimary, opacity: loading ? 0.7 : 1 }]}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={[{ color: '#fff', fontFamily: typography.fontFamily.semibold, fontSize: 15 }]}>Bog'lash</Text>
            }
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}


// ── Telegram Bot-Code Link Modal (for email users) ───────────────────────────

function TelegramLinkModal({
  visible, onClose, onSuccess, c,
}: {
  visible:   boolean
  onClose:   () => void
  onSuccess: (token: string) => void
  c:         any
}) {
  const [step,    setStep]    = useState<'idle' | 'polling' | 'done'>('idle')
  const [botLink, setBotLink] = useState<string | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const codeRef = useRef<string | null>(null)

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  useEffect(() => { if (!visible) { stopPolling(); setStep('idle'); setBotLink(null); setError(null) } }, [visible])

  const startFlow = async () => {
    setError(null)
    try {
      const res = await authApi.requestCode()
      codeRef.current = res.code
      setBotLink(res.bot_link)
      setStep('polling')
      Linking.openURL(res.bot_link).catch(() => {})

      pollRef.current = setInterval(async () => {
        try {
          const data = await authApi.verifyCode(codeRef.current!)
          if ('access_token' in data) {
            stopPolling()
            setStep('polling') // keep spinner visible while onSuccess runs
            onSuccess((data as any).access_token)
            onClose()
          }
        } catch (e: any) {
          if (e.message?.includes('expired') || e.message?.includes('404')) {
            stopPolling()
            setError("Kod muddati tugadi. Qaytadan urinib ko'ring.")
            setStep('idle')
          }
        }
      }, 2000)
    } catch (e: any) {
      setError(e.message ?? 'Xatolik yuz berdi')
    }
  }

  const handleClose = () => { stopPolling(); onClose() }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={s.modalOverlay} onPress={handleClose} />
      <View style={[s.modalSheet, { backgroundColor: c.bgSecondary }]}>
        <View style={[s.modalHandle, { backgroundColor: c.border }]} />
        <Text style={[s.modalTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Telegram bog'lash
        </Text>

        {step === 'idle' && (
          <>
            <Text style={[{ color: c.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: spacing.base, fontFamily: typography.fontFamily.regular }]}>
              Telegram hisobingizni ulash uchun quyidagi tugmani bosing. Telegram botda tasdiqlang va ma'lumotlaringiz avtomatik birlashtiriladi.
            </Text>
            {error && (
              <Text style={[{ color: c.error, fontSize: 13, textAlign: 'center', marginBottom: spacing.sm, fontFamily: typography.fontFamily.regular }]}>
                {error}
              </Text>
            )}
            <View style={s.alertBtns}>
              <Pressable onPress={handleClose} style={[s.alertBtn, { borderColor: c.border, borderWidth: 1 }]}>
                <Text style={[{ color: c.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: 15 }]}>Bekor</Text>
              </Pressable>
              <Pressable onPress={startFlow} style={[s.alertBtn, { backgroundColor: c.accentPrimary }]}>
                <Text style={[{ color: '#fff', fontFamily: typography.fontFamily.semibold, fontSize: 15 }]}>Boshlash</Text>
              </Pressable>
            </View>
          </>
        )}

        {step === 'polling' && (
          <>
            <Text style={[{ color: c.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: spacing.base, fontFamily: typography.fontFamily.regular }]}>
              Telegram botda /start bosgandan so'ng bu yerda avtomatik tasdiqlanadi.
            </Text>
            <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: spacing.base }]}>
              <ActivityIndicator color={c.accentPrimary} />
              <Text style={[{ color: c.textSecondary, fontSize: 13, fontFamily: typography.fontFamily.regular }]}>
                Kutilmoqda...
              </Text>
            </View>
            {botLink && (
              <Pressable
                onPress={() => Linking.openURL(botLink).catch(() => {})}
                style={[s.alertBtn, { backgroundColor: c.accentPrimary, alignSelf: 'stretch' }]}
              >
                <Text style={[{ color: '#fff', fontFamily: typography.fontFamily.semibold, fontSize: 15, textAlign: 'center' }]}>
                  Telegram botni ochish
                </Text>
              </Pressable>
            )}
            <Pressable onPress={handleClose} style={[{ marginTop: spacing.sm, alignItems: 'center' }]}>
              <Text style={[{ color: c.textSecondary, fontSize: 14, fontFamily: typography.fontFamily.regular }]}>Bekor qilish</Text>
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  )
}


// ── Main Screen ────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { c }                 = useTheme()
  const router                = useRouter()
  const { theme, setTheme }   = useThemeStore()
  const { user, logout, loginWithToken, refreshUser } = useAuthStore()

  // O'QISH
  const [dailyGoal,      setDailyGoal]      = useState(user?.daily_goal_minutes ?? 20)
  const [showGoalPicker, setShowGoalPicker] = useState(false)

  const { soundEnabled, vibrateEnabled, setSoundEnabled, setVibrateEnabled, loadSettings } = useSettingsStore()

  useEffect(() => { loadSettings() }, [])

  // BILDIRISHNOMALAR
  const [notifStreak,  setNotifStreak]  = useState(true)
  const [notifCourse,  setNotifCourse]  = useState(true)
  const [notifAchiev,  setNotifAchiev]  = useState(true)
  const [notifWeekly,  setNotifWeekly]  = useState(true)

  useEffect(() => {
    account.getNotifPrefs()
      .then(p => {
        setNotifStreak(p.streak  ?? true)
        setNotifCourse(p.course  ?? true)
        setNotifAchiev(p.achieve ?? true)
        setNotifWeekly(p.weekly  ?? true)
      })
      .catch(() => {})
  }, [])

  // HISOB
  const [showDelete,      setShowDelete]      = useState(false)
  const [showTgLink,      setShowTgLink]      = useState(false)
  const [showTerms,       setShowTerms]       = useState(false)
  const [showEmailLink,   setShowEmailLink]   = useState(false)

  // True if logged in with real Telegram (positive id), false if email/Google (negative synthetic id)
  const isRealTelegram = (user?.telegram_id ?? 0) > 0

  const handleTgLinkSuccess = useCallback(async (token: string) => {
    const oldEmail = user?.email
    try {
      await loginWithToken(token)
      if (oldEmail) {
        await authApi.linkEmail(oldEmail).catch(() => {})
        await refreshUser()
      }
      Alert.alert('Muvaffaqiyat', "Telegram hisobingiz muvaffaqiyatli bog'landi!")
    } catch (e: any) {
      Alert.alert('Xatolik', e.message ?? 'Xatolik yuz berdi')
    }
  }, [user?.email, loginWithToken, refreshUser])

  const handleEmailLinkSuccess = useCallback(async () => {
    await refreshUser()
    Alert.alert('Muvaffaqiyat', "Email hisobingiz bog'landi va ma'lumotlar birlashtirildi!")
  }, [refreshUser])

  const syncNotif = (key: string, val: boolean) => {
    account.saveNotifPrefs({ [key]: val }).catch(() => {})
    if (key === 'streak') {
      const { scheduleStreakReminder, cancelStreakReminder } = require('../../lib/streakNotifications')
      if (val) scheduleStreakReminder().catch(() => {})
      else     cancelStreakReminder().catch(() => {})
    }
  }

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Hisobdan chiqasizmi?',
      '',
      [
        { text: 'Bekor', style: 'cancel' },
        { text: 'Chiqish', style: 'destructive', onPress: logout },
      ],
    )
  }, [logout])

  const handleDeleteAccount = useCallback(async () => {
    await account.deleteAccount()
    logout()
  }, [logout])

  type ThemeChoice = 'dark' | 'light' | 'system'
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>(theme)

  const applyTheme = (choice: ThemeChoice) => {
    setThemeChoice(choice)
    if (choice === 'system') {
      const sys = Appearance.getColorScheme() ?? 'dark'
      setTheme(sys as 'dark' | 'light')
    } else {
      setTheme(choice)
    }
  }

  const THEME_OPTIONS: { key: ThemeChoice; label: string }[] = [
    { key: 'dark',   label: "Qorong'i" },
    { key: 'light',  label: "Yorug'"   },
    { key: 'system', label: 'Tizim'    },
  ]

  const toggleRow = (label: string, value: boolean, onChange: (v: boolean) => void, notifKey?: string, isLast?: boolean) => (
    <SettingRow
      label={label}
      isLast={isLast}
      right={
        <Switch
          value={value}
          onValueChange={v => {
            onChange(v)
            if (notifKey) syncNotif(notifKey, v)
          }}
          trackColor={{ false: '#767577', true: `${c.accentPrimary}55` }}
          thumbColor={value ? c.accentPrimary : '#f4f3f4'}
          ios_backgroundColor="#767577"
        />
      }
    />
  )

  return (
    <SafeAreaView style={[s.root, { backgroundColor: c.bgPrimary }]} edges={['top', 'bottom']}>
      {/* Nav */}
      <View style={[s.navBar, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.navBtn}>
          <ChevronLeft size={24} color={c.accentPrimary} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Sozlamalar
        </Text>
        <View style={s.navBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* PROFIL */}
        <SectionHeader title="PROFIL" />
        <SettingGroup>
          <SettingRow
            label="Profilni tahrirlash"
            onPress={() => router.push('/(screens)/edit-profile' as any)}
          />
          <SettingRow
            label="Telegram"
            value={isRealTelegram ? (user?.username ? `@${user.username}` : "Bog'langan") : undefined}
            onPress={isRealTelegram ? undefined : () => setShowTgLink(true)}
            isLast={!isRealTelegram}
          />
          {isRealTelegram && (
            <SettingRow
              label="Email"
              value={user?.email ?? undefined}
              onPress={user?.email ? undefined : () => setShowEmailLink(true)}
              isLast
            />
          )}
        </SettingGroup>

        {/* O'QISH */}
        <SectionHeader title="O'QISH" />
        <SettingGroup>
          <SettingRow
            label="Kunlik maqsad"
            value={`${dailyGoal} daq`}
            onPress={() => setShowGoalPicker(true)}
          />
          {toggleRow("Taymer tovushi", soundEnabled, setSoundEnabled)}
          {toggleRow("Taymer tebranishi", vibrateEnabled, setVibrateEnabled, undefined, true)}
        </SettingGroup>

        {/* BILDIRISHNOMALAR */}
        <SectionHeader title="BILDIRISHNOMALAR" />
        <SettingGroup>
          {toggleRow("Streak eslatmalari",  notifStreak,  setNotifStreak,  'streak'  )}
          {toggleRow("Kurs eslatmalari",    notifCourse,  setNotifCourse,  'course'  )}
          {toggleRow("Yutuqlar",            notifAchiev,  setNotifAchiev,  'achieve' )}
          {toggleRow("Haftalik hisobot",    notifWeekly,  setNotifWeekly,  'weekly', true)}
        </SettingGroup>

        {/* KO'RINISH */}
        <SectionHeader title="KO'RINISH" />
        <SettingGroup>
          <View style={[s.row, { paddingBottom: 8 }]}>
            <Text style={[s.rowLabel, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>Mavzu</Text>
          </View>
          <View style={[s.themeRow, { paddingHorizontal: spacing.base, paddingBottom: spacing.base }]}>
            {THEME_OPTIONS.map(opt => (
              <Pressable
                key={opt.key}
                onPress={() => applyTheme(opt.key)}
                style={[
                  s.themeOption,
                  {
                    borderColor:     themeChoice === opt.key ? c.accentPrimary : c.border,
                    backgroundColor: themeChoice === opt.key ? c.accentPrimaryMuted : c.bgTertiary,
                  },
                ]}
              >
                <View style={[s.radioCircle, { borderColor: themeChoice === opt.key ? c.accentPrimary : c.border }]}>
                  {themeChoice === opt.key && <View style={[s.radioDot, { backgroundColor: c.accentPrimary }]} />}
                </View>
                <Text style={[
                  s.themeLabel,
                  { fontFamily: themeChoice === opt.key ? typography.fontFamily.semibold : typography.fontFamily.regular },
                  { color: themeChoice === opt.key ? c.accentPrimary : c.textPrimary },
                ]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </SettingGroup>

        {/* YORDAM */}
        <SectionHeader title="YORDAM" />
        <SettingGroup>
          <SettingRow
            label="Foydalanish shartlari"
            isLast
            onPress={() => setShowTerms(true)}
          />
        </SettingGroup>

        {/* HISOB */}
        <SectionHeader title="HISOB" />
        <SettingGroup>
          <SettingRow label="Chiqish" danger onPress={handleLogout} />
          <SettingRow label="Hisobni o'chirish" danger isLast onPress={() => setShowDelete(true)} />
        </SettingGroup>

        {/* Footer */}
        <Text style={[s.footer, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
          v1.0.0 (build 1)
        </Text>
      </ScrollView>

      {/* Goal Picker */}
      <GoalPickerModal
        visible={showGoalPicker}
        current={dailyGoal}
        onClose={() => setShowGoalPicker(false)}
        onSelect={(min) => {
          setDailyGoal(min)
          onboarding.setDailyGoal(min).catch(() => {})
        }}
        c={c}
      />

      {/* Delete Modal */}
      <DeleteAccountModal
        visible={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDeleteAccount}
        c={c}
      />

      <TermsModal visible={showTerms} onClose={() => setShowTerms(false)} />

      {/* Telegram Bot-Code Link Modal (for email users) */}
      <TelegramLinkModal
        visible={showTgLink}
        onClose={() => setShowTgLink(false)}
        onSuccess={handleTgLinkSuccess}
        c={c}
      />

      {/* Email Link Modal (for Telegram users) */}
      <LinkEmailModal
        visible={showEmailLink}
        onClose={() => setShowEmailLink(false)}
        onSuccess={handleEmailLinkSuccess}
        c={c}
      />
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  navBar: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.xs,
    paddingVertical:   spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 15 },

  scroll: { padding: spacing.base, gap: spacing.sm, paddingBottom: 40 },

  sectionHeader: {
    fontSize:      11,
    letterSpacing: 0.8,
    paddingHorizontal: spacing.xs,
    marginTop:     spacing.base,
    marginBottom:  spacing.xs,
  },

  group: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.base,
    gap:               spacing.sm,
    minHeight:         52,
  },
  rowLabel:  { flex: 1, fontSize: 15 },
  rowValue:  { fontSize: 13 },
  chevron:   { fontSize: 22, lineHeight: 26 },

  // Theme
  themeRow:   { flexDirection: 'row', gap: 8 },
  themeOption: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            6,
    paddingVertical:  10,
    borderRadius:   radius.card,
    borderWidth:    1.5,
  },
  themeLabel:  { fontSize: 13 },
  radioCircle: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot:    { width: 8, height: 8, borderRadius: 4 },

  // Goal picker modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    padding:              spacing.xl,
    paddingBottom:        40,
    gap:                  4,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.sm },
  modalTitle:  { fontSize: 17, textAlign: 'center', marginBottom: spacing.sm },
  modalOption: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingVertical:   14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalOptionText: { fontSize: 15 },
  modalCancel: { marginTop: spacing.base, paddingVertical: 14, borderRadius: radius.full, alignItems: 'center' },

  // Delete modal
  alertBox: {
    margin:        spacing.xl,
    borderRadius:  radius.xl,
    padding:       spacing.xl,
    gap:           spacing.sm,
  },
  alertTitle: { fontSize: 17, textAlign: 'center' },
  alertBody:  { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  alertBtns:  { flexDirection: 'row', gap: 12, marginTop: spacing.sm },
  alertBtn:   { flex: 1, paddingVertical: 12, borderRadius: radius.full, alignItems: 'center' },
  deleteInput: {
    borderWidth:       1,
    borderRadius:      radius.input,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    fontSize:          15,
    textAlign:         'center',
    letterSpacing:     2,
  },

  footer: { fontSize: 11, textAlign: 'center', marginTop: spacing.xl },
})

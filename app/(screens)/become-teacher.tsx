import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import {
  ArrowLeft, GraduationCap, ChevronRight, CheckCircle,
  Star, ShieldCheck, BookOpen, BarChart2, BadgeCheck, DollarSign,
} from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { useAuthStore } from '../../stores/authStore'
import { account } from '../../lib/api'
import { typography, spacing, radius } from '../../lib/constants'

// ── Static content ─────────────────────────────────────────────────────────────

const BENEFITS = [
  { icon: BookOpen,    title: "O'z kurslaringizni yarating",  desc: "Video darslar, testlar va materiallar bilan to'liq kurs tuzing" },
  { icon: BadgeCheck,  title: "O'qituvchi badji",             desc: "Profilingizda ko'rinadigan \"Teacher\" badge olasiz" },
  { icon: BarChart2,   title: "Analitika paneli",             desc: "O'quvchilar progressi va daromad statistikasini kuzating" },
  { icon: DollarSign,  title: "Daromad oling",                desc: "Qabul qilinganingizdan so'ng komissiya shartlari bilan tanishasiz" },
]

const REQUIREMENTS = [
  "O'z sohasida bilim va tajribaga ega bo'lish",
  "Sifatli video va o'quv materiallar yarata olish",
  "O'quvchilarga hurmat bilan munosabatda bo'lish",
  "Asl, plagiatdan xoli kontent taqdim etish",
  "O'quvchilarning savollariga o'z vaqtida javob berish",
  "Platformaning ichki qoidalariga rioya qilish",
]

const TERMS = [
  "Yaratgan kurslarim to'liq mening asl ishim bo'ladi",
  "Zararli, yolg'on yoki chalg'ituvchi kontent joylashtirilmaydi",
  "O'quvchilarga sifatli ta'lim va qo'llab-quvvatlash beriladi",
  "Qoidabuzarlik holida akkauntim to'xtatilishi mumkinligini tushunaman",
  "Platforma komissiya shartlari qabul qilinganidan so'ng alohida bildiriladi",
  "Sahifalab platformasining foydalanish shartlari to'liq qabul qilinadi",
]

const EXP_OPTIONS = [
  { label: '0 yil',   value: 0  },
  { label: '1 yil',   value: 1  },
  { label: '2 yil',   value: 2  },
  { label: '3 yil',   value: 3  },
  { label: '5 yil',   value: 5  },
  { label: '7+ yil',  value: 7  },
  { label: '10+ yil', value: 10 },
]

type ScreenState = 'form' | 'submitting' | 'success' | 'pending'

// ── Main screen ────────────────────────────────────────────────────────────────

export default function BecomeTeacherScreen() {
  const { c }    = useTheme()
  const router   = useRouter()
  const insets   = useSafeAreaInsets()
  const authUser = useAuthStore(s => s.user)

  const [screenState,    setScreenState]    = useState<ScreenState>('form')
  const [agreed,         setAgreed]         = useState(false)
  const [specialization, setSpecialization] = useState('')
  const [expYears,       setExpYears]       = useState<number | null>(null)
  const [bio,            setBio]            = useState('')
  const [courseIdea,     setCourseIdea]     = useState('')
  const [motivation,     setMotivation]     = useState('')
  const [contact,        setContact]        = useState('')
  const [errorMsg,       setErrorMsg]       = useState('')

  const isValid =
    agreed &&
    specialization.trim().length > 0 &&
    expYears !== null &&
    bio.trim().length >= 20 &&
    courseIdea.trim().length >= 20 &&
    motivation.trim().length >= 20 &&
    contact.trim().length > 0

  async function handleSubmit() {
    if (!isValid) return
    setScreenState('submitting')
    setErrorMsg('')
    try {
      const res = await account.applyTeacher({
        specialization:   specialization.trim(),
        experience_years: expYears!,
        bio:              bio.trim(),
        course_idea:      courseIdea.trim(),
        motivation:       motivation.trim(),
        contact:          contact.trim(),
      })
      if (res.already_applied) {
        setScreenState(res.status === 'active' ? 'success' : 'pending')
      } else {
        setScreenState('success')
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Xatolik yuz berdi. Qayta urinib ko'ring.")
      setScreenState('form')
    }
  }

  // ── Success states ───────────────────────────────────────────────────────────

  if (screenState === 'success' || screenState === 'pending') {
    return (
      <View style={[s.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
        {/* Back */}
        <Pressable onPress={() => router.back()} hitSlop={12} style={[s.backBtn, { paddingLeft: spacing.base }]}>
          <ArrowLeft size={22} color={c.accentPrimary} />
        </Pressable>

        <View style={[s.successWrap, { flex: 1 }]}>
          <View style={[s.successIcon, { backgroundColor: screenState === 'success' ? '#1a3a1a' : '#3a2a0a' }]}>
            <GraduationCap size={40} color={screenState === 'success' ? '#4ade80' : '#FFB840'} />
          </View>
          <Text style={[s.successTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
            {screenState === 'success' ? 'Ariza yuborildi!' : "Ariza ko'rib chiqilmoqda"}
          </Text>
          <Text style={[s.successSub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {screenState === 'success'
              ? "Arizangiz admin tomonidan ko'rib chiqilmoqda. Tasdiqlangandan so'ng sizga xabar beriladi va o'qituvchi paneli ochiladi."
              : "Siz allaqachon ariza topshirgansiz. Admin ko'rib chiqishini kuting."}
          </Text>

          <View style={[s.stepsCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            {[
              "Admin arizangizni ko'rib chiqadi",
              "Rolingiz \"Teacher\" ga o'zgaradi",
              "Profilingizda o'qituvchi badji paydo bo'ladi",
              "Yangi kirish paytida o'qituvchi paneli ochiladi",
            ].map((step, i) => (
              <View key={i} style={s.stepRow}>
                <Text style={[s.stepNum, { color: c.accentPrimary, fontFamily: typography.fontFamily.extrabold }]}>
                  {i + 1}.
                </Text>
                <Text style={[s.stepText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                  {step}
                </Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => router.push('/(tabs)/' as any)}
            style={[s.primaryBtn, { backgroundColor: c.accentPrimary }]}
          >
            <Text style={[s.primaryBtnText, { fontFamily: typography.fontFamily.bold }]}>
              Bosh sahifaga
            </Text>
          </Pressable>
        </View>
      </View>
    )
  }

  // ── Main form ─────────────────────────────────────────────────────────────────

  return (
    <View style={[s.root, { backgroundColor: c.bgPrimary }]}>

      {/* Fixed top bar */}
      <View style={[s.topBar, { paddingTop: insets.top + 8, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <ArrowLeft size={22} color={c.textPrimary} />
        </Pressable>
        <Text style={[s.topTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          O'qituvchi bo'lish
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={['rgba(232,121,47,0.18)', 'rgba(196,74,26,0.08)', 'rgba(139,42,16,0.04)']}
          style={[s.hero, { borderColor: 'rgba(232,121,47,0.22)' }]}
        >
          <View style={s.heroIconWrap}>
            <LinearGradient colors={['#e8792f', '#c44a1a']} style={s.heroIcon}>
              <GraduationCap size={28} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={[s.heroTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
            Sahifalab'da o'qituvchi bo'ling
          </Text>
          <Text style={[s.heroSub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Bilimingizni ulashing, daromad oling,{'\n'}
            ming lab o'quvchilarga ta'sir qiling.
            {authUser?.first_name ? (
              <Text style={{ color: c.textPrimary, fontFamily: typography.fontFamily.semibold }}>
                {'\n'}Assalomu alaykum, {authUser.first_name}!
              </Text>
            ) : null}
          </Text>
        </LinearGradient>

        {/* ── Benefits grid ─────────────────────────────────────────────── */}
        <View style={s.benefitsGrid}>
          {BENEFITS.map(b => (
            <View key={b.title} style={[s.benefitCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
              <b.icon size={18} color={c.accentPrimary} />
              <Text style={[s.benefitTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                {b.title}
              </Text>
              <Text style={[s.benefitDesc, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                {b.desc}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Requirements ──────────────────────────────────────────────── */}
        <View style={[s.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <View style={s.cardTitleRow}>
            <Star size={16} color={c.accentPrimary} />
            <Text style={[s.cardTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              O'qituvchilarga qo'yiladigan talablar
            </Text>
          </View>
          {REQUIREMENTS.map((req, i) => (
            <View key={i} style={s.reqRow}>
              <CheckCircle size={14} color="#4ade80" />
              <Text style={[s.reqText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                {req}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Terms + Agree ─────────────────────────────────────────────── */}
        <View style={[s.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <View style={s.cardTitleRow}>
            <ShieldCheck size={16} color="#60a5fa" />
            <Text style={[s.cardTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              Foydalanish shartlari
            </Text>
          </View>
          {TERMS.map((term, i) => (
            <View key={i} style={s.reqRow}>
              <ShieldCheck size={13} color="#60a5fa" />
              <Text style={[s.reqText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                {term}
              </Text>
            </View>
          ))}

          {/* Agree toggle */}
          <Pressable
            onPress={() => setAgreed(v => !v)}
            style={[
              s.agreeRow,
              {
                borderColor:     agreed ? c.accentPrimary : c.border,
                backgroundColor: agreed ? 'rgba(232,121,47,0.08)' : 'transparent',
              },
            ]}
          >
            <View style={[
              s.checkbox,
              {
                borderColor:     agreed ? c.accentPrimary : c.border,
                backgroundColor: agreed ? c.accentPrimary : 'transparent',
              },
            ]}>
              {agreed && <CheckCircle size={14} color="#fff" />}
            </View>
            <Text style={[s.agreeText, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
              Yuqoridagi talablar va shartlarni o'qidim, qabul qilaman
            </Text>
          </Pressable>
        </View>

        {/* ── Application form ───────────────────────────────────────────── */}
        <View style={[s.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <Text style={[s.cardTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            Ariza topshirish
          </Text>

          {/* Specialization */}
          <FormField label="Mutaxassislik *" hint="Masalan: Frontend dasturlash, Matematika, Ingliz tili...">
            <TextInput
              value={specialization}
              onChangeText={setSpecialization}
              placeholder="Siz nima o'qitasiz?"
              placeholderTextColor={c.textDisabled}
              maxLength={120}
              returnKeyType="next"
              style={[s.input, { color: c.textPrimary, backgroundColor: c.bgTertiary, borderColor: c.border, fontFamily: typography.fontFamily.regular }]}
            />
          </FormField>

          {/* Experience chips */}
          <FormField label="Tajriba (yillar) *">
            <View style={s.chipRow}>
              {EXP_OPTIONS.map(opt => {
                const active = expYears === opt.value
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setExpYears(opt.value)}
                    style={[
                      s.expChip,
                      {
                        backgroundColor: active ? c.accentPrimary : c.bgTertiary,
                        borderColor:     active ? c.accentPrimary : c.border,
                      },
                    ]}
                  >
                    <Text style={[s.expChipText, {
                      color:      active ? '#fff' : c.textSecondary,
                      fontFamily: active ? typography.fontFamily.semibold : typography.fontFamily.regular,
                    }]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </FormField>

          {/* Bio */}
          <FormField label="O'zingiz haqingizda *" hint="Kamida 20 ta belgi.">
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Men ... bo'lib, ... yildan beri ... bilan shug'ullanaman..."
              placeholderTextColor={c.textDisabled}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
              style={[s.input, s.textarea, { color: c.textPrimary, backgroundColor: c.bgTertiary, borderColor: c.border, fontFamily: typography.fontFamily.regular }]}
            />
            <Text style={[s.charCount, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
              {bio.length}/500
            </Text>
          </FormField>

          {/* Course idea */}
          <FormField label="Qanday kurs yaratmoqchisiz? *" hint="Kursning mavzusi, kimlar uchun mo'ljallangan, qanday natija beradi?">
            <TextInput
              value={courseIdea}
              onChangeText={setCourseIdea}
              placeholder="Men ... kursini yaratmoqchiman. Bu kurs ... uchun bo'lib, ..."
              placeholderTextColor={c.textDisabled}
              multiline
              numberOfLines={5}
              maxLength={1000}
              textAlignVertical="top"
              style={[s.input, s.textarea, { color: c.textPrimary, backgroundColor: c.bgTertiary, borderColor: c.border, fontFamily: typography.fontFamily.regular }]}
            />
            <Text style={[s.charCount, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
              {courseIdea.length}/1000
            </Text>
          </FormField>

          {/* Motivation */}
          <FormField label="Nima uchun o'qituvchi bo'lmoqchisiz? *" hint="Motivatsiyangiz va maqsadingizni yozing (kamida 20 ta belgi).">
            <TextInput
              value={motivation}
              onChangeText={setMotivation}
              placeholder="Men o'qituvchi bo'lmoqchiman, chunki..."
              placeholderTextColor={c.textDisabled}
              multiline
              numberOfLines={5}
              maxLength={1000}
              textAlignVertical="top"
              style={[s.input, s.textarea, { color: c.textPrimary, backgroundColor: c.bgTertiary, borderColor: c.border, fontFamily: typography.fontFamily.regular }]}
            />
            <Text style={[s.charCount, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
              {motivation.length}/1000
            </Text>
          </FormField>

          {/* Contact */}
          <FormField label="Aloqa (email yoki telefon) *" hint="Admin siz bilan bog'lanishi uchun email yoki telefon raqamingizni kiriting.">
            <TextInput
              value={contact}
              onChangeText={setContact}
              placeholder="email@example.com yoki +998 90 123 45 67"
              placeholderTextColor={c.textDisabled}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[s.input, { color: c.textPrimary, backgroundColor: c.bgTertiary, borderColor: c.border, fontFamily: typography.fontFamily.regular }]}
            />
          </FormField>

          {/* Error */}
          {!!errorMsg && (
            <View style={[s.errorBox, { backgroundColor: 'rgba(255,59,48,0.1)', borderColor: 'rgba(255,59,48,0.3)' }]}>
              <Text style={[s.errorText, { color: '#ff453a', fontFamily: typography.fontFamily.regular }]}>
                ⚠️ {errorMsg}
              </Text>
            </View>
          )}

          {!agreed && (
            <Text style={[s.agreeHint, { color: '#FFB840', fontFamily: typography.fontFamily.regular }]}>
              Yuborish uchun yuqoridagi shartlarni qabul qiling
            </Text>
          )}

          <Text style={[s.reviewNote, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
            Arizalar 1–3 kun ichida ko'rib chiqiladi.
          </Text>

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={!isValid || screenState === 'submitting'}
            style={({ pressed }) => [
              s.submitBtn,
              {
                backgroundColor: isValid ? c.accentPrimary : c.bgTertiary,
                opacity:         pressed ? 0.88 : 1,
              },
            ]}
          >
            {screenState === 'submitting' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <GraduationCap size={18} color={isValid ? '#fff' : c.textDisabled} />
                <Text style={[s.submitBtnText, {
                  color:      isValid ? '#fff' : c.textDisabled,
                  fontFamily: typography.fontFamily.bold,
                }]}>
                  Ariza yuborish
                </Text>
              </>
            )}
          </Pressable>
        </View>

      </ScrollView>
    </View>
  )
}

// ── Field wrapper ──────────────────────────────────────────────────────────────

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const { c } = useTheme()
  return (
    <View style={s.field}>
      <Text style={[s.fieldLabel, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
        {label}
      </Text>
      {children}
      {hint && (
        <Text style={[s.fieldHint, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
          {hint}
        </Text>
      )}
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom:     spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  topTitle: { fontSize: 17 },

  scroll: {
    paddingHorizontal: spacing.screenMargin,
    paddingTop:        spacing.base,
    gap:               12,
  },

  // Hero
  hero: {
    borderRadius:  20,
    borderWidth:   1,
    padding:       22,
    alignItems:    'center',
    gap:           10,
    overflow:      'hidden',
  },
  heroIconWrap: { marginBottom: 4 },
  heroIcon: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 22, textAlign: 'center' },
  heroSub:   { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  // Card
  card: {
    borderRadius:  16,
    borderWidth:   1,
    padding:       16,
    gap:           12,
  },
  cardTitle:    { fontSize: 14 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },

  // Benefits
  benefitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  benefitCard:  {
    width:        '48.5%',
    borderRadius: 14,
    borderWidth:  1,
    padding:      12,
    gap:          5,
  },
  benefitTitle: { fontSize: 12, lineHeight: 16 },
  benefitDesc:  { fontSize: 11, lineHeight: 15 },

  // Requirements / terms rows
  reqRow:  { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  reqText: { flex: 1, fontSize: 12, lineHeight: 17 },

  // Agree
  agreeRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            12,
    padding:        14,
    borderRadius:   12,
    borderWidth:    2,
    marginTop:      4,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  agreeText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // Form
  field:      { gap: 6 },
  fieldLabel: { fontSize: 13 },
  fieldHint:  { fontSize: 11, lineHeight: 15 },
  input: {
    borderRadius:      10,
    borderWidth:       1,
    paddingHorizontal: 12,
    paddingVertical:   10,
    fontSize:          14,
  },
  textarea:   { minHeight: 90, paddingTop: 10 },
  charCount:  { fontSize: 10, textAlign: 'right' },

  chipRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  expChip: {
    paddingHorizontal: 12,
    paddingVertical:   7,
    borderRadius:      20,
    borderWidth:       1,
  },
  expChipText: { fontSize: 13 },

  // Error
  errorBox:  { borderRadius: 10, borderWidth: 1, padding: 12 },
  errorText: { fontSize: 13 },
  agreeHint: { fontSize: 12, textAlign: 'center' },
  reviewNote: { fontSize: 11, textAlign: 'center' },

  // Submit
  submitBtn: {
    height:         52,
    borderRadius:   14,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
    marginTop:      4,
  },
  submitBtnText: { fontSize: 16 },

  // Success
  successWrap: {
    padding:        spacing.xl,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            16,
  },
  successIcon: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  successTitle: { fontSize: 22, textAlign: 'center' },
  successSub:   { fontSize: 14, textAlign: 'center', lineHeight: 21, maxWidth: 320 },
  stepsCard: {
    width: '100%', borderRadius: 14, borderWidth: 1,
    padding: 14, gap: 8,
  },
  stepRow:  { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  stepNum:  { fontSize: 14, minWidth: 20 },
  stepText: { flex: 1, fontSize: 13, lineHeight: 18 },

  primaryBtn: {
    width: '100%', height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16 },
})

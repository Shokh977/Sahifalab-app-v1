import React, { useState } from 'react'
import {
  Modal, View, Text, ScrollView, Pressable, StyleSheet,
  LayoutAnimation, Platform, UIManager, Linking, SafeAreaView,
} from 'react-native'
import {
  X, ChevronDown,
  Info, User, BookOpen, ShieldCheck, Trophy,
  FileText, Lock, Shield, AlertTriangle, RefreshCw, Mail,
} from 'lucide-react-native'

const SECTION_ICONS: Record<string, React.ComponentType<{ size: number; color: string; strokeWidth: number }>> = {
  '1':  Info,
  '2':  User,
  '3':  BookOpen,
  '4':  ShieldCheck,
  '5':  Trophy,
  '6':  FileText,
  '7':  Lock,
  '8':  Shield,
  '9':  AlertTriangle,
  '10': RefreshCw,
  '11': Mail,
}
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const EFFECTIVE_DATE = '09-aprel, 2026'

const SECTIONS = [
  {
    id: '1', emoji: '📌', title: 'Umumiy qoidalar',
    body: [
      "Ushbu Foydalanish shartlari SAHIFALAB platformasi va uning barcha xizmatlari — veb-sayt, Telegram Mini-ilova, mobil versiya — orqali taqdim etiladigan mazmun va funksiyalardan foydalanishni tartibga soladi.",
      "Platforma orqali ro'yxatdan o'tish yoki xizmatlardan foydalanib, siz ushbu Shartlarni to'liq o'qib chiqqaningizni va ularga roziligingizni tasdiqlab hisoblaysiz.",
      "Platforma O'zbekiston Respublikasi qonunchiligiga muvofiq ishlaydi.",
    ],
    bullets: [],
  },
  {
    id: '2', emoji: '👤', title: "Ro'yxatdan o'tish va hisob",
    body: ["SAHIFALAB platformasidan foydalanish uchun siz kamida 13 yoshda bo'lishingiz lozim. Hisob yaratar ekansiz, siz:"],
    bullets: [
      "Haqiqiy va to'g'ri ma'lumotlarni kiritishga majbursiz.",
      "Hisobingiz xavfsizligini ta'minlashga javobgarsiz.",
      "Bir foydalanuvchi uchun faqat bitta hisob yaratish ruxsat etiladi.",
    ],
    body2: ["Qoidalarni buzish hisobingizni to'xtatib qo'yish yoki o'chirishga sabab bo'lishi mumkin."],
  },
  {
    id: '3', emoji: '📚', title: 'Platformaning maqsadi va xizmatlar',
    body: ["SAHIFALAB quyidagi xizmatlarni taqdim etadi:"],
    bullets: [
      "Kurslar — video darslar, testlar va sertifikatlar.",
      "Ish joyi (Workspace) — Kanban reja, fokus taymer, qaydlar.",
      "Kitoblar — raqamli kitob do'koni va AI xulosa.",
      "Testlar (Quiz) — o'z-o'zini tekshirish vositalari.",
      "Ijtimoiy lenta — o'quvchilar va o'qituvchilar muloqoti.",
      "SAHIFALAB AI — sun'iy intellekt yordami.",
      "Birga o'qish (Fokus) — jamoa motivatsiyasi.",
    ],
    body2: ["Ba'zi xizmatlar to'lov talab qilishi mumkin."],
  },
  {
    id: '4', emoji: '✅', title: 'Foydalanuvchi majburiyatlari',
    body: ["Platforma orqali siz quyidagilarga rozilik bildirasiz:"],
    bullets: [
      "Faqat qonuniy maqsadlar uchun foydalanish.",
      "Boshqa foydalanuvchilarni haqorat qilmaslik.",
      "Yolg'on yoki aldamchi ma'lumot tarqatmaslik.",
      "Mualliflik huquqi bilan himoyalangan materiallarni ruxsatsiz tarqatmaslik.",
      "Platformaning texnik tizimlariga ruxsatsiz kirmaslik.",
      "XP yoki reyting tizimini sun'iy manipulyatsiya qilmaslik.",
    ],
    body2: [],
  },
  {
    id: '5', emoji: '🏆', title: 'XP, Gamifikatsiya va Mukofotlar',
    body: ["SAHIFALAB XP, darajalar, liderlar taxtasi va sertifikatlar tizimini qo'llaydi."],
    bullets: [
      "XP ni real pulga almashtirish mumkin emas.",
      "Sertifikatlar faqat kurs talablarini bajargach beriladi.",
      "Soxta usul bilan XP to'plash aniqlangan taqdirda hisob bloklanadi.",
    ],
    body2: [],
  },
  {
    id: '6', emoji: '📝', title: 'Foydalanuvchi tomonidan joylashtirilgan kontent',
    body: ["Kontent joylashtirganda:"],
    bullets: [
      "Kontentning qonuniyligini o'zingiz kafolatlaysiz.",
      "SAHIFALABga kontentni ko'rsatish uchun royaltisiz litsenziya berasiz.",
      "Pornografik, zo'ravonlik, nafrat yoki terrorizmga chaqiruvchi kontent qat'iyan taqiqlanadi.",
    ],
    body2: [],
  },
  {
    id: '7', emoji: '🔒', title: "Maxfiylik va ma'lumotlar",
    body: ["SAHIFALAB quyidagi maqsadlar uchun ma'lumot to'playdi:"],
    bullets: [
      "Hisob yaratish va autentifikatsiya.",
      "O'quv progressini saqlash.",
      "Statistik tahlil (anonim).",
      "Bildirishnomalar yuborish.",
    ],
    body2: [
      "Biz ma'lumotlaringizni uchinchi shaxslarga sotmaymiz. Hisobingizni o'chirish uchun @Sahifalab_hub_bot orqali murojaat qiling.",
    ],
  },
  {
    id: '8', emoji: '©️', title: 'Intellektual mulk',
    body: ["Platformadagi barcha kontent SAHIFALAB yoki uning litsenziya beruvchilariga tegishli va mualliflik huquqi bilan himoyalangan."],
    bullets: [
      "Ruxsat etiladi: Shaxsiy o'qish va sertifikatni LinkedIn'da ko'rsatish.",
      "Taqiqlanadi: Kurs materiallarini yozma ruxsatsiz nusxalash, tarqatish yoki sotish.",
    ],
    body2: [],
  },
  {
    id: '9', emoji: '⚠️', title: 'Javobgarlik chegaralari',
    body: ["SAHIFALAB quyidagi holatlar uchun javobgar emas:"],
    bullets: [
      "Texnik nosozliklar yoki server uzilishlari natijasida yuzaga kelgan yo'qotishlar.",
      "Foydalanuvchilar tomonidan joylashtirilgan kontentning to'g'riligi.",
      "Internet yoki qurilma muammolari.",
    ],
    body2: [],
  },
  {
    id: '10', emoji: '🔄', title: "Shartlarning o'zgarishi",
    body: ["SAHIFALAB ushbu Shartlarni istalgan vaqtda o'zgartirish huquqini o'zida saqlaydi. Muhim o'zgarishlar Telegram bot orqali xabar qilinadi. Platformadan davom etib foydalanish yangi Shartlarga rozilikni bildiradi."],
    bullets: [],
    body2: [],
  },
  {
    id: '11', emoji: '📬', title: "Bog'lanish",
    body: ["Savollar uchun bizga email yuboring. Murojaatlaringizga 1–3 ish kuni ichida javob beramiz."],
    bullets: [],
    body2: ["sahifalab@gmail.com"],
  },
]

function Section({ s, c }: { s: typeof SECTIONS[0]; c: any }) {
  const [open, setOpen] = useState(false)

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpen(v => !v)
  }

  const Icon = SECTION_ICONS[s.id] ?? Info

  return (
    <View style={[st.card, { backgroundColor: c.bgTertiary, borderColor: c.border }]}>
      <Pressable onPress={toggle} style={st.cardHead}>
        <View style={[st.iconWrap, { backgroundColor: c.bgElevated }]}>
          <Icon size={15} color={c.textSecondary} strokeWidth={1.75} />
        </View>
        <Text style={[st.cardTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold, flex: 1 }]}>
          {s.id}. {s.title}
        </Text>
        <ChevronDown
          size={15}
          color={c.textMuted}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {open && (
        <View style={[st.cardBody, { borderTopColor: c.border }]}>
          {s.body.map((p, i) => (
            <Text key={i} style={[st.para, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>{p}</Text>
          ))}
          {s.bullets.map((b, i) => (
            <View key={i} style={st.bulletRow}>
              <Text style={[st.dot, { color: c.brand }]}>•</Text>
              <Text style={[st.para, { color: c.textSecondary, fontFamily: typography.fontFamily.regular, flex: 1 }]}>{b}</Text>
            </View>
          ))}
          {(s as any).body2?.map((p: string, i: number) => (
            <Text key={`b2-${i}`} style={[st.para, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>{p}</Text>
          ))}
        </View>
      )}
    </View>
  )
}

interface Props {
  visible:  boolean
  onClose:  () => void
}

export function TermsModal({ visible, onClose }: Props) {
  const { c } = useTheme()

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[st.root, { backgroundColor: c.bgPrimary }]}>
        {/* Header */}
        <View style={[st.header, { borderBottomColor: c.border }]}>
          <Text style={[st.headerTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            Foydalanish shartlari
          </Text>
          <Pressable onPress={onClose} hitSlop={12} style={[st.closeBtn, { backgroundColor: c.bgTertiary }]}>
            <X size={18} color={c.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={st.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Date + summary */}
          <Text style={[st.date, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            Kuchga kirgan sana:{' '}
            <Text style={{ fontFamily: typography.fontFamily.semibold }}>{EFFECTIVE_DATE}</Text>
          </Text>

          <View style={[st.summary, { backgroundColor: c.brandSubtle, borderColor: c.accentPrimaryGlow }]}>
            <Text style={[st.summaryText, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}>
              <Text style={{ fontFamily: typography.fontFamily.bold, color: c.brand }}>Qisqacha: </Text>
              SAHIFALAB — o'zbek tilida ta'lim beruvchi platforma. Biz foydalanuvchilarimizning huquqlarini hurmat qilamiz va ulardan ham bir xil munosabatni kutamiz. Savollar uchun{' '}
              <Text style={{ color: c.brand }} onPress={() => Linking.openURL('mailto:sahifalab@gmail.com')}>
                sahifalab@gmail.com
              </Text>
            </Text>
          </View>

          {/* Sections */}
          {SECTIONS.map(s => <Section key={s.id} s={s} c={c} />)}

          {/* Footer */}
          <Text style={[st.footer, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            © 2026 SAHIFALAB. Barcha huquqlar himoyalangan.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

const st = StyleSheet.create({
  root:  { flex: 1 },
  header: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: typography.size.base },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.sm,
    paddingBottom:     spacing['2xl'],
    gap:               spacing.sm,
  },
  date: { fontSize: typography.size.xs, textAlign: 'center' },
  summary: {
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.base,
  },
  summaryText: { fontSize: typography.size.sm, lineHeight: 20 },
  card: {
    borderRadius: radius.lg,
    borderWidth:  StyleSheet.hairlineWidth,
    overflow:     'hidden',
  },
  cardHead: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: { fontSize: typography.size.sm, lineHeight: 18 },
  cardBody: {
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.xs,
  },
  para:      { fontSize: typography.size.xs, lineHeight: 18 },
  bulletRow: { flexDirection: 'row', gap: spacing.xs, paddingLeft: spacing.xs },
  dot:       { fontSize: typography.size.xs, lineHeight: 18, width: 10 },
  footer:    { fontSize: typography.size.xs, textAlign: 'center', marginTop: spacing.sm },
})

import React, { useState } from 'react'
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  LayoutAnimation, Platform, UIManager, Linking,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  ChevronLeft, ChevronDown,
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

interface Section {
  id:      string
  emoji:   string
  title:   string
  content: string[]           // paragraphs
  bullets?: string[]          // bullet list items
  subBullets?: Record<number, string[]>  // index → sub-bullets
}

const SECTIONS: Section[] = [
  {
    id: '1', emoji: '📌', title: 'Umumiy qoidalar',
    content: [
      "Ushbu Foydalanish shartlari («Shartlar») SAHIFALAB platformasi va uning barcha xizmatlari — veb-sayt, Telegram Mini-ilova, mobil versiya — orqali taqdim etiladigan mazmun va funksiyalardan foydalanishni tartibga soladi.",
      "Platforma orqali ro'yxatdan o'tish, tizimga kirish yoki xizmatlardan foydalanib, siz ushbu Shartlarni to'liq o'qib chiqqaningizni va ularga roziligingizni tasdiqlab hisoblaysiz. Agar siz Shartlarga rozi bo'lmasangiz, platformadan foydalanishingizni darhol to'xtatishingizni so'raymiz.",
      "Platforma O'zbekiston Respublikasi qonunchiligiga muvofiq ishlaydi. Barcha nizolar O'zbekiston Respublikasining amaldagi qonunlari asosida ko'rib chiqiladi.",
    ],
  },
  {
    id: '2', emoji: '👤', title: "Ro'yxatdan o'tish va hisob",
    content: [
      "SAHIFALAB platformasidan foydalanish uchun siz kamida 13 yoshda bo'lishingiz lozim. 13 yoshdan 18 yoshgacha bo'lgan foydalanuvchilar ota-onasining yoki qonuniy vasiyining ruxsati bilan ro'yxatdan o'tishi kerak.",
      "Hisob yaratar ekansiz, siz:",
    ],
    bullets: [
      "Haqiqiy va to'g'ri ma'lumotlarni kiritishga majbursiz.",
      "Hisobingiz xavfsizligini ta'minlashga javobgarsiz.",
      "Hisobingizdan uchinchi shaxslar tomonidan amalga oshirilgan barcha harakatlar uchun mas'uliyat o'z zimmangizga olasiz.",
      "Bir foydalanuvchi uchun faqat bitta hisob yaratish ruxsat etiladi.",
    ],
    content2: [
      "Buzilish, zararli faoliyat yoki Shartlarga rioya etilmasligi aniqlanganda SAHIFALAB har qanday hisobni ogohlantirishsiz bloklash yoki o'chirish huquqini o'zida saqlaydi.",
    ] as any,
  },
  {
    id: '3', emoji: '📚', title: 'Platformaning maqsadi va xizmatlar',
    content: ["SAHIFALAB quyidagi xizmatlarni taqdim etadi:"],
    bullets: [
      "Kurslar — video darslar, testlar va sertifikatlar.",
      "Ish joyi (Workspace) — Kanban reja, fokus taymer, qaydlar.",
      "Kitoblar — raqamli kitob do'koni va umumiy xulosa (AI).",
      "Testlar (Quiz) — o'z-o'zini tekshirish vositalari.",
      "Ijtimoiy lenta — o'quvchilar va o'qituvchilar orasidagi muloqot.",
      "SAHIFALAB AI — sun'iy intellekt yordamida o'qish ko'magi.",
      "Birga o'qish (Fokus) — jamoa bo'lib o'qish va motivatsiya.",
    ],
    content2: [
      "Ba'zi xizmatlar (masalan, premium kurslar yoki kitoblar) to'lov talab qilishi mumkin. To'lov amalga oshirilgandan so'ng, qaytarib berish siyosati alohida ko'rib chiqiladi va har bir holat uchun individual hal qilinadi.",
    ] as any,
  },
  {
    id: '4', emoji: '✅', title: 'Foydalanuvchi majburiyatlari',
    content: ["Platforma orqali siz quyidagilarga rozilik bildirasiz:"],
    bullets: [
      "Faqat qonuniy maqsadlar uchun foydalanish.",
      "Boshqa foydalanuvchilar, o'qituvchilar yoki jamoa a'zolarini haqorat qilmaslik.",
      "Yolg'on, chalg'ituvchi yoki aldamchi ma'lumot tarqatmaslik.",
      "Mualliflik huquqi bilan himoyalangan materiallarni ruxsatsiz nusxalash yoki tarqatmaslik.",
      "Platformaning texnik tizimlariga ruxsatsiz kirish yoki ularni buzmaslik (hacking, scraping).",
      "Boshqa foydalanuvchilarning shaxsiy ma'lumotlarini to'plamaslik yoki oshkor etmaslik.",
      "Spam, reklama yoki keraksiz reklama xabarlarini yubormaslik.",
      "XP, ball yoki reyting tizimini sun'iy manipulyatsiya qilmaslik.",
    ],
    content2: [
      "Ushbu qoidalarni buzish hisobingizni to'xtatib qo'yish yoki o'chirishga, hamda zarur bo'lsa huquqiy javobgarlikka sabab bo'lishi mumkin.",
    ] as any,
  },
  {
    id: '5', emoji: '🏆', title: 'XP, Gamifikatsiya va Mukofotlar',
    content: [
      "SAHIFALAB o'qishni qiziqarli qilish uchun tajriba ballari (XP), darajalar, liderlar taxtasi va sertifikatlar tizimini qo'llaydi.",
    ],
    bullets: [
      "XP va darajalar faqat platformadagi faoliyat asosida avtomatik hisoblanadi.",
      "XP ni real pul, tovar yoki boshqa moddiy boyliklarga almashtirish mumkin emas — bu faqat o'quv progress ko'rsatkichidir.",
      "Sertifikatlar kurs talablarini to'liq bajargach beriladi va faqat SAHIFALAB kursini tugatganlikni tasdiqlaydi.",
      "SAHIFALAB XP yig'ish formulalarini, bonus tizimini yoki darajalar chegarasini oldindan ogohlantirmasdan o'zgartirish huquqini o'zida saqlaydi.",
      "Soxta yoki avtomatlashtirilgan usul bilan XP to'plash aniqlangan taqdirda hisob bloklanadi.",
    ],
    content2: [
      "Reyting taxtasidagi o'rin faqat ma'lumot sifatida beriladi va hech qanday qonuniy da'vo yoki imtiyoz kafolatlamaydi.",
    ] as any,
  },
  {
    id: '6', emoji: '📝', title: "Foydalanuvchi tomonidan joylashtirilgan kontent",
    content: [
      "Siz ijtimoiy lentaga, izohlar bo'limiga, messenjerdagi xabarlarga yoki boshqa joyga kontent (matn, rasm, fayl) joylashtirganda:",
    ],
    bullets: [
      "Ushbu kontentning muallifligi va qonuniyligini o'zingiz kafolatlaysiz.",
      "SAHIFALABga ushbu kontentni platformada ko'rsatish, targ'ib qilish va texnik maqsadlarda foydalanish uchun royaltisiz litsenziya berasiz.",
      "Quyidagi kontent qat'iyan taqiqlangan: pornografik, zo'ravonlik yoki nafrat uyg'otuvchi materiallar; boshqa shaxslarning shaxsiy ma'lumotlarini tarqatish; terrorchilik yoki ekstremizmga chaqirish; mualliflik huquqi buzilgan kontent.",
    ],
    content2: [
      "SAHIFALAB moderatsiya huquqiga ega bo'lib, qoidabuzar kontentni ogohlantirmasdan o'chirishi yoki yashirishi mumkin.",
    ] as any,
  },
  {
    id: '7', emoji: '🔒', title: "Maxfiylik va ma'lumotlar",
    content: [
      "SAHIFALAB foydalanuvchilarning shaxsiy ma'lumotlarini quyidagi maqsadlar uchun to'playdi:",
    ],
    bullets: [
      "Hisob yaratish va autentifikatsiya.",
      "O'quv progressini saqlash (XP, kurs holati, focus vaqti).",
      "Platformani yaxshilash uchun statistik tahlil (anonim).",
      "Muhim yangiliklar va bildirishnomalarni yuborish.",
    ],
    content2: [
      "Biz foydalanuvchilarning shaxsiy ma'lumotlarini uchinchi shaxslarga sotmaymiz. Ma'lumotlar faqat platformaning ishlashi uchun zarur bo'lgan xizmat provayderlariga (masalan, Supabase, Bunny CDN) uzatilishi mumkin.",
      "Telegram Mini-ilovasi orqali kirganda Telegram foydalanuvchi nomi, ID raqami va profil rasmiga ruxsatimiz bo'ladi — bu Telegram platforma shartlari asosida amalga oshiriladi.",
      "Hisobingizni o'chirish uchun @Sahifalab_hub_bot orqali yoki qo'llab-quvvatlash guruhi orqali murojaat qiling. Ma'lumotlar o'chirilgandan so'ng qayta tiklab bo'lmaydi.",
    ] as any,
  },
  {
    id: '8', emoji: '©️', title: 'Intellektual mulk',
    content: [
      "Platformadagi barcha kontent — darslar, testlar, dizayn elementlari, logotiplar, dasturiy ta'minot kodi va boshqalar — SAHIFALAB yoki uning litsenziya beruvchilariga tegishli bo'lib, O'zbekiston va xalqaro mualliflik huquqi qonunlari bilan himoyalangan.",
    ],
    bullets: [
      "Ruxsat etiladi: Shaxsiy o'qish maqsadida kurs materiallarini ko'rib chiqish; platformadan olingan sertifikatlarni shaxsiy portfolio yoki LinkedIn sahifasida ko'rsatish.",
      "Taqiqlanadi: Kurs videolari, matnlari yoki materiallarini oldindan yozma ruxsat olmay nusxalash, tarqatish, sotish yoki tijorat maqsadlarida foydalanish.",
    ],
    content2: [
      "Mualliflik huquqingiz buzilgani haqida xabar berish uchun @Sahifalab_hub_bot ga murojaat qiling.",
    ] as any,
  },
  {
    id: '9', emoji: '⚠️', title: 'Javobgarlik chegaralari',
    content: ["SAHIFALAB quyidagi holatlar uchun javobgar emas:"],
    bullets: [
      "Texnik nosozliklar, server uzilishlari yoki uchinchi tomon xizmatlarining ishdan chiqishi natijasida yuzaga kelgan yo'qotishlar.",
      "Foydalanuvchilar tomonidan joylashtirilgan kontentning to'g'riligi yoki qonuniyligiga kafolat berilmaydi.",
      "Internet ulanishi yoki qurilma muammolari tufayli platformadan foydalana olmaslik.",
      "XP yoki progress ma'lumotlarining texnik xato tufayli yo'qolishi (bunday holatlarda qayta tiklash imkoniyati cheklangan bo'lishi mumkin).",
    ],
    content2: [
      "Platforma «mavjud holda» taqdim etiladi. Biz ma'lum bir maqsad uchun yaroqlilik yoki uzluksiz ishlashni kafolatlamaymiz.",
    ] as any,
  },
  {
    id: '10', emoji: '🔄', title: "Shartlarning o'zgarishi",
    content: [
      "SAHIFALAB ushbu Shartlarni istalgan vaqtda o'zgartirish huquqini o'zida saqlaydi. Muhim o'zgarishlar amalga oshirilganda:",
    ],
    bullets: [
      "Yangilanish sanasi sahifa yuqorisida ko'rsatiladi.",
      "Muhim o'zgarishlar haqida Telegram bot orqali bildirishnoma yuborilishi mumkin.",
      "O'zgarishlardan so'ng platformadan davom etib foydalanish yangi Shartlarga rozilikni bildiradi.",
    ],
    content2: [
      "Shartlarning oxirgi versiyasi doimo ushbu sahifada mavjud bo'ladi. Sizni muntazam ravishda ushbu sahifani ko'rib chiqishga taklif etamiz.",
    ] as any,
  },
  {
    id: '11', emoji: '📬', title: "Bog'lanish",
    content: [
      "Ushbu Shartlarga oid savollar, shikoyatlar yoki takliflar uchun bizga email yuboring:",
      "sahifalab@gmail.com",
      "Murojaatlaringizga 1–3 ish kuni ichida javob berishga harakat qilamiz.",
    ],
  },
]

function SectionCard({ s, c }: { s: typeof SECTIONS[0]; c: any }) {
  const [open, setOpen] = useState(false)

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpen(v => !v)
  }

  const content2 = (s as any).content2 as string[] | undefined
  const Icon = SECTION_ICONS[s.id] ?? Info

  return (
    <View style={[styles.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
      <Pressable onPress={toggle} style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: c.bgTertiary }]}>
          <Icon size={15} color={c.textSecondary} strokeWidth={1.75} />
        </View>
        <Text style={[styles.cardTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold, flex: 1 }]}>
          {s.id}. {s.title}
        </Text>
        <ChevronDown
          size={16}
          color={c.textMuted}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {open && (
        <View style={[styles.cardBody, { borderTopColor: c.border }]}>
          {s.content.map((p, i) => (
            <Text key={i} style={[styles.bodyText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              {p}
            </Text>
          ))}

          {s.bullets?.map((b, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: c.brand }]}>•</Text>
              <Text style={[styles.bulletText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>{b}</Text>
            </View>
          ))}

          {content2?.map((p: string, i: number) => (
            <Text key={`c2-${i}`} style={[styles.bodyText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              {p}
            </Text>
          ))}
        </View>
      )}
    </View>
  )
}

export default function TermsScreen() {
  const { c }  = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <View style={[styles.root, { backgroundColor: c.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: c.border, backgroundColor: c.bgPrimary }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: c.bgSecondary }]} hitSlop={8}>
          <ChevronLeft size={20} color={c.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          Foydalanish shartlari
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Meta */}
        <Text style={[styles.date, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
          Kuchga kirgan sana: <Text style={{ fontFamily: typography.fontFamily.semibold }}>{EFFECTIVE_DATE}</Text>
        </Text>

        {/* Summary card */}
        <View style={[styles.summaryCard, { backgroundColor: c.brandSubtle, borderColor: c.accentPrimaryGlow }]}>
          <Text style={[styles.summaryText, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}>
            <Text style={{ fontFamily: typography.fontFamily.bold, color: c.brand }}>Qisqacha: </Text>
            SAHIFALAB — o'zbek tilida ta'lim beruvchi platforma. Biz foydalanuvchilarimizning huquqlarini hurmat qilamiz va ulardan ham bir xil munosabatni kutamiz. Savollaringiz bo'lsa —{' '}
            <Text
              style={{ color: c.brand, fontFamily: typography.fontFamily.semibold }}
              onPress={() => Linking.openURL('mailto:sahifalab@gmail.com')}
            >
              sahifalab@gmail.com
            </Text>
            {' '}orqali murojaat qiling.
          </Text>
        </View>

        {/* Sections */}
        {SECTIONS.map(s => <SectionCard key={s.id} s={s} c={c} />)}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            © 2026 SAHIFALAB. Barcha huquqlar himoyalangan.
          </Text>
          <Text
            style={[styles.footerLink, { color: c.brand, fontFamily: typography.fontFamily.medium }]}
            onPress={() => Linking.openURL('mailto:sahifalab@gmail.com')}
          >
            sahifalab@gmail.com
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom:   spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: typography.size.base },

  scroll: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.base,
    gap:               spacing.sm,
  },

  date: { fontSize: typography.size.xs, textAlign: 'center', marginBottom: spacing.xs },

  summaryCard: {
    borderRadius: radius.lg,
    borderWidth:  1,
    padding:      spacing.base,
    marginBottom: spacing.xs,
  },
  summaryText: { fontSize: typography.size.sm, lineHeight: 20 },

  card: {
    borderRadius: radius.lg,
    borderWidth:  StyleSheet.hairlineWidth,
    overflow:     'hidden',
  },
  cardHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical:   spacing.sm + 2,
    paddingHorizontal: spacing.base,
    gap:            spacing.sm,
  },
  iconWrap: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: { fontSize: typography.size.sm, lineHeight: 18 },

  cardBody: {
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderTopWidth:    StyleSheet.hairlineWidth,
    gap:               spacing.xs,
  },
  bodyText: { fontSize: typography.size.xs, lineHeight: 18 },
  bulletRow: { flexDirection: 'row', gap: spacing.xs, paddingLeft: spacing.xs },
  bulletDot: { fontSize: typography.size.xs, lineHeight: 18, width: 10 },
  bulletText: { fontSize: typography.size.xs, lineHeight: 18, flex: 1 },

  footer: { alignItems: 'center', gap: 4, marginTop: spacing.base },
  footerText: { fontSize: typography.size.xs },
  footerLink: { fontSize: typography.size.xs },
})

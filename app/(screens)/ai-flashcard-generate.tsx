import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput,
  Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { ChevronLeft, Camera, Images, Sparkles, Trash2, X } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { ai as aiApi } from '../../lib/api'
import type { AiLimits, GeneratedFlashcard } from '../../lib/api'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { typography, spacing, radius } from '../../lib/constants'

type InputMode = 'text' | 'image'
type Step = 'input' | 'preview'

function newActionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function friendlyError(e: any): string {
  const msg = e?.message ?? ''
  if (msg === 'Failed to fetch' || /network request failed/i.test(msg)) {
    return "Internet aloqasi yo'q. Ulanishni tekshirib, qayta urinib ko'ring."
  }
  return msg || 'Kutilmagan xatolik yuz berdi.'
}

export default function AiFlashcardGenerateScreen() {
  const { c } = useTheme()
  const router = useRouter()
  const accent = c.accentPrimary

  const [step, setStep] = useState<Step>('input')
  const [mode, setMode] = useState<InputMode>('text')
  const [text, setText] = useState('')
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [imageMime, setImageMime] = useState<string>('image/jpeg')

  const [limits, setLimits] = useState<AiLimits | null>(null)
  const [limitsError, setLimitsError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [deckTitle, setDeckTitle] = useState('')
  const [cards, setCards] = useState<GeneratedFlashcard[]>([])
  const [tangaSpentForThisGen, setTangaSpentForThisGen] = useState(0)
  const [saving, setSaving] = useState(false)

  const actionIdRef = useRef<string>(newActionId())

  const loadLimits = async () => {
    setLimitsError(null)
    try {
      const l = await aiApi.limits()
      setLimits(l)
    } catch (e: any) {
      setLimitsError(friendlyError(e))
    }
  }

  useEffect(() => { loadLimits() }, [])

  // A fresh input (new text/new image) is a new attempt — new action_id.
  useEffect(() => { actionIdRef.current = newActionId() }, [text, imageUri])

  async function pickImage(fromCamera: boolean) {
    const perms = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perms.granted) {
      Alert.alert('Ruxsat kerak', fromCamera ? 'Kamera uchun ruxsat bering.' : 'Galereya uchun ruxsat bering.')
      return
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    setImageUri(asset.uri)
    setImageMime(asset.mimeType ?? 'image/jpeg')
  }

  const hasInput = mode === 'text' ? text.trim().length >= 30 : !!imageUri
  const capReached = limits ? limits.actions_remaining_today <= 0 : false
  const willCostTanga = limits ? limits.free_remaining_today <= 0 : false
  const price = limits?.prices?.flashcard_gen ?? 25

  function onGeneratePressed() {
    if (!hasInput || capReached || generating) return
    if (willCostTanga) {
      setShowConfirm(true)
    } else {
      void doGenerate()
    }
  }

  async function doGenerate() {
    setShowConfirm(false)
    setGenerating(true)
    try {
      const preview = mode === 'text'
        ? await aiApi.generateFlashcardsFromText(text.trim(), actionIdRef.current)
        : await (async () => {
            const base64 = await FileSystem.readAsStringAsync(imageUri!, { encoding: FileSystem.EncodingType.Base64 })
            return aiApi.generateFlashcardsFromImage(base64, imageMime, actionIdRef.current)
          })()

      if (!preview.cards.length) {
        Alert.alert('Natija bo\'sh', "Ushbu manbadan flashcard yaratib bo'lmadi. Boshqa matn yoki rasm bilan urinib ko'ring.")
        await loadLimits()
        return
      }
      setDeckTitle(preview.deck_title)
      setCards(preview.cards)
      setTangaSpentForThisGen(preview.tanga_spent)
      setStep('preview')
      await loadLimits()  // refresh remaining allowance/balance display
    } catch (e: any) {
      // Backend error strings already say when Tanga was refunded (spec:
      // "confirm the Tanga refund landed") — surface them as-is, then
      // re-pull limits so the UI reflects the post-refund state, not a
      // stale pre-charge one.
      Alert.alert('Xatolik', friendlyError(e))
      await loadLimits()
    } finally {
      setGenerating(false)
    }
  }

  function updateCard(i: number, field: keyof GeneratedFlashcard, value: string) {
    setCards(prev => prev.map((card, idx) => (idx === i ? { ...card, [field]: value } : card)))
  }

  function deleteCard(i: number) {
    setCards(prev => prev.filter((_, idx) => idx !== i))
  }

  async function saveDeck() {
    const cleanCards = cards.filter(cd => cd.front.trim() && cd.back.trim())
    if (!cleanCards.length) {
      Alert.alert('Bo\'sh to\'plam', "Kamida bitta to'liq karta qoldiring.")
      return
    }
    setSaving(true)
    try {
      const res = await aiApi.confirmFlashcards({
        deck_title: deckTitle.trim() || 'Yangi to\'plam',
        cards: cleanCards,
      })
      router.replace({ pathname: `/(screens)/flashcard-deck/${res.deck_id}` } as any)
    } catch (e: any) {
      Alert.alert('Xatolik', friendlyError(e))
    } finally {
      setSaving(false)
    }
  }

  const backTarget = () => {
    if (step === 'preview') { setStep('input'); return }
    router.canGoBack() ? router.back() : router.replace('/(tabs)/flashcards' as any)
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: c.bgPrimary }]} edges={['top', 'bottom']}>
      <View style={[s.navBar, { borderBottomColor: c.border }]}>
        <Pressable onPress={backTarget} hitSlop={12} style={s.navBtn}>
          <ChevronLeft size={24} color={accent} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          {step === 'input' ? 'AI bilan flashcard yaratish' : 'Ko\'rib chiqish'}
        </Text>
        <View style={s.navBtn} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {step === 'input' ? (
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Cost / allowance strip */}
            <View style={[s.limitsRow, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
              {limitsError ? (
                <Text style={[s.limitsText, { color: c.textMuted }]}>Limit ma'lumoti yuklanmadi</Text>
              ) : !limits ? (
                <ActivityIndicator size="small" color={accent} />
              ) : capReached ? (
                <Text style={[s.limitsText, { color: c.warning, fontFamily: typography.fontFamily.semibold }]}>
                  Bugungi AI limitiga yetdingiz ({limits.hard_daily_cap}/kun). Ertaga qayta urinib ko'ring.
                </Text>
              ) : willCostTanga ? (
                <Text style={[s.limitsText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                  🪙 Bu amal <Text style={{ color: accent, fontFamily: typography.fontFamily.bold }}>{price} Tanga</Text> sarflaydi
                  {'  ·  '}{limits.actions_remaining_today} ta amal qoldi bugun
                </Text>
              ) : (
                <Text style={[s.limitsText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                  ✨ Bugun <Text style={{ color: accent, fontFamily: typography.fontFamily.bold }}>{limits.free_remaining_today} ta bepul</Text> amal qoldi
                </Text>
              )}
            </View>

            {/* Mode toggle */}
            <View style={[s.modeToggle, { backgroundColor: c.bgTertiary }]}>
              <Pressable
                style={[s.modeBtn, mode === 'text' && { backgroundColor: c.bgSecondary }]}
                onPress={() => { setMode('text'); setImageUri(null) }}
              >
                <Text style={[s.modeBtnText, { color: mode === 'text' ? c.textPrimary : c.textMuted, fontFamily: typography.fontFamily.semibold }]}>
                  📝 Matn
                </Text>
              </Pressable>
              <Pressable
                style={[s.modeBtn, mode === 'image' && { backgroundColor: c.bgSecondary }]}
                onPress={() => { setMode('image'); setText('') }}
              >
                <Text style={[s.modeBtnText, { color: mode === 'image' ? c.textPrimary : c.textMuted, fontFamily: typography.fontFamily.semibold }]}>
                  📷 Rasm
                </Text>
              </Pressable>
            </View>

            {mode === 'text' ? (
              <TextInput
                style={[s.textInput, { backgroundColor: c.bgSecondary, borderColor: c.border, color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}
                placeholder="Darslik matnini shu yerga joylashtiring (kamida bir necha jumla)..."
                placeholderTextColor={c.textMuted}
                value={text}
                onChangeText={setText}
                multiline
                textAlignVertical="top"
              />
            ) : imageUri ? (
              <View style={s.imagePreviewWrap}>
                <Image source={{ uri: imageUri }} style={s.imagePreview} resizeMode="cover" />
                <Pressable style={[s.imageRemoveBtn, { backgroundColor: c.bgPrimary }]} onPress={() => setImageUri(null)}>
                  <X size={16} color={c.textPrimary} />
                </Pressable>
              </View>
            ) : (
              <View style={s.imagePickRow}>
                <Pressable style={[s.imagePickBtn, { backgroundColor: c.bgSecondary, borderColor: c.border }]} onPress={() => pickImage(true)}>
                  <Camera size={22} color={accent} />
                  <Text style={[s.imagePickText, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>Kamera</Text>
                </Pressable>
                <Pressable style={[s.imagePickBtn, { backgroundColor: c.bgSecondary, borderColor: c.border }]} onPress={() => pickImage(false)}>
                  <Images size={22} color={accent} />
                  <Text style={[s.imagePickText, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>Galereya</Text>
                </Pressable>
              </View>
            )}

            <Pressable
              disabled={!hasInput || capReached || generating}
              style={[
                s.generateBtn,
                { backgroundColor: (!hasInput || capReached || generating) ? c.bgTertiary : accent },
              ]}
              onPress={onGeneratePressed}
            >
              {generating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Sparkles size={18} color={(!hasInput || capReached) ? c.textMuted : '#fff'} />
                  <Text style={[s.generateBtnText, { color: (!hasInput || capReached) ? c.textMuted : '#fff', fontFamily: typography.fontFamily.bold }]}>
                    Flashcard yaratish
                  </Text>
                </>
              )}
            </Pressable>
            {generating && (
              <Text style={[s.generatingHint, { color: c.textMuted }]}>
                Bu bir necha soniya davom etishi mumkin — ilovadan chiqmang
              </Text>
            )}
          </ScrollView>
        ) : (
          <>
            <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[s.previewHint, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                {cards.length} ta karta yaratildi{tangaSpentForThisGen > 0 ? ` · ${tangaSpentForThisGen} Tanga sarflandi` : ' · bepul'} — saqlashdan oldin tahrirlang yoki o'chiring
              </Text>

              <TextInput
                style={[s.deckTitleInput, { backgroundColor: c.bgSecondary, borderColor: c.border, color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}
                placeholder="To'plam nomi"
                placeholderTextColor={c.textMuted}
                value={deckTitle}
                onChangeText={setDeckTitle}
              />

              {cards.map((card, i) => (
                <View key={i} style={[s.cardEdit, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
                  <View style={s.cardEditHeader}>
                    <Text style={[s.cardEditNum, { color: c.textMuted }]}>Karta {i + 1}</Text>
                    <Pressable onPress={() => deleteCard(i)} hitSlop={8}>
                      <Trash2 size={16} color={c.error} />
                    </Pressable>
                  </View>
                  <TextInput
                    style={[s.cardEditInput, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}
                    placeholder="Old tomon"
                    placeholderTextColor={c.textMuted}
                    value={card.front}
                    onChangeText={v => updateCard(i, 'front', v)}
                    multiline
                  />
                  <View style={[s.cardEditDivider, { backgroundColor: c.border }]} />
                  <TextInput
                    style={[s.cardEditInput, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}
                    placeholder="Orqa tomon"
                    placeholderTextColor={c.textMuted}
                    value={card.back}
                    onChangeText={v => updateCard(i, 'back', v)}
                    multiline
                  />
                </View>
              ))}
            </ScrollView>

            <View style={[s.saveBar, { backgroundColor: c.bgPrimary, borderTopColor: c.border }]}>
              <Pressable
                disabled={saving || !cards.length}
                style={[s.saveBtn, { backgroundColor: (saving || !cards.length) ? c.bgTertiary : accent }]}
                onPress={saveDeck}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={[s.saveBtnText, { color: !cards.length ? c.textMuted : '#fff', fontFamily: typography.fontFamily.bold }]}>
                      To'plamni saqlash
                    </Text>
                }
              </Pressable>
            </View>
          </>
        )}
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={showConfirm}
        emoji="🪙"
        title="Flashcard yaratilsinmi?"
        message={`Bu amal ${price} Tanga sarflaydi. Yaratish muvaffaqiyatsiz bo'lsa, Tanga avtomatik qaytariladi.`}
        confirmText={`Ha, ${price} Tanga sarflash`}
        cancelText="Bekor qilish"
        onConfirm={doGenerate}
        onCancel={() => setShowConfirm(false)}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1 },
  navBar: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.xs,
    paddingVertical:   spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn:   { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 15 },

  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },

  limitsRow: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  limitsText: { fontSize: 13, lineHeight: 18 },

  modeToggle: { flexDirection: 'row', borderRadius: radius.lg, padding: 4, gap: 4 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center' },
  modeBtnText: { fontSize: 14 },

  textInput: {
    minHeight: 160, borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.md, fontSize: 14, lineHeight: 20,
  },

  imagePickRow: { flexDirection: 'row', gap: spacing.md },
  imagePickBtn: {
    flex: 1, aspectRatio: 1.3, borderRadius: radius.lg, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  imagePickText: { fontSize: 13 },

  imagePreviewWrap: { borderRadius: radius.lg, overflow: 'hidden', position: 'relative' },
  imagePreview: { width: '100%', aspectRatio: 1.4 },
  imageRemoveBtn: {
    position: 'absolute', top: 8, right: 8, width: 30, height: 30,
    borderRadius: 15, alignItems: 'center', justifyContent: 'center',
  },

  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: radius.full, paddingVertical: 14, marginTop: spacing.xs,
  },
  generateBtnText: { fontSize: 15 },
  generatingHint: { fontSize: 12, textAlign: 'center' },

  previewHint: { fontSize: 12, lineHeight: 17 },
  deckTitleInput: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, fontSize: 16 },

  cardEdit: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: 8 },
  cardEditHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardEditNum: { fontSize: 11 },
  cardEditInput: { fontSize: 14, lineHeight: 19, minHeight: 22 },
  cardEditDivider: { height: StyleSheet.hairlineWidth },

  saveBar: { padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth },
  saveBtn: { borderRadius: radius.full, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 15 },
})

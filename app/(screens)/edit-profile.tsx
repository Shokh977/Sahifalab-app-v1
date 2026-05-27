import React, { useState, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ScrollView, Image, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ActionSheetIOS,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useTheme } from '../../hooks/useTheme'
import { profile as profileApi, uploadProfileImage, onboarding } from '../../lib/api'
import { useProfileStore } from '../../stores/profileStore'
import { typography, spacing, radius } from '../../lib/constants'

const DAILY_GOALS = [10, 20, 40]

export default function EditProfileScreen() {
  const { c }    = useTheme()
  const router   = useRouter()
  const { ownProfile, patchOwnProfile, loadOwnProfile } = useProfileStore()

  const [firstName,    setFirstName]    = useState(ownProfile?.first_name ?? '')
  const [username,     setUsername]     = useState(ownProfile?.username ?? '')
  const [bio,          setBio]          = useState(ownProfile?.bio ?? '')
  const [dailyGoal,    setDailyGoal]    = useState<number>(20)
  const [avatarUri,    setAvatarUri]    = useState<string | null>(ownProfile?.photo_url ?? null)
  const [uploading,    setUploading]    = useState(false)
  const [saving,       setSaving]       = useState(false)

  // Track if anything changed
  const isDirty = (
    firstName !== (ownProfile?.first_name ?? '') ||
    username  !== (ownProfile?.username   ?? '') ||
    bio       !== (ownProfile?.bio        ?? '') ||
    avatarUri !== (ownProfile?.photo_url  ?? null)
  )

  // ── Avatar picker ──────────────────────────────────────────────────────────

  const launchPicker = useCallback(async (fromCamera: boolean) => {
    const perms = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!perms.granted) {
      Alert.alert('Ruxsat kerak', fromCamera ? 'Kamera uchun ruxsat bering.' : 'Galereya uchun ruxsat bering.')
      return
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.85 })

    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]

    setAvatarUri(asset.uri)
    setUploading(true)
    try {
      const url = await uploadProfileImage(asset.uri, 'avatar', asset.mimeType ?? 'image/jpeg')
      patchOwnProfile({ photo_url: url })
      setAvatarUri(url)
    } catch (e: any) {
      Alert.alert('Xatolik', e?.message ?? 'Rasm yuklanmadi')
      setAvatarUri(ownProfile?.photo_url ?? null)
    } finally {
      setUploading(false)
    }
  }, [ownProfile, patchOwnProfile])

  const handleAvatarPress = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Bekor', 'Galereyadan tanlash', 'Rasmga olish'], cancelButtonIndex: 0 },
        (idx) => {
          if (idx === 1) launchPicker(false)
          if (idx === 2) launchPicker(true)
        },
      )
    } else {
      Alert.alert('Rasm tanlash', '', [
        { text: 'Galereyadan tanlash', onPress: () => launchPicker(false) },
        { text: 'Rasmga olish',        onPress: () => launchPicker(true)  },
        { text: 'Bekor', style: 'cancel' },
      ])
    }
  }, [launchPicker])

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (saving || !isDirty) return
    setSaving(true)
    try {
      await Promise.all([
        profileApi.updateMe({
          first_name:    firstName    || undefined,
          bio:           bio          || undefined,
          site_username: username     || undefined,
        }),
        onboarding.setDailyGoal(dailyGoal),
      ])
      patchOwnProfile({
        first_name: firstName,
        bio:        bio        || null,
        username:   username   || null,
      })
      loadOwnProfile()
      router.back()
    } catch (e: any) {
      Alert.alert('Xatolik', e?.message ?? 'Saqlashda xatolik')
    } finally {
      setSaving(false)
    }
  }, [saving, isDirty, firstName, bio, username, dailyGoal, patchOwnProfile, loadOwnProfile, router])

  const initials = ((firstName || ownProfile?.first_name || 'U')
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase())

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bgPrimary }]} edges={['top', 'bottom']}>
      {/* Nav bar */}
      <View style={[styles.navBar, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.navCancel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Bekor
          </Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          Profilni tahrirlash
        </Text>
        <Pressable onPress={handleSave} disabled={saving} hitSlop={12}>
          <Text style={[
            styles.navSave,
            { color: c.accentPrimary, fontFamily: typography.fontFamily.bold },
            (!isDirty || saving) && { opacity: 0.4 },
          ]}>
            {saving ? '…' : 'Saqlash'}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar (centered) */}
          <View style={styles.avatarSection}>
            <Pressable onPress={handleAvatarPress} style={styles.avatarWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: c.bgTertiary, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: c.textSecondary, fontSize: 28, fontFamily: typography.fontFamily.bold }}>
                    {initials}
                  </Text>
                </View>
              )}
              {uploading && (
                <View style={[StyleSheet.absoluteFill, styles.uploadOverlay]}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
            </Pressable>
            <Text style={[styles.changePhoto, { color: c.accentPrimary, fontFamily: typography.fontFamily.regular }]}>
              Rasmni o'zgartirish
            </Text>
          </View>

          {/* Fields */}
          <View style={styles.form}>
            {/* Ism */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
                Ism
              </Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Ismingizni kiriting"
                placeholderTextColor={c.textDisabled}
                maxLength={60}
                style={[styles.input, { backgroundColor: c.bgSecondary, borderColor: c.border, color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}
              />
            </View>

            {/* Foydalanuvchi nomi */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
                Foydalanuvchi nomi
              </Text>
              <View style={[styles.inputRow, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
                <Text style={[styles.inputPrefix, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>@</Text>
                <TextInput
                  value={username}
                  onChangeText={text => setUsername(text.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                  placeholder="username"
                  placeholderTextColor={c.textDisabled}
                  maxLength={30}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.inputInner, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}
                />
              </View>
            </View>

            {/* Bio */}
            <View style={styles.fieldGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[styles.fieldLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
                  Bio
                </Text>
                <Text style={[styles.charCount, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
                  {bio.length} / 160
                </Text>
              </View>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="O'zingiz haqingizda…"
                placeholderTextColor={c.textDisabled}
                maxLength={160}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={[styles.inputMulti, { backgroundColor: c.bgSecondary, borderColor: c.border, color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}
              />
            </View>

            {/* Kunlik maqsad */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
                Kunlik maqsad
              </Text>
              <View style={styles.radioRow}>
                {DAILY_GOALS.map(min => (
                  <Pressable
                    key={min}
                    onPress={() => setDailyGoal(min)}
                    style={[
                      styles.radioOption,
                      {
                        borderColor:     dailyGoal === min ? c.accentPrimary : c.border,
                        backgroundColor: dailyGoal === min ? c.accentPrimaryMuted : c.bgSecondary,
                      },
                    ]}
                  >
                    <View style={[
                      styles.radioCircle,
                      { borderColor: dailyGoal === min ? c.accentPrimary : c.border },
                    ]}>
                      {dailyGoal === min && <View style={[styles.radioDot, { backgroundColor: c.accentPrimary }]} />}
                    </View>
                    <Text style={[
                      styles.radioLabel,
                      { fontFamily: dailyGoal === min ? typography.fontFamily.semibold : typography.fontFamily.regular },
                      { color: dailyGoal === min ? c.accentPrimary : c.textPrimary },
                    ]}>
                      {min} daq
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  navBar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.screenMargin,
    paddingVertical:   spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navCancel: { fontSize: 15 },
  navTitle:  { fontSize: 15 },
  navSave:   { fontSize: 15 },

  scroll: { paddingBottom: 60 },

  // Avatar
  avatarSection: { alignItems: 'center', paddingTop: spacing.xl, paddingBottom: spacing.base, gap: spacing.sm },
  avatarWrap:    { position: 'relative', width: 80, height: 80 },
  avatar:        { width: 80, height: 80, borderRadius: 40 },
  uploadOverlay: { borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  changePhoto:   { fontSize: 13 },

  // Form
  form:       { paddingHorizontal: spacing.screenMargin, gap: spacing.base },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13 },
  charCount:  { fontSize: 11 },

  input: {
    borderWidth:       1,
    borderRadius:      radius.input,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    fontSize:          15,
    height:            48,
  },
  inputRow: {
    flexDirection:     'row',
    alignItems:        'center',
    borderWidth:       1,
    borderRadius:      radius.input,
    paddingHorizontal: spacing.base,
    height:            48,
  },
  inputPrefix: { fontSize: 15, marginRight: 2 },
  inputInner:  { flex: 1, fontSize: 15, height: '100%' },
  inputMulti: {
    borderWidth:       1,
    borderRadius:      radius.input,
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.sm,
    paddingBottom:     spacing.sm,
    fontSize:          15,
    minHeight:         88,
  },

  // Radio
  radioRow:    { flexDirection: 'row', gap: 12 },
  radioOption: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
    paddingVertical:  12,
    borderRadius:   radius.card,
    borderWidth:    1.5,
  },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot:    { width: 9, height: 9, borderRadius: 5 },
  radioLabel:  { fontSize: 14 },
})

import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, Modal, Pressable, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Image, ScrollView, Alert,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../hooks/useTheme'
import { social, uploadPostImage } from '../../lib/api'
import { useFeedStore } from '../../stores/feedStore'
import { useAuthStore } from '../../stores/authStore'
import { typography, spacing, radius } from '../../lib/constants'

interface Props {
  visible:  boolean
  onClose:  () => void
}

export function PostComposer({ visible, onClose }: Props) {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  const user   = useAuthStore(s => s.user)
  const prependPost = useFeedStore(s => s.prependPost)

  const [content,    setContent]    = useState('')
  const [imageUri,   setImageUri]   = useState<string | null>(null)
  const [imageMime,  setImageMime]  = useState('image/jpeg')
  const [uploading,  setUploading]  = useState(false)
  const [posting,    setPosting]    = useState(false)

  function handleClose() {
    if (posting || uploading) return
    setContent('')
    setImageUri(null)
    onClose()
  }

  const pickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Ruxsat kerak', 'Rasmlar kutubxonasiga kirish uchun ruxsat bering.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality:    0.85,
      allowsEditing: true,
      aspect:     [16, 9],
    })
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri)
      setImageMime(result.assets[0].mimeType ?? 'image/jpeg')
    }
  }, [])

  async function handlePost() {
    if ((!content.trim() && !imageUri) || posting) return
    setPosting(true)
    try {
      let imageUrl: string | null = null
      if (imageUri) {
        setUploading(true)
        imageUrl = await uploadPostImage(imageUri, imageMime)
        setUploading(false)
      }
      const post = await social.createPost({
        content:   content.trim(),
        image_url: imageUrl,
      })
      prependPost(post as any)
      handleClose()
    } catch (e: any) {
      Alert.alert('Xatolik', e?.message ?? 'Post yaratishda xatolik yuz berdi')
    } finally {
      setPosting(false)
      setUploading(false)
    }
  }

  const canPost = (content.trim().length > 0 || !!imageUri) && !posting

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}
      >
        {/* Top bar */}
        <View style={[styles.topBar, { borderBottomColor: c.border }]}>
          <Pressable onPress={handleClose} hitSlop={12} style={styles.topBtn}>
            <Text style={[styles.topBtnText, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
              Bekor
            </Text>
          </Pressable>
          <Text style={[styles.topTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Post yaratish
          </Text>
          <Pressable
            onPress={handlePost}
            disabled={!canPost}
            style={[styles.postBtn, { backgroundColor: canPost ? c.brand : c.bgTertiary }]}
          >
            {posting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={[styles.postBtnText, { fontFamily: typography.fontFamily.semibold }]}>
                  Post
                </Text>
            }
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Author row */}
          <View style={styles.authorRow}>
            <View style={[styles.avatar, { backgroundColor: c.brandSubtle }]}>
              <Text style={{ color: c.brand, fontSize: 17, fontFamily: typography.fontFamily.bold }}>
                {user?.first_name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <Text numberOfLines={1} style={[styles.authorName, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
              {user?.first_name}
            </Text>
          </View>

          {/* Text input */}
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Nima haqida o'ylayapsiz?"
            placeholderTextColor={c.textMuted}
            multiline
            autoFocus
            maxLength={2000}
            style={[styles.textInput, {
              color:      c.textPrimary,
              fontFamily: typography.fontFamily.regular,
            }]}
          />

          {/* Character count */}
          {content.length > 1500 && (
            <Text style={[styles.charCount, {
              color: content.length > 1900 ? c.error : c.textMuted,
              fontFamily: typography.fontFamily.regular,
            }]}>
              {2000 - content.length} ta belgi qoldi
            </Text>
          )}

          {/* Image preview */}
          {imageUri && (
            <View style={styles.imagePreviewWrap}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
              <Pressable
                onPress={() => setImageUri(null)}
                style={[styles.removeImg, { backgroundColor: c.overlay }]}
              >
                <Text style={{ color: '#fff', fontSize: 16 }}>✕</Text>
              </Pressable>
              {uploading && (
                <View style={[styles.uploadOverlay, { backgroundColor: c.overlay }]}>
                  <ActivityIndicator color="#fff" />
                  <Text style={{ color: '#fff', marginTop: 8, fontFamily: typography.fontFamily.regular }}>
                    Yuklanmoqda...
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Bottom toolbar */}
        <View style={[styles.toolbar, {
          borderTopColor:  c.border,
          paddingBottom:   insets.bottom + spacing.xs,
        }]}>
          <Pressable onPress={pickImage} style={styles.toolbarBtn} hitSlop={8}>
            <Text style={{ fontSize: 24 }}>🖼️</Text>
            <Text style={[styles.toolbarLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
              Rasm
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  topBtn: {
    minWidth: 60,
  },
  topBtnText: {
    fontSize: typography.size.md,
  },
  topTitle: {
    fontSize: typography.size.md,
  },
  postBtn: {
    minWidth:        60,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius:    radius.full,
    alignItems:      'center',
  },
  postBtnText: {
    color:    '#fff',
    fontSize: typography.size.sm,
  },
  scrollContent: {
    padding: spacing.base,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    marginBottom:  spacing.sm,
  },
  avatar: {
    width:         42,
    height:        42,
    borderRadius:  21,
    alignItems:    'center',
    justifyContent: 'center',
  },
  authorName: {
    fontSize: typography.size.md,
  },
  textInput: {
    fontSize:   typography.size.md,
    lineHeight: 24,
    minHeight:  120,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    fontSize:  typography.size.xs,
    marginTop: spacing.xs,
  },
  imagePreviewWrap: {
    marginTop:    spacing.base,
    borderRadius: radius.md,
    overflow:     'hidden',
  },
  imagePreview: {
    width:       '100%',
    aspectRatio: 16 / 9,
  },
  removeImg: {
    position: 'absolute',
    top:      spacing.sm,
    right:    spacing.sm,
    width:    32,
    height:   32,
    borderRadius: radius.full,
    alignItems:   'center',
    justifyContent: 'center',
  },
  uploadOverlay: {
    position:       'absolute',
    inset:           0,
    alignItems:     'center',
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection:     'row',
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.sm,
    borderTopWidth:    1,
    gap:               spacing.base,
  },
  toolbarBtn: {
    alignItems: 'center',
    gap:        2,
  },
  toolbarLabel: {
    fontSize: typography.size.xs,
  },
})

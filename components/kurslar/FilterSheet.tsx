import React from 'react'
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { X } from 'lucide-react-native'
import { typography, radius as radiusTokens } from '../../lib/constants'
import { coursesStrings as s } from '../../lib/coursesStrings'
import type { PremiumTheme } from '../../lib/premiumTheme'

export type PriceFilter = '' | 'free' | 'paid'
export type DurationFilter = '' | 'short' | 'medium' | 'long' | 'xlong'
export type LevelFilter = '' | 'beginner' | 'intermediate' | 'advanced'

export interface CourseFilters {
  price:    PriceFilter
  duration: DurationFilter
  level:    LevelFilter
  language: string   // '' = all
}

export const EMPTY_FILTERS: CourseFilters = { price: '', duration: '', level: '', language: '' }

export function activeFilterCount(f: CourseFilters): number {
  return [f.price, f.duration, f.level, f.language].filter(Boolean).length
}

export function courseDurationBucket(totalMinutes: number): Exclude<DurationFilter, ''> {
  if (totalMinutes < 60) return 'short'
  if (totalMinutes < 180) return 'medium'
  if (totalMinutes < 600) return 'long'
  return 'xlong'
}

interface Props {
  visible: boolean
  filters: CourseFilters
  availableLanguages: string[]
  t: PremiumTheme
  onApply: (f: CourseFilters) => void
  onClose: () => void
}

function OptionRow<T extends string>({
  options, active, onPick, t,
}: { options: { key: T; label: string }[]; active: T; onPick: (k: T) => void; t: PremiumTheme }) {
  return (
    <View style={styles.optionsRow}>
      {options.map(opt => {
        const isActive = opt.key === active
        return (
          <Pressable
            key={opt.key || '__all'}
            onPress={() => onPick(opt.key)}
            style={[
              styles.optionChip,
              isActive
                ? { backgroundColor: t.segmentActiveBg, borderColor: t.segmentActiveBorder, borderWidth: t.segmentActiveBorder === 'transparent' ? 0 : 1 }
                : { backgroundColor: t.field, borderColor: t.hairline, borderWidth: 1 },
            ]}
          >
            <Text style={{ fontSize: 13, fontFamily: typography.fontFamily.bold, color: isActive ? t.segmentActiveLabel : t.textSecondary }}>
              {opt.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function FilterSheet({ visible, filters, availableLanguages, t, onApply, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const [draft, setDraft] = React.useState<CourseFilters>(filters)

  React.useEffect(() => { if (visible) setDraft(filters) }, [visible, filters])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: t.bg, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: t.textPrimary }]}>{s.filterTitle}</Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <X size={18} color={t.textSecondary} strokeWidth={2} />
          </Pressable>
        </View>

        <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionLabel, { color: t.eyebrow }]}>{s.filterPrice}</Text>
          <OptionRow
            t={t}
            active={draft.price}
            onPick={(k: PriceFilter) => setDraft(d => ({ ...d, price: k }))}
            options={[
              { key: '', label: s.filterPriceAll },
              { key: 'free', label: s.filterPriceFree },
              { key: 'paid', label: s.filterPricePaid },
            ]}
          />

          <Text style={[styles.sectionLabel, { color: t.eyebrow }]}>{s.filterDuration}</Text>
          <OptionRow
            t={t}
            active={draft.duration}
            onPick={(k: DurationFilter) => setDraft(d => ({ ...d, duration: k }))}
            options={[
              { key: '', label: s.filterDurationAll },
              { key: 'short', label: s.filterDurationShort },
              { key: 'medium', label: s.filterDurationMedium },
              { key: 'long', label: s.filterDurationLong },
              { key: 'xlong', label: s.filterDurationXLong },
            ]}
          />

          <Text style={[styles.sectionLabel, { color: t.eyebrow }]}>{s.filterLevel}</Text>
          <OptionRow
            t={t}
            active={draft.level}
            onPick={(k: LevelFilter) => setDraft(d => ({ ...d, level: k }))}
            options={[
              { key: '', label: s.filterLevelAll },
              { key: 'beginner', label: s.filterLevelBeginner },
              { key: 'intermediate', label: s.filterLevelIntermediate },
              { key: 'advanced', label: s.filterLevelAdvanced },
            ]}
          />

          {availableLanguages.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: t.eyebrow }]}>{s.filterLanguage}</Text>
              <OptionRow
                t={t}
                active={draft.language}
                onPick={(k: string) => setDraft(d => ({ ...d, language: k }))}
                options={[
                  { key: '', label: s.filterLanguageAll },
                  ...availableLanguages.map(lang => ({ key: lang, label: lang })),
                ]}
              />
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={() => setDraft(EMPTY_FILTERS)} style={styles.resetBtn}>
            <Text style={[styles.resetText, { color: t.textSecondary }]}>{s.filterReset}</Text>
          </Pressable>
          <Pressable onPress={() => onApply(draft)} style={styles.applyBtnWrap}>
            <LinearGradient colors={t.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.applyBtn}>
              <Text style={[styles.applyText, { color: t.accentInk }]}>{s.filterApply}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,8,6,.5)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 18,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerTitle: { fontSize: 17, fontFamily: typography.fontFamily.extrabold, letterSpacing: -0.3 },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: {
    fontSize: 10, fontFamily: typography.fontFamily.extrabold, letterSpacing: 1.1,
    textTransform: 'uppercase', marginTop: 16, marginBottom: 8,
  },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { borderRadius: radiusTokens.full, paddingHorizontal: 14, paddingVertical: 9 },
  footer: { flexDirection: 'row', gap: 10, marginTop: 18 },
  resetBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  resetText: { fontSize: 14, fontFamily: typography.fontFamily.bold },
  applyBtnWrap: { flex: 2, borderRadius: radiusTokens.full, overflow: 'hidden' },
  applyBtn: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontSize: 14.5, fontFamily: typography.fontFamily.extrabold },
})

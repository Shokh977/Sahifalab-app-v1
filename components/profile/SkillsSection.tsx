import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../hooks/useTheme'
import { skills as skillsApi } from '../../lib/api'
import { typography, spacing, radius } from '../../lib/constants'
import type { ProfileSkill } from '../../lib/types'

interface Props {
  skills:       ProfileSkill[]
  isOwnProfile: boolean
  onSkillsChange?: (updated: ProfileSkill[]) => void
}

export function SkillsSection({ skills, isOwnProfile, onSkillsChange }: Props) {
  const { c } = useTheme()
  const [localSkills, setLocalSkills] = useState<ProfileSkill[]>(skills)
  const [endorsing, setEndorsing] = useState<number | null>(null)

  if (localSkills.length === 0) return null

  async function handleEndorse(skill: ProfileSkill) {
    if (isOwnProfile || endorsing !== null) return
    setEndorsing(skill.id)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    const wasEndorsed = skill.endorsed_by_viewer
    const updated = localSkills.map(s =>
      s.id === skill.id
        ? {
            ...s,
            endorsed_by_viewer: !wasEndorsed,
            endorsement_count: wasEndorsed
              ? Math.max(0, s.endorsement_count - 1)
              : s.endorsement_count + 1,
          }
        : s
    )
    setLocalSkills(updated)
    onSkillsChange?.(updated)

    try {
      await skillsApi.toggleEndorse(skill.id)
    } catch {
      // revert
      setLocalSkills(skills)
      onSkillsChange?.(skills)
    } finally {
      setEndorsing(null)
    }
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
        Ko'nikmalar
      </Text>
      <View style={styles.chips}>
        {localSkills.map(skill => (
          <Pressable
            key={skill.id}
            onPress={() => handleEndorse(skill)}
            disabled={isOwnProfile || endorsing === skill.id}
            style={[
              styles.chip,
              {
                backgroundColor: skill.endorsed_by_viewer ? c.brandSubtle : c.bgTertiary,
                borderColor:     skill.endorsed_by_viewer ? c.brand        : c.border,
              },
            ]}
          >
            <View style={styles.chipInner}>
              {skill.is_verified && (
                <Text style={{ color: c.brand, fontSize: 11 }}>✓</Text>
              )}
              <Text style={[styles.chipName, {
                color: skill.endorsed_by_viewer ? c.brand : c.textPrimary,
                fontFamily: typography.fontFamily.medium,
              }]}>
                {skill.skill_name}
              </Text>
              {skill.endorsement_count > 0 && (
                <View style={[styles.badge, { backgroundColor: skill.endorsed_by_viewer ? c.brand : c.bgElevated }]}>
                  <Text style={[styles.badgeText, {
                    color: skill.endorsed_by_viewer ? '#fff' : c.textMuted,
                    fontFamily: typography.fontFamily.bold,
                  }]}>
                    {skill.endorsement_count}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </View>
      {!isOwnProfile && (
        <Text style={[styles.hint, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
          Ko'nikmani tasdiqlash uchun bosing
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.base,
  },
  sectionTitle: {
    fontSize:     typography.size.lg,
    marginBottom: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.sm,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth:  1,
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.xs + 1,
  },
  chipInner: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  chipName: {
    fontSize: typography.size.sm,
  },
  badge: {
    minWidth:          16,
    height:            16,
    borderRadius:      8,
    paddingHorizontal: 4,
    alignItems:        'center',
    justifyContent:    'center',
  },
  badgeText: {
    fontSize: 10,
  },
  hint: {
    fontSize:  typography.size.xs,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
})

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, TextInput, ScrollView, RefreshControl, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack, useRouter } from 'expo-router'
import { ChevronLeft, Briefcase, Search, X, MapPin, Clock, BadgeCheck } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../hooks/useTheme'
import { request } from '../../lib/api'
import { formatTime } from '../../lib/utils'
import { typography, spacing, radius } from '../../lib/constants'

interface Job {
  id:              number
  title:           string
  company_name:    string
  description:     string | null
  location:        string | null
  job_type:        string
  salary_min:      number | null
  salary_max:      number | null
  salary_currency: string | null
  required_skills: string[]
  applicant_count: number
  match_pct:       number | null
  expires_at:      string | null
  created_at:      string
  poster?: {
    first_name: string
    photo_url:  string | null
  }
}

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time:  "To'liq vaqt",
  part_time:  'Qisman vaqt',
  freelance:  'Frilanser',
  internship: 'Amaliyot',
  remote:     'Masofaviy',
}

type TabKey = 'all' | 'matched'

function JobCard({ job, onApply }: { job: Job; onApply: (id: number) => void }) {
  const { c }   = useTheme()
  const router  = useRouter()
  const typeLabel = JOB_TYPE_LABELS[job.job_type] ?? job.job_type

  const salaryText = () => {
    if (!job.salary_min && !job.salary_max) return null
    const cur = job.salary_currency ?? 'UZS'
    if (job.salary_min && job.salary_max)
      return `${job.salary_min.toLocaleString()} – ${job.salary_max.toLocaleString()} ${cur}`
    if (job.salary_min) return `${job.salary_min.toLocaleString()}+ ${cur}`
    return `${job.salary_max?.toLocaleString()} ${cur}`
  }

  const salary = salaryText()

  return (
    <View style={[styles.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.jobTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]} numberOfLines={2}>
            {job.title}
          </Text>
          <Text style={[styles.company, { color: c.brand, fontFamily: typography.fontFamily.medium }]} numberOfLines={1}>
            {job.company_name}
          </Text>
        </View>
        {(job.match_pct ?? 0) > 0 && (
          <View style={[styles.matchBadge, { backgroundColor: c.brandSubtle }]}>
            <BadgeCheck size={12} color={c.brand} />
            <Text style={[styles.matchText, { color: c.brand, fontFamily: typography.fontFamily.bold }]}>
              {Math.round(job.match_pct!)}%
            </Text>
          </View>
        )}
      </View>

      {/* Meta */}
      <View style={styles.metaRow}>
        {job.location && (
          <View style={styles.metaItem}>
            <MapPin size={12} color={c.textMuted} />
            <Text style={[styles.metaText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              {job.location}
            </Text>
          </View>
        )}
        <View style={[styles.typeBadge, { backgroundColor: c.bgTertiary }]}>
          <Text style={[styles.typeText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {typeLabel}
          </Text>
        </View>
        {salary && (
          <Text style={[styles.salary, { color: '#22c55e', fontFamily: typography.fontFamily.semibold }]}>
            {salary}
          </Text>
        )}
      </View>

      {/* Description */}
      {job.description && (
        <Text style={[styles.description, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]} numberOfLines={2}>
          {job.description}
        </Text>
      )}

      {/* Skills */}
      {job.required_skills.length > 0 && (
        <View style={styles.skillsRow}>
          {job.required_skills.slice(0, 4).map(skill => (
            <View key={skill} style={[styles.skillChip, { backgroundColor: c.bgTertiary }]}>
              <Text style={[styles.skillText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                {skill}
              </Text>
            </View>
          ))}
          {job.required_skills.length > 4 && (
            <Text style={[styles.skillText, { color: c.textMuted }]}>+{job.required_skills.length - 4}</Text>
          )}
        </View>
      )}

      {/* Footer */}
      <View style={[styles.cardFooter, { borderTopColor: c.border }]}>
        <View style={styles.metaItem}>
          <Clock size={11} color={c.textMuted} />
          <Text style={[styles.timeText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {formatTime(job.created_at)}
          </Text>
        </View>
        {job.applicant_count > 0 && (
          <Text style={[styles.applicants, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {job.applicant_count} ariza
          </Text>
        )}
        <Pressable
          onPress={() => onApply(job.id)}
          style={[styles.applyBtn, { backgroundColor: c.brand }]}
        >
          <Text style={[styles.applyBtnText, { fontFamily: typography.fontFamily.semibold }]}>
            Ariza topshirish
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

export default function JobsScreen() {
  const { c }  = useTheme()
  const router = useRouter()

  const [tab,        setTab]        = useState<TabKey>('all')
  const [jobs,       setJobs]       = useState<Job[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search,     setSearch]     = useState('')
  const [applying,   setApplying]   = useState<Set<number>>(new Set())
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const load = useCallback(async (opts: { t?: TabKey; q?: string; refresh?: boolean } = {}) => {
    const { t = tab, q = search, refresh = false } = opts
    if (refresh) setRefreshing(true)
    else setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      const qs  = params.toString() ? `?${params}` : ''
      const endpoint = t === 'matched' ? `/api/v1/jobs/matched${qs}` : `/api/v1/jobs${qs}`
      const data = await request<Job[]>(endpoint, { auth: true })
      setJobs(Array.isArray(data) ? data : [])
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [tab, search])

  useEffect(() => { load() }, [])

  useEffect(() => {
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => load({ q: search }), 300)
    return () => clearTimeout(debounce.current)
  }, [search])

  function switchTab(t: TabKey) {
    setTab(t)
    load({ t })
  }

  async function handleApply(jobId: number) {
    if (applying.has(jobId)) return
    setApplying(prev => new Set([...prev, jobId]))
    try {
      await request(`/api/v1/jobs/${jobId}/apply`, { method: 'POST', auth: true })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert('✓ Ariza yuborildi', "Ish beruvchi siz bilan bog'lanadi.")
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, applicant_count: j.applicant_count + 1 } : j))
    } catch (e: any) {
      if (e?.message?.includes('already')) Alert.alert('', 'Siz allaqachon ariza topshirgansiz.')
      else Alert.alert('Xatolik', 'Ariza yuborishda xatolik yuz berdi.')
    }
    setApplying(prev => { const s = new Set(prev); s.delete(jobId); return s })
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bgPrimary }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={c.brand} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Briefcase size={18} color={c.brand} />
          <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            Ish joylari
          </Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBarWrap, { borderBottomColor: c.border }]}>
        <View style={[styles.tabPill, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          {(['all', 'matched'] as TabKey[]).map(t => (
            <Pressable
              key={t}
              onPress={() => switchTab(t)}
              style={[styles.tabBtn, tab === t && { backgroundColor: c.brand }]}
            >
              <Text style={[styles.tabText, {
                color:      tab === t ? '#fff' : c.textMuted,
                fontFamily: tab === t ? typography.fontFamily.semibold : typography.fontFamily.regular,
              }]}>
                {t === 'all' ? 'Barchasi' : 'Menga mos'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { borderBottomColor: c.border }]}>
        <View style={[styles.searchWrap, { backgroundColor: c.bgTertiary, borderColor: c.border }]}>
          <Search size={15} color={c.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Ish, kompaniya, ko'nikma..."
            placeholderTextColor={c.textMuted}
            style={[styles.searchInput, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}
          />
          {!!search && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <X size={14} color={c.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator color={c.brand} style={{ marginTop: spacing['2xl'] }} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <JobCard job={item} onApply={handleApply} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load({ refresh: true })}
              tintColor={c.brand}
              colors={[c.brand]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Briefcase size={40} color={c.textMuted} />
              <Text style={[styles.emptyText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                {tab === 'matched' ? "Ko'nikmalaringizga mos ish topilmadi" : "Ish joylari topilmadi"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderBottomWidth: 1,
    gap:               spacing.sm,
  },
  headerCenter: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
  },
  title: {
    fontSize: typography.size.lg,
  },
  tabBarWrap: {
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderBottomWidth: 1,
  },
  tabPill: {
    flexDirection: 'row',
    borderRadius:  radius.xl,
    borderWidth:   1,
    padding:       4,
    gap:           4,
  },
  tabBtn: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: spacing.sm - 2,
    borderRadius:    radius.lg,
  },
  tabText: {
    fontSize: typography.size.sm,
  },
  searchRow: {
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderBottomWidth: 1,
  },
  searchWrap: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical:   spacing.sm,
    borderRadius:      radius.xl,
    borderWidth:       1,
  },
  searchInput: {
    flex:     1,
    fontSize: typography.size.sm,
    padding:  0,
  },
  list: {
    padding:       spacing.sm,
    paddingBottom: 80,
    gap:           spacing.sm,
  },
  card: {
    borderRadius: radius['2xl'],
    borderWidth:  1,
    padding:      spacing.base,
    gap:          spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.sm,
  },
  jobTitle: {
    fontSize:   typography.size.md,
    lineHeight: 22,
  },
  company: {
    fontSize:  typography.size.sm,
    marginTop: 2,
  },
  matchBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    paddingHorizontal: spacing.sm,
    paddingVertical:   4,
    borderRadius:      radius.full,
  },
  matchText: {
    fontSize: typography.size.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems:    'center',
    flexWrap:      'wrap',
    gap:           spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  metaText: {
    fontSize: 11,
  },
  typeBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical:   2,
    borderRadius:      radius.full,
  },
  typeText: {
    fontSize: 11,
  },
  salary: {
    fontSize: typography.size.sm,
  },
  description: {
    fontSize:   typography.size.sm,
    lineHeight: 20,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.xs,
  },
  skillChip: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical:   2,
    borderRadius:      radius.full,
  },
  skillText: {
    fontSize: 11,
  },
  cardFooter: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing.sm,
    borderTopWidth: 1,
    paddingTop:     spacing.sm,
  },
  timeText: {
    fontSize: 11,
  },
  applicants: {
    flex:     1,
    fontSize: 11,
  },
  applyBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical:   spacing.xs + 2,
    borderRadius:      radius.full,
  },
  applyBtnText: {
    color:    '#fff',
    fontSize: typography.size.xs,
  },
  empty: {
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: 80,
    gap:             spacing.sm,
  },
  emptyText: {
    fontSize:  typography.size.sm,
    textAlign: 'center',
  },
})

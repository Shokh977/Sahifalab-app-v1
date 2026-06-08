import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, Pressable, ScrollView,
  TextInput, ActivityIndicator, Modal, KeyboardAvoidingView,
  Platform, Image, Animated, Easing,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack, useRouter } from 'expo-router'
import {
  ChevronLeft, LayoutGrid, BookOpen, Timer, FileText,
  Plus, Trash2, X, CheckCircle2, Circle, Pencil, Zap, ChevronRight,
} from 'lucide-react-native'
import { useShallow } from 'zustand/shallow'
import { useTheme } from '../../hooks/useTheme'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useAuthStore } from '../../stores/authStore'
import { useTimerStore } from '../../stores/timerStore'
import { request } from '../../lib/api'
import { typography, spacing, radius } from '../../lib/constants'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Task {
  id:          number
  title:       string
  description: string | null
  status:      'todo' | 'in_progress' | 'done'
  priority:    'low' | 'medium' | 'high'
  created_at:  string
}

interface Note {
  id:         number
  title:      string
  content:    string
  created_at: string
  updated_at: string
}

interface EnrolledCourse {
  course_id:  number
  created_at: string
  courses: {
    id:            number
    title:         string
    slug:          string
    thumbnail_url: string | null
    is_paid:       boolean
    price:         number | null
  }
}

type WorkspaceTab = 'tasks' | 'courses' | 'focus' | 'notes'

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS: { key: WorkspaceTab; label: string; Icon: any }[] = [
  { key: 'tasks',   label: 'Reja',    Icon: LayoutGrid },
  { key: 'courses', label: "O'qish",  Icon: BookOpen   },
  { key: 'focus',   label: 'Fokus',   Icon: Timer      },
  { key: 'notes',   label: 'Qaydlar', Icon: FileText   },
]

const STATUS_LABELS: Record<Task['status'], string> = {
  todo:        'Bajarilmagan',
  in_progress: 'Jarayonda',
  done:        'Bajarildi',
}

const STATUS_COLORS: Record<Task['status'], string> = {
  todo:        '#6b7280',
  in_progress: '#f59e0b',
  done:        '#22c55e',
}

const PRIORITY_COLORS: Record<Task['priority'], string> = {
  low:    '#6b7280',
  medium: '#f59e0b',
  high:   '#ef4444',
}

// ── Task item ─────────────────────────────────────────────────────────────────

function TaskItem({
  task, onStatusCycle, onDelete,
}: {
  task: Task
  onStatusCycle: (t: Task) => void
  onDelete:      (id: number) => void
}) {
  const { c } = useTheme()
  const statusColor   = STATUS_COLORS[task.status]
  const priorityColor = PRIORITY_COLORS[task.priority]
  const isDone        = task.status === 'done'

  return (
    <View style={[styles.taskCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
      <Pressable onPress={() => onStatusCycle(task)} hitSlop={6} style={styles.taskCheck}>
        {isDone
          ? <CheckCircle2 size={22} color="#22c55e" />
          : <Circle size={22} color={c.textMuted} />
        }
      </Pressable>

      <View style={{ flex: 1 }}>
        <Text style={[
          styles.taskTitle,
          { color: isDone ? c.textMuted : c.textPrimary, fontFamily: typography.fontFamily.medium },
          isDone && styles.taskDone,
        ]} numberOfLines={2}>
          {task.title}
        </Text>
        <View style={styles.taskMeta}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.taskMetaText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {STATUS_LABELS[task.status]}
          </Text>
          <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
        </View>
      </View>

      <Pressable onPress={() => onDelete(task.id)} hitSlop={8} style={styles.taskDeleteBtn}>
        <Trash2 size={14} color={c.textMuted} />
      </Pressable>
    </View>
  )
}

// ── Note item ─────────────────────────────────────────────────────────────────

function NoteItem({
  note, onEdit, onDelete,
}: {
  note:     Note
  onEdit:   (n: Note) => void
  onDelete: (id: number) => void
}) {
  const { c } = useTheme()
  return (
    <View style={[styles.noteCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
      <View style={[styles.noteAccent, { backgroundColor: c.brand }]} />
      <View style={{ flex: 1, paddingLeft: spacing.sm }}>
        {!!note.title && (
          <Text style={[styles.noteTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]} numberOfLines={1}>
            {note.title}
          </Text>
        )}
        {!!note.content && (
          <Text style={[styles.noteContent, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]} numberOfLines={3}>
            {note.content}
          </Text>
        )}
      </View>
      <View style={styles.noteActions}>
        <Pressable onPress={() => onEdit(note)} hitSlop={8}>
          <Pencil size={14} color={c.textMuted} />
        </Pressable>
        <Pressable onPress={() => onDelete(note.id)} hitSlop={8}>
          <Trash2 size={14} color={c.textMuted} />
        </Pressable>
      </View>
    </View>
  )
}

// ── Compact focus timer ───────────────────────────────────────────────────────

function FocusTab() {
  const { c } = useTheme()
  const router = useRouter()

  const {
    mode, secondsLeft, isRunning, sessionCount,
    start, pause, reset, tick, switchMode, onSessionComplete,
  } = useTimerStore(useShallow(s => ({
    mode:              s.mode,
    secondsLeft:       s.secondsLeft,
    isRunning:         s.isRunning,
    sessionCount:      s.sessionCount,
    start:             s.start,
    pause:             s.pause,
    reset:             s.reset,
    tick:              s.tick,
    switchMode:        s.switchMode,
    onSessionComplete: s.onSessionComplete,
  })))

  const [showXP, setShowXP] = useState(false)
  const [lastXP, setLastXP] = useState(0)
  const xpAnim   = useRef(new Animated.Value(0)).current
  const interval = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    if (isRunning) {
      interval.current = setInterval(async () => {
        const done = tick()
        if (done) {
          clearInterval(interval.current)
          const res = await onSessionComplete()
          if (mode === 'focus') {
            setLastXP(res.xpAwarded ?? 0)
            setShowXP(true)
            Animated.sequence([
              Animated.timing(xpAnim, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }),
              Animated.delay(1800),
              Animated.timing(xpAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start(() => setShowXP(false))
          }
        }
      }, 1000)
    } else {
      clearInterval(interval.current)
    }
    return () => clearInterval(interval.current)
  }, [isRunning, tick])

  const m = Math.floor(secondsLeft / 60)
  const s = secondsLeft % 60
  const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

  const modeColor =
    mode === 'focus'      ? c.brand :
    mode === 'shortBreak' ? '#22c55e' : '#a78bfa'

  const xpY = xpAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] })

  return (
    <ScrollView contentContainerStyle={styles.focusScroll} showsVerticalScrollIndicator={false}>
      {/* Mode chips */}
      <View style={styles.modeRow}>
        {[
          { k: 'focus',      l: 'Diqqat'          },
          { k: 'shortBreak', l: 'Kichik tanaffus'  },
          { k: 'longBreak',  l: 'Katta tanaffus'   },
        ].map(({ k, l }) => (
          <Pressable
            key={k}
            onPress={() => switchMode(k as any)}
            style={[styles.modeChip, { backgroundColor: mode === k ? c.brand : c.bgTertiary }]}
          >
            <Text style={[styles.modeChipText, {
              color:      mode === k ? '#fff' : c.textMuted,
              fontFamily: typography.fontFamily.medium,
            }]}>{l}</Text>
          </Pressable>
        ))}
      </View>

      {/* Clock */}
      <View style={[styles.clockWrap, { borderColor: modeColor + '44' }]}>
        <Text style={[styles.clockText, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          {timeStr}
        </Text>
        <Text style={[styles.clockMode, { color: modeColor, fontFamily: typography.fontFamily.medium }]}>
          {mode === 'focus' ? 'Diqqat' : mode === 'shortBreak' ? 'Kichik tanaffus' : 'Katta tanaffus'}
        </Text>
      </View>

      {/* XP burst */}
      {showXP && (
        <Animated.View style={[styles.xpBurst, { opacity: xpAnim, transform: [{ translateY: xpY }] }]}>
          <View style={[styles.xpCard, { backgroundColor: c.brand }]}>
            <Zap size={14} color="#fff" />
            <Text style={styles.xpText}>+{lastXP} XP</Text>
          </View>
        </Animated.View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable onPress={reset} style={[styles.ctrlBtn, { backgroundColor: c.bgTertiary }]}>
          <Text style={[styles.ctrlIcon, { color: c.textSecondary }]}>↺</Text>
        </Pressable>
        <Pressable
          onPress={isRunning ? pause : start}
          style={[styles.playBtn, { backgroundColor: modeColor }]}
        >
          <Text style={styles.playIcon}>{isRunning ? '⏸' : '▶'}</Text>
        </Pressable>
        <View style={[styles.ctrlBtn, { backgroundColor: c.bgTertiary }]}>
          <Text style={[styles.ctrlLabel, { color: c.textMuted, fontFamily: typography.fontFamily.bold }]}>
            {sessionCount}
          </Text>
          <Text style={[styles.ctrlSublabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            seans
          </Text>
        </View>
      </View>

      {/* Full timer link */}
      <Pressable
        onPress={() => router.push('/(screens)/focus-timer' as any)}
        style={[styles.fullTimerLink, { backgroundColor: c.bgSecondary, borderColor: c.border }]}
      >
        <Timer size={14} color={c.textMuted} />
        <Text style={[styles.fullTimerText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
          To'liq taymer → ambient ovoz, statistika
        </Text>
        <ChevronRight size={14} color={c.textMuted} />
      </Pressable>
    </ScrollView>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function WorkspaceScreen() {
  const { c }  = useTheme()
  const router = useRouter()
  const { user } = useAuthStore()

  const [tab, setTab] = useState<WorkspaceTab>('tasks')

  // ── Tasks state ──────────────────────────────────────────────────────────────
  const [tasks,         setTasks]         = useState<Task[]>([])
  const [tasksLoading,  setTasksLoading]  = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [newTaskTitle,  setNewTaskTitle]  = useState('')
  const [newTaskPrio,   setNewTaskPrio]   = useState<Task['priority']>('medium')
  const [savingTask,    setSavingTask]    = useState(false)

  // ── Notes state ──────────────────────────────────────────────────────────────
  const [notes,         setNotes]         = useState<Note[]>([])
  const [notesLoading,  setNotesLoading]  = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [editingNote,   setEditingNote]   = useState<Note | null>(null)
  const [noteTitle,     setNoteTitle]     = useState('')
  const [noteContent,   setNoteContent]   = useState('')
  const [savingNote,    setSavingNote]    = useState(false)
  const [confirm, setConfirm] = useState<{ visible: boolean; title: string; message?: string; onConfirm: () => void }>({ visible: false, title: '', onConfirm: () => {} })

  // ── Courses state ────────────────────────────────────────────────────────────
  const [enrolled,        setEnrolled]        = useState<EnrolledCourse[]>([])
  const [coursesLoading,  setCoursesLoading]  = useState(false)

  // ── Load tasks ───────────────────────────────────────────────────────────────
  const loadTasks = useCallback(async () => {
    if (!user) return
    setTasksLoading(true)
    try {
      const data = await request<Task[]>(`/api/v1/planner/tasks/${user.telegram_id}`, { auth: true })
      setTasks(Array.isArray(data) ? data : [])
    } catch {}
    finally { setTasksLoading(false) }
  }, [user])

  // ── Load notes ───────────────────────────────────────────────────────────────
  const loadNotes = useCallback(async () => {
    if (!user) return
    setNotesLoading(true)
    try {
      const data = await request<Note[]>(`/api/v1/planner/notes/${user.telegram_id}`, { auth: true })
      setNotes(Array.isArray(data) ? data : [])
    } catch {}
    finally { setNotesLoading(false) }
  }, [user])

  // ── Load courses ─────────────────────────────────────────────────────────────
  const loadCourses = useCallback(async () => {
    setCoursesLoading(true)
    try {
      const data = await request<EnrolledCourse[]>('/api/v1/enrollments/mine', { auth: true })
      setEnrolled(Array.isArray(data) ? data : [])
    } catch {}
    finally { setCoursesLoading(false) }
  }, [])

  useEffect(() => {
    if (tab === 'tasks')   loadTasks()
    if (tab === 'notes')   loadNotes()
    if (tab === 'courses') loadCourses()
  }, [tab])

  // ── Task actions ─────────────────────────────────────────────────────────────
  const NEXT_STATUS: Record<Task['status'], Task['status']> = {
    todo:        'in_progress',
    in_progress: 'done',
    done:        'todo',
  }

  async function cycleStatus(task: Task) {
    const next = NEXT_STATUS[task.status]
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t))
    try {
      await request(`/api/v1/planner/tasks/${task.id}`, {
        method: 'PUT', auth: true,
        body: JSON.stringify({ status: next }),
      })
    } catch {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t))
    }
  }

  function deleteTask(id: number) {
    setConfirm({
      visible: true,
      title: "Vazifani o'chirish",
      message: "Bu amalni bekor qilib bo'lmaydi. 🗑️",
      onConfirm: async () => {
        setConfirm(s => ({ ...s, visible: false }))
        setTasks(prev => prev.filter(t => t.id !== id))
        try {
          await request(`/api/v1/planner/tasks/${id}`, { method: 'DELETE', auth: true })
        } catch {}
      },
    })
  }

  async function createTask() {
    if (!newTaskTitle.trim()) return
    setSavingTask(true)
    try {
      const task = await request<Task>('/api/v1/planner/tasks', {
        method: 'POST', auth: true,
        body: JSON.stringify({ title: newTaskTitle.trim(), priority: newTaskPrio }),
      })
      setTasks(prev => [task, ...prev])
      setShowTaskModal(false)
      setNewTaskTitle('')
      setNewTaskPrio('medium')
    } catch {}
    finally { setSavingTask(false) }
  }

  // ── Note actions ─────────────────────────────────────────────────────────────
  function openNewNote() {
    setEditingNote(null)
    setNoteTitle('')
    setNoteContent('')
    setShowNoteModal(true)
  }

  function openEditNote(note: Note) {
    setEditingNote(note)
    setNoteTitle(note.title)
    setNoteContent(note.content)
    setShowNoteModal(true)
  }

  async function saveNote() {
    setSavingNote(true)
    try {
      if (editingNote) {
        const updated = await request<Note>(`/api/v1/planner/notes/${editingNote.id}`, {
          method: 'PUT', auth: true,
          body: JSON.stringify({ title: noteTitle, content: noteContent }),
        })
        setNotes(prev => prev.map(n => n.id === editingNote.id ? updated : n))
      } else {
        const note = await request<Note>('/api/v1/planner/notes', {
          method: 'POST', auth: true,
          body: JSON.stringify({ title: noteTitle, content: noteContent }),
        })
        setNotes(prev => [note, ...prev])
      }
      setShowNoteModal(false)
    } catch {}
    finally { setSavingNote(false) }
  }

  function deleteNote(id: number) {
    setConfirm({
      visible: true,
      title: "Qaydni o'chirish",
      message: "Bu amalni bekor qilib bo'lmaydi. 🗑️",
      onConfirm: async () => {
        setConfirm(s => ({ ...s, visible: false }))
        setNotes(prev => prev.filter(n => n.id !== id))
        try {
          await request(`/api/v1/planner/notes/${id}`, { method: 'DELETE', auth: true })
        } catch {}
      },
    })
  }

  // ── Task groups ──────────────────────────────────────────────────────────────
  const grouped: Record<Task['status'], Task[]> = {
    todo:        tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done:        tasks.filter(t => t.status === 'done'),
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bgPrimary }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={c.brand} />
        </Pressable>
        <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Ish joyi
        </Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Pill tab bar */}
      <View style={[styles.tabBarWrap, { borderBottomColor: c.border }]}>
        <View style={[styles.tabPillContainer, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          {TABS.map(({ key, label, Icon }) => {
            const active = tab === key
            return (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                style={[styles.tabPill, active && { backgroundColor: c.brand }]}
              >
                <Icon size={12} color={active ? '#fff' : c.textMuted} />
                <Text style={[styles.tabLabel, {
                  color:      active ? '#fff' : c.textMuted,
                  fontFamily: active ? typography.fontFamily.semibold : typography.fontFamily.regular,
                }]}>{label}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* Tab content */}

      {/* ── Reja (tasks) ─────────────────────────────────────────── */}
      {tab === 'tasks' && (
        <View style={{ flex: 1 }}>
          {tasksLoading ? (
            <ActivityIndicator color={c.brand} style={{ marginTop: spacing['2xl'] }} />
          ) : (
            <ScrollView contentContainerStyle={styles.taskScroll} showsVerticalScrollIndicator={false}>
              {(['todo', 'in_progress', 'done'] as Task['status'][]).map(status => {
                const group = grouped[status]
                return (
                  <View key={status}>
                    <View style={styles.groupHeader}>
                      <View style={[styles.groupDot, { backgroundColor: STATUS_COLORS[status] }]} />
                      <Text style={[styles.groupLabel, { color: c.textMuted, fontFamily: typography.fontFamily.semibold }]}>
                        {STATUS_LABELS[status]}
                      </Text>
                      <Text style={[styles.groupCount, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                        {group.length}
                      </Text>
                    </View>
                    {group.map(task => (
                      <TaskItem key={task.id} task={task} onStatusCycle={cycleStatus} onDelete={deleteTask} />
                    ))}
                    {group.length === 0 && (
                      <Text style={[styles.emptyGroup, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                        Vazifalar yo'q
                      </Text>
                    )}
                  </View>
                )
              })}
              <View style={{ height: 80 }} />
            </ScrollView>
          )}

          {/* FAB */}
          <Pressable
            onPress={() => setShowTaskModal(true)}
            style={[styles.fab, { backgroundColor: c.brand }]}
          >
            <Plus size={22} color="#fff" />
          </Pressable>
        </View>
      )}

      {/* ── O'qish (courses) ─────────────────────────────────────── */}
      {tab === 'courses' && (
        coursesLoading ? (
          <ActivityIndicator color={c.brand} style={{ marginTop: spacing['2xl'] }} />
        ) : enrolled.length === 0 ? (
          <View style={styles.empty}>
            <BookOpen size={40} color={c.textMuted} />
            <Text style={[styles.emptyText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              Hech qanday kursga yozilmagansiz
            </Text>
            <Pressable
              onPress={() => router.push('/(screens)/courses' as any)}
              style={[styles.emptyBtn, { backgroundColor: c.brand }]}
            >
              <Text style={[styles.emptyBtnText, { fontFamily: typography.fontFamily.semibold }]}>
                Kurslarni ko'rish
              </Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={enrolled}
            keyExtractor={item => String(item.course_id)}
            contentContainerStyle={styles.courseList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const course = item.courses
              return (
                <Pressable
                  onPress={() => router.push(`/(screens)/course/${course.id}` as any)}
                  style={[styles.courseCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}
                >
                  {course.thumbnail_url ? (
                    <Image source={{ uri: course.thumbnail_url }} style={styles.courseCover} resizeMode="cover" />
                  ) : (
                    <View style={[styles.courseCover, { backgroundColor: c.bgTertiary, alignItems: 'center', justifyContent: 'center' }]}>
                      <BookOpen size={24} color={c.textMuted} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.courseTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]} numberOfLines={2}>
                      {course.title}
                    </Text>
                    <Text style={[styles.courseMeta, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                      {course.is_paid && course.price
                        ? `${course.price.toLocaleString('uz-UZ')} so'm`
                        : 'Bepul'}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={c.textMuted} />
                </Pressable>
              )
            }}
          />
        )
      )}

      {/* ── Fokus (inline timer) ─────────────────────────────────── */}
      {tab === 'focus' && <FocusTab />}

      {/* ── Qaydlar (notes) ─────────────────────────────────────── */}
      {tab === 'notes' && (
        <View style={{ flex: 1 }}>
          {notesLoading ? (
            <ActivityIndicator color={c.brand} style={{ marginTop: spacing['2xl'] }} />
          ) : notes.length === 0 ? (
            <View style={styles.empty}>
              <FileText size={40} color={c.textMuted} />
              <Text style={[styles.emptyText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                Qaydlar yo'q
              </Text>
            </View>
          ) : (
            <FlatList
              data={notes}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={styles.noteList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <NoteItem note={item} onEdit={openEditNote} onDelete={deleteNote} />
              )}
            />
          )}

          <Pressable
            onPress={openNewNote}
            style={[styles.fab, { backgroundColor: c.brand }]}
          >
            <Plus size={22} color="#fff" />
          </Pressable>
        </View>
      )}

      {/* ── New task modal ───────────────────────────────────────── */}
      <Modal visible={showTaskModal} transparent animationType="slide" onRequestClose={() => setShowTaskModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={[styles.modalBackdrop, { backgroundColor: c.overlay }]} onPress={() => setShowTaskModal(false)} />
          <View style={[styles.modalSheet, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
                Yangi vazifa
              </Text>
              <Pressable onPress={() => setShowTaskModal(false)} hitSlop={8}>
                <X size={18} color={c.textMuted} />
              </Pressable>
            </View>

            <TextInput
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              placeholder="Vazifa nomi..."
              placeholderTextColor={c.textMuted}
              style={[styles.modalInput, {
                backgroundColor: c.bgTertiary,
                color: c.textPrimary,
                borderColor: newTaskTitle ? c.brand : c.border,
                fontFamily: typography.fontFamily.regular,
              }]}
              autoFocus
            />

            {/* Priority picker */}
            <Text style={[styles.modalLabel, { color: c.textMuted, fontFamily: typography.fontFamily.medium }]}>
              Muhimlik
            </Text>
            <View style={styles.prioRow}>
              {(['low', 'medium', 'high'] as Task['priority'][]).map(p => (
                <Pressable
                  key={p}
                  onPress={() => setNewTaskPrio(p)}
                  style={[styles.prioChip, {
                    backgroundColor: newTaskPrio === p ? PRIORITY_COLORS[p] + '22' : c.bgTertiary,
                    borderColor:     newTaskPrio === p ? PRIORITY_COLORS[p] : c.border,
                    borderWidth: 1,
                  }]}
                >
                  <Text style={[styles.prioText, {
                    color:      newTaskPrio === p ? PRIORITY_COLORS[p] : c.textMuted,
                    fontFamily: typography.fontFamily.medium,
                  }]}>
                    {p === 'low' ? 'Past' : p === 'medium' ? "O'rta" : 'Yuqori'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={createTask}
              disabled={!newTaskTitle.trim() || savingTask}
              style={[styles.modalSaveBtn, { backgroundColor: newTaskTitle.trim() ? c.brand : c.bgTertiary }]}
            >
              {savingTask
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={[styles.modalSaveBtnText, { fontFamily: typography.fontFamily.semibold }]}>
                    Qo'shish
                  </Text>
              }
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Note modal ───────────────────────────────────────────── */}
      <Modal visible={showNoteModal} transparent animationType="slide" onRequestClose={() => setShowNoteModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowNoteModal(false)} />
          <View style={[styles.modalSheet, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
                {editingNote ? 'Qaydni tahrirlash' : 'Yangi qayd'}
              </Text>
              <Pressable onPress={() => setShowNoteModal(false)} hitSlop={8}>
                <X size={18} color={c.textMuted} />
              </Pressable>
            </View>

            <TextInput
              value={noteTitle}
              onChangeText={setNoteTitle}
              placeholder="Sarlavha (ixtiyoriy)..."
              placeholderTextColor={c.textMuted}
              style={[styles.modalInput, {
                backgroundColor: c.bgTertiary,
                color: c.textPrimary,
                borderColor: c.border,
                fontFamily: typography.fontFamily.regular,
              }]}
            />
            <TextInput
              value={noteContent}
              onChangeText={setNoteContent}
              placeholder="Qayd matni..."
              placeholderTextColor={c.textMuted}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={[styles.modalTextarea, {
                backgroundColor: c.bgTertiary,
                color: c.textPrimary,
                borderColor: noteContent ? c.brand : c.border,
                fontFamily: typography.fontFamily.regular,
              }]}
              autoFocus={!editingNote}
            />

            <Pressable
              onPress={saveNote}
              disabled={(!noteTitle.trim() && !noteContent.trim()) || savingNote}
              style={[styles.modalSaveBtn, {
                backgroundColor: (noteTitle.trim() || noteContent.trim()) ? c.brand : c.bgTertiary,
              }]}
            >
              {savingNote
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={[styles.modalSaveBtnText, { fontFamily: typography.fontFamily.semibold }]}>
                    {editingNote ? 'Saqlash' : "Qo'shish"}
                  </Text>
              }
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmModal
        visible={confirm.visible}
        emoji="🗑️"
        title={confirm.title}
        message={confirm.message}
        confirmText="O'chirish"
        danger
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm(s => ({ ...s, visible: false }))}
      />
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

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
  title: {
    flex:      1,
    fontSize:  typography.size.lg,
    textAlign: 'center',
  },

  tabBarWrap: {
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderBottomWidth: 1,
  },
  tabPillContainer: {
    flexDirection: 'row',
    borderRadius:  radius.xl,
    borderWidth:   1,
    padding:       3,
    gap:           3,
  },
  tabPill: {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             4,
    paddingVertical: spacing.xs + 2,
    borderRadius:    radius.lg,
  },
  tabLabel: {
    fontSize: 11,
  },

  // Tasks
  taskScroll: {
    padding:       spacing.sm,
    paddingBottom: 100,
  },
  groupHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  groupDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  groupLabel: {
    flex:     1,
    fontSize: typography.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupCount: {
    fontSize: typography.size.xs,
  },
  taskCard: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    borderRadius:      radius.xl,
    borderWidth:       1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical:   spacing.sm,
    marginBottom:      spacing.xs,
  },
  taskCheck: {
    flexShrink: 0,
  },
  taskTitle: {
    fontSize:   typography.size.sm,
    lineHeight: 20,
  },
  taskDone: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
    marginTop:     3,
  },
  statusDot: {
    width: 6, height: 6, borderRadius: 3,
  },
  taskMetaText: {
    fontSize: 11,
    flex:     1,
  },
  priorityDot: {
    width: 6, height: 6, borderRadius: 3,
  },
  taskDeleteBtn: {
    flexShrink: 0,
    padding: spacing.xs,
  },
  emptyGroup: {
    fontSize:  typography.size.xs,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    opacity:   0.6,
  },

  // Courses
  courseList: {
    padding:       spacing.sm,
    paddingBottom: 80,
    gap:           spacing.sm,
  },
  courseCard: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    borderRadius:      radius.xl,
    borderWidth:       1,
    overflow:          'hidden',
  },
  courseCover: {
    width:  72,
    height: 60,
    flexShrink: 0,
  },
  courseTitle: {
    fontSize:   typography.size.sm,
    lineHeight: 20,
  },
  courseMeta: {
    fontSize:  11,
    marginTop: 3,
  },

  // Focus
  focusScroll: {
    padding:       spacing.base,
    gap:           spacing.lg,
    paddingBottom: spacing['3xl'],
    alignItems:    'center',
  },
  modeRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    flexWrap:      'wrap',
    justifyContent: 'center',
  },
  modeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xs + 2,
    borderRadius:      radius.full,
  },
  modeChipText: { fontSize: typography.size.sm },
  clockWrap: {
    width:          200,
    height:         200,
    borderRadius:   100,
    borderWidth:    5,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing.xs,
  },
  clockText: {
    fontSize: 48,
    lineHeight: 56,
  },
  clockMode: {
    fontSize: typography.size.xs,
  },
  xpBurst: { alignItems: 'center' },
  xpCard: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.md,
    borderRadius:      radius.xl,
  },
  xpText: {
    color: '#fff',
    fontSize: typography.size.lg,
    fontWeight: '800',
  },
  controls: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing.xl,
  },
  ctrlBtn: {
    width:          52,
    height:         52,
    borderRadius:   26,
    alignItems:     'center',
    justifyContent: 'center',
  },
  ctrlIcon:     { fontSize: 22 },
  ctrlLabel:    { fontSize: typography.size.lg },
  ctrlSublabel: { fontSize: typography.size.xs },
  playBtn: {
    width:          68,
    height:         68,
    borderRadius:   34,
    alignItems:     'center',
    justifyContent: 'center',
    elevation:      6,
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.35,
    shadowRadius:   8,
  },
  playIcon: { color: '#fff', fontSize: 28, lineHeight: 32 },
  fullTimerLink: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderRadius:      radius.xl,
    borderWidth:       1,
    alignSelf:         'stretch',
  },
  fullTimerText: {
    flex:     1,
    fontSize: typography.size.xs,
  },

  // Notes
  noteList: {
    padding:       spacing.sm,
    paddingBottom: 100,
    gap:           spacing.sm,
  },
  noteCard: {
    flexDirection:  'row',
    borderRadius:   radius.xl,
    borderWidth:    1,
    overflow:       'hidden',
    paddingVertical: spacing.sm,
    paddingRight:   spacing.sm,
  },
  noteAccent: {
    width:   4,
    flexShrink: 0,
    borderRadius: 2,
    marginLeft: 0,
  },
  noteTitle: {
    fontSize:   typography.size.sm,
    lineHeight: 20,
  },
  noteContent: {
    fontSize:   typography.size.xs,
    lineHeight: 18,
    marginTop:  2,
    opacity:    0.8,
  },
  noteActions: {
    gap:         spacing.sm,
    alignItems:  'center',
    flexShrink:  0,
    paddingLeft: spacing.xs,
  },

  // FAB
  fab: {
    position:       'absolute',
    bottom:         spacing.xl,
    right:          spacing.base,
    width:          52,
    height:         52,
    borderRadius:   26,
    alignItems:     'center',
    justifyContent: 'center',
    elevation:      6,
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.35,
    shadowRadius:   8,
  },

  // Empty
  empty: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing.sm,
    paddingVertical: 80,
  },
  emptyText: {
    fontSize:  typography.size.sm,
    textAlign: 'center',
  },
  emptyBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderRadius:      radius.xl,
    marginTop:         spacing.sm,
  },
  emptyBtnText: {
    color:    '#fff',
    fontSize: typography.size.sm,
  },

  // Modals
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius:  radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    borderTopWidth:       1,
    borderLeftWidth:      1,
    borderRightWidth:     1,
    padding:              spacing.base,
    gap:                  spacing.sm,
  },
  modalHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   spacing.xs,
  },
  modalTitle: {
    fontSize: typography.size.md,
  },
  modalLabel: {
    fontSize:   typography.size.xs,
    marginTop:  spacing.xs,
    marginBottom: 2,
  },
  modalInput: {
    borderRadius:      radius.xl,
    borderWidth:       1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical:   spacing.sm,
    fontSize:          typography.size.base,
    minHeight:         44,
  },
  modalTextarea: {
    borderRadius:      radius.lg,
    borderWidth:       1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical:   spacing.sm,
    fontSize:          typography.size.base,
    minHeight:         120,
  },
  prioRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginBottom:  spacing.xs,
  },
  prioChip: {
    flex:             1,
    alignItems:       'center',
    paddingVertical:  spacing.xs + 2,
    borderRadius:     radius.full,
  },
  prioText: {
    fontSize: typography.size.xs,
  },
  modalSaveBtn: {
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: spacing.sm + 2,
    borderRadius:    radius.xl,
    marginTop:       spacing.xs,
  },
  modalSaveBtnText: {
    color:    '#fff',
    fontSize: typography.size.sm,
  },
})

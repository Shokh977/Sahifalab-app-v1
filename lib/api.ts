/**
 * api.ts — typed fetch wrapper for the FastAPI backend.
 *
 * All auth routes live under /api/auth/.
 * The JWT is stored in SecureStore (via authStore) and injected here.
 */
import * as SecureStore from 'expo-secure-store'
import { API_URL } from './constants'
import type {
  FlashcardDeck, Flashcard, FlashcardStats,
  StudySession, ReviewResult, CompleteSessionResult,
} from './types'

export const TOKEN_KEY = 'sahifalab_jwt'

async function getToken(): Promise<string | null> {
  try { return await SecureStore.getItemAsync(TOKEN_KEY) }
  catch { return null }
}

export async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = false, ...init } = options

  const fullUrl = `${API_URL}${path}`
  if (!fullUrl.startsWith('https://') && !fullUrl.startsWith('http://localhost') && !fullUrl.startsWith('http://127.')) {
    throw new Error('Only HTTPS connections are allowed')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  }
  if (auth) {
    const token = await getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(fullUrl, { ...init, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = data?.detail ?? `HTTP ${res.status}`
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message))
  }
  return data as T
}

// ── Auth responses ────────────────────────────────────────────────────────────

export interface AuthResponse {
  access_token:   string
  token_type:     string
  telegram_id:    number
  first_name:     string
  username:       string | null
  photo_url:      string | null
  email:          string | null
  email_verified: boolean
  has_password:   boolean
  role:           string
  status:         string
}

export interface MeResponse extends AuthResponse {
  level:               number
  total_xp:            number
  bio:                 string | null
  streak_days:         number
  daily_goal_minutes:  number
}

// ── Auth endpoints ────────────────────────────────────────────────────────────

export const auth = {
  emailRegister: (body: { first_name: string; email: string; password: string }) =>
    request<{ status: string; email: string; message: string }>(
      '/api/auth/email-register', { method: 'POST', body: JSON.stringify(body) },
    ),

  emailLogin: (body: { email: string; password: string }) =>
    request<AuthResponse>(
      '/api/auth/email-login', { method: 'POST', body: JSON.stringify(body) },
    ),

  googleLogin: (id_token: string) =>
    request<AuthResponse>(
      '/api/auth/google', { method: 'POST', body: JSON.stringify({ id_token }) },
    ),

  // Telegram Login Widget — sends verified hash data from the widget
  telegramLogin: (data: {
    id: number; first_name: string; username?: string
    photo_url?: string; auth_date: number; hash: string
  }) =>
    request<AuthResponse>(
      '/api/auth/telegram', { method: 'POST', body: JSON.stringify(data) },
    ),

  me: () =>
    request<MeResponse>('/api/auth/me', { auth: true }),

  forgotPassword: (email: string) =>
    request<{ ok: boolean }>('/api/auth/forgot-password', {
      method: 'POST', body: JSON.stringify({ email }),
    }),

  resendVerification: (email: string) =>
    request<{ ok: boolean }>('/api/auth/resend-verification', {
      method: 'POST', body: JSON.stringify({ email }),
    }),

  logout: () =>
    request<{ ok: boolean }>('/api/auth/logout', { method: 'POST', auth: true }),

  // Link an email address to the current Telegram/Google profile (merges old email-only data)
  linkEmail: (email: string) =>
    request<{ ok: boolean; email: string; merged: boolean; message?: string }>(
      '/api/auth/link-email', { method: 'POST', auth: true, body: JSON.stringify({ email }) },
    ),

  // Bot-code flow: generate a code → open t.me/bot?start=auth_{code} → poll verifyCode
  requestCode: () =>
    request<{ code: string; bot_link: string; expires_in_seconds: number }>(
      '/api/auth/request-code', { method: 'POST' },
    ),

  verifyCode: (code: string) =>
    request<AuthResponse | { status: 'pending' }>(`/api/auth/verify-code/${code}`),
}

// ── Social / Feed endpoints ───────────────────────────────────────────────────

export interface FeedResponse {
  items:    import('./types').Post[]
  total:    number
  page:     number
  has_more: boolean
}

export interface CommentItem {
  id:          number
  content:     string
  author:      import('./types').PostAuthor
  created_at:  string
  likes_count: number
  is_liked:    boolean
  parent_id:   number | null
}

export const social = {
  getFeed: (page = 1, pageSize = 20) =>
    request<FeedResponse>(
      `/api/v1/social/posts/feed?page=${page}&page_size=${pageSize}`,
      { auth: true },
    ),

  getExplore: (page = 1, pageSize = 20) =>
    request<FeedResponse>(
      `/api/v1/social/posts/explore?page=${page}&page_size=${pageSize}`,
      { auth: true },
    ),

  createPost: (body: { content: string; image_url?: string | null; image_urls?: string[] }) =>
    request<import('./types').Post>(
      '/api/v1/social/posts',
      { method: 'POST', body: JSON.stringify(body), auth: true },
    ),

  likePost: (postId: number) =>
    request<{ ok: boolean }>(
      `/api/v1/social/posts/${postId}/like`,
      { method: 'POST', auth: true },
    ),

  unlikePost: (postId: number) =>
    request<{ ok: boolean }>(
      `/api/v1/social/posts/${postId}/like`,
      { method: 'DELETE', auth: true },
    ),

  repostPost: (postId: number) =>
    request<{ ok: boolean }>(
      `/api/v1/social/posts/${postId}/repost`,
      { method: 'POST', auth: true },
    ),

  unrepostPost: (postId: number) =>
    request<{ ok: boolean }>(
      `/api/v1/social/posts/${postId}/repost`,
      { method: 'DELETE', auth: true },
    ),

  savePost: (postId: number) =>
    request<{ ok: boolean }>(
      `/api/v1/social/posts/${postId}/save`,
      { method: 'POST', auth: true },
    ),

  unsavePost: (postId: number) =>
    request<{ ok: boolean }>(
      `/api/v1/social/posts/${postId}/save`,
      { method: 'DELETE', auth: true },
    ),

  getComments: (postId: number) =>
    request<CommentItem[]>(
      `/api/v1/social/posts/${postId}/comments`,
      { auth: true },
    ),

  addComment: (postId: number, content: string, parentId?: number) =>
    request<CommentItem>(
      `/api/v1/social/posts/${postId}/comments`,
      { method: 'POST', body: JSON.stringify({ content, ...(parentId ? { parent_id: parentId } : {}) }), auth: true },
    ),

  likeComment: (commentId: number) =>
    request<{ ok: boolean }>(
      `/api/v1/social/comments/${commentId}/like`,
      { method: 'POST', auth: true },
    ),

  unlikeComment: (commentId: number) =>
    request<{ ok: boolean }>(
      `/api/v1/social/comments/${commentId}/like`,
      { method: 'DELETE', auth: true },
    ),

  recordView: (postId: number) =>
    request<{ ok: boolean }>(
      `/api/v1/social/posts/${postId}/view`,
      { method: 'POST', auth: true },
    ),

  deletePost: (postId: number) =>
    request<{ ok: boolean }>(
      `/api/v1/social/posts/${postId}`,
      { method: 'DELETE', auth: true },
    ),

  updatePost: (postId: number, content: string) =>
    request<import('./types').Post>(
      `/api/v1/social/posts/${postId}`,
      { method: 'PATCH', body: JSON.stringify({ content }), auth: true },
    ),

  deleteComment: (commentId: number) =>
    request<{ ok: boolean }>(
      `/api/v1/social/comments/${commentId}`,
      { method: 'DELETE', auth: true },
    ),

  // Triggers a server-side push notification to the parent comment's author.
  // Message sent: "[sender_name] sizning izohingizga javob berdi"
  notifyReply: (parentCommentId: number) =>
    request<{ ok: boolean }>(
      `/api/v1/social/comments/${parentCommentId}/reply-notify`,
      { method: 'POST', auth: true },
    ),
}

// ── Upload ────────────────────────────────────────────────────────────────────

export async function uploadPostImage(
  localUri: string,
  mimeType = 'image/jpeg',
): Promise<string> {
  const token = await getToken()
  const form  = new FormData()
  form.append('file', { uri: localUri, type: mimeType, name: 'photo.jpg' } as any)

  const res = await fetch(`${API_URL}/api/upload/post-image`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
    body:    form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.detail ?? `Upload failed ${res.status}`)
  return data.url as string
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface SearchPerson {
  id:           number
  name:         string
  username:     string | null
  avatar_url:   string | null
  headline:     string | null
  is_verified:  boolean
  is_connected?: boolean
}

export interface SearchCourse {
  id:           number
  title:        string
  thumbnail_url: string | null
  teacher_name: string
  is_paid:      boolean
  price:        number
}

export interface SearchPost {
  id:         number
  content:    string
  author:     string | { id?: number; name?: string; username?: string; avatar_url?: string } | null
  created_at: string
}

export interface SearchResults {
  people?:  SearchPerson[]
  courses?: SearchCourse[]
  posts?:   SearchPost[]
  jobs?:    Array<{ id: number; title: string; company: string }>
}

export const search = {
  all: (q: string) =>
    request<SearchResults>(`/api/search?q=${encodeURIComponent(q)}&type=all`, { auth: true }),

  people: (q: string) =>
    request<SearchResults>(`/api/search?q=${encodeURIComponent(q)}&type=people`, { auth: true }),
}

// ── Profile endpoints ─────────────────────────────────────────────────────────

import type { ProfileData, ActivityItem } from './types'

export const profile = {
  getMe: () =>
    request<ProfileData>('/api/profile/me', { auth: true }),

  getPublic: (identifier: string | number) =>
    request<ProfileData>(`/api/profile/${identifier}`, { auth: true }),

  updateMe: (body: {
    first_name?:     string
    headline?:       string
    bio?:            string
    location_city?:  string
    website_url?:    string
    photo_url?:      string
    cover_image_url?: string
    site_username?:  string
  }) =>
    request<{ ok: boolean }>('/api/profile/me', {
      method: 'PUT', body: JSON.stringify(body), auth: true,
    }),

  getUserPosts: (targetId: number, page = 1) =>
    request<import('./types').FeedPage>(
      `/api/v1/social/users/${targetId}/posts?page=${page}&page_size=20`,
      { auth: true },
    ),

  // Returns Array<{ user: { telegram_id, full_name, username, photo_url, headline }, created_at }>
  getConnections: (targetId: number) =>
    request<Array<{ user: SocialUser; connected_at: string }>>(
      `/api/v1/social/users/${targetId}/connections`, { auth: true },
    ),

  getFollowers: (targetId: number) =>
    request<Array<{ user: SocialUser; created_at: string }>>(
      `/api/v1/social/users/${targetId}/followers`, { auth: true },
    ),

  getFollowing: (targetId: number) =>
    request<Array<{ user: SocialUser; created_at: string }>>(
      `/api/v1/social/users/${targetId}/following`, { auth: true },
    ),

  getHeatmap: (telegramId: number, days = 365) =>
    request<HeatmapDay[]>(
      `/api/profiles/heatmap?telegram_id=${telegramId}&days=${days}`,
      { auth: true },
    ),
}

export interface HeatmapDay {
  date:     string   // "YYYY-MM-DD"
  quiz:     number
  focus_xp: number
  total:    number
}

/** Shape returned by _profile_to_author in social_service */
export interface SocialUser {
  telegram_id:  number
  full_name:    string
  username:     string | null
  photo_url:    string | null
  headline:     string | null
  is_verified:  boolean
  level:        number
}

export async function uploadProfileImage(
  localUri: string,
  type: 'avatar' | 'cover',
  mimeType = 'image/jpeg',
): Promise<string> {
  const token = await getToken()
  const form  = new FormData()
  form.append('file', { uri: localUri, type: mimeType, name: 'photo.jpg' } as any)
  form.append('type', type)

  const res = await fetch(`${API_URL}/api/profile/me/upload`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
    body:    form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.detail ?? `Upload failed ${res.status}`)
  return data.url as string
}

// ── Connections endpoints ─────────────────────────────────────────────────────

/** Shape returned by GET /api/connections/ */
export interface ConnectionListItem {
  connection_id: number
  accepted_at:   string | null
  user: {
    id:          number
    name:        string
    username:    string | null
    avatar_url:  string | null
    headline:    string
  }
}

export const connections = {
  sendRequest: (receiverId: number) =>
    request<{ ok: boolean; id: number; status: string }>(
      '/api/connections/request',
      { method: 'POST', body: JSON.stringify({ receiver_id: receiverId }), auth: true },
    ),

  cancelRequest: (connectionId: number) =>
    request<{ ok: boolean }>(
      '/api/connections/cancel',
      { method: 'POST', body: JSON.stringify({ connection_id: connectionId }), auth: true },
    ),

  accept: (connId: number) =>
    request<{ ok: boolean }>(
      `/api/connections/${connId}/accept`,
      { method: 'PUT', auth: true },
    ),

  decline: (connId: number) =>
    request<{ ok: boolean }>(
      `/api/connections/${connId}/decline`,
      { method: 'PUT', auth: true },
    ),

  remove: (connId: number) =>
    request<{ ok: boolean }>(
      `/api/connections/${connId}`,
      { method: 'DELETE', auth: true },
    ),

  // Returns a plain array (no wrapper object)
  listOwn: () =>
    request<ConnectionListItem[]>('/api/connections/', { auth: true }),

  // Returns { sent: [...], received: [...] }
  getPending: () =>
    request<{ sent: ConnectionListItem[]; received: ConnectionListItem[] }>(
      '/api/connections/pending', { auth: true },
    ),
}

// ── Skills endpoints ──────────────────────────────────────────────────────────

export const skills = {
  toggleEndorse: (skillId: number) =>
    request<{ ok: boolean; endorsed: boolean }>(
      `/api/skills/${skillId}/endorse`,
      { method: 'POST', auth: true },
    ),
}

// ── Follow endpoints ──────────────────────────────────────────────────────────

export const follows = {
  follow: (targetId: number) =>
    request<{ ok: boolean }>(
      `/api/v1/social/users/${targetId}/follow`,
      { method: 'POST', auth: true },
    ),

  unfollow: (targetId: number) =>
    request<{ ok: boolean }>(
      `/api/v1/social/users/${targetId}/follow`,
      { method: 'DELETE', auth: true },
    ),
}

// ── Courses ───────────────────────────────────────────────────────────────────

export interface Category {
  id:         number
  name:       string
  slug:       string
  icon:       string | null
  sort_order: number
}

export interface Course {
  id:                     number
  teacher_id:             number
  category_id:            number | null
  title:                  string
  slug:                   string
  description:            string | null
  thumbnail_url:          string | null
  price:                  number
  original_price?:        number | null
  is_paid:                boolean
  is_published:           boolean
  level:                  string
  language:               string
  total_lessons:          number
  total_duration_minutes: number
  enrolled_count:         number
  rating:                 number | null
  ratings_count?:         number | null
  created_at:             string
  updated_at?:            string | null
  categories:             { name: string; slug: string; icon: string | null } | null
  what_you_learn?:        string[] | null
  requirements?:          string[] | null
  has_certificate?:       boolean | null
  teacher?: {
    telegram_id: number
    first_name:  string
    photo_url:   string | null
    headline:    string | null
    bio:         string | null
  } | null
}

export interface Lesson {
  id:                   number
  course_id:            number
  title:                string
  description:          string | null
  video_source:         string
  video_url:            string | null
  bunny_video_id:       string | null
  hls_url:              string | null
  embed_url:            string | null
  duration_minutes:     number
  order_index:          number
  is_free:              boolean
  lesson_type:          string
  section_title:        string | null
  material_url:         string | null
  material_name:        string | null
  encoding_status:      string | null
  created_at:           string
  scheduled_at?:        string | null
  zoom_link?:           string | null
  live_duration_minutes?: number | null
  content_html?:        string | null
  test_id?:             number | null
}

export interface CourseReview {
  id:         number
  student_id: number
  rating:     number
  review:     string | null
  created_at: string
  profiles: {
    first_name: string
    username:   string | null
    photo_url:  string | null
  }
}

export interface CourseCertificate {
  course_id:          number
  certificate_id:     string
  issued_at:          string
  total_lessons:      number
  completed_lessons:  number
  courses: { id: number; title: string; thumbnail_url: string | null } | null
}

export const courses = {
  list: (params?: {
    category?: string; level?: string; search?: string
    limit?: number; offset?: number
    is_paid?: boolean; ordering?: string; teacher_id?: number
  }) => {
    const q = new URLSearchParams()
    if (params?.category)              q.set('category', params.category)
    if (params?.level)                 q.set('level', params.level)
    if (params?.search)                q.set('search', params.search)
    if (params?.limit)                 q.set('limit', String(params.limit))
    if (params?.offset)                q.set('offset', String(params.offset))
    if (params?.is_paid !== undefined) q.set('is_paid', String(params.is_paid))
    if (params?.ordering)              q.set('ordering', params.ordering)
    if (params?.teacher_id)            q.set('teacher_id', String(params.teacher_id))
    const qs = q.toString()
    return request<{ courses: Course[]; total: number; limit: number; offset: number }>(
      `/api/courses${qs ? `?${qs}` : ''}`, { auth: true },
    )
  },

  getCategories: () =>
    request<Category[]>('/api/courses/categories'),

  get: (id: number) =>
    request<Course>(`/api/courses/${id}`, { auth: true }),

  getReviews: (courseId: number) =>
    request<CourseReview[]>(`/api/courses/${courseId}/reviews`),

  getMyRating: (courseId: number) =>
    request<{ rating: number; review: string }>(`/api/courses/${courseId}/my-rating`, { auth: true }),

  rate: (courseId: number, rating: number, review?: string) =>
    request<{ ok: boolean }>(
      `/api/courses/${courseId}/rate`,
      { method: 'POST', body: JSON.stringify({ rating, review: review ?? '' }), auth: true },
    ),

}

// ── Lessons ───────────────────────────────────────────────────────────────────

export const lessons = {
  listByCourse: (courseId: number) =>
    request<Lesson[]>(`/api/lessons?course_id=${courseId}`, { auth: true }),

  get: (lessonId: number) =>
    request<Lesson>(`/api/lessons/${lessonId}`, { auth: true }),

  complete: (lessonId: number) =>
    request<{ ok: boolean; certificate_issued: boolean }>(
      `/api/lessons/${lessonId}/complete`,
      { method: 'POST', auth: true },
    ),

  getProgress: (courseId: number) =>
    request<{ completed_lesson_ids: number[] }>(
      `/api/lessons/my-progress?course_id=${courseId}`, { auth: true },
    ),

  getMyCertificates: () =>
    request<CourseCertificate[]>('/api/lessons/my-course-certificates', { auth: true }),

  getDownloadUrl: (lessonId: number) =>
    request<{ download_url: string; expires_in: number }>(
      `/api/lessons/${lessonId}/download-url`, { auth: true },
    ),

  getVideoPosition: (lessonId: number) =>
    request<{ position: number }>(`/api/lessons/${lessonId}/position`, { auth: true }),

  saveVideoPosition: (lessonId: number, positionSeconds: number) =>
    request<{ ok: boolean }>(
      `/api/lessons/${lessonId}/position`,
      { method: 'PATCH', body: JSON.stringify({ position_seconds: positionSeconds }), auth: true },
    ),
}

// ── Messenger ─────────────────────────────────────────────────────────────────

export interface OtherUser {
  telegram_id: number
  full_name:   string
  username:    string | null
  photo_url:   string | null
  role:        string
  level:       number
  xp:          number
}

export interface Conversation {
  id:              number
  other_user:      OtherUser
  last_message:    string | null
  unread_count:    number
  last_message_at: string | null
}

export interface MessageReaction {
  emoji:    string
  count:    number
  user_ids: number[]
}

export interface Message {
  id:                  number
  conversation_id:     number
  sender_id:           number
  content:             string
  is_delivered:        boolean
  is_read:             boolean
  created_at:          string
  reply_to_id?:        number | null
  reply_to_content?:   string | null
  reply_to_sender_id?: number | null
  reactions?:          MessageReaction[]
}

export const messenger = {
  listConversations: () =>
    request<Conversation[]>('/api/v1/messenger/conversations', { auth: true }),

  getOrCreate: (otherUserId: number) =>
    request<Conversation>(`/api/v1/messenger/conversations/${otherUserId}`, {
      method: 'POST', auth: true,
    }),

  listMessages: (convId: number, beforeId?: number, limit = 40) => {
    const q = new URLSearchParams({ limit: String(limit) })
    if (beforeId) q.set('before_id', String(beforeId))
    return request<Message[]>(`/api/v1/messenger/conversations/${convId}/messages?${q}`, { auth: true })
  },

  sendMessage: (convId: number, content: string, replyToId?: number | null) =>
    request<Message>(`/api/v1/messenger/conversations/${convId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, reply_to_id: replyToId ?? null }),
      auth: true,
    }),

  markRead: (convId: number) =>
    request<{ ok: boolean }>(`/api/v1/messenger/conversations/${convId}/read`, {
      method: 'PATCH', auth: true,
    }),

  toggleReaction: (messageId: number, emoji: string) =>
    request<{ action: 'added' | 'removed'; emoji: string; user_id: number; message_id: number }>(
      `/api/v1/messenger/messages/${messageId}/react`,
      { method: 'POST', body: JSON.stringify({ emoji }), auth: true },
    ),

  deleteMessage: (messageId: number) =>
    request<{ ok: boolean }>(`/api/v1/messenger/messages/${messageId}`, {
      method: 'DELETE', auth: true,
    }),

  deleteConversation: (convId: number) =>
    request<{ ok: boolean }>(`/api/v1/messenger/conversations/${convId}`, {
      method: 'DELETE', auth: true,
    }),

  getUnreadCount: () =>
    request<{ count: number }>('/api/v1/messenger/unread-count', { auth: true }),

  savePushToken: (token: string) =>
    request<{ ok: boolean }>('/api/auth/push-token', {
      method: 'POST', body: JSON.stringify({ token }), auth: true,
    }),
}

// ── Group chats ───────────────────────────────────────────────────────────────

export interface GroupChat {
  id:              number
  name:            string
  cover_url:       string | null
  course_id:       number
  created_by:      number
  last_message:    string | null
  last_message_at: string | null
  member_count:    number
  unread_count:    number
}

export interface GroupMessage {
  id:           number
  group_id:     number
  sender_id:    number
  sender_name:  string
  sender_photo: string | null
  content:      string
  created_at:   string
}

export const groups = {
  list: () =>
    request<GroupChat[]>('/api/v1/groups', { auth: true }),

  create: (course_id: number, name: string, cover_url?: string) =>
    request<GroupChat>('/api/v1/groups', {
      method: 'POST',
      body: JSON.stringify({ course_id, name, cover_url }),
      auth: true,
    }),

  get: (groupId: number) =>
    request<GroupChat & { my_role: string; members: any[] }>(`/api/v1/groups/${groupId}`, { auth: true }),

  listMessages: (groupId: number, beforeId?: number, limit = 40) => {
    const q = new URLSearchParams({ limit: String(limit) })
    if (beforeId) q.set('before_id', String(beforeId))
    return request<GroupMessage[]>(`/api/v1/groups/${groupId}/messages?${q}`, { auth: true })
  },

  sendMessage: (groupId: number, content: string) =>
    request<GroupMessage>(`/api/v1/groups/${groupId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
      auth: true,
    }),
}

// ── Focus Timer ───────────────────────────────────────────────────────────────

export interface WeeklyStudyDay {
  date:     string   // "YYYY-MM-DD"
  minutes:  number
  goal_met: boolean
}

export const focus = {
  complete: (minutes: number) =>
    request<{
      xp_awarded:          number
      total_xp:            number
      level:               number
      level_up:            boolean
      achievements_earned: Array<{ id: string; name: string; description: string; xp: number }>
    }>(
      '/api/focus/complete',
      { method: 'POST', body: JSON.stringify({ minutes }), auth: true },
    ),

  weekly: () =>
    request<WeeklyStudyDay[]>('/api/focus/weekly', { auth: true })
      .catch(() => [] as WeeklyStudyDay[]),

  weeklyReport: () =>
    request<{
      first_name:    string
      week_start:    string
      week_end:      string
      total_minutes: number
      prev_minutes:  number
      pct_change:    number
      week_xp:       number
      streak_days:   number
      days_active:   number
      daily_goal:    number
      best_day:      string | null
      best_minutes:  number
      days: Array<{ date: string; minutes: number; goal_met: boolean }>
    }>('/api/focus/weekly-report', { auth: true }),
}

// ── Account actions ───────────────────────────────────────────────────────────

export const account = {
  changePassword: (current_password: string, new_password: string) =>
    request<{ ok: boolean }>(
      '/api/auth/change-password',
      { method: 'POST', body: JSON.stringify({ current_password, new_password }), auth: true },
    ),

  getNotifPrefs: () =>
    request<{ streak: boolean; course: boolean; achieve: boolean; weekly: boolean }>(
      '/api/auth/notification-prefs',
      { auth: true },
    ),

  saveNotifPrefs: (prefs: Record<string, boolean>) =>
    request<{ ok: boolean }>(
      '/api/auth/notification-prefs',
      { method: 'PUT', body: JSON.stringify({ prefs }), auth: true },
    ),

  deleteAccount: () =>
    request<{ ok: boolean }>(
      '/api/auth/me',
      { method: 'DELETE', auth: true },
    ),

  applyTeacher: (body: {
    specialization:   string
    experience_years: number
    bio:              string
    course_idea:      string
    motivation:       string
    contact:          string
  }) =>
    request<{ ok: boolean; already_applied?: boolean; status?: string }>(
      '/api/auth/apply-teacher',
      { method: 'POST', body: JSON.stringify(body), auth: true },
    ),
}

// ── Flashcards ────────────────────────────────────────────────────────────────

export const flashcards = {
  listDecks: () =>
    request<FlashcardDeck[]>('/api/flashcards/decks', { auth: true }),

  createDeck: (body: { title: string; description?: string; color?: string; icon?: string; course_id?: number }) =>
    request<FlashcardDeck>('/api/flashcards/decks', {
      method: 'POST', body: JSON.stringify(body), auth: true,
    }),

  getDeck: (id: number) =>
    request<FlashcardDeck>(`/api/flashcards/decks/${id}`, { auth: true }),

  updateDeck: (id: number, body: { title?: string; description?: string; color?: string; icon?: string }) =>
    request<FlashcardDeck>(`/api/flashcards/decks/${id}`, {
      method: 'PATCH', body: JSON.stringify(body), auth: true,
    }),

  deleteDeck: (id: number) =>
    request<void>(`/api/flashcards/decks/${id}`, { method: 'DELETE', auth: true }),

  listCards: (deckId: number) =>
    request<Flashcard[]>(`/api/flashcards/decks/${deckId}/cards`, { auth: true }),

  addCard: (deckId: number, body: { front_text: string; back_text: string; position?: number }) =>
    request<Flashcard>(`/api/flashcards/decks/${deckId}/cards`, {
      method: 'POST', body: JSON.stringify(body), auth: true,
    }),

  updateCard: (id: number, body: { front_text?: string; back_text?: string }) =>
    request<Flashcard>(`/api/flashcards/cards/${id}`, {
      method: 'PATCH', body: JSON.stringify(body), auth: true,
    }),

  deleteCard: (id: number) =>
    request<void>(`/api/flashcards/cards/${id}`, { method: 'DELETE', auth: true }),

  getStudySession: (deckId: number, practice?: boolean) =>
    request<StudySession>(`/api/flashcards/decks/${deckId}/study${practice ? '?practice=1' : ''}`, { auth: true }),

  reviewCard: (id: number, body: { rating: number; time_spent_ms?: number }) =>
    request<ReviewResult>(`/api/flashcards/cards/${id}/review`, {
      method: 'POST', body: JSON.stringify(body), auth: true,
    }),

  completeSession: (deckId: number, body: { total_time_ms: number; cards_reviewed: number }) =>
    request<CompleteSessionResult>(`/api/flashcards/decks/${deckId}/complete`, {
      method: 'POST', body: JSON.stringify(body), auth: true,
    }),

  getStats: () =>
    request<FlashcardStats>('/api/flashcards/stats', { auth: true }),
}

// ── Onboarding ────────────────────────────────────────────────────────────────

export const onboarding = {
  /** Save selected interest/category IDs after the pick-interests step. */
  saveInterests: (categoryIds: number[]) =>
    request<{ ok: boolean }>('/api/profile/interests', {
      method: 'POST',
      body:   JSON.stringify({ category_ids: categoryIds }),
      auth:   true,
    }).catch(() => ({ ok: true })),   // non-fatal if endpoint not yet deployed

  /** Persist daily study goal on the user profile. */
  setDailyGoal: (minutes: number) =>
    request<{ ok: boolean }>('/api/auth/me', {
      method: 'PATCH',
      body:   JSON.stringify({ daily_goal_minutes: minutes }),
      auth:   true,
    }).catch(() => ({ ok: true })),

  /** Save user's self-reported experience level (beginner / intermediate / advanced). */
  saveExperience: (level: 'beginner' | 'intermediate' | 'advanced') =>
    request<{ ok: boolean }>('/api/auth/me', {
      method: 'PATCH',
      body:   JSON.stringify({ experience_level: level }),
      auth:   true,
    }).catch(() => ({ ok: true })),

  /** Save user's primary learning motivation for segmentation. */
  saveMotivation: (motivation: 'career' | 'skill' | 'self' | 'exam') =>
    request<{ ok: boolean }>('/api/auth/me', {
      method: 'PATCH',
      body:   JSON.stringify({ learning_motivation: motivation }),
      auth:   true,
    }).catch(() => ({ ok: true })),

  /** Register FCM / APNs device token for push notifications. */
  savePushToken: (token: string) =>
    request<{ ok: boolean }>('/api/auth/push-token', {
      method: 'POST',
      body:   JSON.stringify({ token }),
      auth:   true,
    }).catch(() => ({ ok: true })),
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank:        number
  telegram_id: number
  first_name:  string
  username:    string | null
  photo_url:   string | null
  level:       number
  score:       number
  minutes:     number  // focus minutes in the selected period
  is_me:       boolean
}

type _OldLbRow = {
  telegram_id: number; first_name: string | null; username: string | null
  photo_url: string | null; level: number; total_xp: number
}

function _mapOldLb(rows: _OldLbRow[]): { entries: LeaderboardEntry[]; my_rank: number | null } {
  return {
    entries: rows.map((r, i): LeaderboardEntry => ({
      rank:        i + 1,
      telegram_id: r.telegram_id,
      first_name:  r.first_name  || '',
      username:    r.username    || null,
      photo_url:   r.photo_url   || null,
      level:       r.level       || 1,
      score:       r.total_xp    || 0,
      minutes:     0,
      is_me:       false,
    })),
    my_rank: null,
  }
}

export type LeaderboardPeriod = 'week' | 'month' | 'all'

export const leaderboard = {
  weekly: async (period: LeaderboardPeriod = 'week') => {
    try {
      const res = await request<{ entries: LeaderboardEntry[]; my_rank: number | null }>(
        `/api/leaderboard/weekly?period=${period}`, { auth: true },
      )
      // For week/month: sparse results are correct (only active users) — return as-is.
      // For all: fall back to old endpoint if new one is missing data.
      if (res.entries && (period !== 'all' || res.entries.length >= 10)) return res
    } catch {}
    // Fallback for 'all' only — old endpoint has all-time data for all 1400 users
    try {
      const rows = await request<_OldLbRow[]>('/api/profiles/leaderboard?limit=100', { auth: true })
      return _mapOldLb(rows)
    } catch {
      return { entries: [] as LeaderboardEntry[], my_rank: null as number | null }
    }
  },

  friends: (period: LeaderboardPeriod = 'week') =>
    request<{ entries: LeaderboardEntry[]; my_rank: number | null }>(
      `/api/leaderboard/weekly?scope=friends&period=${period}`, { auth: true },
    ).catch(() => ({ entries: [] as LeaderboardEntry[], my_rank: null as number | null })),
}

// ── Focus stats ───────────────────────────────────────────────────────────────

export interface FocusStats {
  today_minutes:       number
  today_sessions:      number
  week_minutes:        number
  streak_days:         number
  last_study_at:       string | null
  daily_goal:          number
  total_focus_minutes: number
  sessions_count:      number
  longest_streak:      number
  freeze_count:        number
}

export const focusStats = {
  get: () =>
    request<FocusStats>('/api/focus/stats', { auth: true })
      .catch(() => ({
        today_minutes:       0,
        today_sessions:      0,
        week_minutes:        0,
        streak_days:         0,
        last_study_at:       null,
        daily_goal:          20,
        total_focus_minutes: 0,
        sessions_count:      0,
        longest_streak:      0,
        freeze_count:        0,
      })),
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface NotifItem {
  id:         number
  type:       string
  category:   string
  meta:       Record<string, any>
  is_read:    boolean
  created_at: string
  sender_id?: number | null
}

export const notifs = {
  unreadCount: () =>
    request<{ count: number }>('/api/notifications/unread-count', { auth: true })
      .catch(() => ({ count: 0 })),

  list: (limit = 20, cursor?: number) =>
    request<{ notifications: NotifItem[]; next_cursor: number | null }>(
      `/api/notifications?limit=${limit}${cursor != null ? `&cursor=${cursor}` : ''}`,
      { auth: true },
    ).catch(() => ({ notifications: [] as NotifItem[], next_cursor: null })),

  markRead: (id: number) =>
    request<{ updated: number }>('/api/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ notification_ids: [id] }),
      auth: true,
    }).catch(() => ({ updated: 0 })),

  markAllRead: () =>
    request<{ updated: number }>('/api/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ notification_ids: null }),
      auth: true,
    }).catch(() => ({ updated: 0 })),
}

// ── Enrollments ───────────────────────────────────────────────────────────────

export interface EnrollmentCheck {
  enrolled: boolean
  owner:    boolean
}

export const enrollments = {
  check: (courseId: number) =>
    request<EnrollmentCheck>(`/api/enrollments/check?course_id=${courseId}`, { auth: true }),

  enroll: (courseId: number) =>
    request<{ ok: boolean; already_enrolled: boolean }>(
      '/api/enrollments/enroll',
      { method: 'POST', body: JSON.stringify({ course_id: courseId }), auth: true },
    ),

  unenroll: (courseId: number) =>
    request<{ ok: boolean }>(
      `/api/enrollments/enroll?course_id=${courseId}`,
      { method: 'DELETE', auth: true },
    ),

  mine: () =>
    request<Array<{ course_id: number; created_at: string; courses: Course | null }>>(
      '/api/enrollments/mine', { auth: true },
    ),
}

// ── Tests ─────────────────────────────────────────────────────────────────────

export interface TestQuestion {
  id:              number
  question_text:   string
  question_image?: string | null
  question_type:   'single_choice' | 'multiple_choice' | 'true_false' | 'fill_blank'
  options?:        { id: number; text: string }[]
  order_index:     number
}

export interface TestAttemptStart {
  attempt_id:     number
  test_id:        number
  title:          string
  time_limit_min: number | null
  passing_score:  number
  questions:      TestQuestion[]
  is_final:       boolean
}

export interface TestSubmitAnswer {
  question_id:        number
  selected_option_id?: number | null
  text?:               string | null
}

export interface AnsweredQuestion {
  id:              number
  question_text:   string
  correct:         boolean
  user_answer:     string
  correct_answer:  string
  explanation?:    string | null
}

export interface TestSubmitResult {
  attempt_id:         number
  passed:             boolean
  score_pct:          number
  correct_count:      number
  wrong_count:        number
  total_questions:    number
  elapsed_seconds:    number
  xp_awarded:         number
  certificate_issued: boolean
  certificate_code?:  string | null
  show_answers:       boolean
  is_final:           boolean
  answered_questions?: AnsweredQuestion[]
}

export const tests = {
  start: (testId: number) =>
    request<TestAttemptStart>(`/api/tests/${testId}/attempts`, { method: 'POST', auth: true }),
  submit: (testId: number, attemptId: number, answers: TestSubmitAnswer[]) =>
    request<TestSubmitResult>(`/api/tests/${testId}/attempts/${attemptId}/submit`, {
      method: 'POST', body: JSON.stringify({ answers }), auth: true,
    }),
}

// ── Certificates ──────────────────────────────────────────────────────────────

export interface CertificateDetail {
  certificate_id: string
  issued_at:      string
  recipient_name: string
  course_title:   string
  teacher_name:   string
  score_pct:      number
  qr_url?:        string | null
  image_url?:     string | null
  pdf_url?:       string | null
  is_verified:    boolean
  is_mine:        boolean
}

export const certificates = {
  get: (code: string) =>
    request<CertificateDetail>(`/api/certificates/${code}`, { auth: true }),
}

// ── Hero / announcement content (admin-managed) ───────────────────────────────

export interface HeroContent {
  id:          number
  title:       string
  subtitle:    string | null
  description: string | null
  image_url:   string | null
  cta_text:    string | null
  cta_link:    string | null
}

export const hero = {
  get: (): Promise<HeroContent | null> =>
    request<HeroContent>('/api/hero/')
      .catch(() => null),
}

// ── Ambient sounds ────────────────────────────────────────────────────────────

export interface AmbientSound {
  id:            number
  name:          string
  emoji:         string
  url:           string
  display_order: number
  is_active:     boolean
}

export const ambientSounds = {
  list: () =>
    request<AmbientSound[]>('/api/audio/ambient-sounds')
      .catch(() => [] as AmbientSound[]),

  proxyUrl: (id: number) => `${API_URL}/api/audio/proxy/${id}`,
}

// ── Focus challenges ──────────────────────────────────────────────────────────

export interface StreakChallenge {
  key:           string
  title:         string
  description:   string
  required_days: number
  bonus_xp:      number
  icon:          string
  earned:        boolean
  completed_at:  string | null
  current_days:  number
  progress_pct:  number
}

export const focusChallenges = {
  list: () =>
    request<StreakChallenge[]>('/api/focus/challenges', { auth: true })
      .catch(() => [] as StreakChallenge[]),

  activeCount: () =>
    request<{ count: number }>('/api/focus/active-count')
      .catch(() => ({ count: 0 })),

  heartbeat: () =>
    request<{ ok: boolean }>('/api/focus/heartbeat', { method: 'POST', auth: true })
      .catch(() => ({ ok: false })),
}

// ── Activity feed ─────────────────────────────────────────────────────────────

export interface ActivityFeed {
  items:    ActivityItem[]
  total:    number
  offset:   number
  has_more: boolean
}

export const activity = {
  list: (limit = 20, offset = 0) =>
    request<ActivityFeed>(
      `/api/activity?limit=${limit}&offset=${offset}`,
      { auth: true },
    ).catch(() => ({ items: [] as ActivityItem[], total: 0, offset: 0, has_more: false })),
}

// ── Achievements ──────────────────────────────────────────────────────────────

export interface Achievement {
  id:                 number
  key:                string
  name:               string
  description:        string
  icon_url?:          string | null
  tier:               'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legend'
  sort_order:         number
  requirement_text:   string
  current_progress?:  number | null
  required_progress?: number | null
  earned:             boolean
  earned_at?:         string | null
}

export const achievements = {
  list: () =>
    request<Achievement[]>('/api/achievements', { auth: true })
      .catch(() => [] as Achievement[]),
}

// ── Streak system ─────────────────────────────────────────────────────────────

export interface StreakCalendarDay {
  date:   string  // ISO yyyy-mm-dd
  status: 'studied' | 'frozen' | 'missed' | 'future'
}

export interface StreakMilestone {
  days:         number
  earned:       boolean
  completed_at: string | null
  current:      number
  pct:          number
}

export interface FreezePackage {
  count:    number
  xp_cost:  number
}

export interface StreakDetail {
  streak_days:     number
  is_active:       boolean
  longest_streak:  number
  week_days:       number
  freeze_count:    number
  milestones:      StreakMilestone[]
  calendar:        StreakCalendarDay[]
  freeze_packages: FreezePackage[]
}

export const streaks = {
  detail: (telegramId?: number | null) =>
    request<StreakDetail>('/api/streaks/detail', { auth: true }),

  purchaseFreeze: (count: number) =>
    request<{ ok: boolean; xp_spent: number; freezes_added: number; total_xp: number; freeze_count: number }>(
      '/api/streaks/freeze/purchase',
      { method: 'POST', body: JSON.stringify({ count }), auth: true },
    ),

  useFreeze: () =>
    request<{ ok: boolean; freeze_count: number; streak_days: number; frozen_date: string }>(
      '/api/streaks/freeze/use',
      { method: 'POST', auth: true },
    ),
}

// ── Teacher wallet ─────────────────────────────────────────────────────────────

export interface WalletBalance {
  teacher_id:         number
  available_balance:  number
  pending_withdrawal: number
  withdrawn_total:    number
}

export interface PayoutRequest {
  id:           number
  teacher_id:   number
  amount:       number
  card_number:  string
  status:       'pending' | 'approved' | 'rejected'
  admin_note:   string | null
  created_at:   string
  processed_at: string | null
}

export const wallet = {
  balance: () =>
    request<WalletBalance>('/api/teacher/wallet', { auth: true }),

  withdraw: (amount: number, card_number: string) =>
    request<{ success: boolean; payout: PayoutRequest }>(
      '/api/teacher/wallet/withdraw',
      { method: 'POST', body: JSON.stringify({ amount, card_number }), auth: true },
    ),

  history: (limit = 50) =>
    request<{ history: PayoutRequest[] }>(`/api/teacher/wallet/history?limit=${limit}`, { auth: true }),
}

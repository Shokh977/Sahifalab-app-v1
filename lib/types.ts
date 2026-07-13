// ── Profile ──────────────────────────────────────────────────────────────────

export interface ProfileSkill {
  id:               number
  skill_name:       string
  is_verified:      boolean
  endorsement_count: number
  endorsed_by_viewer: boolean
  display_order:    number
}

export interface ProfileCertificate {
  id:             number
  certificate_id: string
  course_title:   string
  score:          number
  issued_at:      string | null
  share_token:    string | null
  skill_tags:     string[]
}

export interface ActivityItem {
  id:            number
  activity_type: string
  created_at:    string
  metadata:      Record<string, any> | null
}

export type ConnectionStatus =
  | 'own'
  | 'none'
  | 'accepted'
  | 'pending_sent'
  | 'pending_received'

export interface ProfileData {
  telegram_id:       number
  username:          string | null
  first_name:        string
  photo_url:         string | null
  cover_image_url:   string | null
  headline:          string | null
  bio:               string | null
  location_city:     string | null
  website_url:       string | null
  account_type:      'student' | 'teacher' | 'company' | 'admin'
  role?:             string
  is_verified:       boolean
  joined_at:         string | null
  // Gamification
  level:             number
  level_name:        string
  total_xp:          number
  next_level_xp:     number
  xp_percent:        number
  // Activity
  focus_hours:       number
  streak_days:       number
  longest_streak:    number
  profile_views:     number
  profile_views_week: number
  posts_count:       number
  // Stats
  connections_count: number
  mutual_connections: number
  courses_enrolled:  number
  courses_completed: number
  certificates_count: number
  followers_count:   number
  following_count:   number
  // Relationship with viewer
  connection_status: ConnectionStatus
  connection_id:     number | null
  is_following:      boolean
  is_followed_by:    boolean
  can_message:       boolean
  // Sections
  skills:            ProfileSkill[]
  certificates:      ProfileCertificate[]
  recent_activity:   ActivityItem[]
  active_courses:    any[]
  experiences:       any[]
  education:         any[]
  profile_completeness: number
}

export interface TeacherProfileData {
  telegram_id:      number
  specialization:   string | null
  experience_years: number | null
  bio:              string | null
  education:        string | null
  website_url:      string | null
  youtube_url:      string | null
  telegram_channel: string | null
  first_name:       string | null
  username:         string | null
  photo_url:        string | null
  level:            number | null
}

// ── Posts ────────────────────────────────────────────────────────────────────

export interface PostAuthor {
  telegram_id:  number
  full_name:    string
  username:     string | null
  photo_url:    string | null
  role:         string
  account_type: string
  level:        number
  headline:     string | null
  is_verified:  boolean
}

export interface Post {
  id:             number
  content:        string
  image_url:      string | null
  image_urls:     string[]
  post_type:      'text' | 'image' | 'poll' | 'repost'
  post_metadata:  Record<string, any> | null
  author:         PostAuthor
  repost_by:      PostAuthor | null
  likes_count:    number
  comments_count: number
  reposts_count:  number
  saves_count:    number
  views_count:    number
  is_liked:       boolean
  is_reposted:    boolean
  is_saved:       boolean
  created_at:     string
}

export interface Comment {
  id:         number
  content:    string
  author:     PostAuthor
  created_at: string
}

export interface FeedPage {
  items:    Post[]
  total:    number
  page:     number
  has_more: boolean
}

// ── Flashcards ────────────────────────────────────────────────────────────────

export type CardStatus = 'new' | 'learning' | 'reviewing' | 'mastered'

export type DeckBadgeType = 'none' | 'official' | 'verified_creator'
export type DeckModerationStatus = 'approved' | 'pending_review' | 'removed'

export interface FlashcardDeck {
  id:             number
  user_id:        number
  title:          string
  description:    string | null
  color:          string
  icon:           string | null
  card_count:     number
  mastered_count: number
  is_public:      boolean
  course_id:      number | null
  due_count:      number
  created_at:     string | null
  updated_at:     string | null
  // Public deck library (step-14-public-flashcard-decks)
  is_anonymous:        boolean
  category:            string | null
  badge_type:          DeckBadgeType
  is_featured:         boolean
  is_verified:         boolean
  clone_count:         number
  rating_avg:          number
  rating_count:        number
  moderation_status:   DeckModerationStatus
  cloned_from_deck_id: number | null
  published_at:        string | null
}

export interface PublishDeckError {
  success: false
  error: { code: string; details: string }
}

export interface PublicDeckCreator {
  id:         number
  name:       string
  avatar_url: string | null
  top_badge?: import('./api').TopBadge | null
}

export interface PublicDeckItem {
  id:             number
  title:          string
  description:    string | null
  color:          string
  card_count:     number
  category:       string | null
  badge_type:     DeckBadgeType
  creator:        PublicDeckCreator | null
  clone_count:    number
  rating_avg:     number
  rating_count:   number
  is_featured:    boolean
  already_cloned: boolean
}

export interface DeckRatingEntry {
  rating:     number
  comment:    string | null
  created_at: string | null
  rater:      PublicDeckCreator
}

export interface PublicDeckDetail extends PublicDeckItem {
  is_verified:    boolean
  published_at:   string | null
  preview_cards:  { front_text: string; back_text: string }[]
  recent_ratings: DeckRatingEntry[]
}

export interface PublicDeckListResult {
  decks: PublicDeckItem[]
  total: number
  page:  number
  limit: number
}

export interface DeckRatingsResult {
  ratings: DeckRatingEntry[]
  total:   number
  page:    number
  limit:   number
}

export interface RateDeckResult {
  rating_avg:   number
  rating_count: number
  my_rating:    number
}

export type DeckCategory = 'english' | 'ielts' | 'business' | 'arabic' | 'programming' | 'medical' | 'other'
export type DeckSort = 'popular' | 'newest' | 'top_rated'
export type DeckReportReason = 'spam' | 'errors' | 'inappropriate' | 'offensive' | 'copyright' | 'other'

export interface Flashcard {
  id:            number
  deck_id:       number
  front_text:    string
  back_text:     string
  position:      number
  ease_factor:   number
  interval_days: number
  repetitions:   number
  next_review:   string | null
  last_reviewed: string | null
  status:        CardStatus
  created_at:    string | null
}

export interface FlashcardStats {
  total_decks:    number
  total_cards:    number
  total_mastered: number
  total_due:      number
  today_reviewed: number
}

export interface StudySession {
  cards:     Flashcard[]
  total:     number
  due_count: number
  new_count: number
}

export interface ReviewResult {
  ok:             boolean
  new_status:     CardStatus
  next_review:    string | null
  interval_days:  number
  xp_awarded:     number
  deck_bonus_xp:  number
  newly_mastered: boolean
}

export interface CompleteSessionResult {
  ok:                boolean
  xp_awarded:        number
  flash_minutes:     number
  today_minutes:     number
  streak_days:       number
  goal_met:          boolean
  stages_completed:  Array<{ key: string; stage_number: number; title: string; required_days: number; bonus_xp: number }>
}
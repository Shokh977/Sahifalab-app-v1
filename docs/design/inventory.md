# Phase 0 inventory

Generated on the `redesign/phase-0-audit` branch (2026-10-17) from `app/`, `components/`, `hooks/`, `stores/`, `lib/` and `widgets/` (229 files). The tables come from a scan script, so their line numbers drift as files change. The hand-written sections say what the numbers mean for the redesign.

## Contents

1. Phase 0 findings
2. The design system that exists today
3. Routes → main components, stores and hooks
4. Duplicated components
5. Other rule violations in today's code
6. Hard-coded colours (file:line)
7. Hard-coded font sizes (file:line)
8. Hard-coded durations and timers (file:line)
9. Core `Animated` usage (file:line)

## 1. Phase 0 findings

### 5 Savol "started" and "time" were measuring Home visits

`GET /api/quiz/today` creates the attempt row and starts the server clock (`daily_quiz_service.deliver_today`). Home called it on every mount (`components/dashboard/BugunGrid/BugunSection.tsx`, `FiveSavolGridCard.tsx`), and so did the web dashboard and its sidebar.

- "Started" therefore meant "opened Home", which is where the 46% completion rate came from.
- `elapsed_ms`, which the ranking uses as its tie-break, ran from the first Home visit.

Fixed in this phase: Home uses the read-only `/quiz/today/status`, and the play screen reports foreground-only `active_ms`. That number feeds the metric only; the ranking is unchanged.

### Course detail is blank for seconds: three sequential request waves

The whole screen in `app/(screens)/course/[id].tsx` waits on `loading`. `load()` clears it only after three waves of requests, each starting when the previous one ends:

| Wave | Calls (in parallel) | Timed 2026-10-17 from Seoul, healthy backend |
|---|---|---|
| 1 | `/courses/{id}`, `/lessons?course_id`, `/courses/{id}/reviews` | 0.31–0.66 s each |
| 2 | `/enrollments/check`, `/lessons/my-progress` (need login; same handler pattern) | ≈0.4 s (estimated) |
| 3 | `/profile/{teacher}`, `/courses?teacher_id`, `/lessons/my-course-certificates`, `/teacher/profile/{teacher}` | 0.29–0.82 s each |

That adds up to about 1.9 s at best; `/health` alone takes 0.22–0.44 s. On a mobile network in Uzbekistan each round trip costs several times more, which gives the ~8 s users see. Wave 3 isn't needed for the first paint.

Each of these backend handlers also opens a **new `httpx.AsyncClient` per request**, so every call pays a fresh TLS handshake to Supabase. Each waits up to 10 s, and during the 2026-10-17 Supabase outage every one of them hit that timeout.

Fix in Phase 1: render the header from list data already in memory, defer wave 3, and show a skeleton. Backend follow-up: reuse one HTTP client.

### `current_week_progress` does not block Home's render

Only `WeeklyReviewGridCard.tsx` calls `/api/ai/weekly-review`, in its own effect. The card renders without its chart until the response arrives.

Two smaller problems:

- The response isn't cached, so it's requested again on every Home mount and competes with the dashboard calls at cold start.
- `stores/dashboardStore.ts` `fetchAll` has a waterfall: the per-course `getProgress` calls wait for `enrollments.mine()`.

### "Oson" has 0 uses

The study screen sends only ratings 1–3 (`app/(screens)/flashcard-study/[id].tsx`). The backend SM-2 already handles 4. Decision: add the button in Phase 6.

### Font coverage (the Phase 1 font check)

**Plus Jakarta Sans, the app's body font, has no Cyrillic (0 of 64 letters) and no ʻ (U+02BB).** Names like "Князь" fall back to the system font today. Of the other bundled fonts:

- Space Grotesk has ʻ but no Cyrillic.
- JetBrains Mono and Noto Serif Display have Cyrillic.

Phase 1 must propose Onest or Manrope.

### Analytics

There was no SDK. The existing convention is snake_case events sent to `POST /api/analytics/track` and stored in `analytics_events`. `lib/analytics.ts` now batches them; the events added are listed in the Phase 0 report.

### Tooling baseline

- `tsc` had 28 errors; it now has 0.
- There was no lint step. With `eslint-config-expo` it reports 0 errors and 780 warnings, mostly the new React Compiler rules, set to warnings for existing code.
- Lint found a real rules-of-hooks crash in `components/courses/VideoPlayer.tsx`, now fixed.

### Supabase egress (found during the 2026-10-17 incident, fixed on `main`)

The 5 ambient sounds and the 5 older books were still in Supabase Storage. The sounds were streamed in full on every play: `components/study/AmbientPlayer.tsx` uses `createAudioPlayer({ uri })` with no on-device cache. Phase 3 (Fokus) should cache the sound file on the device.

## 2. The design system that exists today

- **Colours:** `lib/constants.ts` defines `colors.dark` and `colors.light` (type `ColorTokens`). `stores/themeStore.ts` picks one and `hooks/useTheme.ts` exposes it as `c.*` (`c.bgPrimary`, `c.textPrimary`, `c.accentPrimary`, `c.border`…). Screens mostly use it, but 951 hard-coded colours remain outside the palette files (section 6).
- **Type:**
  - `typography.fontFamily`: Plus Jakarta Sans 400–800, plus Space Grotesk, Instrument Serif, JetBrains Mono and Noto Serif Display for special cases.
  - `typography.size`: xs 11, sm 13, base 15, lg 17, xl 20, 2xl 24, 3xl 32, 4xl 48.
  - 745 `fontSize` values are raw numbers anyway (section 7).
- **Spacing and radius:** `spacing.*` (including `screenMargin`) and `radius.*` (including `cardLg` and `full`) in `lib/constants.ts`.
- **Motion:** there are no shared tokens.
  - 264 durations and timers are written inline (section 8).
  - 277 places in 44 files use React Native's core `Animated` (section 9), which rule 4 forbids for new work.
- **Icons:** two sets are in use, `lucide-react-native` (69 files) and `phosphor-react-native` (27 files). The spec wants Lucide only.
- **Existing `components/ui/`:** Avatar, Button, ConfirmModal, InfoModal, ComingSoonModal, AnnouncementModal, AvatarPickerModal, TermsModal, NotifToast, OfflineBanner, ReportContentSheet, RoleBadge, Input… Phase 1 replaces these.

## 3. Routes → main components, stores and hooks

55 routes, layouts excluded. The Components column lists imports from `components/`. The Hooks column leaves out `useTheme` and `useAuthStore`, because nearly every screen uses them.

| URL | File | Lines | Components | Stores | Hooks |
|---|---|---|---|---|---|
| `/email-auth` | `app/(auth)/email-auth.tsx` | 437 | TermsModal | authStore | — |
| `/forgot-password` | `app/(auth)/forgot-password.tsx` | 115 | Input, Button | — | — |
| `/login` | `app/(auth)/login.tsx` | 384 | TermsModal | authStore | — |
| `/signup` | `app/(auth)/signup.tsx` | 384 | PasswordStrengthBar, TermsModal | authStore | useAuthRequest |
| `/telegram-callback` | `app/(auth)/telegram-callback.tsx` | 16 | — | — | — |
| `/verify-email` | `app/(auth)/verify-email.tsx` | 113 | Button | — | — |
| `/daily-goal` | `app/(onboarding)/daily-goal.tsx` | 249 | — | — | — |
| `/experience` | `app/(onboarding)/experience.tsx` | 237 | — | — | — |
| `/interests` | `app/(onboarding)/interests.tsx` | 295 | — | — | — |
| `/motivation` | `app/(onboarding)/motivation.tsx` | 234 | — | — | — |
| `/notifications` | `app/(onboarding)/notifications.tsx` | 153 | StreakFlame | authStore | — |
| `/ai-companion` | `app/(screens)/ai-companion.tsx` | 270 | — | — | — |
| `/ai-flashcard-generate` | `app/(screens)/ai-flashcard-generate.tsx` | 434 | ConfirmModal | — | — |
| `/become-teacher` | `app/(screens)/become-teacher.tsx` | 634 | — | authStore | — |
| `/book-reader/:id` | `app/(screens)/book-reader/[id].tsx` | 588 | — | — | — |
| `/book/:id` | `app/(screens)/book/[id].tsx` | 709 | ComingSoonModal | authStore | — |
| `/books` | `app/(screens)/books.tsx` | 408 | — | — | — |
| `/certificate/:code` | `app/(screens)/certificate/[code].tsx` | 358 | — | — | — |
| `/challenge/:slug` | `app/(screens)/challenge/[slug].tsx` | 422 | ConsistencyDayDots, TeamHeadToHeadBar | authStore | — |
| `/connections` | `app/(screens)/connections.tsx` | 407 | RoleBadge | — | — |
| `/course/:id` | `app/(screens)/course/[id].tsx` | 2380 | VideoPlayer, ConfirmModal, RoleBadge | authStore, courseStore, downloadStore | useDownloadStore, useCourseStore, useOnline |
| `/courses` | `app/(screens)/courses.tsx` | 557 | CourseCard | courseStore | useCourseStore |
| `/daily-quiz-results` | `app/(screens)/daily-quiz-results.tsx` | 243 | ConfirmModal, ShareCard | — | — |
| `/daily-quiz` | `app/(screens)/daily-quiz.tsx` | 307 | QuizResultView | authStore, rewardStore | — |
| `/downloads` | `app/(screens)/downloads.tsx` | 411 | ConfirmModal | downloadStore | useDownloadStore |
| `/edit-profile` | `app/(screens)/edit-profile.tsx` | 303 | AvatarPickerModal | profileStore | useProfileStore |
| `/flashcard-deck/:id` | `app/(screens)/flashcard-deck/[id].tsx` | 959 | ConfirmModal, PublishSheet, RatingSheet | flashcardStore, publicDecksStore | useFlashcardStore |
| `/flashcard-study/:id` | `app/(screens)/flashcard-study/[id].tsx` | 801 | EvolutionModal, ChallengeCompletionModal | flashcardStore, authStore, rewardStore | useFlashcardStore |
| `/focus-timer` | `app/(screens)/focus-timer.tsx` | 896 | — | timerStore, settingsStore, dashboardStore | useTimerStore, useSettingsStore |
| `/jobs` | `app/(screens)/jobs.tsx` | 484 | — | — | — |
| `/leaderboard` | `app/(screens)/leaderboard.tsx` | 568 | RoleBadge, TopBadgeIndicator, InfoModal | authStore | — |
| `/lesson/:id` | `app/(screens)/lesson/[id].tsx` | 1204 | VideoPlayer, ChallengeCompletionModal | courseStore, downloadStore | useCourseStore |
| `/payment-complete/:courseId` | `app/(screens)/payment-complete/[courseId].tsx` | 147 | — | — | — |
| `/profile/:id` | `app/(screens)/profile/[id].tsx` | 1183 | RoleBadge, Avatar, HeroLevelCard, CompareModal, ConfirmModal, ReportContentSheet, TrophyRoom, BadgeHeaderRow | authStore, profileStore, dashboardStore | useProfileStore, useDashboardStore |
| `/public-deck/:id` | `app/(screens)/public-deck/[id].tsx` | 388 | subjectTheme, ReportSheet, Avatar | flashcardStore, publicDecksStore | useOnline, useFlashcardStore, usePublicDecksStore |
| `/qollab-quvvatlash` | `app/(screens)/qollab-quvvatlash.tsx` | 41 | DonationScreen | — | — |
| `/saved` | `app/(screens)/saved.tsx` | 268 | PostCard, CommentsSheet | — | — |
| `/search` | `app/(screens)/search.tsx` | 588 | RoleBadge | — | — |
| `/settings` | `app/(screens)/settings.tsx` | 976 | TermsModal, ConfirmModal | themeStore, authStore, settingsStore, downloadStore | useThemeStore, useSettingsStore, useDownloadStore |
| `/streak-detail` | `app/(screens)/streak-detail.tsx` | 1368 | FreezeSheet, StreakLostModal, StreakAtRiskModal, EvolutionModal, MagicTree, StreakHeroBackground | authStore, dashboardStore, streakStagesStore | useDashboardStore, useFreeze |
| `/teacher-dashboard` | `app/(screens)/teacher-dashboard.tsx` | 657 | — | authStore | — |
| `/teacher-earnings` | `app/(screens)/teacher-earnings.tsx` | 526 | — | — | — |
| `/terms` | `app/(screens)/terms.tsx` | 383 | — | — | — |
| `/test/:id` | `app/(screens)/test/[id].tsx` | 922 | — | — | — |
| `/tree-stages` | `app/(screens)/tree-stages.tsx` | 225 | MagicTree | authStore, dashboardStore | useDashboardStore |
| `/tree-test` | `app/(screens)/tree-test.tsx` | 200 | MagicTree | — | — |
| `/weekly-review` | `app/(screens)/weekly-review.tsx` | 126 | WeeklyReviewGridCard, Hero, FocusCard, DailyActivityCard, StatsGrid, CoursesCta, TavsiyaCard, LastWeekSummary, Skeleton, StudyMethodCard, CategoryInsightCard, TutorOpportunityCard | — | useWeeklyReview |
| `/workspace` | `app/(screens)/workspace.tsx` | 1188 | ConfirmModal | authStore, timerStore | useTimerStore |
| `/courses` | `app/(tabs)/courses.tsx` | 417 | SearchField, FeaturedCarousel, CategoryChips, SortTabs, CourseCard, States, FilterSheet | authStore, courseStore | useReduceMotion, useCourseStore, useWishlist |
| `/flashcards` | `app/(tabs)/flashcards.tsx` | 364 | subjectTheme, SegmentedTabs, MyDecksTab, PublicSetsTab, ProfileAvatarButton | flashcardStore | useFlashcardStore |
| `/` | `app/(tabs)/index.tsx` | 567 | StreakLostModal, StreakAtRiskModal, SkeletonBlock, UnifiedBanner, ContextualActionRow, CourseHCard, CourseVCard, LeaderboardCard, BugunSection, TangaInfoSheet | authStore, dashboardStore, notificationStore | useNotificationStore, useDashboardStore, useFreeze |
| `/musobaqalar` | `app/(tabs)/musobaqalar.tsx` | 581 | ProfileAvatarButton, ChallengeCoverImage, ChallengeProgressRing, ParticipantAvatarStack, ConsistencyDayDots, TeamHeadToHeadBar | — | — |
| `/notifications` | `app/(tabs)/notifications.tsx` | 650 | — | notificationStore | useNotificationStore |
| `/profile` | `app/(tabs)/profile.tsx` | 694 | Avatar, HeroLevelCard, TrophyRoom, BadgeHeaderRow | profileStore, authStore, dashboardStore | useProfileStore, useDashboardStore |
| `/study` | `app/(tabs)/study.tsx` | 1599 | TimerCircle, DigitDisplay, XPFloat, CompletionSheet, LevelUpOverlay, AchievementOverlay, MonthlyHeatmap, AmbientPlayer, GoalCompleteModal, EvolutionModal, ProfileAvatarButton, ChallengeChip, ChallengeCompletionModal | timerStore, authStore, dashboardStore, rewardStore, offlineQueueStore | useTimerStore |

Routes nothing links to (no navigation call and no deep link): `ai-companion`, `jobs`, `terms`, `tree-test`, `workspace`.

`/courses` is defined twice: `(tabs)/courses.tsx` and `(screens)/courses.tsx`.

## 4. Duplicated components

| What | Versions today | Replaced in Phase 1 by |
|---|---|---|
| Course card | `courses/CourseCard.tsx`, `kurslar/CourseCard.tsx`, `dashboard/CourseHCard.tsx`, `dashboard/CourseVCard.tsx`, `saved.tsx` `SavedCourseCard`, `profile/[id].tsx` `TeacherCourseCard` | `Card` and `ListRow` (thumbnail variant) |
| Screen header / nav bar | Built inline in 22 route files (`navBar` / `topBar` styles), e.g. `daily-quiz.tsx`, `course/[id].tsx`, `settings.tsx`, `lesson/[id].tsx` (`NavBar`), `(tabs)/index.tsx` (`TopBar`) | `ScreenHeader` |
| Section header | `SectionHeader` in `(tabs)/index.tsx` and in `settings.tsx`, plus inline overline labels in most screens | Overline text style and `ScreenHeader` |
| Skeleton | `dashboard/SkeletonBlock.tsx`, `weekly-review/Skeleton.tsx`, `kurslar/States.tsx` `CoursesSkeleton`, `(tabs)/index.tsx` `SectionSkeleton`, `courses.tsx` `SkeletonCard`, `notifications.tsx` `SkeletonRow`, `flashcards/MyDecksTab.tsx` `SkeletonRow` | `Skeleton` (block, line, row) |
| Bottom sheet | 10 `*Sheet` components (`TangaInfoSheet`, `CommentsSheet`, `PublishSheet`, `RatingSheet`, `ReportSheet`, `FilterSheet`, `BadgeDetailSheet`, `FreezeSheet`, `CompletionSheet`, `ReportContentSheet`); inline sheets in `flashcard-deck/[id].tsx` (`CardSheet`, `DeckEditSheet`), `(tabs)/flashcards.tsx` (`DeckSheet`) and `course/[id].tsx` (pay sheet, `DownloadAllSheet`); two `SortSheet`s; `animationType="slide"` Modals in 9 files | `Sheet` |
| Modal / dialog | 14 `*Modal` components (`ConfirmModal`, `InfoModal`, `StreakLostModal`, `StreakAtRiskModal`, `EvolutionModal`, `GoalCompleteModal`…) | `Sheet` (confirm preset) |
| Progress ring | `flashcards/ProgressRing.tsx`, `daily-quiz/ResultTicket.tsx` `ProgressRing`, `study/ChallengeProgressRing.tsx`, `course/[id].tsx` `WatchRing` | `ProgressRing` |
| Stat tile | `teacher-dashboard.tsx` `StatTile`, `weekly-review/StatsGrid.tsx` `StatCard`, `public-deck/[id].tsx` `StatItem`, the summary tiles in `daily-quiz-results.tsx` | `StatTile` |
| Chip | `kurslar/CategoryChips.tsx` `Chip`, `flashcards/FilterChips.tsx`, `interests.tsx` `InterestChip`, `focus-timer.tsx` `DurationChip` and `SessionChip`, `study/ChallengeChip.tsx`, `teacher-earnings.tsx` `StatusChip`, `profile/[id].tsx` `MutualChip` | `Chip` |
| Rows | `InfoRow` (2 versions), `SettingRow`, `NavRow`, `NotifRow`, `PersonRow`, `RankRow`, `StudentRow`, `CourseRow`, `DeckRow`, `LessonRow`, `SheetRow`, `OptionRow`… | `ListRow` |
| Buttons | `components/ui/Button.tsx`, plus inline `RatingBtn`, `DownloadBtn`, `FollowButton`, `OptionButton`, `LikeBtn`, `ScaleBtn` and many styled `Pressable`s | `Button` and the base `Pressable` |
| Empty and error states | `kurslar/States.tsx` (`CoursesEmptyState`, `CoursesErrorState`), `donation/EmptyMethods.tsx`, `flashcards/MyDecksTab.tsx` `EmptyState`, inline emoji-plus-text states in most screens | `EmptyState` |

## 5. Other rule violations in today's code

- **Full-screen spinners (rule 3):** 19 route files use `ActivityIndicator size="large"` as their loading state: `verify-email`, `interests`, `book-reader/[id]`, `certificate/[code]`, `course/[id]`, `daily-quiz-results`, `daily-quiz`, `flashcard-deck/[id]`, `flashcard-study/[id]`, `lesson/[id]`, `payment-complete/[courseId]`, `profile/[id]`, `public-deck/[id]`, `teacher-dashboard`, `teacher-earnings`, `test/[id]`, `(tabs)/musobaqalar`, `(tabs)/profile` and `(tabs)/study`.
- **Animation on the JS thread (rule 4):** core `Animated` appears in 44 files (section 9). `setInterval` drives timers that re-render the screen every second: the session clock in `flashcard-study/[id].tsx`, `focus-timer.tsx`, the polling in `(tabs)/study.tsx`, and `workspace.tsx`.
- **Icons:** two icon sets, and emoji used as icons in empty states, `TopBar` (🪙) and the quiz states.
- **Lists (rule 6):** there is no `FlashList` anywhere. Leaderboards, notifications, public decks and card lists use `ScrollView` or `FlatList`.

## 6. Hard-coded colours (file:line)

Hex and `rgb(a)` literals outside comments: **951** in 120 files. Another 250 sit in the palette files, where they belong: lib/constants.ts, lib/premiumTheme.ts, lib/treeTheme.ts, components/donation/donationTheme.ts, lib/tier-data.ts, lib/badges.ts, lib/colorUtils.ts.

| File | Count | Lines |
|---|---|---|
| `app/(screens)/streak-detail.tsx` | 69 | 38, 39, 66, 67, 77, 78, 81, 93, 94, 97, 98, 108, 109, 117, 131, 132, 144, 146, 154, 168, 170, 180, 184, 197, 198, 208, 442, 457, 458, 496, 503, 510, 548, 549, 605, 616, 649, 661, 667, 668, 674, 712, 732, 744, 747, 753, 939, 1030, 1032, 1034, 1035, 1119, 1127, 1166, 1221, 1228, 1238, 1245, 1246, 1247, 1248, 1258, 1268, 1270, 1277, 1301, 1348, 1357, 1362 |
| `app/(screens)/course/[id].tsx` | 45 | 120, 121, 199, 431, 484, 536, 556, 557, 576, 600, 601, 675, 701, 702, 765, 894, 895, 1357, 1372, 1377, 1383, 1540, 1545, 1572, 1573, 1612, 1682, 1697, 1842, 1843, 1867, 1917, 1982, 1988, 2162, 2165, 2171, 2222, 2252, 2253, 2276, 2278, 2322, 2346, 2353 |
| `components/streak/MagicTree.tsx` | 44 | 140, 141, 142, 145, 146, 149, 150, 151, 184, 200, 207, 232, 256, 287, 291, 305, 317, 335, 336, 337, 338, 354, 359, 371, 372, 373, 383, 385, 386, 387, 490, 613, 730, 760, 761, 764, 769, 770, 776, 787, 788, 789, 799, 804 |
| `components/flashcards/subjectTheme.ts` | 43 | 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 101, 107, 119, 120, 121, 122, 123, 124, 128, 129, 159 |
| `app/(screens)/test/[id].tsx` | 24 | 116, 149, 160, 161, 167, 179, 188, 256, 292, 300, 335, 336, 343, 374, 550, 666, 712, 759, 764, 820, 850, 853, 882, 910 |
| `app/(tabs)/notifications.tsx` | 24 | 171, 174, 177, 179, 181, 183, 187, 189, 191, 194, 196, 198, 201, 203, 205, 207, 209, 213, 215, 217, 219, 221, 358, 515 |
| `components/dashboard/BugunGrid/RankGridCard.tsx` | 22 | 13, 14, 15, 16, 137, 147, 153, 170, 183, 187, 199, 219, 240, 246, 257, 299, 306, 309, 310, 314, 315, 316 |
| `components/profile/HeroLevelCard.tsx` | 21 | 45, 159, 169, 174, 180, 184, 192, 196, 197, 198, 200, 205, 208, 210, 218, 219, 220, 224, 229, 230, 231 |
| `components/streak/StreakHeroBackground.tsx` | 21 | 57, 60, 73, 74, 75, 76, 80, 81, 82, 83, 87, 88, 162, 186, 246, 268, 283, 284, 298, 299, 339 |
| `app/(screens)/teacher-earnings.tsx` | 20 | 37, 38, 39, 188, 201, 217, 281, 282, 296, 297, 302, 308, 309, 314, 320, 321, 341, 350, 412, 414 |
| `app/(screens)/workspace.tsx` | 20 | 71, 72, 73, 77, 78, 79, 100, 226, 245, 266, 512, 514, 565, 658, 722, 783, 996, 1027, 1115, 1184 |
| `components/feed/PostCard.tsx` | 20 | 87, 90, 91, 95, 99, 199, 206, 207, 265, 266, 305, 340, 343, 355, 356, 359, 526, 537, 591, 597 |
| `app/(screens)/become-teacher.tsx` | 19 | 134, 135, 201, 202, 205, 206, 248, 259, 266, 280, 291, 336, 416, 417, 424, 446, 449, 451, 632 |
| `components/streak/EvolutionModal.tsx` | 19 | 37, 189, 269, 316, 337, 365, 366, 375, 392, 399, 413, 416, 421, 435, 436, 443, 448, 455, 460 |
| `app/(screens)/book/[id].tsx` | 18 | 54, 55, 70, 86, 87, 165, 185, 186, 264, 290, 291, 470, 483, 485, 496, 497, 540, 685 |
| `app/(screens)/profile/[id].tsx` | 17 | 55, 252, 257, 271, 300, 308, 337, 355, 425, 432, 435, 505, 744, 773, 1046, 1047, 1086 |
| `components/daily-quiz/ResultTicket.tsx` | 17 | 10, 11, 12, 13, 67, 81, 99, 101, 129, 130, 131, 183, 219, 231, 238, 246, 253 |
| `components/courses/VideoPlayer.tsx` | 16 | 191, 465, 466, 471, 482, 485, 488, 491, 496, 498, 503, 505, 507, 511, 514, 516 |
| `app/(screens)/books.tsx` | 13 | 30, 31, 32, 33, 34, 35, 71, 90, 91, 196, 197, 201, 224 |
| `app/(screens)/challenge/[slug].tsx` | 13 | 96, 104, 107, 154, 155, 338, 362, 365, 366, 369, 371, 403, 420 |
| `components/dashboard/UnifiedBanner.tsx` | 13 | 159, 160, 161, 162, 181, 182, 183, 191, 193, 195, 198, 388, 442 |
| `components/donation/PaymentCard.tsx` | 13 | 70, 78, 87, 139, 155, 157, 160, 162, 165, 169, 175, 179, 181 |
| `app/(screens)/flashcard-deck/[id].tsx` | 12 | 29, 30, 300, 329, 359, 360, 361, 362, 586, 609, 645, 950 |
| `app/(screens)/settings.tsx` | 12 | 250, 288, 289, 368, 369, 481, 503, 650, 651, 652, 932, 934 |
| `components/study/ChallengeCompletionModal.tsx` | 12 | 77, 80, 100, 133, 134, 146, 158, 159, 163, 168, 170, 171 |
| `components/kurslar/FeaturedCarousel.tsx` | 11 | 16, 75, 86, 87, 97, 127, 171, 181, 182, 184, 185 |
| `components/streak/StreakAtRiskModal.tsx` | 11 | 78, 82, 87, 91, 104, 108, 115, 119, 126, 144, 206 |
| `app/(screens)/focus-timer.tsx` | 10 | 67, 68, 84, 106, 800, 801, 817, 859, 886, 894 |
| `app/(screens)/lesson/[id].tsx` | 10 | 212, 214, 242, 244, 771, 961, 963, 1039, 1071, 1082 |
| `components/daily-quiz/QuizResultView.tsx` | 10 | 13, 14, 15, 16, 64, 65, 99, 101, 102, 139 |
| `components/streak/FreezeSheet.tsx` | 10 | 139, 144, 152, 181, 203, 204, 242, 247, 249, 266 |
| `app/(screens)/book-reader/[id].tsx` | 9 | 17, 18, 19, 76, 77, 373, 380, 473, 511 |
| `app/(screens)/courses.tsx` | 9 | 183, 199, 351, 368, 381, 455, 469, 500, 547 |
| `app/(screens)/downloads.tsx` | 9 | 130, 136, 155, 185, 211, 218, 273, 340, 370 |
| `components/dashboard/HeroCard.tsx` | 9 | 8, 9, 12, 13, 14, 15, 16, 126, 127 |
| `components/flashcards/PublicSetsTab.tsx` | 8 | 229, 230, 235, 240, 342, 345, 352, 354 |
| `components/study/ChallengeCoverImage.tsx` | 8 | 15, 72, 77, 107, 114, 117, 119, 121 |
| `app/(auth)/signup.tsx` | 7 | 174, 193, 270, 326, 357, 360, 372 |
| `app/(screens)/teacher-dashboard.tsx` | 7 | 163, 253, 254, 323, 338, 350, 419 |
| `app/(screens)/tree-stages.tsx` | 7 | 65, 68, 78, 82, 122, 134, 139 |
| `app/(screens)/tree-test.tsx` | 7 | 13, 14, 15, 63, 89, 113, 122 |
| `components/profile/CompareModal.tsx` | 7 | 208, 213, 235, 240, 259, 261, 277 |
| `app/(screens)/public-deck/[id].tsx` | 6 | 114, 122, 224, 245, 331, 336 |
| `app/(tabs)/flashcards.tsx` | 6 | 30, 31, 172, 175, 309, 323 |
| `app/(tabs)/index.tsx` | 6 | 67, 70, 80, 94, 529, 561 |
| `app/(tabs)/musobaqalar.tsx` | 6 | 360, 361, 430, 531, 548, 564 |
| `app/(tabs)/profile.tsx` | 6 | 186, 276, 284, 286, 299, 689 |
| `components/dashboard/BugunGrid/WeeklyReviewGridCard.tsx` | 6 | 11, 12, 13, 40, 41, 107 |
| `components/donation/EmptyMethods.tsx` | 6 | 17, 31, 56, 61, 74, 77 |
| `components/kurslar/CourseCard.tsx` | 6 | 56, 72, 95, 151, 156, 164 |
| `components/onboarding/AppIntroModal.tsx` | 6 | 24, 31, 38, 45, 52, 244 |
| `components/rewards/RewardModal.tsx` | 6 | 118, 128, 132, 136, 147, 165 |
| `components/streak/StreakLostModal.tsx` | 6 | 89, 93, 100, 104, 113, 125 |
| `components/weekly-review/StatsGrid.tsx` | 6 | 11, 12, 13, 14, 15, 16 |
| `lib/validators.ts` | 6 | 9, 21, 22, 23, 24, 25 |
| `app/(screens)/ai-companion.tsx` | 5 | 33, 43, 116, 143, 175 |
| `app/(screens)/ai-flashcard-generate.tsx` | 5 | 282, 285, 286, 349, 350 |
| `app/(screens)/certificate/[code].tsx` | 5 | 186, 187, 205, 280, 342 |
| `app/(screens)/daily-quiz-results.tsx` | 5 | 117, 148, 152, 209, 237 |
| `app/_layout.tsx` | 5 | 131, 133, 134, 135, 136 |
| `components/dashboard/SmartActionCards.tsx` | 5 | 35, 36, 59, 60, 72 |
| `components/feed/PostComposer.tsx` | 5 | 110, 167, 171, 172, 227 |
| `components/flashcards/DeckRow.tsx` | 5 | 59, 60, 61, 233, 236 |
| `components/ui/OfflineBanner.tsx` | 5 | 46, 57, 58, 79, 86 |
| `app/(tabs)/courses.tsx` | 4 | 393, 395, 398, 400 |
| `components/courses/CourseCard.tsx` | 4 | 55, 77, 109, 147 |
| `components/donation/CopyRow.tsx` | 4 | 73, 80, 108, 109 |
| `components/feed/CommentsSheet.tsx` | 4 | 119, 132, 507, 508 |
| `components/flashcards/PublishSheet.tsx` | 4 | 167, 168, 169, 213 |
| `components/flashcards/ReviewDueCard.tsx` | 4 | 44, 53, 54, 58 |
| `components/streak/GoalCompleteModal.tsx` | 4 | 90, 91, 108, 119 |
| `widgets/StreakWidget.tsx` | 4 | 27, 39, 49, 59 |
| `app/(screens)/jobs.tsx` | 3 | 99, 244, 470 |
| `app/(tabs)/study.tsx` | 3 | 217, 218, 1492 |
| `components/flashcards/ReportSheet.tsx` | 3 | 118, 119, 131 |
| `components/profile/BadgeDetailSheet.tsx` | 3 | 44, 111, 118 |
| `components/ui/AnnouncementModal.tsx` | 3 | 119, 133, 207 |
| `components/ui/ConfirmModal.tsx` | 3 | 38, 76, 90 |
| `components/ui/ReportContentSheet.tsx` | 3 | 121, 122, 134 |
| `app/(screens)/edit-profile.tsx` | 2 | 147, 250 |
| `app/(screens)/payment-complete/[courseId].tsx` | 2 | 65, 92 |
| `app/(screens)/qollab-quvvatlash.tsx` | 2 | 33, 34 |
| `components/daily-quiz/ShareCard.tsx` | 2 | 89, 90 |
| `components/dashboard/BugunGrid/AiFlashcardGridCard.tsx` | 2 | 9, 14 |
| `components/dashboard/BugunGrid/FiveSavolGridCard.tsx` | 2 | 10, 11 |
| `components/dashboard/TangaInfoSheet.tsx` | 2 | 78, 99 |
| `components/donation/DonationScreen.tsx` | 2 | 120, 201 |
| `components/flashcards/RatingSheet.tsx` | 2 | 80, 114 |
| `components/profile/TopBadgeIndicator.tsx` | 2 | 25, 41 |
| `components/ui/AvatarPickerModal.tsx` | 2 | 121, 133 |
| `components/ui/Button.tsx` | 2 | 33, 36 |
| `components/ui/ComingSoonModal.tsx` | 2 | 52, 93 |
| `components/ui/InfoModal.tsx` | 2 | 100, 116 |
| `components/ui/RoleBadge.tsx` | 2 | 4, 5 |
| `components/weekly-review/CategoryInsightCard.tsx` | 2 | 14, 15 |
| `components/weekly-review/CoursesCta.tsx` | 2 | 21, 22 |
| `components/weekly-review/DailyActivityCard.tsx` | 2 | 88, 95 |
| `app/(auth)/email-auth.tsx` | 1 | 412 |
| `app/(auth)/forgot-password.tsx` | 1 | 77 |
| `app/(onboarding)/motivation.tsx` | 1 | 46 |
| `app/(screens)/daily-quiz.tsx` | 1 | 290 |
| `app/(screens)/flashcard-study/[id].tsx` | 1 | 522 |
| `app/(screens)/weekly-review.tsx` | 1 | 117 |
| `components/courses/LessonRow.tsx` | 1 | 154 |
| `components/daily-quiz/ShareCaptureHost.tsx` | 1 | 44 |
| `components/dashboard/BugunGrid/GridCard.tsx` | 1 | 98 |
| `components/dashboard/ContextualActionRow.tsx` | 1 | 55 |
| `components/dashboard/LeaderboardCard.tsx` | 1 | 11 |
| `components/donation/PageIndicator.tsx` | 1 | 27 |
| `components/flashcards/MyDecksTab.tsx` | 1 | 311 |
| `components/kurslar/FilterSheet.tsx` | 1 | 160 |
| `components/layout/ProfileAvatarButton.tsx` | 1 | 46 |
| `components/profile/BadgeHeaderRow.tsx` | 1 | 32 |
| `components/profile/BadgeTile.tsx` | 1 | 35 |
| `components/streak/StagesPath.tsx` | 1 | 77 |
| `components/study/CompletionSheet.tsx` | 1 | 122 |
| `components/study/ConsistencyDayDots.tsx` | 1 | 31 |
| `components/study/LevelUpOverlay.tsx` | 1 | 16 |
| `components/ui/NotifToast.tsx` | 1 | 85 |
| `components/ui/XPBar.tsx` | 1 | 41 |

## 7. Hard-coded font sizes (file:line)

Numeric `fontSize:` values: **745** in 135 files.

| File | Count | Lines |
|---|---|---|
| `app/(screens)/profile/[id].tsx` | 37 | 132, 133, 161, 179, 186, 192, 196, 202, 221, 255, 274, 333, 340, 346, 356, 388, 453, 456, 458, 505, 509, 527, 534, 540, 546, 565, 740, 966, 1129, 1130, 1131, 1134, 1149, 1151, 1152, 1177, 1178 |
| `app/(screens)/settings.tsx` | 33 | 133, 138, 203, 208, 247, 250, 262, 275, 289, 340, 354, 360, 369, 468, 472, 478, 481, 489, 494, 503, 509, 890, 895, 911, 912, 913, 927, 942, 950, 960, 961, 969, 974 |
| `app/(screens)/streak-detail.tsx` | 26 | 961, 963, 972, 974, 975, 977, 984, 986, 987, 988, 1035, 1042, 1044, 1113, 1118, 1126, 1158, 1166, 1211, 1237, 1276, 1283, 1332, 1347, 1348, 1361 |
| `app/(screens)/challenge/[slug].tsx` | 24 | 365, 366, 371, 379, 380, 383, 384, 385, 387, 390, 391, 392, 394, 400, 403, 404, 405, 406, 409, 411, 412, 413, 416, 420 |
| `app/(screens)/become-teacher.tsx` | 22 | 499, 521, 522, 531, 543, 544, 548, 564, 568, 569, 575, 578, 587, 591, 592, 593, 605, 618, 619, 625, 626, 632 |
| `app/(screens)/course/[id].tsx` | 22 | 180, 387, 441, 444, 460, 465, 472, 484, 489, 653, 871, 1636, 1821, 1867, 1878, 2039, 2166, 2245, 2258, 2273, 2289, 2319 |
| `app/(tabs)/profile.tsx` | 22 | 124, 186, 190, 208, 214, 218, 224, 244, 318, 319, 613, 614, 616, 634, 653, 654, 664, 665, 684, 689, 690, 692 |
| `app/(screens)/teacher-earnings.tsx` | 21 | 52, 206, 207, 208, 213, 215, 217, 448, 465, 466, 476, 478, 479, 481, 484, 503, 504, 505, 506, 509, 524 |
| `app/(screens)/leaderboard.tsx` | 19 | 102, 114, 466, 478, 492, 515, 516, 517, 518, 519, 530, 531, 533, 534, 542, 555, 556, 557, 566 |
| `app/(screens)/daily-quiz-results.tsx` | 17 | 202, 205, 206, 207, 209, 212, 219, 220, 222, 226, 227, 229, 230, 231, 239, 240, 241 |
| `app/(tabs)/musobaqalar.tsx` | 17 | 519, 525, 541, 542, 545, 546, 548, 551, 555, 556, 561, 562, 564, 574, 575, 576, 579 |
| `app/(screens)/test/[id].tsx` | 16 | 151, 324, 365, 793, 804, 820, 821, 829, 834, 857, 868, 877, 878, 882, 913, 915 |
| `components/flashcards/PublicSetsTab.tsx` | 13 | 314, 320, 325, 330, 331, 337, 339, 340, 342, 348, 351, 352, 362 |
| `app/(auth)/login.tsx` | 12 | 295, 300, 312, 323, 324, 335, 345, 356, 365, 373, 374, 377 |
| `app/(screens)/ai-flashcard-generate.tsx` | 12 | 384, 389, 393, 397, 405, 418, 419, 421, 422, 426, 427, 432 |
| `app/(screens)/edit-profile.tsx` | 12 | 140, 240, 241, 242, 251, 256, 257, 264, 275, 276, 283, 301 |
| `components/daily-quiz/ResultTicket.tsx` | 12 | 81, 82, 86, 104, 222, 223, 230, 231, 241, 242, 249, 250 |
| `components/dashboard/BugunGrid/RankGridCard.tsx` | 11 | 198, 199, 219, 240, 257, 294, 303, 304, 306, 310, 314 |
| `components/profile/HeroLevelCard.tsx` | 11 | 184, 196, 197, 198, 200, 210, 218, 219, 220, 229, 230 |
| `components/dashboard/UnifiedBanner.tsx` | 10 | 356, 357, 358, 361, 370, 371, 417, 418, 419, 420 |
| `components/streak/EvolutionModal.tsx` | 10 | 335, 373, 389, 398, 415, 416, 420, 442, 454, 459 |
| `app/(screens)/daily-quiz.tsx` | 9 | 283, 286, 287, 288, 290, 297, 299, 302, 305 |
| `app/(screens)/flashcard-study/[id].tsx` | 8 | 713, 726, 737, 751, 752, 775, 776, 784 |
| `app/(screens)/teacher-dashboard.tsx` | 8 | 171, 276, 469, 488, 587, 608, 645, 654 |
| `app/(tabs)/courses.tsx` | 8 | 378, 379, 395, 400, 406, 408, 414, 415 |
| `app/(tabs)/index.tsx` | 8 | 250, 251, 253, 503, 515, 516, 529, 562 |
| `app/(tabs)/notifications.tsx` | 8 | 586, 587, 603, 621, 622, 623, 647, 648 |
| `components/donation/PaymentCard.tsx` | 8 | 138, 154, 157, 162, 164, 168, 174, 181 |
| `app/(screens)/public-deck/[id].tsx` | 7 | 245, 336, 337, 339, 349, 354, 367 |
| `app/(screens)/tree-stages.tsx` | 7 | 159, 168, 196, 211, 212, 222, 223 |
| `app/(tabs)/study.tsx` | 7 | 1150, 1212, 1238, 1256, 1365, 1479, 1582 |
| `components/donation/DonationScreen.tsx` | 7 | 186, 188, 189, 191, 193, 196, 201 |
| `components/donation/EmptyMethods.tsx` | 7 | 60, 67, 68, 74, 79, 81, 82 |
| `app/(screens)/tree-test.tsx` | 6 | 152, 165, 173, 196, 197, 198 |
| `app/(screens)/weekly-review.tsx` | 6 | 110, 113, 114, 115, 117, 124 |
| `app/(screens)/workspace.tsx` | 6 | 848, 906, 947, 980, 1013, 1027 |
| `components/donation/CopyRow.tsx` | 6 | 116, 117, 118, 123, 125, 126 |
| `components/flashcards/DeckRow.tsx` | 6 | 205, 216, 218, 223, 233, 244 |
| `components/kurslar/CourseCard.tsx` | 6 | 162, 169, 175, 187, 188, 197 |
| `components/kurslar/FeaturedCarousel.tsx` | 6 | 162, 168, 181, 182, 184, 185 |
| `components/profile/BadgeDetailSheet.tsx` | 6 | 124, 132, 133, 134, 140, 141 |
| `components/profile/CompareModal.tsx` | 6 | 326, 336, 363, 364, 365, 377 |
| `components/weekly-review/FocusCard.tsx` | 6 | 73, 74, 75, 76, 78, 79 |
| `app/(screens)/focus-timer.tsx` | 5 | 125, 789, 805, 817, 875 |
| `app/(screens)/jobs.tsx` | 5 | 420, 428, 448, 458, 462 |
| `components/daily-quiz/QuizResultView.tsx` | 5 | 125, 126, 127, 141, 147 |
| `components/daily-quiz/ShareCard.tsx` | 5 | 104, 105, 106, 107, 114 |
| `components/flashcards/MyDecksTab.tsx` | 5 | 299, 300, 302, 318, 320 |
| `components/flashcards/PublicSetRow.tsx` | 5 | 141, 144, 145, 146, 162 |
| `components/flashcards/ReviewDueCard.tsx` | 5 | 119, 121, 122, 138, 144 |
| `components/kurslar/FilterSheet.tsx` | 5 | 61, 167, 170, 177, 180 |
| `components/study/ChallengeCompletionModal.tsx` | 5 | 167, 168, 170, 171, 179 |
| `components/weekly-review/StatsGrid.tsx` | 5 | 65, 73, 74, 75, 76 |
| `app/(screens)/certificate/[code].tsx` | 4 | 291, 300, 309, 321 |
| `app/(screens)/payment-complete/[courseId].tsx` | 4 | 126, 131, 143, 145 |
| `app/_layout.tsx` | 4 | 132, 133, 134, 136 |
| `components/dashboard/TangaInfoSheet.tsx` | 4 | 114, 116, 118, 120 |
| `components/donation/TransparencyNote.tsx` | 4 | 34, 37, 38, 40 |
| `components/feed/PostCard.tsx` | 4 | 450, 475, 478, 512 |
| `components/profile/BadgeTile.tsx` | 4 | 107, 108, 109, 110 |
| `components/profile/TrophyRoom.tsx` | 4 | 94, 95, 96, 97 |
| `components/study/MonthlyHeatmap.tsx` | 4 | 204, 207, 220, 231 |
| `components/weekly-review/DailyActivityCard.tsx` | 4 | 111, 112, 116, 123 |
| `components/weekly-review/LastWeekSummary.tsx` | 4 | 51, 55, 56, 57 |
| `widgets/StreakWidget.tsx` | 4 | 33, 38, 48, 58 |
| `app/(auth)/signup.tsx` | 3 | 333, 335, 372 |
| `app/(screens)/book/[id].tsx` | 3 | 238, 623, 682 |
| `app/(screens)/book-reader/[id].tsx` | 3 | 495, 531, 568 |
| `components/courses/VideoPlayer.tsx` | 3 | 166, 450, 488 |
| `components/dashboard/BugunGrid/AiFlashcardGridCard.tsx` | 3 | 46, 47, 49 |
| `components/dashboard/BugunGrid/FiveSavolGridCard.tsx` | 3 | 86, 87, 88 |
| `components/dashboard/BugunGrid/WeeklyReviewGridCard.tsx` | 3 | 99, 100, 101 |
| `components/feed/PostComposer.tsx` | 3 | 125, 167, 187 |
| `components/flashcards/PublishSheet.tsx` | 3 | 223, 253, 254 |
| `components/kurslar/States.tsx` | 3 | 75, 76, 77 |
| `components/rewards/RewardModal.tsx` | 3 | 168, 186, 197 |
| `components/streak/FreezeSheet.tsx` | 3 | 291, 315, 341 |
| `components/streak/StagesPath.tsx` | 3 | 153, 154, 155 |
| `components/weekly-review/Hero.tsx` | 3 | 45, 46, 47 |
| `components/weekly-review/StudyMethodCard.tsx` | 3 | 36, 37, 38 |
| `app/(onboarding)/interests.tsx` | 2 | 252, 273 |
| `app/(screens)/books.tsx` | 2 | 359, 371 |
| `app/(screens)/flashcard-deck/[id].tsx` | 2 | 864, 880 |
| `components/courses/CourseCard.tsx` | 2 | 39, 72 |
| `components/dashboard/BugunGrid/BugunSection.tsx` | 2 | 68, 69 |
| `components/profile/BadgeHeaderRow.tsx` | 2 | 68, 74 |
| `components/profile/TopBadgeIndicator.tsx` | 2 | 33, 41 |
| `components/study/AmbientPlayer.tsx` | 2 | 334, 351 |
| `components/study/ChallengeCoverImage.tsx` | 2 | 117, 119 |
| `components/study/TeamHeadToHeadBar.tsx` | 2 | 66, 70 |
| `components/ui/NotifToast.tsx` | 2 | 137, 138 |
| `components/weekly-review/CategoryInsightCard.tsx` | 2 | 36, 37 |
| `components/weekly-review/CoursesCta.tsx` | 2 | 46, 47 |
| `components/weekly-review/TavsiyaCard.tsx` | 2 | 32, 33 |
| `components/weekly-review/TutorOpportunityCard.tsx` | 2 | 45, 46 |
| `components/weekly-review/WeeklyBar.tsx` | 2 | 92, 93 |
| `app/(auth)/email-auth.tsx` | 1 | 412 |
| `app/(auth)/forgot-password.tsx` | 1 | 110 |
| `app/(auth)/verify-email.tsx` | 1 | 109 |
| `app/(onboarding)/daily-goal.tsx` | 1 | 197 |
| `app/(onboarding)/experience.tsx` | 1 | 193 |
| `app/(onboarding)/motivation.tsx` | 1 | 192 |
| `app/(onboarding)/notifications.tsx` | 1 | 128 |
| `app/(screens)/ai-companion.tsx` | 1 | 210 |
| `app/(screens)/connections.tsx` | 1 | 80 |
| `app/(screens)/courses.tsx` | 1 | 455 |
| `app/(screens)/downloads.tsx` | 1 | 342 |
| `app/(tabs)/flashcards.tsx` | 1 | 293 |
| `app/+not-found.tsx` | 1 | 10 |
| `components/courses/LessonRow.tsx` | 1 | 155 |
| `components/dashboard/HeroCard.tsx` | 1 | 131 |
| `components/dashboard/LeaderboardCard.tsx` | 1 | 40 |
| `components/flashcards/FilterChips.tsx` | 1 | 70 |
| `components/flashcards/RatingSheet.tsx` | 1 | 121 |
| `components/flashcards/ReportSheet.tsx` | 1 | 138 |
| `components/flashcards/SegmentedTabs.tsx` | 1 | 72 |
| `components/kurslar/CategoryChips.tsx` | 1 | 74 |
| `components/kurslar/SearchField.tsx` | 1 | 42 |
| `components/kurslar/SortTabs.tsx` | 1 | 98 |
| `components/layout/AnimatedTabBar.tsx` | 1 | 143 |
| `components/onboarding/AppIntroModal.tsx` | 1 | 219 |
| `components/streak/GoalCompleteModal.tsx` | 1 | 149 |
| `components/streak/StreakAtRiskModal.tsx` | 1 | 195 |
| `components/streak/StreakLostModal.tsx` | 1 | 182 |
| `components/study/ChallengeChip.tsx` | 1 | 84 |
| `components/study/ChallengeProgressRing.tsx` | 1 | 56 |
| `components/study/ConsistencyDayDots.tsx` | 1 | 53 |
| `components/study/LevelUpOverlay.tsx` | 1 | 164 |
| `components/study/ParticipantAvatarStack.tsx` | 1 | 62 |
| `components/study/XPFloat.tsx` | 1 | 62 |
| `components/ui/AnnouncementModal.tsx` | 1 | 158 |
| `components/ui/ConfirmModal.tsx` | 1 | 110 |
| `components/ui/Input.tsx` | 1 | 46 |
| `components/ui/OfflineBanner.tsx` | 1 | 87 |
| `components/ui/ReportContentSheet.tsx` | 1 | 141 |

## 8. Hard-coded durations and timers (file:line)

Numbers in `duration:` / `delay:`, `withTiming(… duration)`, `setTimeout(…, n)` and `setInterval(`: **264** in 82 files.

| File | Count | Lines |
|---|---|---|
| `components/streak/EvolutionModal.tsx` | 15 | 131, 132, 133, 134, 136, 137, 140, 141, 144, 148, 152, 154, 155, 156, 157 |
| `app/(tabs)/study.tsx` | 14 | 114, 121, 372, 400, 443, 517, 573, 877, 884, 913, 918, 919, 983, 985 |
| `app/(screens)/test/[id].tsx` | 11 | 78, 142, 143, 208, 209, 210, 212, 440, 453, 511, 528 |
| `app/(screens)/settings.tsx` | 10 | 101, 106, 107, 171, 176, 177, 410, 443, 448, 449 |
| `app/(screens)/course/[id].tsx` | 9 | 409, 414, 415, 547, 1181, 1186, 1187, 1196, 1902 |
| `app/(screens)/flashcard-study/[id].tsx` | 9 | 67, 68, 114, 291, 305, 311, 323, 330, 355 |
| `app/(auth)/email-auth.tsx` | 7 | 52, 53, 54, 55, 56, 57, 73 |
| `app/(screens)/lesson/[id].tsx` | 7 | 126, 128, 129, 153, 167, 288, 441 |
| `components/streak/MagicTree.tsx` | 7 | 405, 439, 440, 465, 529, 592, 630 |
| `components/streak/StreakHeroBackground.tsx` | 7 | 100, 101, 151, 152, 195, 234, 377 |
| `app/(screens)/streak-detail.tsx` | 6 | 301, 312, 323, 830, 835, 836 |
| `components/study/DigitDisplay.tsx` | 6 | 27, 28, 29, 32, 33, 34 |
| `components/dashboard/UnifiedBanner.tsx` | 5 | 76, 77, 135, 139, 147 |
| `components/study/LevelUpOverlay.tsx` | 5 | 43, 44, 46, 83, 86 |
| `components/ui/InfoModal.tsx` | 5 | 28, 30, 34, 35, 36 |
| `app/(auth)/login.tsx` | 4 | 47, 49, 51, 81 |
| `app/(screens)/courses.tsx` | 4 | 35, 279, 302, 330 |
| `components/flashcards/PublishSheet.tsx` | 4 | 45, 46, 50, 51 |
| `components/flashcards/RatingSheet.tsx` | 4 | 35, 36, 40, 41 |
| `components/flashcards/ReportSheet.tsx` | 4 | 43, 44, 48, 49 |
| `components/kurslar/SortTabs.tsx` | 4 | 35, 36, 46, 47 |
| `components/profile/CompareModal.tsx` | 4 | 86, 87, 91, 92 |
| `components/streak/FreezeSheet.tsx` | 4 | 62, 63, 67, 68 |
| `components/study/XPFloat.tsx` | 4 | 31, 34, 35, 36 |
| `components/ui/AvatarPickerModal.tsx` | 4 | 28, 33, 34, 44 |
| `components/ui/ReportContentSheet.tsx` | 4 | 46, 47, 51, 52 |
| `components/ui/StreakFlame.tsx` | 4 | 33, 34, 48, 49 |
| `app/(screens)/flashcard-deck/[id].tsx` | 3 | 193, 198, 199 |
| `app/(screens)/focus-timer.tsx` | 3 | 366, 368, 419 |
| `app/(screens)/teacher-earnings.tsx` | 3 | 78, 83, 84 |
| `app/(screens)/workspace.tsx` | 3 | 198, 207, 209 |
| `app/(tabs)/flashcards.tsx` | 3 | 62, 67, 68 |
| `app/_layout.tsx` | 3 | 403, 458, 483 |
| `components/courses/VideoPlayer.tsx` | 3 | 143, 346, 359 |
| `components/dashboard/BugunGrid/RankGridCard.tsx` | 3 | 74, 75, 120 |
| `components/donation/CopyRow.tsx` | 3 | 47, 48, 49 |
| `components/study/AmbientPlayer.tsx` | 3 | 53, 224, 225 |
| `app/(tabs)/index.tsx` | 2 | 287, 299 |
| `app/(tabs)/musobaqalar.tsx` | 2 | 43, 44 |
| `app/(tabs)/notifications.tsx` | 2 | 313, 314 |
| `app/(tabs)/profile.tsx` | 2 | 50, 51 |
| `components/dashboard/HeroCard.tsx` | 2 | 47, 48 |
| `components/dashboard/SkeletonBlock.tsx` | 2 | 22, 23 |
| `components/feed/CommentsSheet.tsx` | 2 | 298, 384 |
| `components/flashcards/MyDecksTab.tsx` | 2 | 234, 235 |
| `components/kurslar/CourseCard.tsx` | 2 | 39, 41 |
| `components/profile/BadgeDetailSheet.tsx` | 2 | 31, 32 |
| `components/rewards/RewardModal.tsx` | 2 | 48, 73 |
| `components/streak/StreakAtRiskModal.tsx` | 2 | 55, 66 |
| `components/study/AchievementOverlay.tsx` | 2 | 39, 41 |
| `components/study/CompletionSheet.tsx` | 2 | 33, 36 |
| `components/ui/NotifToast.tsx` | 2 | 63, 70 |
| `components/weekly-review/Skeleton.tsx` | 2 | 13, 14 |
| `hooks/useHideOnScroll.ts` | 2 | 15, 22 |
| `hooks/useOnline.ts` | 2 | 15, 28 |
| `app/(screens)/ai-companion.tsx` | 1 | 93 |
| `app/(screens)/book/[id].tsx` | 1 | 381 |
| `app/(screens)/book-reader/[id].tsx` | 1 | 202 |
| `app/(screens)/books.tsx` | 1 | 146 |
| `app/(screens)/daily-quiz.tsx` | 1 | 160 |
| `app/(screens)/jobs.tsx` | 1 | 192 |
| `components/daily-quiz/ResultTicket.tsx` | 1 | 59 |
| `components/daily-quiz/ShareCard.tsx` | 1 | 46 |
| `components/dashboard/BugunGrid/GridCard.tsx` | 1 | 43 |
| `components/donation/PaymentCard.tsx` | 1 | 39 |
| `components/flashcards/ProgressRing.tsx` | 1 | 38 |
| `components/flashcards/PublicSetsTab.tsx` | 1 | 62 |
| `components/kurslar/FeaturedCarousel.tsx` | 1 | 37 |
| `components/kurslar/States.tsx` | 1 | 13 |
| `components/layout/AnimatedTabBar.tsx` | 1 | 59 |
| `components/streak/GoalCompleteModal.tsx` | 1 | 43 |
| `components/streak/StreakLostModal.tsx` | 1 | 42 |
| `components/study/ChallengeCompletionModal.tsx` | 1 | 48 |
| `components/study/ChallengeProgressRing.tsx` | 1 | 30 |
| `components/study/TeamHeadToHeadBar.tsx` | 1 | 30 |
| `components/study/TimerCircle.tsx` | 1 | 33 |
| `components/ui/ConfirmModal.tsx` | 1 | 33 |
| `components/ui/OfflineBanner.tsx` | 1 | 33 |
| `components/ui/XPBar.tsx` | 1 | 24 |
| `components/weekly-review/WeeklyBar.tsx` | 1 | 39 |
| `hooks/useShareTicket.ts` | 1 | 72 |
| `stores/timerStore.ts` | 1 | 66 |

## 9. Core `Animated` usage (file:line)

`new Animated.Value` and `Animated.timing|spring|parallel|sequence|loop`: **277** in 44 files.

| File | Count | Lines |
|---|---|---|
| `app/(screens)/settings.tsx` | 24 | 94, 95, 100, 101, 102, 105, 106, 107, 164, 165, 170, 171, 172, 175, 176, 177, 436, 437, 442, 443, 444, 447, 448, 449 |
| `app/(screens)/course/[id].tsx` | 19 | 139, 142, 397, 398, 408, 409, 410, 413, 414, 415, 972, 973, 998, 1180, 1181, 1182, 1185, 1186, 1187 |
| `components/dashboard/UnifiedBanner.tsx` | 13 | 70, 73, 74, 76, 77, 130, 131, 132, 135, 139, 145, 146, 147 |
| `components/ui/InfoModal.tsx` | 11 | 20, 21, 22, 27, 28, 29, 30, 33, 34, 35, 36 |
| `app/(screens)/streak-detail.tsx` | 8 | 823, 824, 829, 830, 831, 834, 835, 836 |
| `app/(screens)/teacher-earnings.tsx` | 8 | 71, 72, 77, 78, 79, 82, 83, 84 |
| `components/dashboard/BugunGrid/GridCard.tsx` | 8 | 35, 36, 37, 42, 43, 44, 54, 58 |
| `components/dashboard/TangaInfoSheet.tsx` | 8 | 22, 23, 32, 33, 37, 43, 44, 48 |
| `components/flashcards/PublishSheet.tsx` | 8 | 29, 30, 44, 45, 46, 49, 50, 51 |
| `components/flashcards/RatingSheet.tsx` | 8 | 23, 24, 34, 35, 36, 39, 40, 41 |
| `components/flashcards/ReportSheet.tsx` | 8 | 31, 32, 42, 43, 44, 47, 48, 49 |
| `components/profile/CompareModal.tsx` | 8 | 80, 81, 85, 86, 87, 90, 91, 92 |
| `components/streak/FreezeSheet.tsx` | 8 | 48, 49, 61, 62, 63, 66, 67, 68 |
| `components/ui/AvatarPickerModal.tsx` | 8 | 21, 22, 27, 28, 29, 32, 33, 34 |
| `components/ui/ReportContentSheet.tsx` | 8 | 34, 35, 45, 46, 47, 50, 51, 52 |
| `app/(screens)/flashcard-deck/[id].tsx` | 6 | 192, 193, 194, 197, 198, 199 |
| `app/(screens)/focus-timer.tsx` | 6 | 255, 256, 365, 366, 368, 382 |
| `app/(tabs)/flashcards.tsx` | 6 | 61, 62, 63, 66, 67, 68 |
| `app/(tabs)/study.tsx` | 6 | 912, 913, 914, 917, 918, 919 |
| `app/(screens)/search.tsx` | 5 | 35, 36, 42, 43, 44 |
| `app/(tabs)/notifications.tsx` | 5 | 309, 311, 312, 313, 314 |
| `components/dashboard/BugunGrid/RankGridCard.tsx` | 5 | 68, 72, 73, 74, 75 |
| `components/flashcards/MyDecksTab.tsx` | 5 | 230, 232, 233, 234, 235 |
| `components/profile/BadgeDetailSheet.tsx` | 5 | 25, 26, 30, 31, 32 |
| `components/rewards/RewardModal.tsx` | 5 | 66, 67, 71, 72, 73 |
| `components/streak/GoalCompleteModal.tsx` | 5 | 34, 35, 41, 42, 43 |
| `components/streak/StreakAtRiskModal.tsx` | 5 | 47, 48, 53, 54, 55 |
| `components/streak/StreakLostModal.tsx` | 5 | 34, 35, 40, 41, 42 |
| `components/study/ChallengeCompletionModal.tsx` | 5 | 36, 37, 46, 47, 48 |
| `components/ui/ConfirmModal.tsx` | 5 | 24, 25, 31, 32, 33 |
| `components/weekly-review/Skeleton.tsx` | 5 | 9, 11, 12, 13, 14 |
| `app/(screens)/workspace.tsx` | 4 | 193, 206, 207, 209 |
| `app/(tabs)/profile.tsx` | 4 | 46, 49, 50, 51 |
| `components/feed/CommentsSheet.tsx` | 4 | 118, 122, 123, 124 |
| `components/kurslar/CourseCard.tsx` | 4 | 29, 38, 39, 41 |
| `app/(screens)/book-reader/[id].tsx` | 3 | 126, 199, 202 |
| `components/feed/PostCard.tsx` | 3 | 40, 45, 48 |
| `components/ui/NotifToast.tsx` | 3 | 42, 48, 62 |
| `components/ui/OfflineBanner.tsx` | 3 | 13, 21, 31 |
| `hooks/useHideOnScroll.ts` | 3 | 7, 15, 22 |
| `components/daily-quiz/ResultTicket.tsx` | 2 | 55, 59 |
| `components/dashboard/HeroCard.tsx` | 2 | 42, 45 |
| `components/layout/AnimatedTabBar.tsx` | 2 | 53, 57 |
| `app/(screens)/connections.tsx` | 1 | 198 |

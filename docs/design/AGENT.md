# Sahifalab redesign — instructions for the coding agent

Put this file at `docs/design/AGENT.md` in the repo. Start every session with:

> Read `docs/design/AGENT.md` fully. We are doing **Phase N**. Follow the session protocol in section 3.

One phase per session, one phase per branch and pull request. Don't start the next phase until the current one is merged.

---

## 1. Context

You are redesigning **Sahifalab**, a production study app for Uzbek-speaking students. It is live and people use it daily, so every change must be safe to ship and easy to roll back.

**Stack (don't change it):**

- Expo + React Native + TypeScript, `expo-router`
- Supabase (auth, database, RPCs); a Python backend on Railway
- Zustand for state (persisted)
- `react-native-reanimated`, `react-native-gesture-handler`
- Payments go through a Telegram bot (payment code → Telegram → admin approval). **Never change the bot or its API.**
- OTA releases with EAS Update

**App structure today:**

```
app/_layout.tsx        Root Stack + auth guard (lines ~353-369) + deep-link map (lines ~55-101)
├── (auth)/            login, email-auth, signup, forgot-password, verify-email, telegram-callback
├── (onboarding)/      interests, motivation, experience, daily-goal, notifications
├── (tabs)/            index, study, courses, flashcards, musobaqalar (+ hidden: profile, notifications)
│                      custom AnimatedTabBar; tabs use dangerouslySingular (back-freeze fix, commit 65a3461)
└── (screens)/         37 pushed routes (course/[id], lesson/[id], daily-quiz, leaderboard, streak-detail, ...)
```

Deep links use the `sahifalab://` scheme. On Android, `https://sahifalab.uz/deck/*` also opens the app. A link opened while signed out is held and followed after login.

**What the data says (last 30 days), and why the redesign looks like this:**

- 398 active users, 31.7 daily. Stickiness (daily ÷ monthly users) is 8%.
- 44% of people who open the app do nothing tracked. Bugun (Home) must show one obvious action.
- 5 Savol (daily quiz) reaches 63% of active users, but only 46% of started rounds are finished and 77% of players play on one day only.
- Focus timer: 129 users averaging 12.3 sessions each. This is the core habit.
- Flashcards: 87% of cards have never been studied, and only 16 people reviewed.
- Courses are the revenue. AI features (flashcards, weekly suggestions, quizzes) become a paid "Pro" subscription later.

**Target navigation (5 tabs):** Bugun · Fokus · Kurslar · Kartalar · Bellashuv. Profil opens from the avatar on Bugun. Books leave the app; they live on sahifalab.uz.

---

## 2. Non-negotiable rules

Apply these in every phase. If a task seems to need breaking one, stop and ask.

1. **Tokens only.** Colours, font sizes, spacing, radius, durations and springs come from `src/design/`. No hex values, raw numbers for sizes, or durations in screen files.
2. **Components only.** Screens are built from `src/components/ui/`. If a screen needs something new, add it there first, with all its states.
3. **Every screen handles four states:** loading (cached data or a skeleton, **never a full-screen spinner**), empty, error with retry, and offline.
4. **Animation on the UI thread only.** Reanimated shared values and worklets. Never animate with `setState`, `setInterval` or `Animated` from react-native core.
5. **Respect reduce motion.** Use `useReducedMotion()` from Reanimated. Movement becomes a 150 ms fade, celebrations show their final state, haptics stay.
6. **Lists:** use `@shopify/flash-list` for anything that can exceed 20 rows. Use `expo-image` with caching for all images.
7. **Don't break links.** Never delete a route or a deep-link entry in `app/_layout.tsx`. Redirect instead.
8. **Don't change the backend.** Leave Supabase queries, RPCs, scoring, XP, streak calculation and the payment bot alone unless the phase says so. You may add new read-only queries if needed; say so in the PR.
9. **Uzbek text:** Latin script with the correct ʻ (U+02BB) in oʻ and gʻ. Never use an ASCII apostrophe there. Assume strings run 30% longer than in English: no fixed-width text containers, and truncate with an ellipsis only where the spec says.
10. **Keep `AnimatedTabBar` behaviour** and the `dangerouslySingular` fix on tabs.
11. **No new dependencies** except `expo-haptics`, `@shopify/flash-list` and `lottie-react-native`, unless you ask first and give a reason.
12. **Small diffs.** If a phase touches more than about 25 files, stop and propose a split.

---

## 3. Session protocol (follow it every phase)

1. **Read** this file, then the files the phase names. Don't skim: open them.
2. **Plan** in plan mode. Write:
   - the files you will create, change or delete;
   - for each screen, the components it will use;
   - risks, and anything you are unsure about;
   - questions for me.

   **Stop and wait for my approval.**
3. **Implement** in small commits, one concern per commit, with clear messages.
4. **Check yourself:**
   - `npx tsc --noEmit` passes;
   - lint passes;
   - existing tests pass, and the new pure functions have tests;
   - `grep` the changed screen files for `#` hex colours, `fontSize:` numbers, `duration:` numbers and `setInterval`. There should be none outside `src/design/`.
5. **Report** using this template:

```
## Phase N report
What changed: (bullets)
Files: (count + list)
Decisions I made: (anything not specified in AGENT.md)
Check on a device: (numbered list of exact taps to try)
Known gaps / follow-ups:
Analytics events added or changed:
```

**Stop and ask (don't guess) when:**

- a backend change seems needed;
- a route or deep link would have to move;
- the spec conflicts with what the code does today;
- a design decision is missing.

---

## 4. Design tokens (create these exactly in Phase 1)

### Colours: `src/design/tokens.ts`

```ts
export const palette = {
  dark: {
    bg: '#0D0D0F',
    surface: '#17171B',
    surfaceRaised: '#202026',
    border: '#2B2B32',
    tabBar: '#121215',
    text: '#F4F2EE',
    textMuted: '#A3A1A8',
    textFaint: '#6E6C74',      // disabled and decoration only, never body text
    accent: '#E8722D',         // brand orange: primary buttons, active tab, progress
    onAccent: '#1A0F08',       // text and icons ON accent fills (white fails contrast)
    accentText: '#F08A4B',     // orange used as text on bg
    accentSoft: 'rgba(232,114,45,0.14)',
    success: '#3DBE6B',
    successText: '#5CCB84',
    danger: '#E5484D',
    dangerText: '#F07175',
    freeze: '#4C9EEB',         // streak freeze only
    coin: '#F2C14E',           // coin icon and coin amounts only
    scrim: 'rgba(0,0,0,0.5)',
  },
  light: {
    bg: '#FAF7F1',
    surface: '#FFFFFF',
    surfaceRaised: '#F3EEE5',
    border: '#E6DFD2',
    tabBar: '#FFFFFF',
    text: '#1C2530',
    textMuted: '#5B6573',
    textFaint: '#8A919B',
    accent: '#E8722D',
    onAccent: '#1A0F08',
    accentText: '#B4531A',
    accentSoft: 'rgba(232,114,45,0.12)',
    success: '#1F8F4A',
    successText: '#1F8F4A',
    danger: '#C62F35',
    dangerText: '#C62F35',
    freeze: '#2775C2',
    coin: '#C9921A',
    scrim: 'rgba(0,0,0,0.4)',
  },
} as const;
```

Retire these: the saturated purple headers (competitions, public decks), the blue "Sotib olish" button, and the separate amber `#F5A623`. Category badges use one 8-colour set at low saturation, only as small badge backgrounds.

Check every text-on-background pair against WCAG AA (4.5:1; 3:1 for text 24 px and larger) in **both** themes, and report any pair that fails.

### Type

Font: **check first.** The app must render Cyrillic (leaderboards show names like "Князь") and the ʻ glyph. If the current font lacks either, propose Onest or Manrope and wait for my answer.

| Token | Size / line height | Weight |
| --- | --- | --- |
| `display` | 40 / 44 | 800 |
| `title1` | 28 / 34 | 700 |
| `title2` | 20 / 26 | 700 |
| `headline` | 17 / 22 | 600 |
| `body` | 15 / 22 | 400 |
| `callout` | 13 / 18 | 500 |
| `overline` | 11 / 14, letter spacing 0.9 | 700, uppercase |

Every number that changes (timer, XP, scores, ranks, counts) uses `fontVariant: ['tabular-nums']`.

### Space, radius, depth

- Spacing: 4, 8, 12, 16, 20, 24, 32, 40, 56. Screen gutter 20. Gap between cards 12. Gap between sections 24–32.
- Radius: `sm` 10 (chips), `md` 14 (buttons, inputs), `lg` 20 (cards), `xl` 24 (hero cards), `sheet` 28, `full`.
- In dark mode, depth comes from a lighter surface, not shadows. Light mode gets one shadow level (y 2, blur 8, 6% black). Android `elevation` 2 or less.
- Touch targets at least 48×48. Icons from one line set (Lucide), 20 and 24 px, stroke 1.75–1.9. No emoji as icons; emoji only inside user content.

---

## 5. Motion system (create in Phase 1: `src/design/motion.ts`)

The goal is iOS-level smoothness: minimal, premium, never decorative.

```ts
import { Easing } from 'react-native-reanimated';

export const springs = {
  nav: { duration: 500, dampingRatio: 1 },    // push/pop, sheets, tab indicator: no bounce
  ui:  { duration: 350, dampingRatio: 0.85 }, // toggles, chips, press release, cards settling
  pop: { duration: 450, dampingRatio: 0.6 },  // celebrations only
};
export const easing = {
  standard: Easing.bezier(0.32, 0.72, 0, 1),  // iOS-like curve for all timing animations
  exit: Easing.bezier(0.3, 0, 1, 1),
};
export const durations = { fast: 150, fade: 220, slow: 360, celebrate: 700 };
export const press = { scale: 0.97, opacity: 0.9 };
export const stagger = { step: 30, maxItems: 5 };
```

If your Reanimated version doesn't support `duration` + `dampingRatio` in `withSpring`, convert each spring to `damping`/`stiffness`/`mass` values that look the same. Tell me which you used.

**Movement types (only these):**

| Name | Behaviour | Where |
| --- | --- | --- |
| Push | Native stack. Incoming screen from the right; outgoing shifts left and dims. Edge swipe-back on iOS. | Course detail, deck, competition, settings |
| Sheet | Rises from the bottom with `springs.nav`. On iOS-style screens the screen behind scales to 0.93 with 22 px corners; 50% scrim; drag down to close with velocity hand-off. | Purchase, filters, upgrade, confirmations |
| Tab switch | Content crossfade 220 ms, **no sliding**. Indicator moves with `springs.nav`. | Tab bar |
| Press | Scale 0.97 + opacity 0.9 on press-in; `springs.ui` back. | Every pressable |
| Fade | 220 ms `easing.standard`. | Text and colour changes, skeleton → content |

Push and pop use expo-router's native `Stack` (react-native-screens), not a JS transition. On Android, configure the stack to slide from the right with matching timing. Check what animation options your installed react-native-screens version offers and tell me.

**Signature moments (only these celebrate):**

| Moment | Where | Motion | Haptic |
| --- | --- | --- | --- |
| Streak tick | Bugun, daily focus goal met | Flame scales 1 → 1.35 → 1; number rolls up (63 → 64, vertical roll, 700 ms); 1–2 new leaves grow on the tree with `springs.pop`, 380 ms delay. Once per day. | success |
| Correct answer | 5 Savol, flashcards | Option fills green; check mark pops in (`springs.pop`). | light |
| Wrong answer | 5 Savol | Option shakes ±6 px twice in 240 ms and turns red; the correct option highlights green. | error |
| Result reveal | 5 Savol result | Ring fills to the score; answer dots appear one by one (30 ms stagger); rank counts up. | success on 4–5 |
| Focus complete | Fokus | Ring finishes; one pulse; earned XP flies to the header counter. | success |
| Flashcard flip | Card study | rotateY 180° in 360 ms with backface hidden; grade buttons slide up after the flip. | light |
| Level up | Anywhere XP is earned | One full-screen moment. The only Lottie file in the app. | heavy |

**Rules:**

- Everything is interruptible: a tap or swipe mid-animation reverses from the current position.
- No bounce on navigation or sheets; bounce only in the celebration moments.
- Things move from where they came from: a sheet rises from its button's side, XP flies to its counter.
- No looping animations on idle screens (the running timer ring is the only exception). No blur over scrolling content on Android. No animated shadows.
- Stagger only on a screen's first mount, never on refresh or tab return.
- Haptics: light on primary buttons, success on goal and correct streaks, error on wrong answers. Nothing on tab switch or scroll.
- Test on a 3–4 GB RAM Android phone at 60 Hz. If it drops frames there, simplify the animation.

---

## 6. Components to build (Phase 1): `src/components/ui/`

Each component ships with every state listed and works in both themes.

| Component | Variants | States |
| --- | --- | --- |
| `Button` | primary, secondary (outline), ghost, destructive; sm 40 / md 48 / lg 54 | default, pressed, disabled, loading |
| `Card` | plain, pressable, hero | default, pressed, skeleton |
| `ListRow` | leading icon tile / avatar / thumbnail; trailing chevron / value / badge / check | default, pressed, done (dimmed + check), skeleton |
| `Chip` | filter, choice | default, selected, disabled |
| `SegmentedControl` | 2–3 segments | animated selection |
| `ProgressBar`, `ProgressRing` | thin, thick | animated value change |
| `Sheet` | bottom sheet with grabber | open, dragging, closing |
| `Input`, `TextArea` | with icon, with counter | default, focused, error, disabled |
| `Skeleton` | block, text line, row | shimmer (off with reduce motion) |
| `EmptyState` | icon, title, one action | — |
| `Toast` | success, error, info | enter, exit |
| `StatTile` | number + label (+ delta) | count-up on first view |
| `Avatar` | image, initials | with level ring |
| `Badge` | count, PRO, status | — |
| `Countdown` | days / hours / minutes tiles | live |
| `ScreenHeader` | title, back, trailing actions | — |
| `Pressable` (base) | wraps press scale + haptic | — |

Add a dev-only gallery screen `app/(screens)/dev-gallery.tsx`, reachable only in development builds, that shows every component in both themes.

---

## 7. Phases

### Phase 0: audit and measurement (no visual changes)

**Read:** `app/_layout.tsx`, all files under `app/(tabs)/`, `app/(screens)/course/[id].tsx`, `app/(screens)/daily-quiz*`, the analytics module (find it), the flashcard study screen.

**Steps:**

1. Write `docs/design/inventory.md`:
   - every route → main components and hooks;
   - every hardcoded colour, font size and duration (file:line);
   - duplicated components (two or more versions of the same card, button or header).
2. Fix the 5 Savol time metric: count only time while the quiz screen is in the foreground (`AppState`).
3. Record the AI flashcard source (text or image) on each generation.
4. **Ask me** whether to add the "Oson" (easy) grade button or remove it from scheduling and analytics. It has 0 uses because the UI shows only three buttons.
5. Add these analytics events if missing (check the existing naming convention first):
   - `app_open`
   - `today_primary_action_tap { action }`
   - `quiz_start`, `quiz_answer { index, correct }`, `quiz_complete { score }`, `quiz_resume`
   - `course_view { courseId }`, `purchase_sheet_open`, `purchase_start`, `purchase_approved`
   - `deck_copy { size }`, `review_session_start`, `review_session_complete { cards }`
   - `ai_quota_exhausted { feature }`, `pro_sheet_open { source }`
6. Profile the course detail screen. Today it shows a black screen with a spinner for about 8 seconds. Find the cause (slow query, waterfall, missing index, blocking render). **Report the cause; don't fix it yet.**
7. Check whether the `current_week_progress` call (about 2.8 s average) blocks the home screen's render.

**Done when:** `inventory.md` exists; the event list is implemented and listed in the report; the course-page cause is identified with evidence.

---

### Phase 1: foundation

**Read:** sections 2, 4, 5 and 6 of this file; `inventory.md`.

**Steps:**

1. Font check (section 4). If a change is needed, propose it and wait.
2. Create `src/design/tokens.ts`, `typography.ts`, `spacing.ts`, `motion.ts` and `index.ts`.
3. Create a `ThemeProvider` plus a `useTheme()` hook that follows the existing setting (Qorongʻi / Yorugʻ / Tizim) and system changes.
4. Create `src/lib/haptics.ts` wrapping `expo-haptics` (`light`, `success`, `error`, `selection`). It must be a no-op when haptics are unavailable.
5. Build every component in section 6, plus the dev gallery.
6. Fix the course detail blank screen using the Phase 0 finding. Render the header and title immediately from list data already in memory (pass it through route params or a store), and show a skeleton for the rest.
7. Fix these bugs:
   - Rank "#10" wraps to two lines in competition rankings: use a fixed-width rank column with tabular numbers.
   - Empty QR placeholder on the 5 Savol share card: show the real QR or remove the box.
   - Truncated streak text on Home ("bugu…").
   - Flashcard study shows the back side ("ORQA TOMON") before the front at 0/10.
   - Duplicate green and orange swatches in the new-deck colour picker.

**Don't** restyle any other screens yet.

**Done when:** the gallery renders all components in both themes; contrast pairs are reported; course detail never shows a blank screen; all five bugs are fixed.

---

### Phase 2: Bugun (Home)

**Read:** `app/(tabs)/index.tsx` and the hooks it uses.

**Layout, top to bottom:**

1. **Header:** "Xayrli tong," (muted, changes by time of day: tong / kun / kech) plus first name (`title1`). Right side: coin pill, bell (with an unread dot), and an avatar that opens Profil.
2. **Hero card** (`xl` radius):
   - left: the streak tree illustration, 96 px. Tapping it opens `streak-detail`.
   - right: flame plus streak number (`display`), "kunlik seriya", the tree stage (e.g. "Sehrli daraxt · 6-bosqich" in `successText`), and a 7-day strip (done = green with check, freeze = blue, today = orange outline).
   - below: the "Bugungi fokus" label with "12 / 20 daq" and a progress bar.
   - a primary `Button` (lg, full width) whose label comes from `getPrimaryAction()` (below); a muted caption under it.
3. **"BUGUNGI REJA"** overline, then one `Card` of `ListRow`s: 5 Savol #N (time until it closes), Kartalar (due count and estimated minutes), and the current course lesson. Done rows dim and move to the bottom.
4. **Weekly rank teaser:** "#57", "#56 gacha 120 XP" and a progress bar. Opens Bellashuv.
5. **One extra slot:** on Mondays the weekly review card; for users with no enrolment, one recommended course; otherwise nothing.

**`getPrimaryAction(state)`**: a pure function in `src/features/today/primaryAction.ts`, with unit tests for every branch:

| Condition | Label | Action |
| --- | --- | --- |
| Focus goal not met | "Fokusni davom ettirish" (or "Fokusni boshlash" if 0 minutes) | Open Fokus with the goal preset |
| Goal met, quiz not played | "5 Savolni oʻynash" | Open the daily quiz |
| Quiz done, cards due | "Kartalarni takrorlash · {n} ta" | Start a review session |
| All done, has a course | "Kursni davom ettirish" | Open the next lesson |
| All done | Caption "Bugungi reja bajarildi" and no button | — |

Caption examples: "Seriyani saqlash uchun yana 8 daqiqa" · "Bugungi mavzu: Pul va iqtisod" · "Taxminan 4 daqiqa".

**States:**

- First day (no streak): the hero says "Birinchi maqsadingiz — 10 daqiqa".
- Offline: cached data plus a small "oflayn" chip.
- After 20:00 with the goal not met: the hero caption warns that the streak is at risk and mentions freezes.
- Loading: always show persisted data first, then refresh in the background. Never block on `current_week_progress`.

**Motion:** the streak tick moment (section 5), once per day, when the goal flips to met.

**Done when:** a cold start on the test phone shows content within about 1 second; every primary-action branch is reachable in the dev menu or tests; `today_primary_action_tap` fires.

---

### Phase 3: 5 Savol and Fokus

**5 Savol play screen:**

1. Header: close button (keeps progress), overline "5 SAVOL #67 · PUL VA IQTISOD", "3-savol / 5".
2. Five-segment progress bar: answered ones green or red, current one orange.
3. Question in `title2` (22 / 30).
4. Four answer buttons (min height 58, `lg` radius, letter badge A/B/D/E).
5. On tap: lock all options; show the correct/wrong moment; slide up an explanation card (1–2 lines) and a primary "Keyingi savol" button, which reads "Natijani koʻrish" on the last question.
6. Persist the position per round. If the user leaves, Bugun shows "Davom etish · 3/5", and re-entering resumes at that question.

**5 Savol result screen:** keep the existing score card and share flow, then add:

- "Ertaga: {category} · 06:00 da ochiladi";
- quiz streak;
- friends' scores above the full ranking;
- the QR fix from Phase 1;
- the result reveal moment.

**Fokus:**

- Ring progress driven by a shared value on the UI thread (no re-render each second). Display time updates once per second via a derived value or a text component that doesn't re-render the screen.
- Duration chips (15 / 25 / 45 / 60 / Boshqa); the session count becomes a stepper; ambient sound becomes one button that opens a `Sheet`.
- Running state: a quiet full-screen mode showing only the ring, time, pause and stop, with an option to keep the screen awake.
- Show "0", never "—", for empty stats.
- The focus complete moment.

**Don't** change scoring, XP or streak calculation.

**Done when:** you can leave a quiz at question 3, kill the app, reopen it and resume; the timer ring stays smooth through a 1-minute session on the test phone.

---

### Phase 4: navigation and Bellashuv

**Navigation:**

1. Tab order: **Bugun, Fokus, Kurslar, Kartalar, Bellashuv**. `profile.tsx` and `notifications.tsx` stay hidden routes.
2. Remove books from navigation. **Ask me** whether book routes should keep working or redirect to `https://sahifalab.uz`.
3. Tab switch: content crossfade 220 ms; a pill indicator behind the active icon moves with `springs.nav`; the active icon and label use `accentText`.
4. Update the deep-link map: every old link must still open the right screen. Put a table of old link → new destination in the PR description.

**Bellashuv screen (`musobaqalar.tsx`)**, top to bottom:

1. `title1` "Bellashuv".
2. Today's 5 Savol card:
   - not played: title, topic, "35 kishi oʻynadi · 2 ta doʻstingiz ham", and a primary "Oʻynash" button;
   - played: score "3/5", answer dots, "#7-oʻrin", and "Ertaga: …".
3. Competition card:
   - live: team bar, your contribution, time left;
   - none live: "KEYINGI BELLASHUV", the title, a `Countdown` (kun / soat / daqiqa), one line of rules, and a secondary "Eslatma qoʻyish" button that schedules a local notification.
4. "HAFTALIK REYTING" overline with a "Hammasi" link, then the top 5 rows (fixed-width rank column; gold, silver and bronze rank colours; avatar initials; name; level and hours; XP), then **your row pinned** with an `accentSoft` background and "#56 gacha 120 XP".
5. A collapsed "Yakunlangan bellashuvlar · 12 ta" row.

**Competition detail:** a cover image header with a dark scrim instead of the purple block; your row sticky at the bottom of long rankings; FlashList.

**Done when:** every deep link in the PR table opens correctly on the phone; tab switching shows no flicker or layout jump.

---

### Phase 5: Profil and progress systems

1. Profil opens from the avatar, with a back button.
2. Layout:
   - identity row (avatar with accent ring, name, handle, followers, settings);
   - level hero card on an accent fill with `onAccent` text: "DARAJA 8", title "Koʻkalosh", XP bar, "20 687 / 24 300 XP", "3 613 XP qoldi";
   - three `StatTile`s (soat, seriya, reyting);
   - "NISHONLAR": 8 earned badges in a 4-column grid, with "Hammasi (23 / 80)";
   - a list card: Statistika, Seriya va inventar, Sevimli kurslar, Oʻqituvchi paneli.
3. Merge trophies, achievements, titles and tree stages into one badge grid with category filters. Earned badges come first; locked ones only on the full page, shown as readable silhouettes (not low-contrast ghosts).
4. Merge `tree-stages` into `streak-detail`. Keep the existing tree art and stages.
5. Add the level-up moment (one Lottie).

**Don't** delete any badge data. This is presentation only.

**Done when:** Profil fits in about two screen heights, and every old badge is still reachable.

---

### Phase 6: Kartalar

1. Hero: "{n} ta karta bugun · ~{m} daqiqa" plus a primary "Takrorlashni boshlash" button.
2. AI generation card:
   - "AI bilan karta yaratish", "Matn yoki rasmdan · bugun 3 ta bepul";
   - a footer with a PRO badge and "Pro bilan cheksiz".
   - Build the upgrade `Sheet` as a component **behind a feature flag (off)**. When the quota runs out, today's behaviour stays until Pro launches.
3. Deck list with due-count badges; the public library one tap away.
4. Copying a deck larger than 50 cards opens a sheet: "Kuniga nechta yangi karta?" with options 10 / 20 / 30 (default 20). Store the choice per deck and introduce only that many new cards per day.
5. Study screen:
   - front first;
   - the flip moment;
   - grade buttons per the Phase 0 decision;
   - an end summary with accuracy and tomorrow's count.
6. Feed the due count into the Bugun plan.

**Ask me** before changing the scheduling algorithm itself.

**Done when:** copying a 500-card deck asks for a daily amount and only that many new cards appear the next day.

---

### Phase 7: Kurslar and purchase

1. Kurslar tab:
   - `title1` and a search button;
   - "Davom etish" row for enrolled courses;
   - one featured course (16:9 cover, title below the image, never on it);
   - "BARCHA KURSLAR" list rows (thumbnail, title, meta, price; "Bepul" in `successText`).
   - Category chips only for categories that have courses. No hero carousel and no Ommabop/Yangi/Bepul/Top tabs until there are more than 8 courses.
2. Social proof: hide ratings under 5 ratings (show "Yangi" instead) and student counts under 20.
3. Course detail (native push):
   - cover with a circular back button;
   - title, meta, a "NIMANI OʻRGANASIZ" card, and the lesson list (first lesson "Bepul koʻrish", the rest with a lock);
   - a sticky bottom bar with "Narxi", the price and "Sotib olish" (or "Boshlash" if free).
4. Purchase sheet (sheet preset):
   - title "Kursni sotib olish", course and price;
   - three numbered steps: "Ilova sizga toʻlov kodini beradi" → "Telegram botda toʻlab, chek rasmini yuborasiz" → "Tasdiqlangach kurs ochiladi va xabar keladi";
   - primary "Telegram orqali davom etish" with the Telegram icon; ghost "Bekor qilish".
5. Pending state: a "Tekshirilmoqda" chip on the course card and detail, a status screen, and a push notification when approved (use the existing approval signal).

**Don't** change the payment bot, the code format or the approval API.

**Done when:** you can walk a purchase on the phone up to the Telegram hand-off and back, the pending state shows, and `purchase_*` events fire.

---

### Phase 8: polish and release check

1. Light-mode pass on every rebuilt screen; fix contrast failures.
2. Accessibility:
   - `accessibilityLabel` on icon-only buttons;
   - roles on custom controls;
   - Dynamic Type / font scale up to 1.3 without clipping.
3. Performance on the test phone:
   - cold start to visible content;
   - scroll at 60 fps on Bellashuv and Kartalar;
   - no JS-thread drops during push and sheet.

   Report the numbers.
4. Reduce-motion pass: turn it on and walk every flow.
5. Remove dead code: old components replaced during the redesign, `tree-test`, the planner.
6. Release notes in Uzbek, 5 bullets maximum.

---

## 8. Copy reference (Uzbek, use as written)

| Key | Text |
| --- | --- |
| Tabs | Bugun · Fokus · Kurslar · Kartalar · Bellashuv |
| Greeting | Xayrli tong / Xayrli kun / Xayrli kech, {name} |
| Streak | {n} kunlik seriya |
| Today plan | BUGUNGI REJA · {done} / {total} bajarildi |
| Quiz closes | Yopilishiga {h} s {m} d |
| Resume | Davom etish · {i}/5 |
| Correct | Toʻgʻri! +{xp} XP |
| Wrong | Notoʻgʻri. Toʻgʻri javob: {answer} |
| Next | Keyingi savol · Natijani koʻrish |
| Rank gap | #{rank} gacha {xp} XP |
| Countdown | kun · soat · daqiqa |
| Remind | Eslatma qoʻyish |
| Free quota | bugun {n} ta bepul |
| Pending | Tekshirilmoqda |
| Empty stat | 0 |

---

## 9. Recommended model per phase

| Phase | Model | Why |
| --- | --- | --- |
| 0 Audit | Opus | Reading the whole codebase and finding root causes |
| 1 Foundation | Opus | Architecture that every later phase depends on |
| 2 Bugun | Sonnet | Building screens on top of the foundation |
| 3 5 Savol + Fokus | Sonnet (Opus if the timer ring stutters) | UI work; tricky animation is the exception |
| 4 Navigation | Opus | Deep links and routing are easy to break silently |
| 5 Profil | Sonnet | Presentation changes |
| 6 Kartalar | Sonnet | UI plus a contained data change |
| 7 Kurslar + purchase | Opus | Revenue flow; mistakes cost money |
| 8 Polish | Sonnet | Checklists |

Whatever the model, keep plan mode on and approve each plan yourself.

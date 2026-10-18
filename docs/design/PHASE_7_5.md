# Phase 7.5: UI fixes after review

Put this file at `docs/design/PHASE_7_5.md`. Save screenshots of the v2 mockups as:

- `docs/design/v2/bugun-light.png`, `bugun-dark.png`
- `docs/design/v2/bellashuv-light.png`
- `docs/design/v2/profil-dark.png`, `profil-light.png`
- `docs/design/v2/week-icons.png`

Use the Tweaks theme switch on each board for the light and dark versions.

Start each session with:

> Read `docs/design/AGENT.md` and `docs/design/PHASE_7_5.md` fully. We are doing **Part A** (or B, C, D). Follow the session protocol in AGENT.md section 3. Use the screenshots in `docs/design/v2/` as the visual target.

Run the parts in order, one branch and PR each:

| Part | What | Model |
| --- | --- | --- |
| A | Bugs and wrong numbers | Opus |
| B | Tokens and shared components | Opus |
| C | Bugun screen | Sonnet |
| D | Bellashuv and Profil | Sonnet |

All rules from AGENT.md section 2 still apply.

---

## Part A: bugs and wrong numbers (fix before any visual work)

These make the app look broken whatever the styling. Fix them first.

### A1. Flashcard counts are wrong and inconsistent

**Today:** the Bugun button says "Kartalarni takrorlash · 778 ta · Taxminan 104 daqiqa". The plan row on the same screen says "Kartalar · 4459 ta · ~595 daq". These are two different numbers for the same thing, and both are impossible to finish in a day.

**Do:**

1. Find every place that computes a "cards due" number and list them in your plan.
2. Create one selector, `getTodayReviewQueue(userId)`, in `src/features/flashcards/queue.ts`. It returns `{ reviewsDue, newToday, total, estMinutes }`:
   - `reviewsDue` = cards in review/learning state whose due date ≤ end of today.
   - `newToday` = for each deck, `min(deck.dailyNewLimit ?? 20, newCardsInDeck)`, minus new cards already introduced today.
   - `total = reviewsDue + newToday`.
   - `estMinutes = ceil(total × 7 s / 60)`, where 7 s per card is the measured average (5.2 s) plus a margin.
3. Every screen (Bugun tile, Kartalar hero, deck list badges, study session length) reads this selector. No other count may be shown.
4. Decks copied before Phase 6 have no `dailyNewLimit`; treat them as 20.
5. If `reviewsDue` is above 150, show at most 150 today and say so in the Kartalar hero: "Bugun 150 ta · qolganlari ertaga". **Ask me before** changing how the scheduler itself spreads an overdue backlog.

**Done when:** the same number appears on Bugun and Kartalar, and a user with 4,459 new cards sees about 20–40 cards today, not 4,459.

### A2. Focus progress label

**Today:** "180 / 10 daq" in green.

**Do:** when the goal is met, show "Maqsad bajarildi ✓" on the right, with "**180 daq** bugun" and "Maqsad: 10 daq" under a full bar. Before the goal is met, show "12 / 20 daq" as now. Make this a pure function with tests.

### A3. Active competition progress bar is empty

**Today:** the Faol bellashuv card shows a beige bar with no fill.

**Do:** find out what it was meant to show and report it. Replace it with "Top 10 gacha {x} soat qoldi" plus a filled bar (your hours ÷ hours of the #10 participant). If you are already in the top 10, show "Top 10 dasiz · #{rank}" with a full bar. If the data isn't available, hide the bar; never show an empty one.

### A4. Floating gear button on every screen

**Today:** a grey round gear button floats over content on every screen (over the rating card, the stat tiles and the competition list).

**Do:** identify where it comes from.

- If it is Expo dev-client's tools button, confirm on an EAS **preview** build that it doesn't appear, and say so.
- If it is ours (theme toggle, debug or dev gallery), remove it from production builds with `__DEV__`.

### A5. Avatar initials too small

**Today:** "Sanjar" shows a tiny "s" in a blue circle.

**Do:** in `Avatar`, initials = first letters of the first two words, uppercase; for one word, the first two letters. Font size = `round(size × 0.38)`, weight 800, white on the colour from `avatarColor(userId)` (8 fixed colours, picked by a hash of the id). Show initials whenever the image fails or is missing.

### A6. Bugun plan is missing Fokus

**Today:** "BUGUNGI REJA · 1 / 2 BAJARILDI" lists only Kartalar and 5 Savol.

**Do:** the plan always contains Fokus, 5 Savol, Kartalar (if the user has decks) and the current course (if enrolled). The count covers all of them.

### A7. The "#22 gacha 22 XP" line sits outside the "Siz" row on Bellashuv

**Do:** move it inside the highlighted row, under "Siz" (see the v2 Bellashuv screenshot).

---

## Part B: tokens and shared components

### B1. Filled accent buttons and tiles: white text on a brighter gradient

Dark text on orange looked muddy. Change it:

```ts
// src/design/tokens.ts (both themes)
accentFill: ['#F7782C', '#E2560E'],   // LinearGradient top → bottom
onAccent: '#FFFFFF',
accentShadow: 'rgba(226,86,14,0.28)', // light theme only: y 8, blur 20
```

- Use `expo-linear-gradient` (add it; it's an Expo package).
- **Contrast rule:** white on this orange is about 3.1–3.8:1, which passes WCAG only for large text (≥ 18.66 px bold). So every white label on an accent fill is **at least 18 px and weight 800**, or is a number of 24 px or more. Smaller text (chips, captions) on orange goes inside a white pill with `accentText` colour, as in the "KEYINGI" chip.
- `accentText` for orange text on backgrounds: light `#C2410C`, dark `#FF8A4C`.

### B2. Light theme surfaces

```ts
light: {
  bg: '#F7F3EC', surface: '#FFFFFF', raised: '#F4EFE6',
  border: '#ECE5D8', track: '#EEE7DB',
  shadowCard: '0 1 2 rgba(28,37,48,0.04) + 0 6 18 rgba(28,37,48,0.05)',
}
```

On iOS, two stacked shadows need a wrapper view; on Android, use `elevation: 2` and keep the border. Dark theme keeps borders and no shadows.

### B3. Semantic colours: add soft tints

Add `greenSoft`, `blueSoft`, `violetSoft`, `goldSoft`, `orangeSoft` (light ≈ 9–10% alpha, dark ≈ 16–18% alpha) plus their ink colours, for icon tiles and chips. Values are in the mockup files' `renderVals()`; copy them exactly.

### B4. Section titles

Replace the small grey uppercase overlines used as **section** titles ("BUGUNGI REJA", "HAFTALIK REYTING") with a sentence-case title: 20 px, weight 800, letter-spacing −0.2, colour `text`. On the right goes an optional meta in `muted` 13 px, or a link in `accentText` 14 px, weight 700. Overlines stay only **inside** cards ("YAKUNLANGAN", "DARAJA 8").

### B5. New components

1. **`WeekDayIcon`** (`react-native-svg`, 38×38), with states `done | frozen | missed | today | future`. Copy these exact shapes:

```tsx
// defs (once per component or a shared Defs provider)
<LinearGradient id="wdDone" x1="0" y1="0" x2="0" y2="1">
  <Stop offset="0" stopColor="#FFB45E"/><Stop offset="1" stopColor="#EE5A12"/>
</LinearGradient>
<LinearGradient id="wdIce" x1="0" y1="0" x2="1" y2="1">
  <Stop offset="0" stopColor="#E6F6FF"/><Stop offset="0.55" stopColor="#8FD0FF"/><Stop offset="1" stopColor="#3B8FE6"/>
</LinearGradient>

// done: orange gradient circle + gloss + white flame with a gold core
<Circle cx="19" cy="19" r="18" fill="url(#wdDone)"/>
<Ellipse cx="13" cy="10" rx="8" ry="4.5" fill="#FFF" fillOpacity={0.28}/>
<Path d="M19 8.5c.7 3 5.2 5.2 5.2 10.4a5.2 5.2 0 0 1-10.4 0c0-2.2 1.1-3.7 2.2-4.4 0 1.8.8 3 1.9 3C17.4 14.4 17.4 11.4 19 8.5z" fill="#FFF"/>
<Path d="M19 17.5c.5 1.4 2.2 2.2 2.2 4.4a2.2 2.2 0 0 1-4.4 0c0-1.2.6-1.9 1.2-2.2.1.9.4 1.3.9 1.3C18.6 20.2 18.6 19 19 17.5z" fill="#FFC56B"/>

// frozen: ice-crystal hexagon + top facet highlight + snowflake + frost sparkles
<Path d="M19 1.5 34.2 10.25v17.5L19 36.5 3.8 27.75v-17.5z" fill="url(#wdIce)"/>
<Path d="M19 1.5 34.2 10.25 19 19 3.8 10.25z" fill="#FFF" fillOpacity={0.35}/>
<G stroke="#FFF" strokeWidth={2} strokeLinecap="round">
  <Path d="M19 10v18M11.2 14.5l15.6 9M11.2 23.5l15.6-9"/>
  <Path d="M16.5 11.5 19 13.5l2.5-2M16.5 26.5 19 24.5l2.5 2"/>
</G>
<Circle cx="9" cy="27" r="1.2" fill="#FFF" fillOpacity={0.8}/><Circle cx="29" cy="9.5" r="1" fill="#FFF"/>

// missed: dashed raised circle + extinguished flame outline + slash (colours from theme: raised, border, faint)
<Circle cx="19" cy="19" r="17" fill={raised} stroke={border} strokeWidth={2} strokeDasharray="3 3"/>
<Path d="M19 10.5c.6 2.6 4.4 4.5 4.4 8.8a4.4 4.4 0 0 1-8.8 0c0-1.9.9-3.1 1.9-3.7" fill="none" stroke={faint} strokeWidth={1.8} strokeLinecap="round"/>
<Path d="M12 26 26 12" stroke={faint} strokeWidth={1.8} strokeLinecap="round"/>

// today (not done yet): dashed accent ring + centre dot
<Circle cx="19" cy="19" r="17" fill="none" stroke="#EE5A12" strokeWidth={2.4} strokeDasharray="4 3.2"/>
<Circle cx="19" cy="19" r="4" fill="#EE5A12"/>

// future: thin ring in `border`, no fill
```

   Give each icon an `accessibilityLabel`: "{kun}: bajarildi / muzlatildi / oʻtkazildi / bugun". **Gradient ids must be unique per instance** (`useId()`), or Android will mix up the gradients in lists.

2. **`PlanTile`**: see Part C. Variants `next | default | done`.
3. **`RivalLadder`**: see Part C.
4. **`CompetitionHero`**: see Part D.
5. **`Podium`**: see Part D.
6. **`BadgeTile`**: 72×72, radius 22, tinted background plus a 1 px tinted border, 34 px line icon, name under it (11/14, weight 600, centred, 2 lines max).

Add all of them to the dev gallery in both themes.

---

## Part C: Bugun

Target: `docs/design/v2/bugun-light.png` and `bugun-dark.png`.

### C1. Header: one row, no greeting

- Remove "Xayrli tong/kun/kech".
- Row height 48. Left: the user's display name, 28/34, weight 800, one line, ellipsis. Right, in this order and centred vertically with the name: coin pill → bell → avatar.
- Coin pill: height 36, `surface` with a 1 px border, gold coin icon (22 px gradient coin, not an outline icon), value 15 px, weight 700.
- Avatar 44 px with a 2 px accent ring and the level badge (20 px, accent fill, white number, 2 px `bg` border) at the bottom right. Tapping it opens Profil.

### C2. Hero card: streak only, no button

The big "Kartalarni takrorlash" button duplicated the plan below, so remove it. The single obvious action now lives in the plan grid (C3).

Contents, top to bottom:

1. A row with:
   - a **tree tile**: 112×112, radius 28, background light `radial(#E3F5EA → #F4FBF6)`, dark `radial(rgba(77,191,126,.22) → .04)`; the tree art inside at 100 px. Tapping it opens streak-detail.
   - a column: flame (gradient, 28×34) and the streak number (48/50, weight 800, tabular); "kunlik seriya" (15, muted); a stage chip "Sehrli daraxt · 6-bosqich" (13, weight 700, `green` on `greenSoft`, pill).
2. The week strip: 7 equal columns of `WeekDayIcon` (38 px) with the day label under each (12 px; today in `text` weight 800, other days in `muted` weight 600).
3. A focus block on `raised` (radius 16, padding 12/14):
   - label "Bugungi fokus", with the status from A2 on the right;
   - a 10 px bar with an orange gradient fill (`#FFB45E → #EE5A12`); **green is only for the "done" check text**;
   - a meta row under the bar.

Card: radius 28, padding 20, gap 18.

### C3. "Bugungi reja": a 2×2 grid of tiles

Section title "Bugungi reja" (B4), with a 4-segment mini progress and "2 / 4" on the right.

Grid: 2 columns, gap 12. Each `PlanTile` is at least 150 px tall, radius 24, padding 16. Inside:

- top: a 40 px icon tile (radius 12, tinted) and a status on the right (a check badge, a percentage, or a chip);
- a **big value**: 30/32, weight 800, tabular ("48 ta", "180 daq", "5/5", "3-dars");
- a title (16, weight 700) and a sub-line (13, muted), or a thin progress bar.

| Item | Value | Title | Sub | Icon tint |
| --- | --- | --- | --- | --- |
| Kartalar | `{total} ta` (from A1) | Kartalar | `~{estMinutes} daqiqa` | orange |
| Fokus | `{min} daq` | Fokus | `Maqsad {goal} daq` | orange |
| 5 Savol | `{score}/5` or `Oʻynash` | `5 Savol #{n}` | `#{rank}-oʻrin bugun` or `Yopilishiga {h} s {m} d` | blue |
| Course | `{n}-dars` | the course's short title | progress bar | violet |

**Which tile is "next":** reuse `getPrimaryAction()` from Phase 2. Its result picks the one tile shown as `variant="next"`:

- accent gradient fill, white text, accent shadow;
- a white "KEYINGI" pill top-right;
- a white 34 px circle with a play icon bottom-right.

**Order:** the next tile first, then the other unfinished tiles, then the done tiles.

**Done tiles keep full opacity** (no fading out). They show a green 26 px check badge instead of a chevron.

**Motion:**

- When a tile becomes done, it moves to its new position with a Reanimated `LinearTransition` using `springs.ui`.
- The "next" highlight crossfades to the new tile over 220 ms.
- Press: the standard press scale.

### C4. "Haftalik reyting" card: rival ladder

Section title "Haftalik reyting", with a "Hammasi" link to Bellashuv.

Card contents:

1. **Top row:**
   - a stack of the top 3 avatars (34 px, −10 px overlap, 2.5 px surface border) plus a "+{n}" bubble;
   - "{N} kishi bu hafta" (muted);
   - a pill "{d} kun qoldi" showing time until the weekly reset.
2. **`RivalLadder`:** three rows, connected by a 2 px vertical line behind the avatars.
   - The person **above** you: avatar, name, "#{rank}", XP.
   - **You**: `orangeSoft` background, 1.5 px `orangeLine` border, radius 16, "Siz", "#{rank}" in `accentText`, XP in weight 800.
   - The person **below** you: name, "#{rank} · {gap} XP orqada", XP.
   - If you are #1, show you plus the two people below. If you are last, show the two people above you plus you.
3. **Footer** on `raised` (radius 16):
   - a gradient trophy icon;
   - "**{gap} XP** — {name}ni quvib oʻtasiz.";
   - a muted second line "Taxminan {m} daqiqa fokus", where m = gap ÷ XP per focus minute from the existing XP rules (read them; don't invent);
   - a chevron. The whole footer opens the Fokus timer.

**Motion:** when your rank changes, the rows swap with `LinearTransition` and the XP numbers roll (the rolling-number component from the Phase 2 streak tick).

### C5. Optional slot

Keep "Tavsiya etilgan kurs" only for users with no enrolment, styled as a `ListRow` card with a 16:9 thumbnail on the left.

---

## Part D: Bellashuv and Profil

### D1. Bellashuv: new order and sections

Target: `docs/design/v2/bellashuv-light.png`.

Competitions matter most on this tab. The weekly ranking is XP-based. 5 Savol has its own ranking, which lives on its result screen. So, top to bottom:

**Section 1, "Bellashuvlar"** (meta on the right: "{n} ta faol"). One card holds both active and finished competitions.

1. **`CompetitionHero`**, for the live competition, or the next one if none is live:
   - **Cover band**, 168 px tall:
     - background = the competition's cover image, **blurred** (radius 18) and slightly saturated, under a dark gradient scrim (15% → 72%);
     - bottom-left: the **sharp thumbnail** (92×92, radius 20, 2 px white border, shadow) with, next to it, a chip "● FAOL · {d} KUN QOLDI" (live dot in `#4ADE80`; pulsing is the one allowed loop; off when reduce motion is on) and the title (21/25, weight 800, white).
     - This blur-plus-thumbnail treatment keeps the existing low-resolution thumbnails looking sharp. Use `expo-image` `blurRadius`.
   - **Body**, padding 16:
     - three stat tiles on `raised`: "#{rank} oʻrningiz" (rank in `accentText`), "{h} soat hissangiz", "{n} ishtirokchi";
     - the A3 progress row;
     - a primary gradient button "Fokusni boshlash" (19 px, weight 800, white). For team competitions, show the existing team bar above the button.
   - **Not started yet:** the same cover; the body shows the `Countdown` tiles and "Eslatma qoʻyish".
2. **"YAKUNLANGAN"** overline inside the same card, under a divider, with "Barchasi ({n})" on the right. Then the 3 latest finished competitions as rows:
   - 52 px thumbnail (radius 14);
   - title, and "{n} ishtirokchi" (or "Jamoaviy · {n} ishtirokchi");
   - a result chip on the right: `#{rank}` or "Jamoa {n}-oʻrin". Gold styling for top 3, `raised` otherwise.

**Section 2, "Haftalik reyting"** (meta: "XP boʻyicha · {d} kun qoldi"). A card containing:

1. **`Podium`**: 3 columns ordered #2, #1, #3.
   - Avatars 56 / 68 / 56 px with 3 px medal-colour rings (silver `#C9CDD3`, gold `#F2C14E`, bronze `#D08A54`), plus a rank coin overlapping the bottom of each avatar. A small crown above #1.
   - Name and XP under each avatar.
   - Podium blocks 44 / 64 / 32 px tall, each in a soft gradient of its medal colour.
2. Rows #4 and #5 (rank, avatar, name, "Lv.{n} · {h} soat", XP).
3. **Your row, pinned** (same style as the RivalLadder "Siz" row), with "#{next} gacha {gap} XP" **inside** it.
4. A "Toʻliq reyting" link, centred.

**Section 3, "5 Savol"** (meta: "Kunlik viktorina"). One compact card:

- a 48 px blue icon tile; "#{n} · {topic}"; "Bugun {players} kishi oʻynadi"; the score on the right (22, weight 800);
- a `raised` strip: "#{rank}-oʻrin" (accent) · "Ertaga {time} da yangi savollar" · "Natijalar" (accent). The strip opens the results screen with the 5 Savol ranking.
- Not played yet: the score becomes a "Oʻynash" pill, and the strip shows "Yopilishiga {h} s {m} d".

> Trade-off, decided: moving 5 Savol to the bottom of Bellashuv is safe because its main entry point is now the Bugun plan tile. Watch `quiz_start` for 2 weeks after release. If it drops by more than 15%, tell me.

### D2. Profil

Target: `docs/design/v2/profil-dark.png` and `profil-light.png`.

1. **Header:** back, "Profil" (17, weight 700) centred, share and settings icons on the right. Move "edit" out of the header into a "Tahrirlash" secondary button on the identity row.
2. **Identity row:** 72 px avatar with a 3 px accent ring; name (22, weight 800); handle in `accentText`; "**37** kuzatuvchi · **29** kuzatilmoqda" (numbers in `text`, words in `muted`).
3. **Level card**, replacing the flat orange card with black text:
   - Background: a diagonal gradient `#FF9A4A → #F26A1F → #C9430A`, radius 28, padding 20, accent shadow (light theme).
   - Decorative concentric rings at the top-right at 18% white (one SVG, `pointerEvents="none"`).
   - Left: a 76 px hexagon level emblem (white-outlined outer hexagon, solid white inner hexagon, level number in `#D2530E`, weight 800).
   - Right: "DARAJA 8 · UNVON" (12, weight 800, tracking 1, white 90%), the title (30/34, weight 800, white), "Keyingisi: {next title}" (13, weight 600).
   - Below: a 10 px bar (white fill on 28% white track) and "21 028 / 24 300 XP" ... "3 272 qoldi" (14, weight 700, white, tabular).
   - All text is white and at least 12 px **bold uppercase** or 13+ px weight 600 on the darker half of the gradient. Check contrast and report.
4. **Stat tiles:** 3 columns. Each has a 32 px tinted icon square, the value (24, weight 800), and a label.
5. **"Nishonlar":** a **4-column** grid of `BadgeTile`, showing the 8 most recent earned badges, with "Hammasi · {earned}/{total}" on the right.
   - **No emoji medals.** Map each badge category to a line icon and a tint:

     | Category | Icon | Tint |
     | --- | --- | --- |
     | Tree / streak | tree | green |
     | Night study | moon | violet |
     | Time challenge | timer | blue |
     | Competition win | trophy | gold |
     | Team | users | teal |
     | XP | bolt | pink |
     | Consistency | calendar-check | orange |
     | Other | star | orange |

   - If a badge already has real artwork (like the tree), use it inside the tile.
   - List the badge→category mapping in the PR for me to check.
6. **Menu list card:** each row has a 40 px `raised` icon square, title (16, weight 700), subtitle (13, muted) and a chevron.

---

## Acceptance checklist (every part)

- [ ] Light and dark screenshots of every changed screen are attached to the PR, side by side with the v2 mockups.
- [ ] No white text under 18 px bold on orange; contrast report included.
- [ ] Bugun and Kartalar show the same card count (A1).
- [ ] No empty progress bars anywhere.
- [ ] Nothing floats over content in a preview build.
- [ ] Tiles and the rival ladder animate position changes; nothing jumps.
- [ ] Reduce motion on: no movement, no pulsing dot, final states shown.
- [ ] `tsc`, lint and tests pass; no hex values or font sizes in screen files.

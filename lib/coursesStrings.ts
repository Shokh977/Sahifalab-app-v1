/* ============================================================
   Sahifalab — Kurslar (Courses) copy
   Every user-facing string on the courses screen lives here —
   nothing hardcoded inline in JSX.
   ============================================================ */

export const coursesStrings = {
  brandEyebrow:   'SAHIFALAB',
  screenTitle:    'Kurslar',
  searchPlaceholder: 'Kurslarni qidiring…',

  categoryAll:    'Hammasi',

  sortPopular:    'Ommabop',
  sortNewest:     'Yangi',
  sortFree:       'Bepul',
  sortTop:        'Top',

  coursesCount: (n: number) => `${n} TA KURS`,
  sortCta:      'Saralash',

  free:         'Bepul',
  somUnit:      "so'm",
  ratingFallback: '—',
  students: (n: number) => `${n.toLocaleString()} talaba`,
  durationHours: (h: number) => `${h} soat`,
  durationMinutes: (m: number) => `${m} daq`,

  favoritesTitle: 'Sevimlilar',
  exitFavorites:  "Barcha kurslar",

  savedConfirm:   'Saqlandi',
  removedConfirm: "Olib tashlandi",

  emptyTitle:     "Bu bo'limda kurs topilmadi",
  emptyClearFilters: "Filtrlarni tozalash",
  emptyFavoritesTitle: "Sevimli kurslar yo'q",
  emptyFavoritesHint:  "Kursni saqlash uchun kartani bosib turing",

  errorLine:      "Ma'lumotlarni yuklab bo'lmadi",
  retry:          'Qayta urinish',

  filterTitle:    'Filtrlar',
  filterPrice:    'Narx',
  filterPriceAll:  'Hammasi',
  filterPriceFree: 'Bepul',
  filterPricePaid: 'Pullik',
  filterDuration: 'Davomiyligi',
  filterDurationAll:    'Hammasi',
  filterDurationShort:  "1 soatgacha",
  filterDurationMedium: '1–3 soat',
  filterDurationLong:   '3–10 soat',
  filterDurationXLong:  "10 soatdan ko'p",
  filterLevel:    'Daraja',
  filterLevelAll:          'Hammasi',
  filterLevelBeginner:     "Boshlang'ich",
  filterLevelIntermediate: "O'rta",
  filterLevelAdvanced:     'Murakkab',
  filterLanguage: 'Til',
  filterLanguageAll: 'Hammasi',
  filterApply:    "Qo'llash",
  filterReset:    'Tozalash',

  navHome:      'Bosh sahifa',
  navStudy:     "O'qish",
  navCourses:   'Kurslar',
  navFlashcards:'Kartalar',
  navChallenge: 'Bellashuv',
} as const

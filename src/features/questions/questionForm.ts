/**
 * "Siz ham savol yuboring" — the submission form's copy and its client-side
 * checks. The checks only mirror the server (question 10–200 characters,
 * four distinct options up to 80 each) so the form can say what's wrong
 * before sending; the backend re-validates and has the final word. Pure;
 * tested in questionForm.test.ts.
 */

export const QUESTION_MIN = 10
export const QUESTION_MAX = 200
export const OPTION_MAX = 80
export const NOTE_MAX = 200

export const COPY = {
  title: 'Savol yuborish',
  intro: 'Siz bilgan qiziq faktni savolga aylantiring. Savolingiz 5 SAVOLDA chiqsa — ismingiz koʻrinadi va tanga olasiz.',
  questionLabel: 'Savol',
  questionPlaceholder: 'Masalan: Asal nima uchun ming yillar davomida buzilmaydi?',
  correctLabel: 'Toʻgʻri javob',
  correctPlaceholder: 'Masalan: Shakar koʻp, suv juda kam',
  wrongLabel: 'Notoʻgʻri javoblar',
  wrongPlaceholder: (n: number) => `${n}-notoʻgʻri javob`,
  assist: 'Notoʻgʻri javoblarni AI tayyorlasin',
  explanationLabel: 'Izoh (ixtiyoriy)',
  explanationPlaceholder: 'Nega bu javob toʻgʻri — bir jumlada',
  sourceLabel: 'Qayerdan bilasiz? (ixtiyoriy)',
  sourcePlaceholder: 'Kitob, maqola, oʻqituvchi…',
  anonymous: 'Ismimni koʻrsatmang',
  submit: 'Yuborish',
  remaining: (n: number) => (n > 0 ? `Bugun yana ${n} ta yubora olasiz` : 'Bugungi limit tugadi'),
  limitTitle: 'Bugungi limit tugadi',
  limitBody: (until: string | null) => (until ? `Yangi savolni ${until} dan keyin yubora olasiz.` : 'Ertaga yana yuboring.'),
  pendingFullTitle: 'Savollaringiz koʻrib chiqilmoqda',
  pendingFullBody: 'Yuborganlaringiz tekshirilgach, yana yubora olasiz.',
  offline: 'Internet yoʻq — ulanish tiklangach yuboring.',
  thanksTitle: 'Rahmat!',
  thanksBody: (tanga: number) => `Tekshirib chiqamiz. Qabul qilinsa — xabar beramiz va ${tanga} tanga olasiz.`,
  another: 'Yana savol yuborish',
  mine: 'Mening savollarim',
  disabled: 'Savol yuborish hozircha yopiq.',
} as const

export const CTA = {
  title: 'Siz ham savol yuboring',
  body: (tanga: number) => `Savolingiz 5 SAVOLDA chiqsa — ${tanga} tanga va ismingiz koʻrinadi.`,
  credited: (name: string) => `Bugungi savollardan biri ${name} tomonidan yuborilgan 🙌`,
  attribution: (name: string) => `Bu savol ${name} tomonidan yuborilgan 🙌`,
  launchTitle: 'Yangi: 5 SAVOLGA savol yuboring',
  launchBody: 'Oʻzingiz bilgan qiziq faktni savolga aylantiring — chiqsa, hamma unga javob beradi.',
} as const

/** Default reward when the limits call hasn't answered yet (server value wins). */
export const DEFAULT_REWARD = 25

const APOSTROPHES = /[`ʻʼ‘’′´]/g

/** Same idea as the server's normalize_for_compare: case, apostrophe
 *  variants (oʻ / o' / o`), spacing and punctuation don't make two options
 *  different. */
export function normalizeOption(value: string): string {
  return value
    .replace(APOSTROPHES, "'")
    .toLowerCase()
    .replace(/[\s.,!?;:"«»()-]+/g, ' ')
    .trim()
}

export interface QuestionDraft {
  question: string
  correct: string
  wrong: [string, string, string]
  explanation: string
  source: string
}

export type DraftField = 'question' | 'correct' | 'wrong0' | 'wrong1' | 'wrong2' | 'explanation' | 'source'

/** First problem per field, in Uzbek; empty object = ready to send. The
 *  form shows these only after a send attempt, so a fresh form isn't red. */
export function draftErrors(d: QuestionDraft): Partial<Record<DraftField, string>> {
  const errors: Partial<Record<DraftField, string>> = {}
  const q = d.question.trim()
  if (q.length < QUESTION_MIN) errors.question = `Kamida ${QUESTION_MIN} ta belgi`
  else if (q.length > QUESTION_MAX) errors.question = `${QUESTION_MAX} belgidan oshmasin`

  const options = [d.correct, ...d.wrong].map(o => o.trim())
  const fields: DraftField[] = ['correct', 'wrong0', 'wrong1', 'wrong2']
  const seen = new Map<string, number>()
  options.forEach((o, i) => {
    if (!o) errors[fields[i]] = 'Toʻldiring'
    else if (o.length > OPTION_MAX) errors[fields[i]] = `${OPTION_MAX} belgidan oshmasin`
    else {
      const key = normalizeOption(o)
      if (seen.has(key)) errors[fields[i]] = 'Boshqa javob bilan bir xil'
      else seen.set(key, i)
    }
  })
  if (d.explanation.trim().length > NOTE_MAX) errors.explanation = `${NOTE_MAX} belgidan oshmasin`
  if (d.source.trim().length > NOTE_MAX) errors.source = `${NOTE_MAX} belgidan oshmasin`
  return errors
}

export function isReady(d: QuestionDraft): boolean {
  return Object.keys(draftErrors(d)).length === 0
}

/** The AI assist needs the question and the correct answer first. */
export function canAssist(d: QuestionDraft): boolean {
  const q = d.question.trim().length
  const c = d.correct.trim().length
  return q >= QUESTION_MIN && q <= QUESTION_MAX && c > 0 && c <= OPTION_MAX
}

/** Fills only the EMPTY wrong-answer fields — never overwrites what the user
 *  typed. */
export function fillWrong(current: [string, string, string], suggested: string[]): [string, string, string] {
  const queue = [...suggested]
  return current.map(v => (v.trim() ? v : queue.shift() ?? v)) as [string, string, string]
}

/** The submitted options: the correct answer first. Order carries no signal —
 *  every player sees them shuffled. */
export function toSubmitBody(d: QuestionDraft, isAnonymous: boolean, usedAssist: boolean) {
  return {
    question_text: d.question.trim(),
    options: [d.correct, ...d.wrong].map(o => o.trim()),
    correct_index: 0,
    explanation: d.explanation.trim() || null,
    source_note: d.source.trim() || null,
    is_anonymous: isAnonymous,
    used_ai_assist: usedAssist,
  }
}

/** The results-screen prompt is louder on a strong round, or when someone
 *  else's question was in today's quiz. */
export function ctaProminent(correctCount: number, contributors: readonly string[] | undefined): boolean {
  return correctCount >= 4 || (contributors?.length ?? 0) > 0
}

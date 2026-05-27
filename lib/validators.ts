export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4   // 0=empty, 1=weak, 2=fair, 3=good, 4=strong
  label: string
  color: string
  errors: string[]
}

export function checkPassword(pw: string): PasswordStrength {
  if (!pw) return { score: 0, label: '', color: '#3f3f46', errors: [] }

  const errors: string[] = []
  if (pw.length < 8)        errors.push("Kamida 8 ta belgi")
  if (!/[A-Z]/.test(pw))    errors.push("Kamida 1 ta katta harf")
  if (!/[a-z]/.test(pw))    errors.push("Kamida 1 ta kichik harf")
  if (!/[0-9]/.test(pw))    errors.push("Kamida 1 ta raqam")
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw))
                             errors.push("Kamida 1 ta maxsus belgi (!@#$...)")

  const score = (4 - errors.length) as 0 | 1 | 2 | 3 | 4
  const map: Record<number, { label: string; color: string }> = {
    0: { label: "Juda zaif",  color: '#ef4444' },
    1: { label: "Zaif",       color: '#f97316' },
    2: { label: "O\'rtacha",  color: '#eab308' },
    3: { label: "Yaxshi",     color: '#22c55e' },
    4: { label: "A\'lo",      color: '#10b981' },
  }
  return { score, errors, ...map[score] }
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

/**
 * formatAccountNumber.ts — presentation-only grouping for a payment
 * method's raw account number. CopyRow always copies the RAW, ungrouped
 * digits to the clipboard — grouping here is display-only and must never
 * leak into what gets copied.
 */
export type NumberType = 'card' | 'account' | 'iban'

/** Groups every 4 characters with a space. */
export function formatAccountNumber(value: string, _type: NumberType): string {
  const clean = (value || '').replace(/\s+/g, '')
  return clean.replace(/(.{4})/g, '$1 ').trim()
}

/** <=20 chars renders on one line (16-digit card, most account numbers);
 * 21-40 (IBAN territory) wraps to exactly two lines per the spec. */
export function numberDisplayMode(value: string): 'single' | 'wrapped' {
  const len = (value || '').replace(/\s+/g, '').length
  return len <= 20 ? 'single' : 'wrapped'
}

export function copyLabelFor(numberType: NumberType): string {
  if (numberType === 'iban') return "IBAN'DAN NUSXA OLING"
  if (numberType === 'account') return 'HISOB RAQAMIDAN NUSXA OLING'
  return 'KARTA RAQAMIDAN NUSXA OLING'
}

export function fieldLabelFor(numberType: NumberType): string {
  return numberType === 'iban' ? 'IBAN' : numberType === 'account' ? 'HISOB' : 'KARTA'
}

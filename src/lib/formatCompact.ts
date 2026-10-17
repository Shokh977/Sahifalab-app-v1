/** 999 → "999", 1_000 → "1K", 1_500 → "1.5K", 1_000_000 → "1M" (no "1.0K"). */
export function formatCompact(n: number): string {
  const fmt = (value: number, suffix: string) => {
    const rounded = Math.round(value * 10) / 10
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}${suffix}`
  }
  if (n >= 1_000_000) return fmt(n / 1_000_000, 'M')
  if (n >= 1_000) return fmt(n / 1_000, 'K')
  return String(n)
}

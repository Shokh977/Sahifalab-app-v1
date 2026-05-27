export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function formatTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)        return 'Hozir'
  if (diff < 3600)      return `${Math.floor(diff / 60)} daqiqa`
  if (diff < 86400)     return `${Math.floor(diff / 3600)} soat`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} kun`
  return new Date(iso).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })
}
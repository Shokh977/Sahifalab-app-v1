import { Share } from 'react-native'

export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.sahifalab.app'

function appFooter(deepPath?: string): string {
  const lines: string[] = ['']
  if (deepPath) lines.push(`Ilovada ochish: sahifalab://${deepPath}`)
  lines.push(`Yuklab olish: ${PLAY_STORE_URL}`)
  return lines.join('\n')
}

export async function shareProfile(opts: {
  telegramId: number | string
  firstName?: string | null
  level?: number | null
  streakDays?: number | null
  isOwn?: boolean
}) {
  const name = opts.isOwn ? 'Mening profilim' : (opts.firstName ?? 'Profil')
  const parts: string[] = [`👤 SAHIFALAB — ${name}`]

  const stats: string[] = []
  if (opts.level)      stats.push(`📚 ${opts.level}-daraja`)
  if (opts.streakDays) stats.push(`🔥 ${opts.streakDays} kunlik seriya`)
  if (stats.length)    parts.push(stats.join('  '))

  parts.push(appFooter(`profile/${opts.telegramId}`))
  try { await Share.share({ message: parts.join('\n') }) } catch {}
}

export async function sharePost(opts: {
  id: number
  content?: string | null
}) {
  const preview = opts.content
    ? opts.content.slice(0, 150) + (opts.content.length > 150 ? '...' : '')
    : ''
  const msg = [preview, appFooter()].join('\n')
  try { await Share.share({ message: msg }) } catch {}
}

export async function shareWeeklyReport(opts: {
  totalMinutes: number
  weekXp: number
  streakDays: number
}) {
  const { totalMinutes, weekXp, streakDays } = opts
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  const timeStr = h && m ? `${h} soat ${m} daqiqa` : h ? `${h} soat` : `${m} daqiqa`

  const msg = [
    `📊 Bu hafta SAHIFALAB'da:`,
    `⏱ ${timeStr} o'qildi`,
    `⚡ +${weekXp.toLocaleString()} XP`,
    `🔥 ${streakDays} kunlik seriya`,
    appFooter(),
  ].join('\n')
  try { await Share.share({ message: msg }) } catch {}
}

export async function shareTreeEvolution(opts: {
  stageName: string
  streakDays: number
}) {
  const msg = [
    `🌳 SAHIFALAB seriyam ${opts.streakDays} kunga yetdi!`,
    `Daraxtim "${opts.stageName}" bosqichiga ko'tarildi`,
    appFooter('streak-detail'),
  ].join('\n')
  try { await Share.share({ message: msg }) } catch {}
}

export async function shareCertificate(opts: {
  courseTitle: string
  certUrl?: string | null
}) {
  const lines = [`🏆 Men "${opts.courseTitle}" kursini muvaffaqiyatli tugatdim!`]
  if (opts.certUrl) lines.push(`Tasdiqlash: ${opts.certUrl}`)
  lines.push(appFooter())
  try { await Share.share({ message: lines.join('\n') }) } catch {}
}

export async function shareCertificateImage(opts: {
  imageUri: string
  courseTitle: string
  certUrl?: string | null
}) {
  const lines = [`🏆 Men "${opts.courseTitle}" kursini muvaffaqiyatli tugatdim!`]
  if (opts.certUrl) lines.push(`Tasdiqlash: ${opts.certUrl}`)
  lines.push(appFooter())
  try {
    await Share.share({
      url:     opts.imageUri,
      message: lines.join('\n'),
      title:   'Sahifalab Sertifikat',
    })
  } catch {}
}

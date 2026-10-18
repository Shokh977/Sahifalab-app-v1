import { avatarColors } from '../../design/tokens'

/**
 * The initials background for a user: one of 8 fixed colours, picked by a
 * hash of the user id (or the name when there's no id), so a person keeps
 * their colour everywhere.
 */
export function avatarColor(key: number | string): string {
  const s = String(key)
  let h = 2166136261                      // FNV-1a
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return avatarColors[(h >>> 0) % avatarColors.length]
}

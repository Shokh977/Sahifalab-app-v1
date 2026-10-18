import { describe, expect, it } from '@jest/globals'
import { initials } from '../src/components/ui/initials'
import { avatarColor } from '../src/components/ui/avatarColor'
import { avatarColors } from '../src/design/tokens'

describe('initials', () => {
  it('takes the first letters of the first two words', () => {
    expect(initials('Shohruh Aliyev')).toBe('SA')
    expect(initials('  Oʻktam  Ravshan  Gʻulomov ')).toBe('OR')
  })
  it('takes two letters from a single word', () => {
    expect(initials('Sanjar')).toBe('SA')
    expect(initials('sanjar')).toBe('SA')
    expect(initials('Oʻtkir')).toBe('OT')
    expect(initials('мадина')).toBe('МА')
    expect(initials('A')).toBe('A')
  })
  it('skips emoji, digits and empty names', () => {
    expect(initials('🔥 Ali Valiyev')).toBe('AV')
    expect(initials('007')).toBe('?')
    expect(initials('   ')).toBe('?')
  })
})

describe('avatarColor', () => {
  it('picks one of the 8 colours, the same one every time', () => {
    expect(avatarColors).toHaveLength(8)
    expect(avatarColors).toContain(avatarColor(42))
    expect(avatarColor(42)).toBe(avatarColor(42))
    expect(avatarColor('Sanjar')).toBe(avatarColor('Sanjar'))
  })
  it('spreads ids across the palette', () => {
    const seen = new Set(Array.from({ length: 200 }, (_, i) => avatarColor(1_000_000 + i * 7919)))
    expect(seen.size).toBe(8)
  })
})

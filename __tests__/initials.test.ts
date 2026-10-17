import { describe, expect, it } from '@jest/globals'
import { initials } from '../src/components/ui/initials'

describe('initials', () => {
  it('takes the first and last word', () => {
    expect(initials('Shohruh Aliyev')).toBe('SA')
    expect(initials('  Oʻktam  Ravshan  Gʻulomov ')).toBe('OG')
  })
  it('handles one word, Cyrillic and empty names', () => {
    expect(initials('Bekzod')).toBe('B')
    expect(initials('мадина')).toBe('М')
    expect(initials('   ')).toBe('?')
  })
})

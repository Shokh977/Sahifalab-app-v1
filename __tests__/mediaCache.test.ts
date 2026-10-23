import { describe, expect, it, jest } from '@jest/globals'

jest.mock('expo-file-system/legacy', () => ({ documentDirectory: 'file:///docs/' }))

import { extOf, hashUrl, localPathFor } from '../lib/mediaCache'

describe('mediaCache', () => {
  it('names a file by a stable hash of its URL', () => {
    const a = 'https://cdn.example.com/sounds/rain.mp3'
    expect(hashUrl(a)).toBe(hashUrl(a))
    expect(hashUrl(a)).not.toBe(hashUrl('https://cdn.example.com/sounds/rain2.mp3'))
    expect(hashUrl(a)).toMatch(/^[0-9a-f]{8}$/)
  })

  it('keeps the extension, ignoring the query string', () => {
    expect(extOf('https://x.uz/a/b.MP3?v=2')).toBe('.mp3')
    expect(extOf('https://x.uz/download?id=5', '.pdf')).toBe('.pdf')
    expect(extOf('https://x.uz/download')).toBe('')
  })

  it('stores files per bucket in the document directory', () => {
    const p = localPathFor('https://x.uz/rain.mp3', 'ambient')
    expect(p).toMatch(/^file:\/\/\/docs\/media\/ambient\/[0-9a-f]{8}\.mp3$/)
    expect(localPathFor('https://x.uz/file', 'materials', '.pdf')).toMatch(/\.pdf$/)
  })
})

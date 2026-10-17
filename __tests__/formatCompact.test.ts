import { describe, expect, it } from '@jest/globals'
import { formatCompact } from '../src/lib/formatCompact'

describe('formatCompact', () => {
  it.each([[0, '0'], [999, '999'], [1000, '1K'], [1500, '1.5K'], [12_340, '12.3K'], [1_000_000, '1M'], [2_250_000, '2.3M']])(
    '%i → %s', (n, s) => expect(formatCompact(n)).toBe(s),
  )
})

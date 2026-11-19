import { describe, expect, it, jest } from '@jest/globals'
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock'
import { PAY_BOT_URL, payBotLink } from '../src/features/courses/purchase'

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage)
jest.mock('../lib/api', () => ({ enrollments: {} }))

describe('payBotLink', () => {
  it('puts the PAY code in the bot start link', () => {
    expect(payBotLink('PAY-AB12-CD34')).toBe(`${PAY_BOT_URL}?start=PAY-AB12-CD34`)
  })
  it('uses the server bot URL, dropping any query it had', () => {
    expect(payBotLink('PAY-AB12-CD34', 'https://t.me/other_bot?start=x')).toBe('https://t.me/other_bot?start=PAY-AB12-CD34')
    expect(payBotLink('PAY-AB12-CD34', '')).toBe(`${PAY_BOT_URL}?start=PAY-AB12-CD34`)
  })
})

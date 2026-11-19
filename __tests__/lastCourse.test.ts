import { describe, expect, it, jest } from '@jest/globals'
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock'
import { pickPlanCourse } from '../src/features/today/lastCourse'

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage)

const list = [
  { course_id: 1, progress: 0.8 },
  { course_id: 2, progress: 0.2 },
  { course_id: 3, progress: 1 },
]

describe('pickPlanCourse', () => {
  it('takes the course opened last while it is unfinished', () => {
    expect(pickPlanCourse(list, 2)?.course_id).toBe(2)
  })
  it('falls back to the furthest along when the last one is finished or gone', () => {
    expect(pickPlanCourse(list, 3)?.course_id).toBe(1)
    expect(pickPlanCourse(list, 99)?.course_id).toBe(1)
    expect(pickPlanCourse(list, null)?.course_id).toBe(1)
  })
  it('shows none when every course is finished', () => {
    expect(pickPlanCourse([{ course_id: 3, progress: 1 }], 3)).toBeNull()
  })
})

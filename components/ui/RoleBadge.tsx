import React from 'react'
import { BadgeCheck } from 'lucide-react-native'

const TEACHER_COLOR = '#34C759'
const ADMIN_COLOR   = '#F5A623'

interface Props {
  role?:        string | null
  accountType?: string | null
  size?:        number
}

export function RoleBadge({ role, accountType, size = 15 }: Props) {
  if (role === 'admin' || accountType === 'admin')        return <BadgeCheck size={size} color={ADMIN_COLOR}   fill={`${ADMIN_COLOR}22`} style={{ marginTop: 4 }} />
  if (role === 'teacher' || accountType === 'teacher')    return <BadgeCheck size={size} color={TEACHER_COLOR} fill={`${TEACHER_COLOR}22`} style={{ marginTop: 4 }} />
  return null
}

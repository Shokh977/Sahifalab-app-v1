/**
 * Books left the app (redesign Phase 4a): the reader now opens on
 * sahifalab.uz. Kept so old links never break (rule 7).
 */
import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import { WEB_URL } from '../../../lib/constants'
import { ExternalRedirect } from '../../../src/features/nav/ExternalRedirect'

export default function BookReaderRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <ExternalRedirect url={`${WEB_URL}/read/${encodeURIComponent(id ?? '')}`} title="Kitob sahifalab.uz saytida oʻqiladi" />
}

/**
 * Books left the app (redesign Phase 4a): this route now opens the book's
 * page on sahifalab.uz. Kept so old links never break (rule 7).
 */
import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import { WEB_URL } from '../../../lib/constants'
import { ExternalRedirect } from '../../../src/features/nav/ExternalRedirect'

export default function BookRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <ExternalRedirect url={`${WEB_URL}/kitoblar/${encodeURIComponent(id ?? '')}`} title="Kitob sahifalab.uz saytida ochiladi" />
}

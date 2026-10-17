/**
 * Books left the app (redesign Phase 4a): this route now opens
 * sahifalab.uz/kitoblar. Kept so old links never break (rule 7).
 */
import React from 'react'
import { WEB_URL } from '../../lib/constants'
import { ExternalRedirect } from '../../src/features/nav/ExternalRedirect'

export default function BooksRedirect() {
  return <ExternalRedirect url={`${WEB_URL}/kitoblar`} title="Kitoblar endi sahifalab.uz saytida" />
}

/**
 * The tree preview screen (a dev tool) was removed in redesign Phase 8.
 * The route stays so old links and pushes still work (rule 7): it
 * redirects to Bugun.
 */
import React from 'react'
import { Redirect } from 'expo-router'

export default function TreeTestRedirect() {
  return <Redirect href={'/(tabs)' as any} />
}

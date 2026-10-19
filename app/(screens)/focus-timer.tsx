/**
 * The old focus timer was replaced by the Fokus tab and removed in redesign Phase 8.
 * The route stays so old links and pushes still work (rule 7): it
 * redirects to Bugun.
 */
import React from 'react'
import { Redirect } from 'expo-router'

export default function FocusTimerRedirect() {
  return <Redirect href={'/(tabs)' as any} />
}

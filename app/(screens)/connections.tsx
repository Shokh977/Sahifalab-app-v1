/**
 * The connections list was removed in redesign Phase 8; follower and following lists open from Profil.
 * The route stays so old links and pushes still work (rule 7): it
 * redirects to Bugun.
 */
import React from 'react'
import { Redirect } from 'expo-router'

export default function ConnectionsRedirect() {
  return <Redirect href={'/(tabs)' as any} />
}

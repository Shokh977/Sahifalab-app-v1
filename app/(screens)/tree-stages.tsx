/**
 * The tree stages now live inside Seriya (streak-detail) — redesign
 * Phase 5. This route is kept so old links and pushes still work (rule 7):
 * it redirects to the stages section.
 */
import React from 'react'
import { Redirect } from 'expo-router'

export default function TreeStagesRedirect() {
  return <Redirect href={'/(screens)/streak-detail?section=stages' as any} />
}

/**
 * Feature flags, set at build time.
 * pro: the AI features planned for the AI subscription (the AI companion
 * chat). Off: the screens stay in the code but redirect to Bugun and
 * nothing links to them.
 */
export const features = {
  pro: false,
} as const

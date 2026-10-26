/**
 * Pro is not launched yet (AGENT.md Phase 6): the upgrade sheet and the
 * "Pro bilan cheksiz" footer exist but stay hidden until this is true.
 * Flipping it needs an app update / OTA.
 */
export const PRO_UPGRADE_ENABLED = false

/**
 * The Pro purchase screen (/(screens)/pro) and the "Pro bilan oching"
 * buttons on locked cosmetics (themes, banners, rings, tree looks). Separate
 * from PRO_UPGRADE_ENABLED, which promises AI benefits Pro doesn't have yet.
 */
export const PRO_PURCHASE_ENABLED = true

/**
 * Build variants on top of app.json. APP_VARIANT=preview (set by the eas.json
 * preview profile) builds a separate app — its own package, name and URL
 * scheme — so it installs next to the store app instead of replacing it.
 * Any other value, or none, leaves app.json as it is.
 */
const IS_PREVIEW = process.env.APP_VARIANT === 'preview'

const PREVIEW_SCHEME = 'sahifalab-preview'

module.exports = ({ config }) => {
  const appVariant = IS_PREVIEW ? 'preview' : 'production'
  const base = { ...config, extra: { ...config.extra, appVariant } }
  if (!IS_PREVIEW) return base

  return {
    ...base,
    name: 'Sahifalab Preview',
    scheme: PREVIEW_SCHEME,
    android: {
      ...config.android,
      package: 'uz.sahifalab.preview',
      // Only the preview scheme: the store app keeps sahifalab:// and the
      // verified sahifalab.uz links.
      intentFilters: [
        {
          action: 'VIEW',
          data: [{ scheme: PREVIEW_SCHEME, host: '*' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
  }
}

/**
 * The app font (Onest) for Skia text, loaded once for the whole app — the
 * gradient and Yaltiroq names are drawn by Skia so the colour can follow
 * the text's own width. Each weight is registered under its RN family name
 * ('Onest-Bold' …), so a TextStyle's fontFamily maps across directly.
 */
import { useEffect, useState } from 'react'
import { Skia, loadData, type SkTypefaceFontProvider } from '@shopify/react-native-skia'

const FACES: Record<string, number> = {
  'Onest-SemiBold':  require('../../../../assets/fonts/Onest-SemiBold.ttf'),
  'Onest-Bold':      require('../../../../assets/fonts/Onest-Bold.ttf'),
  'Onest-ExtraBold': require('../../../../assets/fonts/Onest-ExtraBold.ttf'),
}

export const SKIA_FAMILIES = Object.keys(FACES)

let provider: SkTypefaceFontProvider | null = null
let loading: Promise<SkTypefaceFontProvider> | null = null

function load(): Promise<SkTypefaceFontProvider> {
  loading ??= Promise.all(
    Object.entries(FACES).map(([family, mod]) =>
      loadData(mod, Skia.Typeface.MakeFreeTypeFaceFromData).then(face => [family, face] as const)),
  ).then(faces => {
    const p = Skia.TypefaceFontProvider.Make()
    for (const [family, face] of faces) if (face) p.registerFont(face, family)
    provider = p
    return p
  })
  return loading
}

/** The shared font provider, or null for the first frames while it loads. */
export function useOnestProvider(): SkTypefaceFontProvider | null {
  const [p, setP] = useState(provider)
  useEffect(() => {
    if (p) return
    let alive = true
    load().then(v => { if (alive) setP(v) }).catch(() => {})
    return () => { alive = false }
  }, [p])
  return p
}

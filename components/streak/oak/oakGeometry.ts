/* ============================================================
   Sahifalab — "Eman" (oak) streak tree: scene geometry.
   Pure data, no React Native imports: OakTree.tsx draws it with
   Skia, and a node script can draw the same scene as SVG.

   Spaces (viewBox 320×400, ground scale origin (160, 362)):
   - canvas: the 320×400 viewBox
   - tree:   origin on the ground, y up is negative, scaled by treeScale
   - island: same origin, scaled by islandScale
   Stroke widths are given in SCREEN px by the spec and converted
   per space here, so outlines stay bold when the tree is scaled.
   ============================================================ */

export type OakStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
export type OakState = 'alive' | 'frozen' | 'dead'

export const OAK_W = 320
export const OAK_H = 400
const OX = 160
const OY = 362
/** Where tree and island space sit in the canvas. */
export const OAK_ORIGIN = { x: OX, y: OY }

interface Tones { sh: string; base: string; hl: string }

// Per depth layer: back, mid, front.
const GREEN: Tones[] = [
  { sh: '#2E6B27', base: '#4E9A33', hl: '#86C447' },
  { sh: '#3A8030', base: '#61B13B', hl: '#9DD551' },
  { sh: '#46922F', base: '#74C343', hl: '#B6E55E' },
]
const GOLD: Tones[] = [
  { sh: '#9A6416', base: '#D19A2E', hl: '#F2C452' },
  { sh: '#A96F1A', base: '#DFA836', hl: '#F9D260' },
  { sh: '#B87A1E', base: '#EDB53E', hl: '#FFDF6E' },
]
const ICE: Tones[] = [
  { sh: '#5E86AE', base: '#8FB6DA', hl: '#C9E3F7' },
  { sh: '#668FB6', base: '#98BFE1', hl: '#D2EAFA' },
  { sh: '#6E97BD', base: '#A1C7E7', hl: '#DBEFFC' },
]
const DRY: Tones = { sh: '#6B5D4A', base: '#8C7B63', hl: '#A99A80' }

interface Look {
  outline: string
  wood: { hl: string; base: string; sh: string; groove: string }
  island: { top: string; side: string; rim: string; tuft: string }
}
const LOOK: Record<OakState, Look> = {
  alive: {
    outline: '#2B3A1A',
    wood: { hl: '#C08350', base: '#94592E', sh: '#5E3518', groove: '#4A2810' },
    island: { top: '#7CC64A', side: '#4C9A33', rim: '#C6F07A', tuft: '#74C343' },
  },
  frozen: {
    outline: '#1F3448',
    wood: { hl: '#A88A78', base: '#7E6150', sh: '#4F3A30', groove: '#3A2A24' },
    island: { top: '#EEF6FC', side: '#A9C9E3', rim: '#FFFFFF', tuft: '#CFE4F4' },
  },
  dead: {
    outline: '#3A3128',
    wood: { hl: '#9C8C7A', base: '#78685A', sh: '#4E4238', groove: '#3A3128' },
    island: { top: '#A9A27E', side: '#7E7757', rim: '#C8C09A', tuft: '#9A9370' },
  },
}

const TREE_SCALE: Record<number, number> = { 1: 1.6, 2: 1.5, 3: 1.3, 4: 0.48, 5: 0.62, 6: 0.72, 7: 0.80, 8: 0.86, 9: 0.90, 10: 0.95 }
const CLUMP_COUNT: Record<number, number> = { 4: 5, 5: 14, 6: 17, 7: 20, 8: 22, 9: 22, 10: 22 }
const GOLD_SHARE: Record<number, number> = { 8: 5, 9: 9, 10: 12 }
const AURA: Record<number, { color: string; intensity: number }> = {
  6: { color: '#8FD8FF', intensity: 0.55 },
  7: { color: '#D7F59A', intensity: 0.40 },
  8: { color: '#FFD98A', intensity: 0.60 },
  9: { color: '#FFE3A3', intensity: 0.75 },
  10: { color: '#FFE08A', intensity: 1.0 },
}
const MOTES: Record<number, number> = { 6: 6, 7: 6, 8: 8, 9: 8, 10: 10 }
const MOTE_COLOR: Record<number, string> = { 6: '#CFF1FF', 7: '#F2FFD0', 8: '#FFE7A0', 9: '#FFE7A0', 10: '#FFF0B8' }

// Crown layout at full size, in priority order: the first N clumps are the
// crown of a stage with N clumps, so young crowns stay compact. [layer, x, y, r]
type Spot = [0 | 1 | 2, number, number, number]
const CROWN: Spot[] = [
  // stage 4 (5)
  [0, 0, -262, 50], [1, -52, -228, 42], [1, 54, -232, 42], [2, -8, -200, 40], [2, 40, -186, 32],
  // stage 5 (+9)
  [0, -90, -262, 42], [0, 88, -268, 42], [0, -30, -306, 40], [0, 38, -304, 40],
  [1, -100, -200, 36], [1, 100, -198, 36], [2, -62, -168, 34], [2, 66, -160, 32], [1, 2, -276, 38],
  // stage 6 (+3)
  [0, -122, -222, 34], [0, 122, -226, 34], [2, -30, -244, 32],
  // stage 7 (+3)
  [1, -60, -290, 34], [1, 70, -288, 34], [2, 100, -150, 28],
  // stage 8 (+2)
  [2, -108, -150, 28], [0, 0, -325, 34],
]
const SAPLING: Spot[] = [[0, -1, -104, 17], [1, -18, -84, 15], [1, 15, -92, 16], [2, 2, -80, 13]]
const DEAD: Spot[] = [[1, -70, -215, 22], [1, 5, -262, 24], [1, 70, -222, 22], [2, -110, -186, 16], [2, 110, -182, 16]]

// ── helpers ──────────────────────────────────────────────────────────────────
const n2 = (v: number) => Math.round(v * 100) / 100
const deg = (d: number) => (d * Math.PI) / 180

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function mixHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16)
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t)
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)
}

function ellipse(cx: number, cy: number, rx: number, ry: number) {
  return `M${n2(cx - rx)} ${n2(cy)}A${n2(rx)} ${n2(ry)} 0 1 0 ${n2(cx + rx)} ${n2(cy)}A${n2(rx)} ${n2(ry)} 0 1 0 ${n2(cx - rx)} ${n2(cy)}Z`
}

function circle(cx: number, cy: number, r: number) { return ellipse(cx, cy, r, r) }

/** Cloud-edged clump: points on a circle, joined by outward arcs (radius chord × 0.58). */
function scallop(cx: number, cy: number, r: number, bumps: number, rnd: () => number) {
  const rot = rnd() * Math.PI * 2
  const pts: [number, number][] = []
  for (let k = 0; k < bumps; k++) {
    const a = rot + (k * Math.PI * 2) / bumps
    const rr = r * 0.9 * (1 + (rnd() * 2 - 1) * 0.07)
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)])
  }
  let d = `M${n2(pts[0][0])} ${n2(pts[0][1])}`
  for (let k = 0; k < bumps; k++) {
    const [x0, y0] = pts[k]
    const [x1, y1] = pts[(k + 1) % bumps]
    const R = Math.hypot(x1 - x0, y1 - y0) * 0.58
    d += `A${n2(R)} ${n2(R)} 0 0 1 ${n2(x1)} ${n2(y1)}`
  }
  return d + 'Z'
}

/** Snow cap: the top bumps of a clump, closed by a wavy lower edge. */
function snowCap(cx: number, cy: number, r: number, bumps: number) {
  const step = (Math.PI * 2) / bumps
  const pts: [number, number][] = []
  for (let a = Math.PI + 0.45; a <= Math.PI * 2 - 0.45 + 1e-6; a += step) {
    pts.push([cx + r * 0.93 * Math.cos(a), cy + r * 0.93 * Math.sin(a)])
  }
  if (pts.length < 2) return ''
  let d = `M${n2(pts[0][0])} ${n2(pts[0][1])}`
  for (let k = 1; k < pts.length; k++) {
    const R = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]) * 0.58
    d += `A${n2(R)} ${n2(R)} 0 0 1 ${n2(pts[k][0])} ${n2(pts[k][1])}`
  }
  const [xe, ye] = pts[pts.length - 1]
  const [xs, ys] = pts[0]
  const segs = 3
  for (let s = 1; s <= segs; s++) {
    const x = xe + ((xs - xe) * s) / segs
    const y = ye + ((ys - ye) * s) / segs
    const mx = xe + ((xs - xe) * (s - 0.5)) / segs
    const my = cy - r * 0.32 + (s % 2 ? r * 0.16 : -r * 0.02)
    d += `Q${n2(mx)} ${n2(my)} ${n2(x)} ${n2(y)}`
  }
  return d + 'Z'
}

/** A branch tapering from w0 to w1 along a quadratic curve, with a round tip. */
function taper(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, w0: number, w1: number) {
  const N = 12
  const left: string[] = [], right: string[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N, u = 1 - t
    const x = u * u * x0 + 2 * u * t * cx + t * t * x1
    const y = u * u * y0 + 2 * u * t * cy + t * t * y1
    const dx = 2 * u * (cx - x0) + 2 * t * (x1 - cx)
    const dy = 2 * u * (cy - y0) + 2 * t * (y1 - cy)
    const len = Math.hypot(dx, dy) || 1
    const w = (w0 + (w1 - w0) * t) / 2
    left.push(`${n2(x - (dy / len) * w)} ${n2(y + (dx / len) * w)}`)
    right.push(`${n2(x + (dy / len) * w)} ${n2(y - (dx / len) * w)}`)
  }
  const tipR = n2(w1 / 2)
  return `M${left[0]}L${left.slice(1).join('L')}A${tipR} ${tipR} 0 0 0 ${right[N]}L${right.slice(0, N).reverse().join('L')}Z`
}

function tuft(x: number, y: number, h: number) {
  const b = h / 5
  return `M${n2(x - 3 * b)} ${n2(y)}L${n2(x - 2 * b)} ${n2(y - h * 0.8)}L${n2(x - b * 0.6)} ${n2(y - b * 0.4)}` +
    `L${n2(x + b * 0.2)} ${n2(y - h)}L${n2(x + b)} ${n2(y - b * 0.3)}L${n2(x + 2.2 * b)} ${n2(y - h * 0.65)}L${n2(x + 3 * b)} ${n2(y)}Z`
}

function leafShape(x: number, y: number, s: number, rot: number) {
  // A small leaf around (x, y), length ~13·s, rotated by rot degrees.
  const pts = [[0, -6.5], [5, -4], [6, 3], [0, 6.5], [-6, 3], [-5, -4]].map(([px, py]) => {
    const c = Math.cos(deg(rot)), sn = Math.sin(deg(rot))
    return [x + (px * c - py * sn) * s, y + (px * sn + py * c) * s]
  })
  const [a, b, c, d, e, f] = pts
  return `M${n2(a[0])} ${n2(a[1])}C${n2(b[0])} ${n2(b[1])} ${n2(c[0])} ${n2(c[1])} ${n2(d[0])} ${n2(d[1])}` +
    `C${n2(e[0])} ${n2(e[1])} ${n2(f[0])} ${n2(f[1])} ${n2(a[0])} ${n2(a[1])}Z`
}

/** A 5-petal blossom: petals and centre as separate path strings. */
function blossom(x: number, y: number, R: number, rot: number) {
  let petals = ''
  for (let k = 0; k < 5; k++) {
    const a = rot + (k * Math.PI * 2) / 5
    petals += circle(x + Math.cos(a) * R * 0.55, y + Math.sin(a) * R * 0.55, R * 0.45)
  }
  return { petals, center: circle(x, y, R * 0.34) }
}

// ── scene types ──────────────────────────────────────────────────────────────
export interface OakClump {
  layer: 0 | 1 | 2
  cx: number
  cy: number
  r: number
  shadow: string
  base: string
  highlight: string
  tones: Tones
  speckles: { x: number; y: number; r: number; color: string }[]
  snow?: string
  petalsWhite?: string
  petalsPink?: string
  centers?: string
  /** Sway: amplitude (radians), period and phase (s), around (cx, cy + 0.8r). */
  amp: number
  period: number
  phase: number
  stroke: number
  twinkle: 0 | 1 | 2
}

export interface OakMote { x: number; y: number; r: number; rise: number; drift: number; life: number; delay: number }

export interface OakScene {
  stage: OakStage
  state: OakState
  small: boolean
  treeScale: number
  islandScale: number
  outline: string
  /** Island space. */
  island: {
    side: string; top: string; rim: string; tufts: string; dryLeaves?: string
    colors: Look['island']; stroke: number; rimWidth: number
  }
  /** Tree space. Stroke widths in tree units. */
  seed?: {
    nut: string; nutLight: string; cap: string; capMarks: string; stalk: string; lip: string
    glow: { cx: number; cy: number; r: number }; sparkles: string[]
    colors: { nut: string; nutLight: string; cap: string }; stroke: number
  }
  sprout?: { stem: string; leaves: string; light: string; ribs: string; stroke: number; ribWidth: number }
  wood?: {
    pieces: string
    grooves?: string
    knot?: { outer: string; inner: string }
    runes?: string
    icicles?: string
    ao: { cx: number; cy: number; rx: number; ry: number }
    rootGlow?: { cx: number; cy: number; rx: number; ry: number }
    colors: Look['wood']
    gradX: [number, number]
    stroke: number
    grooveWidth: number
    runeWidth: number
  }
  clumps: OakClump[]
  /** Combined crown silhouette for the one-blur edge glow (tree space). */
  edgeGlow?: { d: string; color: string; width: number; blur: number }
  /** Canvas space from here on. */
  aura?: { cx: number; cy: number; r: number; color: string; intensity: number }
  rays?: { d: string; x0: number; y0: number; x1: number; y1: number }[]
  orbs?: { cx: number; cy: number; rx: number; ry: number; count: number; r: number }
  motes?: { list: OakMote[]; color: string }
  butterflies?: { cx: number; cy: number; ax: number; ay: number; period: number; flap: number; color: string; size: number }[]
  leaf?: { x: number; y: number; d: string; color: string; stroke: number }
  snow?: { x: number; y: number; r: number; fall: number; drift: number; life: number; delay: number }[]
  crown: { cx: number; cy: number; R: number }
}

// ── builder ──────────────────────────────────────────────────────────────────
export function buildOakScene(stage: OakStage, state: OakState, sizePx: number): OakScene {
  const small = sizePx <= 120
  const look = LOOK[state]
  const treeScale = TREE_SCALE[stage]
  const islandScale = 0.42 + ((stage - 1) * 0.58) / 9
  const outlinePx = sizePx >= 200 ? 2.4 : sizePx >= 90 ? 1.6 : 1.2
  const pxCanvas = OAK_W / sizePx
  const pxTree = pxCanvas / treeScale
  const pxIsland = pxCanvas / islandScale
  const alive = state === 'alive'
  const rnd = rng(stage * 977 + (state === 'alive' ? 0 : state === 'frozen' ? 31 : 67) + (small ? 7 : 0))

  // ── island ──
  const island: OakScene['island'] = {
    side: ellipse(0, 7, 150, 22),
    top: ellipse(0, 0, 150, 18),
    rim: (() => {
      let d = ''
      for (let a = 195; a <= 255; a += 6) {
        const x = -1 + 141 * Math.cos(deg(a)), y = -1 + 14 * Math.sin(deg(a))
        d += `${d ? 'L' : 'M'}${n2(x)} ${n2(y)}`
      }
      return d
    })(),
    tufts: small ? '' : tuft(-104, -1, 13) + tuft(88, -2, 11),
    colors: look.island,
    stroke: outlinePx * pxIsland,
    rimWidth: 2.6 * pxIsland * (small ? 0.8 : 1),
  }
  if (state === 'dead' && stage >= 2) {
    island.dryLeaves = leafShape(-60, -3, 1.1, 70) + leafShape(36, -1, 1, -60) + leafShape(84, -4, 0.9, 100)
  }

  const scene: OakScene = {
    stage, state, small, treeScale, islandScale, outline: look.outline, island, clumps: [],
    crown: { cx: OX, cy: OY - 235 * treeScale, R: 150 * treeScale },
  }
  const stroke = outlinePx * pxTree

  // ── stage 1: seed ──
  if (stage === 1) {
    const sparkles = [[-20, -34, 4.5], [17, -42, 3.8], [3, -56, 3]].map(([x, y, r]) =>
      `M${n2(x)} ${n2(y - r)}Q${n2(x)} ${n2(y)} ${n2(x + r)} ${n2(y)}Q${n2(x)} ${n2(y)} ${n2(x)} ${n2(y + r)}` +
      `Q${n2(x)} ${n2(y)} ${n2(x - r)} ${n2(y)}Q${n2(x)} ${n2(y)} ${n2(x)} ${n2(y - r)}Z`)
    // An acorn — the seed of the oak — half-buried in the island.
    scene.seed = {
      nut: 'M-9 -13C-10 -3 -5 4 0 6C5 4 10 -3 9 -13Z',
      nutLight: 'M-6 -11C-6.5 -5 -4 0 -1.5 2.5C-3 -3 -3 -8 -2 -11Z',
      cap: 'M-12 -13C-12.5 -24 12.5 -24 12 -13C6 -10 -6 -10 -12 -13Z',
      capMarks: 'M-7 -18L-5 -15M-2 -20L0 -16M3 -20L5 -16M8 -17L9 -14',
      stalk: 'M0 -21Q1 -26 5 -28',
      lip: 'M-22 -1Q-12 -6 0 -3Q12 -6 22 -1L22 5L-22 5Z',
      glow: { cx: 0, cy: -10, r: 24 },
      sparkles: alive && !small ? sparkles : sparkles.slice(0, alive ? 1 : 0),
      colors: state === 'dead'
        ? { nut: '#9C8C7A', nutLight: '#B5A796', cap: '#5E5246' }
        : state === 'frozen'
          ? { nut: '#C9B3A0', nutLight: '#E8DCD0', cap: '#6E5A4E' }
          : { nut: '#D49A55', nutLight: '#F1C789', cap: '#7A4A26' },
      stroke,
    }
    return scene
  }

  // ── stage 2: sprout ──
  if (stage === 2) {
    scene.sprout = {
      stem: taper(0, 2, 2, -20, 1, -40, 5, 3),
      leaves: 'M1 -40C-8 -51 -24 -51 -31 -42C-22 -32 -8 -32 1 -40Z' + 'M1 -40C10 -55 28 -57 35 -48C27 -36 10 -34 1 -40Z',
      light: 'M1 -40C-8 -51 -24 -51 -31 -42C-19 -45 -8 -43 1 -40Z' + 'M1 -40C10 -55 28 -57 35 -48C22 -49 10 -45 1 -40Z',
      ribs: 'M1 -40Q-14 -44 -28 -42M1 -40Q17 -47 32 -48',
      stroke,
      ribWidth: 1.2 * pxTree,
    }
    scene.wood = woodFor('sprout')
    return scene
  }

  // ── wood ──
  function woodFor(kind: 'sprout' | 'sapling' | 'tree'): NonNullable<OakScene['wood']> {
    const base = {
      colors: look.wood, gradX: [-26, 26] as [number, number], stroke,
      grooveWidth: 1.6 * pxTree, runeWidth: 1.8 * pxTree,
    }
    if (kind === 'sprout') return { ...base, pieces: '', ao: { cx: 0, cy: 0, rx: 12, ry: 3 } }
    if (kind === 'sapling') {
      return {
        ...base,
        gradX: [-6, 6],
        pieces: taper(0, 2, -1, -35, 0, -72, 7, 3.6) + taper(0, -46, -8, -60, -16, -76, 3, 1.6) + taper(0, -54, 7, -70, 14, -86, 3, 1.6),
        ao: { cx: 0, cy: 0, rx: 16, ry: 3.5 },
      }
    }
    const pieces =
      // roots
      'M-16 -14C-30 -10 -44 -4 -66 4C-50 8 -30 6 -12 4Z' +
      'M-8 -6C-16 -2 -24 4 -34 9C-22 10 -12 8 -2 4Z' +
      'M16 -16C32 -10 48 -2 70 5C52 9 30 7 12 4Z' +
      'M8 -6C16 0 22 6 30 10C20 11 10 8 2 4Z' +
      // trunk
      'M-24 2C-20 -30 -14 -55 -18 -85C-21 -108 -16 -132 -14 -152L14 -152C18 -130 22 -112 17 -90C12 -64 19 -32 26 2Z' +
      // three main branches
      taper(-4, -144, -30, -170, -70, -215, 17, 7) +
      taper(0, -146, -8, -200, 5, -262, 17, 7) +
      taper(4, -144, 35, -175, 70, -222, 17, 7) +
      // four twigs (the stage-4 crown is too small to hide them)
      (stage >= 5 || state === 'dead'
        ? taper(-40, -186, -80, -172, -112, -186, 6.5, 2.2) +
          taper(40, -190, 80, -170, 112, -182, 6.5, 2.2) +
          taper(-3, -226, -20, -262, -45, -292, 5.5, 2) +
          taper(4, -236, 26, -268, 50, -292, 5.5, 2)
        : '')
    return {
      ...base,
      pieces,
      grooves: small ? undefined : 'M-6 -20C-9 -50 -4 -80 -8 -120M8 -14C11 -40 6 -70 9 -100M-14 -8C-16 -28 -12 -44 -14 -58',
      knot: small ? undefined : { outer: ellipse(5, -70, 5, 7), inner: ellipse(5, -71, 2.4, 3.4) },
      runes: stage >= 8 && alive
        ? 'M-10 -30L-7 -37L-4 -30M2 -50V-59M-1 -56H5M-11 -96L-7 -100L-3 -96L-7 -92ZM2 -120L7 -126M2 -126L7 -120'
        : undefined,
      icicles: state === 'frozen'
        ? [[-62, -134], [66, -128], [100, -122], [-8, -150], [12, -150]].map(([x, y]) =>
            `M${x - 3} ${y}L${x + 3} ${y}L${x} ${y + 11}Z`).join('')
        : undefined,
      ao: { cx: 0, cy: 0, rx: 46, ry: 7 },
      rootGlow: stage === 10 && alive ? { cx: 0, cy: 3, rx: 62, ry: 10 } : undefined,
    }
  }

  // ── clumps ──
  let spots: Spot[]
  if (stage === 3) spots = SAPLING
  else if (state === 'dead') spots = DEAD
  else spots = CROWN.slice(0, CLUMP_COUNT[stage])
  if (small && stage >= 4 && state !== 'dead') {
    spots = spots.slice(0, 11).map(([l, x, y, r]) => [l, x, y, r * 1.33] as Spot)
  } else if (small) {
    spots = spots.map(([l, x, y, r]) => [l, x, y, r * 1.2] as Spot)
  }
  scene.wood = woodFor(stage === 3 ? 'sapling' : 'tree')

  const goldN = alive ? GOLD_SHARE[stage] ?? 0 : 0
  const blossomStage = alive && stage >= 5 && stage <= 7
  const leafStroke = stroke
  const layerMul = [1.3, 1.12, 1.0]

  spots.forEach(([layer, cx, cy, r], i) => {
    const bumps = small ? Math.max(6, Math.round(r / 7)) : Math.max(7, Math.round(r / 5))
    const isGold = ((i * 7) % 22) < goldN
    const tones = state === 'dead' ? DRY : state === 'frozen' ? ICE[layer] : isGold ? GOLD[layer] : GREEN[layer]
    const speckles: OakClump['speckles'] = []
    if (!small && state !== 'dead') {
      for (let k = 0; k < 4; k++) {
        const a = deg(-135 + (rnd() * 2 - 1) * 40)
        const dist = r * (0.35 + rnd() * 0.25)
        speckles.push({
          x: n2(cx - 0.07 * r + Math.cos(a) * dist),
          y: n2(cy - 0.09 * r + Math.sin(a) * dist),
          r: n2(r * (0.035 + rnd() * 0.025)),
          color: state === 'frozen' ? '#FFFFFF' : isGold ? mixHex('#FFE9A0', '#FFF8D6', k / 3) : mixHex('#B9E36A', '#ECFAA6', k / 3),
        })
      }
    }
    const clump: OakClump = {
      layer, cx, cy, r,
      shadow: scallop(cx, cy, r, bumps, rnd),
      base: scallop(cx - 0.07 * r, cy - 0.09 * r, 0.8 * r, bumps, rnd),
      highlight: scallop(cx - 0.27 * r, cy - 0.3 * r, 0.44 * r, Math.max(6, bumps - 2), rnd),
      tones,
      speckles,
      amp: deg(state === 'dead' ? 0.6 : [1, 1.5, 2][i % 3]),
      period: 4 + ((i * 0.37) % 1.9),
      phase: -((i * 0.53) % 5),
      stroke: leafStroke * layerMul[layer],
      twinkle: (i % 3) as 0 | 1 | 2,
    }
    if (state === 'frozen') clump.snow = snowCap(cx, cy, r, bumps)
    if (blossomStage && layer > 0 && !isGold) {
      const open = stage === 7
      const count = small ? 1 : open ? 2 : 1 + (i % 2)
      let white = '', pink = '', centers = ''
      for (let k = 0; k < count; k++) {
        const a = rnd() * Math.PI * 2
        const dist = r * (0.15 + rnd() * 0.4)
        const R = (open ? 8 : 5.5) * (small ? 1.6 : 1)
        const b = blossom(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, R, rnd() * 6)
        if ((i + k) % 2) pink += b.petals; else white += b.petals
        centers += b.center
      }
      clump.petalsWhite = white || undefined
      clump.petalsPink = pink || undefined
      clump.centers = centers
    }
    scene.clumps.push(clump)
  })
  scene.clumps.sort((a, b) => a.layer - b.layer)

  if (stage < 4) return scene

  // ── magic (alive only from here) ──
  const { cx: ccx, cy: ccy, R } = scene.crown
  if (alive && (stage === 6 || stage >= 8)) {
    scene.edgeGlow = {
      d: scene.clumps.map(c => c.shadow).join(''),
      color: stage === 6 ? '#8FD8FF' : '#FFD873',
      width: 9 * (small ? 1.3 : 1),
      blur: 3 / treeScale * (small ? 1.6 : 1),
    }
  }
  if (alive && stage >= 6) {
    scene.aura = { cx: ccx, cy: ccy, r: R * 1.35, ...AURA[stage] }
    const count = small ? Math.min(4, MOTES[stage]) : MOTES[stage]
    const list: OakMote[] = []
    for (let i = 0; i < count; i++) {
      list.push({
        x: n2(ccx + (rnd() - 0.5) * 1.5 * R),
        y: n2(ccy + (rnd() * 0.7 - 0.1) * R),
        r: n2((3.2 + rnd() * 2.2) * (small ? 1.4 : 1)),
        rise: n2(40 + rnd() * 19),
        drift: n2((rnd() * 2 - 1) * 8),
        life: [5, 6, 7][i % 3],
        delay: i * 0.6,
      })
    }
    scene.motes = { list, color: MOTE_COLOR[stage] }
  }
  if (alive && stage >= 9) {
    scene.orbs = { cx: ccx, cy: ccy, rx: 1.08 * R, ry: 0.3 * R, count: Math.min(small ? 5 : 99, stage === 9 ? 8 : 10), r: small ? 6 : 4.5 }
    const dir = [0.62, 1], len = Math.hypot(dir[0], dir[1])
    const dx = dir[0] / len, dy = dir[1] / len
    scene.rays = [0, 1, 2, 3].map(i => {
      const ox = -30 + i * 38, oy = -30, w = 16 + i * 7, L = 340
      const nx = -dy, ny = dx
      const p = (x: number, y: number) => `${n2(x)} ${n2(y)}`
      return {
        d: `M${p(ox + nx * w * 0.3, oy + ny * w * 0.3)}L${p(ox + dx * L + nx * w, oy + dy * L + ny * w)}` +
           `L${p(ox + dx * L - nx * w, oy + dy * L - ny * w)}L${p(ox - nx * w * 0.3, oy - ny * w * 0.3)}Z`,
        x0: ox, y0: oy, x1: n2(ox + dx * L), y1: n2(oy + dy * L),
      }
    })
  }
  if (alive && stage === 7 && !small) {
    scene.butterflies = [
      { cx: ccx - 0.72 * R, cy: ccy + 0.12 * R, ax: 16, ay: 9, period: 7, flap: 0.75, color: '#A78BFA', size: 1 },
      { cx: ccx + 0.78 * R, cy: ccy - 0.2 * R, ax: 14, ay: 8, period: 8, flap: 0.82, color: '#F5C542', size: 0.9 },
      { cx: ccx + 0.08 * R, cy: ccy - 0.78 * R, ax: 18, ay: 7, period: 9, flap: 0.9, color: '#60A5FA', size: 0.85 },
    ]
  }
  if (alive && !small) {
    scene.leaf = {
      x: ccx - 0.42 * R, y: ccy + 0.55 * R,
      d: leafShape(0, 0, 1, 0),
      color: stage >= 8 ? '#EDB53E' : '#74C343',
      stroke: outlinePx * pxCanvas * 0.8,
    }
  }
  if (state === 'frozen') {
    const n = small ? 4 : 9
    scene.snow = Array.from({ length: n }, (_, i) => ({
      x: n2(30 + rnd() * 260), y: n2(10 + rnd() * 100), r: n2((1.6 + rnd() * 1.6) * (small ? 1.8 : 1)),
      fall: n2(220 + rnd() * 80), drift: n2((rnd() * 2 - 1) * 12), life: 6 + (i % 4), delay: i * 0.8,
    }))
  }
  return scene
}

/** Butterfly drawn around (0, 0), ~22 units wide; wings flap by scaleX. */
export const BUTTERFLY = {
  wings: ellipse(-5, -3, 5.5, 4.5) + ellipse(5, -3, 5.5, 4.5) + ellipse(-4, 3, 3.5, 3) + ellipse(4, 3, 3.5, 3),
  body: 'M-1 -6H1V6H-1Z',
}

export const OAK_STAGES: OakStage[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

/**
 * MagicTree for *your* streak tree: drawn in your tree look (Tabiiy, Sakura,
 * Kumush, Oltin) from myLookStore, so changing it in Profilni bezash changes
 * it everywhere your tree appears — Bugun, the streak screen, the stage
 * roadmap and the streak modals. Other people's trees pass their own look
 * to MagicTree instead.
 */
import React from 'react'
import { useMyLookStore } from '../../stores/myLookStore'
import { treeLookKind } from '../../src/features/profile/cosmetics/cosmetics'
import { MagicTree, type MagicTreeProps } from './MagicTree'

export function MyMagicTree(props: Omit<MagicTreeProps, 'look'>) {
  const tree = useMyLookStore(s => s.tree)
  return <MagicTree {...props} look={treeLookKind(tree)} />
}

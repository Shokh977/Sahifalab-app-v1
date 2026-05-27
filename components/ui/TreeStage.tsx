import React from 'react'
import Svg, { Ellipse, Rect, Line, Circle, G } from 'react-native-svg'

export type TreeHealth = 'healthy' | 'frost' | 'wilting' | 'dead'

interface Props {
  stage:  1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  health: TreeHealth
  size?:  number
}

export function treeStageFromStreak(streak: number): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 {
  if (streak >= 365) return 8
  if (streak >= 100) return 7
  if (streak >= 60)  return 6
  if (streak >= 30)  return 5
  if (streak >= 14)  return 4
  if (streak >= 7)   return 3
  if (streak >= 3)   return 2
  return 1
}

export function TreeStage({ stage, health = 'healthy', size = 90 }: Props) {
  const frost   = health === 'frost'
  const wilting = health === 'wilting'
  const dead    = health === 'dead'

  const treeColor   = frost ? '#7FB8D8' : wilting ? '#8B7355' : '#4CAF50'
  const trunkColor  = frost ? '#6B8B9B' : '#8B6914'
  const leafColor2  = frost ? '#5A9AB5' : wilting ? '#7A6340' : '#388E3C'
  const flowerColor = frost ? '#9BC4D8' : '#FFD700'
  const groundColor = frost ? '#4A6B7A' : '#3E2723'
  const svgOpacity  = dead ? 0.5 : 1

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={svgOpacity}>
      {/* Ground */}
      <Ellipse cx="50" cy="88" rx="30" ry="6" fill={groundColor} opacity={0.4} />

      {stage === 1 && (
        <G>
          <Rect x="48" y="78" width="4" height="10" rx="2" fill={treeColor} />
          <Ellipse cx="47" cy="76" rx="5" ry="4" fill={treeColor} opacity={0.9} />
          <Ellipse cx="53" cy="77" rx="4" ry="3.5" fill={leafColor2} opacity={0.8} />
        </G>
      )}

      {stage === 2 && (
        <G>
          <Rect x="48" y="65" width="4" height="23" rx="2" fill={trunkColor} />
          <Ellipse cx="42" cy="64" rx="8" ry="6" fill={treeColor} />
          <Ellipse cx="56" cy="62" rx="7" ry="5.5" fill={leafColor2} />
          <Ellipse cx="48" cy="58" rx="6" ry="5" fill={treeColor} opacity={0.8} />
          <Ellipse cx="55" cy="68" rx="5" ry="4" fill={leafColor2} opacity={0.7} />
        </G>
      )}

      {stage === 3 && (
        <G>
          <Rect x="47" y="52" width="6" height="36" rx="3" fill={trunkColor} />
          <Line x1="50" y1="65" x2="38" y2="58" stroke={trunkColor} strokeWidth="3" strokeLinecap="round" />
          <Line x1="50" y1="60" x2="62" y2="53" stroke={trunkColor} strokeWidth="3" strokeLinecap="round" />
          <Ellipse cx="36" cy="54" rx="10" ry="8" fill={treeColor} />
          <Ellipse cx="62" cy="49" rx="9" ry="7" fill={leafColor2} />
          <Ellipse cx="50" cy="45" rx="12" ry="9" fill={treeColor} opacity={0.9} />
          {!frost && <Circle cx="58" cy="52" r="2.5" fill={flowerColor} opacity={0.7} />}
        </G>
      )}

      {stage === 4 && (
        <G>
          <Rect x="46" y="45" width="8" height="43" rx="4" fill={trunkColor} />
          <Line x1="50" y1="62" x2="35" y2="52" stroke={trunkColor} strokeWidth="3.5" strokeLinecap="round" />
          <Line x1="50" y1="55" x2="65" y2="46" stroke={trunkColor} strokeWidth="3.5" strokeLinecap="round" />
          <Line x1="50" y1="50" x2="40" y2="40" stroke={trunkColor} strokeWidth="2.5" strokeLinecap="round" />
          <Ellipse cx="50" cy="35" rx="22" ry="16" fill={treeColor} />
          <Ellipse cx="38" cy="40" rx="12" ry="10" fill={leafColor2} opacity={0.8} />
          <Ellipse cx="62" cy="38" rx="11" ry="9" fill={treeColor} opacity={0.85} />
          {!frost && (
            <G>
              <Circle cx="42" cy="32" r="2.5" fill={flowerColor} opacity={0.8} />
              <Circle cx="55" cy="28" r="2" fill={flowerColor} opacity={0.6} />
              <Circle cx="60" cy="36" r="2.5" fill="#FF6B6B" opacity={0.7} />
            </G>
          )}
        </G>
      )}

      {stage === 5 && (
        <G>
          <Rect x="44" y="38" width="12" height="50" rx="6" fill={trunkColor} />
          <Line x1="50" y1="58" x2="30" y2="45" stroke={trunkColor} strokeWidth="5" strokeLinecap="round" />
          <Line x1="50" y1="50" x2="70" y2="38" stroke={trunkColor} strokeWidth="5" strokeLinecap="round" />
          <Line x1="50" y1="45" x2="35" y2="30" stroke={trunkColor} strokeWidth="3.5" strokeLinecap="round" />
          <Line x1="50" y1="42" x2="65" y2="28" stroke={trunkColor} strokeWidth="3.5" strokeLinecap="round" />
          <Ellipse cx="50" cy="25" rx="30" ry="20" fill={treeColor} />
          <Ellipse cx="33" cy="32" rx="15" ry="12" fill={leafColor2} opacity={0.8} />
          <Ellipse cx="67" cy="30" rx="14" ry="11" fill={treeColor} opacity={0.85} />
          <Ellipse cx="50" cy="18" rx="18" ry="12" fill={leafColor2} opacity={0.7} />
          {!frost && (
            <G>
              <Circle cx="38" cy="22" r="3" fill={flowerColor} opacity={0.9} />
              <Circle cx="58" cy="18" r="2.5" fill={flowerColor} opacity={0.8} />
              <Circle cx="45" cy="30" r="2" fill="#FF6B6B" opacity={0.7} />
              <Circle cx="63" cy="26" r="2.5" fill="#FF6B6B" opacity={0.6} />
              <Circle cx="52" cy="15" r="2" fill={flowerColor} opacity={0.7} />
            </G>
          )}
          {frost && (
            <G>
              <Circle cx="40" cy="20" r="2" fill="#fff" opacity={0.5} />
              <Circle cx="55" cy="15" r="1.5" fill="#fff" opacity={0.4} />
              <Circle cx="48" cy="25" r="1.5" fill="#B0D4E8" opacity={0.3} />
            </G>
          )}
        </G>
      )}

      {stage === 6 && (
        <G>
          {/* Mature tree — wide spreading canopy, thick trunk */}
          <Rect x="43" y="35" width="14" height="53" rx="7" fill={trunkColor} />
          <Line x1="50" y1="60" x2="25" y2="44" stroke={trunkColor} strokeWidth="6" strokeLinecap="round" />
          <Line x1="50" y1="52" x2="75" y2="36" stroke={trunkColor} strokeWidth="6" strokeLinecap="round" />
          <Line x1="50" y1="46" x2="30" y2="28" stroke={trunkColor} strokeWidth="4" strokeLinecap="round" />
          <Line x1="50" y1="43" x2="70" y2="25" stroke={trunkColor} strokeWidth="4" strokeLinecap="round" />
          <Line x1="50" y1="40" x2="38" y2="22" stroke={trunkColor} strokeWidth="3" strokeLinecap="round" />
          {/* Wide canopy */}
          <Ellipse cx="50" cy="22" rx="34" ry="20" fill={treeColor} />
          <Ellipse cx="28" cy="30" rx="18" ry="13" fill={leafColor2} opacity={0.85} />
          <Ellipse cx="72" cy="28" rx="17" ry="12" fill={treeColor} opacity={0.9} />
          <Ellipse cx="50" cy="14" rx="20" ry="12" fill={leafColor2} opacity={0.75} />
          <Ellipse cx="38" cy="18" rx="12" ry="9" fill={treeColor} opacity={0.8} />
          <Ellipse cx="63" cy="16" rx="11" ry="8" fill={leafColor2} opacity={0.8} />
          {!frost && (
            <G>
              <Circle cx="35" cy="18" r="3" fill={flowerColor} opacity={0.9} />
              <Circle cx="55" cy="12" r="3" fill={flowerColor} opacity={0.85} />
              <Circle cx="42" cy="28" r="2.5" fill="#FF6B6B" opacity={0.75} />
              <Circle cx="66" cy="22" r="3" fill="#FF6B6B" opacity={0.7} />
              <Circle cx="50" cy="10" r="2.5" fill={flowerColor} opacity={0.8} />
              <Circle cx="28" cy="24" r="2" fill={flowerColor} opacity={0.7} />
            </G>
          )}
        </G>
      )}

      {stage === 7 && (
        <G>
          {/* Ancient tree — massive, gnarled, imposing */}
          <Rect x="42" y="30" width="16" height="58" rx="8" fill={trunkColor} />
          {/* Heavy root flares */}
          <Ellipse cx="42" cy="82" rx="8" ry="5" fill={trunkColor} opacity={0.6} />
          <Ellipse cx="58" cy="82" rx="8" ry="5" fill={trunkColor} opacity={0.6} />
          {/* Major branches */}
          <Line x1="50" y1="62" x2="22" y2="44" stroke={trunkColor} strokeWidth="7" strokeLinecap="round" />
          <Line x1="50" y1="54" x2="78" y2="36" stroke={trunkColor} strokeWidth="7" strokeLinecap="round" />
          <Line x1="50" y1="48" x2="26" y2="26" stroke={trunkColor} strokeWidth="5" strokeLinecap="round" />
          <Line x1="50" y1="44" x2="74" y2="22" stroke={trunkColor} strokeWidth="5" strokeLinecap="round" />
          <Line x1="50" y1="40" x2="35" y2="16" stroke={trunkColor} strokeWidth="3.5" strokeLinecap="round" />
          <Line x1="50" y1="38" x2="65" y2="14" stroke={trunkColor} strokeWidth="3.5" strokeLinecap="round" />
          {/* Massive canopy */}
          <Ellipse cx="50" cy="18" rx="38" ry="20" fill={treeColor} />
          <Ellipse cx="24" cy="28" rx="20" ry="14" fill={leafColor2} opacity={0.9} />
          <Ellipse cx="76" cy="26" rx="19" ry="13" fill={treeColor} opacity={0.9} />
          <Ellipse cx="50" cy="10" rx="24" ry="13" fill={leafColor2} opacity={0.8} />
          <Ellipse cx="36" cy="16" rx="14" ry="10" fill={treeColor} opacity={0.85} />
          <Ellipse cx="65" cy="14" rx="13" ry="10" fill={leafColor2} opacity={0.85} />
          <Ellipse cx="50" cy="6" rx="14" ry="8" fill={treeColor} opacity={0.7} />
          {!frost && (
            <G>
              <Circle cx="30" cy="16" r="3.5" fill={flowerColor} opacity={0.95} />
              <Circle cx="55" cy="8" r="3.5" fill={flowerColor} opacity={0.9} />
              <Circle cx="40" cy="26" r="3" fill="#FF6B6B" opacity={0.8} />
              <Circle cx="68" cy="20" r="3.5" fill="#FF6B6B" opacity={0.75} />
              <Circle cx="22" cy="22" r="2.5" fill={flowerColor} opacity={0.8} />
              <Circle cx="72" cy="30" r="2.5" fill={flowerColor} opacity={0.75} />
              <Circle cx="48" cy="5" r="2.5" fill="#FF6B6B" opacity={0.7} />
            </G>
          )}
          {frost && (
            <G>
              <Circle cx="30" cy="16" r="2.5" fill="#fff" opacity={0.6} />
              <Circle cx="60" cy="10" r="2" fill="#fff" opacity={0.5} />
              <Circle cx="75" cy="24" r="2" fill="#B0D4E8" opacity={0.4} />
              <Circle cx="35" cy="8" r="1.5" fill="#fff" opacity={0.4} />
            </G>
          )}
        </G>
      )}

      {stage >= 8 && (
        <G>
          {/* Legendary tree — full canopy, glowing, mythical */}
          <Rect x="41" y="28" width="18" height="60" rx="9" fill={trunkColor} />
          {/* Root flares */}
          <Ellipse cx="40" cy="83" rx="10" ry="5" fill={trunkColor} opacity={0.65} />
          <Ellipse cx="60" cy="83" rx="10" ry="5" fill={trunkColor} opacity={0.65} />
          <Ellipse cx="50" cy="85" rx="12" ry="4" fill={trunkColor} opacity={0.5} />
          {/* Heavy branches in all directions */}
          <Line x1="50" y1="65" x2="20" y2="46" stroke={trunkColor} strokeWidth="8" strokeLinecap="round" />
          <Line x1="50" y1="56" x2="80" y2="37" stroke={trunkColor} strokeWidth="8" strokeLinecap="round" />
          <Line x1="50" y1="50" x2="22" y2="24" stroke={trunkColor} strokeWidth="5.5" strokeLinecap="round" />
          <Line x1="50" y1="46" x2="78" y2="20" stroke={trunkColor} strokeWidth="5.5" strokeLinecap="round" />
          <Line x1="50" y1="42" x2="32" y2="14" stroke={trunkColor} strokeWidth="4" strokeLinecap="round" />
          <Line x1="50" y1="40" x2="68" y2="12" stroke={trunkColor} strokeWidth="4" strokeLinecap="round" />
          <Line x1="50" y1="36" x2="50" y2="10" stroke={trunkColor} strokeWidth="3.5" strokeLinecap="round" />
          {/* Epic full canopy */}
          <Ellipse cx="50" cy="16" rx="40" ry="20" fill={treeColor} />
          <Ellipse cx="22" cy="28" rx="22" ry="16" fill={leafColor2} opacity={0.9} />
          <Ellipse cx="78" cy="26" rx="20" ry="15" fill={treeColor} opacity={0.92} />
          <Ellipse cx="50" cy="8" rx="26" ry="14" fill={leafColor2} opacity={0.85} />
          <Ellipse cx="34" cy="14" rx="16" ry="11" fill={treeColor} opacity={0.88} />
          <Ellipse cx="66" cy="12" rx="15" ry="11" fill={leafColor2} opacity={0.88} />
          <Ellipse cx="50" cy="4" rx="16" ry="8" fill={treeColor} opacity={0.75} />
          <Ellipse cx="40" cy="22" rx="12" ry="8" fill={leafColor2} opacity={0.7} />
          <Ellipse cx="62" cy="20" rx="11" ry="8" fill={treeColor} opacity={0.7} />
          {/* Abundant blooms */}
          {!frost && (
            <G>
              <Circle cx="28" cy="14" r="4" fill={flowerColor} opacity={0.95} />
              <Circle cx="55" cy="6" r="4" fill={flowerColor} opacity={0.95} />
              <Circle cx="38" cy="24" r="3.5" fill="#FF6B6B" opacity={0.85} />
              <Circle cx="70" cy="18" r="4" fill="#FF6B6B" opacity={0.8} />
              <Circle cx="20" cy="22" r="3" fill={flowerColor} opacity={0.85} />
              <Circle cx="76" cy="30" r="3" fill={flowerColor} opacity={0.8} />
              <Circle cx="46" cy="4" r="3" fill="#FF6B6B" opacity={0.75} />
              <Circle cx="62" cy="8" r="3" fill={flowerColor} opacity={0.8} />
              <Circle cx="32" cy="8" r="2.5" fill="#FF6B6B" opacity={0.7} />
              <Circle cx="68" cy="26" r="2.5" fill={flowerColor} opacity={0.75} />
            </G>
          )}
          {frost && (
            <G>
              <Circle cx="28" cy="14" r="3" fill="#fff" opacity={0.7} />
              <Circle cx="60" cy="8" r="2.5" fill="#fff" opacity={0.6} />
              <Circle cx="76" cy="24" r="2.5" fill="#B0D4E8" opacity={0.5} />
              <Circle cx="35" cy="6" r="2" fill="#fff" opacity={0.5} />
              <Circle cx="50" cy="3" r="2" fill="#B0D4E8" opacity={0.4} />
            </G>
          )}
        </G>
      )}
    </Svg>
  )
}

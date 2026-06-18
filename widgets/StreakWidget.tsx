import React from 'react'
import { FlexWidget, TextWidget } from 'react-native-android-widget'

const STAGE_EMOJIS: Record<number, string> = {
  1: '🌱', 2: '🌿', 3: '🍃', 4: '🌾',
  5: '🌸', 6: '✨', 7: '🌺', 8: '🍂',
  9: '🌟', 10: '👑',
}

interface Props {
  streakDays: number
  stage: number
  stageName: string
}

export function StreakWidget({ streakDays, stage, stageName }: Props) {
  const emoji = STAGE_EMOJIS[stage] ?? '🌱'

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#111318',
        borderRadius: 20,
      }}
    >
      <TextWidget
        text={emoji}
        style={{ fontSize: 38, textAlign: 'center' }}
      />
      <TextWidget
        text={`${streakDays} 🔥`}
        style={{
          fontSize: 26,
          color: '#ffffff',
          fontFamily: 'sans-serif-medium',
          textAlign: 'center',
          marginTop: 4,
        }}
      />
      <TextWidget
        text={stageName}
        style={{
          fontSize: 11,
          color: '#6b7280',
          fontFamily: 'sans-serif',
          textAlign: 'center',
          marginTop: 2,
        }}
      />
      <TextWidget
        text="SAHIFALAB"
        style={{
          fontSize: 9,
          color: '#374151',
          fontFamily: 'sans-serif',
          textAlign: 'center',
          marginTop: 10,
          letterSpacing: 1.5,
        }}
      />
    </FlexWidget>
  )
}

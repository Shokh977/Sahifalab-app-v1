/**
 * Ambient sound behind one button: "Fon ovozi" (or the playing sound's
 * name) opens a Sheet with the sound picker. The sound keeps playing after
 * the sheet closes (AmbientPlayer's module store owns playback).
 */
import React, { useState } from 'react'
import { Music, Volume2 } from 'lucide-react-native'
import { AmbientPlayer, useAmbientNow } from '../../../components/study/AmbientPlayer'
import { Button, Sheet } from '../../components/ui'
import { uzText } from '../today/today'

export function AmbientSheet() {
  const [open, setOpen] = useState(false)
  const playing = useAmbientNow(s => s.name)

  return (
    <>
      <Button
        label={playing ? `Fon ovozi · ${uzText(playing)}` : 'Fon ovozi'}
        icon={playing ? Volume2 : Music}
        variant="secondary"
        fullWidth
        onPress={() => setOpen(true)}
      />
      <Sheet visible={open} onClose={() => setOpen(false)} title="Fon ovozi">
        <AmbientPlayer />
      </Sheet>
    </>
  )
}

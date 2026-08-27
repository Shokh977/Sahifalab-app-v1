import React from 'react'
import { View, StyleSheet } from 'react-native'
import { ResultTicket, type ResultTicketProps } from './ResultTicket'

// Fixed 4:5 design-width canvas (360x450dp) — captureRef resizes this to
// the real 1080x1350 export target (see useShareTicket), so this only
// needs to be internally consistent, not match final pixels itself.
const CANVAS_W = 360
const CANVAS_H = 450

/**
 * Mounted off-screen (not opacity:0 — some capture backends skip fully
 * transparent views) so useShareTicket's captureRef always has a real,
 * laid-out view to grab, independent of whatever the visible on-screen
 * ticket looks like at the current device width.
 */
export function ShareCaptureHost({ hostRef, ticketProps }: { hostRef: React.RefObject<any>; ticketProps: ResultTicketProps }) {
  return (
    <View style={styles.offscreen} pointerEvents="none">
      <View ref={hostRef} collapsable={false} style={styles.canvas}>
        <ResultTicket {...ticketProps} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  offscreen: { position: 'absolute', top: -10_000, left: 0 },
  canvas: {
    width: CANVAS_W, height: CANVAS_H, backgroundColor: '#0F1115',
    alignItems: 'center', justifyContent: 'center', padding: 18,
  },
})

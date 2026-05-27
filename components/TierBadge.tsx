/**
 * TierBadge — React Native (Expo) using @shopify/react-native-skia
 * and react-native-reanimated.
 *
 * Usage:
 *   import { TierBadge } from "@/components/TierBadge";
 *   <TierBadge level={16} size={180} featured />
 */

import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, AccessibilityInfo } from "react-native";
import {
  Canvas,
  Path,
  Group,
  SweepGradient,
  LinearGradient,
  Mask,
  Rect,
  Skia,
  vec,
  BlurMask,
} from "@shopify/react-native-skia";
import Animated, {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";

import { levelOf, MOTIF_PATHS, type Level } from "../lib/tier-data";

// Hex polygon scaled to a size×size box (flat-top hex).
function buildHexPath(size: number, inset = 0) {
  const path = Skia.Path.Make();
  const pts: [number, number][] = [
    [0.5, 0.01], [0.96, 0.26], [0.96, 0.74],
    [0.5, 0.99], [0.04, 0.74], [0.04, 0.26],
  ];
  pts.forEach(([x, y], i) => {
    const px = x * size + (x < 0.5 ? inset : -inset);
    const py = y * size + (y < 0.5 ? inset : -inset);
    if (i === 0) path.moveTo(px, py); else path.lineTo(px, py);
  });
  path.close();
  return path;
}

interface TierBadgeProps {
  /** Absolute level 1..29, or pass a Level object directly */
  level: number | Level;
  size?: number;
  /** Adds extra glow + idle bob animation */
  featured?: boolean;
  /** Grayscale + lock icon overlay */
  locked?: boolean;
  /** Show tier name + subtitle beneath the badge */
  showLabel?: boolean;
  /** 1 = normal speed, 2 = double, 0.5 = half */
  speed?: number;
  /** Set false to freeze all animations (use in grids to avoid GPU overdraw) */
  animated?: boolean;
}

export function TierBadge({
  level,
  size = 180,
  featured = false,
  locked = false,
  showLabel = true,
  speed = 1,
  animated = true,
}: TierBadgeProps) {
  const lvl = typeof level === "number" ? levelOf(level) : level;
  const t = lvl.tier;
  const isLegend = t.id === "legendary";

  // Respect system reduce-motion setting — badge stays fully styled, just static.
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => sub.remove();
  }, []);

  // ── Animations ───────────────────────────────────────────────────────────
  const angle = useSharedValue(0);
  const sheen = useSharedValue(0);
  const bob   = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || !animated) return;
    angle.value = withRepeat(
      withTiming(1, { duration: 12_000 / speed, easing: Easing.linear }),
      -1, false,
    );
    sheen.value = withRepeat(
      withTiming(1, { duration: 4_000 / speed, easing: Easing.inOut(Easing.ease) }),
      -1, true,
    );
    bob.value = withRepeat(
      withTiming(1, { duration: 3_000, easing: Easing.inOut(Easing.ease) }),
      -1, true,
    );
  }, [speed, reduceMotion, animated]);

  const ringTransform = useDerivedValue(() => [
    { rotate: angle.value * 2 * Math.PI },
  ]);

  const animatedBobStyle = useDerivedValue(() => ({
    transform: [{
      translateY: featured && !reduceMotion
        ? interpolate(bob.value, [0, 1], [0, -6])
        : 0,
    }],
  }));

  // ── Paths ────────────────────────────────────────────────────────────────
  const ringPath  = useMemo(() => buildHexPath(size, 0), [size]);
  const facePath  = useMemo(() => buildHexPath(size, 6), [size]);
  const motifPath = useMemo(() => {
    const p = Skia.Path.MakeFromSVGString(MOTIF_PATHS[t.motif]);
    if (p) {
      const m = Skia.Matrix();
      const motifSize = size * 0.7;
      m.translate((size - motifSize) / 2, (size - motifSize) / 2);
      m.scale(motifSize / 100, motifSize / 100);
      p.transform(m);
    }
    return p;
  }, [t.motif, size]);

  const palette = useMemo(() => {
    const positions = t.palette.map((_, i) => i / t.palette.length);
    return {
      colors:    [...t.palette, t.palette[0]],
      positions: [...positions, 1],
    };
  }, [t.palette]);

  const center = vec(size / 2, size / 2);
  const glowColors = isLegend ? ["#ff5fa0", "#5fb6ff", "#ffd24a"] : [t.glow];

  return (
    <Animated.View style={[styles.root, { width: size }, animatedBobStyle as any]}>
      <View style={{ width: size, height: size }}>

        {/* Drop-shadow glow behind the badge */}
        <Canvas style={StyleSheet.absoluteFill}>
          {glowColors.map((c, i) => (
            <Path
              key={i}
              path={ringPath}
              color={c}
              opacity={featured ? 0.55 : 0.35}
            >
              <BlurMask
                blur={size * (isLegend ? 0.18 : featured ? 0.14 : 0.08)}
                style="solid"
              />
            </Path>
          ))}
        </Canvas>

        {/* Main badge canvas */}
        <Canvas style={StyleSheet.absoluteFill}>
          {/* Rotating holographic ring */}
          <Group clip={ringPath} transform={ringTransform} origin={center}>
            <Path path={ringPath}>
              <SweepGradient c={center} colors={palette.colors} positions={palette.positions} />
            </Path>
          </Group>

          {/* Inner face — same gradient, inset 6px for the metallic border */}
          <Group clip={facePath} transform={ringTransform} origin={center}>
            <Path path={facePath}>
              <SweepGradient c={center} colors={palette.colors} positions={palette.positions} />
            </Path>
            {/* Dark vignette for legibility */}
            <Path path={facePath} color={t.ink} opacity={0.55}>
              <BlurMask blur={size * 0.25} style="inner" />
            </Path>
          </Group>

          {/* Sheen sweep — diagonal highlight translating across the face */}
          <Mask mode="luminance" mask={<Path path={facePath} color="white" />}>
            <SheenLayer size={size} sheen={sheen} />
          </Mask>

          {/* Motif silhouette */}
          {motifPath && (
            <Path path={motifPath} color={t.ink} opacity={0.32} />
          )}
        </Canvas>

        {/* Roman numeral — RN Text floats above the canvas */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.textLayer]}>
          <Text
            style={[
              styles.roman,
              {
                fontSize:         size * 0.36,
                textShadowColor:  t.glow,
                textShadowRadius: size * 0.08,
              },
            ]}
          >
            {lvl.roman}
          </Text>
        </View>

        {/* "Lvl N" label + pip ring */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Text style={[styles.num, { bottom: size * 0.2, fontSize: size * 0.065 }]}>
            Lvl {lvl.n}
          </Text>
          <View style={[styles.pips, { bottom: size * 0.1, gap: size * 0.02 }]}>
            {Array.from({ length: t.levels }).map((_, i) => (
              <View
                key={i}
                style={{
                  width:           size * 0.04,
                  height:          size * 0.04,
                  borderRadius:    999,
                  backgroundColor: i < lvl.sub ? "#fff" : "rgba(255,255,255,0.2)",
                  borderWidth:     1,
                  borderColor:     i < lvl.sub ? "#fff" : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </View>
        </View>

        {locked && (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.lockLayer]}>
            <Text style={{ fontSize: size * 0.22 }}>🔒</Text>
          </View>
        )}
      </View>

      {showLabel && (
        <View style={{ alignItems: "center", marginTop: 10 }}>
          <Text style={[styles.tierName, { fontSize: size * 0.095 }]}>{t.name}</Text>
          <Text style={[styles.tierSub,  { fontSize: size * 0.062 }]}>{t.subtitle}</Text>
        </View>
      )}
    </Animated.View>
  );
}

// Sheen layer — translating diagonal highlight, clipped to the face hex by the parent Mask.
function SheenLayer({
  size,
  sheen,
}: {
  size: number;
  sheen: Animated.SharedValue<number>;
}) {
  const start = useDerivedValue(() => {
    const x = interpolate(sheen.value, [0, 1], [-size * 0.6, size * 1.6]);
    return vec(x - size * 0.3, -size * 0.3);
  });
  const end = useDerivedValue(() => {
    const x = interpolate(sheen.value, [0, 1], [-size * 0.6, size * 1.6]);
    return vec(x + size * 0.3, size * 1.3);
  });

  return (
    <Rect x={0} y={0} width={size} height={size} opacity={0.55}>
      <LinearGradient
        start={start}
        end={end}
        colors={[
          "transparent",
          "rgba(255,255,255,0.0)",
          "rgba(255,255,255,0.7)",
          "rgba(255,255,255,0.0)",
          "transparent",
        ]}
        positions={[0, 0.35, 0.5, 0.65, 1]}
      />
    </Rect>
  );
}

const styles = StyleSheet.create({
  root:      { alignItems: "center" },
  textLayer: { alignItems: "center", justifyContent: "center" },
  roman: {
    color:             "#fff",
    fontStyle:         "italic",
    fontWeight:        "700",
    fontFamily:        "NotoSerifDisplay-BoldItalic",
    textShadowOffset:  { width: 0, height: 1 },
  },
  num: {
    position:       "absolute",
    alignSelf:      "center",
    color:          "rgba(255,255,255,0.7)",
    fontWeight:     "600",
    letterSpacing:  1.5,
    textTransform:  "uppercase",
  },
  pips: {
    position:      "absolute",
    alignSelf:     "center",
    flexDirection: "row",
  },
  lockLayer: { alignItems: "center", justifyContent: "center" },
  tierName:  { color: "#fff", fontFamily: "SpaceGrotesk-Bold", letterSpacing: -0.4 },
  tierSub:   { color: "rgba(255,255,255,0.55)", fontFamily: "SpaceGrotesk-Medium", marginTop: 2 },
});

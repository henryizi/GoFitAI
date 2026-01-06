import React from 'react';
import { View } from 'react-native';
import Svg, { G, Path, Ellipse } from 'react-native-svg';

type Gender = 'male' | 'female';

export type BodyFatIllustrationProps = {
  bodyFat: number; // percentage (0-50)
  gender: Gender;
  width?: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// Clean, consistent outline silhouette (torso-only). We morph with scaling + belly overlay.
const TORSO_OUTLINE_MALE =
  'M110 24 C96 24 82 30 74 42 C64 58 58 82 56 110 C54 152 62 210 76 258 C88 302 100 332 110 346 C120 332 132 302 144 258 C158 210 166 152 164 110 C162 82 156 58 146 42 C138 30 124 24 110 24 Z';

const TORSO_OUTLINE_FEMALE =
  'M110 24 C98 24 86 30 78 40 C68 52 62 74 60 102 C58 146 66 206 80 256 C92 300 102 332 110 346 C118 332 128 300 140 256 C154 206 162 146 160 102 C158 74 152 52 142 40 C134 30 122 24 110 24 Z';

export function BodyFatIllustration({ bodyFat, gender, width = 260 }: BodyFatIllustrationProps) {
  const bf = clamp(bodyFat, 0, 50);

  // 0 (lean) -> 1 (higher)
  const t = clamp((bf - 8) / 27, 0, 1);
  const definition = clamp(1 - (bf - 10) / 14, 0, 1); // fades by ~24%

  // Style: match your reference (simple outline + light shading)
  const skin = '#F3D2B4';
  const shade = '#EBC3A2';
  const outline = '#171717';
  const detail = 'rgba(23,23,23,0.55)';

  const torsoPath = gender === 'female' ? TORSO_OUTLINE_FEMALE : TORSO_OUTLINE_MALE;

  // Morph: get a slightly thicker silhouette as BF increases
  const scaleX = lerp(0.96, 1.06, t);
  const scaleY = lerp(1.0, 1.03, t);

  // Belly overlay grows with BF (soft shape)
  const bellyRx = lerp(34, 52, t);
  const bellyRy = lerp(22, 40, t);
  const bellyY = lerp(214, 226, t);

  // Chest shading fades slightly at higher BF
  const chestOpacity = lerp(0.18, 0.10, t);

  return (
    <View style={{ width, aspectRatio: 220 / 360 }}>
      <Svg width="100%" height="100%" viewBox="0 0 220 360">
        <G transform={`translate(110 170) scale(${scaleX} ${scaleY}) translate(-110 -170)`}>
          {/* Torso base */}
          <Path d={torsoPath} fill={skin} stroke={outline} strokeWidth={3} />

          {/* Light chest shading (like illustration) */}
          <Path
            d="M74 86 C90 70 104 66 110 66 C116 66 130 70 146 86 C140 106 126 112 110 112 C94 112 80 106 74 86 Z"
            fill={shade}
            opacity={chestOpacity}
          />

          {/* Belly softness overlay */}
          <Ellipse cx={110} cy={bellyY} rx={bellyRx} ry={bellyRy} fill={shade} opacity={0.14 + 0.18 * t} />

          {/* Minimal details (fade with definition) */}
          <G opacity={0.12 + 0.80 * definition} stroke={detail} strokeWidth={3} strokeLinecap="round">
            {/* pec separation */}
            <Path d="M78 118 C92 112 102 110 110 110 C118 110 128 112 142 118" fill="none" />
            {/* midline */}
            <Path d="M110 122 C110 166 110 210 110 254" fill="none" opacity={0.7} />
            {/* abs blocks */}
            <Path d="M90 152 C98 148 104 146 110 146 C116 146 122 148 130 152" fill="none" />
            <Path d="M88 176 C98 172 104 170 110 170 C116 170 122 172 132 176" fill="none" />
            <Path d="M90 200 C100 196 104 194 110 194 C116 194 120 196 130 200" fill="none" />
          </G>

          {/* Waist outline hint at higher BF */}
          <G opacity={0.10 + 0.55 * t} stroke={detail} strokeWidth={3} strokeLinecap="round">
            <Path d="M78 222 C82 240 92 254 104 262" fill="none" />
            <Path d="M142 222 C138 240 128 254 116 262" fill="none" />
          </G>
        </G>
      </Svg>
    </View>
  );
}







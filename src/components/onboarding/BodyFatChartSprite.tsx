import React, { useMemo, useState } from 'react';
import { Image, ImageSourcePropType, LayoutChangeEvent, StyleSheet, View } from 'react-native';

export type BodyFatChartSpriteProps = {
  source: ImageSourcePropType;
  /** 0..(rows*cols-1) */
  index: number;
  columns?: number; // default 3
  rows?: number; // default 2
  borderRadius?: number;
};

export function BodyFatChartSprite({
  source,
  index,
  columns = 3,
  rows = 2,
  borderRadius = 18,
}: BodyFatChartSpriteProps) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const safeIndex = useMemo(() => {
    const max = Math.max(0, columns * rows - 1);
    return Math.max(0, Math.min(max, index));
  }, [columns, rows, index]);

  const cellX = safeIndex % columns;
  const cellY = Math.floor(safeIndex / columns);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setSize({ w: width, h: height });
  };

  const imageStyle = useMemo(() => {
    if (!size) return null;
    return {
      width: size.w * columns,
      height: size.h * rows,
      transform: [{ translateX: -cellX * size.w }, { translateY: -cellY * size.h }],
    } as const;
  }, [size, columns, rows, cellX, cellY]);

  return (
    <View onLayout={onLayout} style={[styles.viewport, { borderRadius }]}>
      {size && (
        <Image
          source={source}
          style={imageStyle}
          resizeMode="stretch"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});







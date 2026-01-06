import React, { useState } from 'react';
import { Dimensions, Image, ImageSourcePropType, LayoutChangeEvent, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type BodyFatGridProps = {
  source: ImageSourcePropType;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  options: Array<{ value: number; label: string }>;
  columns?: number; // default 3
  rows?: number; // default 2
  spriteIndexMap?: number[]; // Optional mapping for sprite indices (e.g., for female chart skipping duplicates)
  gender?: 'male' | 'female'; // For gender-specific adjustments
};

export function BodyFatGrid({
  source,
  selectedIndex,
  onSelect,
  options,
  columns = 3,
  rows = 2,
  spriteIndexMap,
  gender,
}: BodyFatGridProps) {
  // Calculate cell width: (screen width - container padding - margins) / columns
  // Reduced padding and margins to make photos bigger
  const containerPadding = 24; // 12px each side (reduced from 40)
  const cellMargin = 8; // 4px each side (reduced from 12)
  const totalMargins = cellMargin * (columns + 1); // margins between and around cells
  const cellWidth = (SCREEN_WIDTH - containerPadding - totalMargins) / columns;
  // Image is 1536x1024, so each tile is 512x512 (square), but we'll use calculated width
  // Aspect ratio: 1536/1024 = 1.5 (width/height), so each cell: 512/512 = 1.0 (square)
  // But the actual image cells might be slightly different, so use a calculated ratio
  const cellAspectRatio = 1.0; // Each tile in the sprite sheet is roughly square
  const cellHeight = cellWidth / cellAspectRatio;

  return (
    <View style={styles.grid}>
      {options.map((option, index) => {
        // Use sprite index mapping if provided (for female chart skipping duplicates)
        const spriteIndex = spriteIndexMap ? spriteIndexMap[index] ?? index : index;
        const cellX = spriteIndex % columns;
        const cellY = Math.floor(spriteIndex / columns);
        const isSelected = selectedIndex === index;

        return (
          <CellWithSprite
            key={index}
            source={source}
            cellWidth={cellWidth}
            cellHeight={cellHeight}
            cellX={cellX}
            cellY={cellY}
            columns={columns}
            rows={rows}
            isSelected={isSelected}
            onPress={() => onSelect(index)}
            optionValue={option.value}
            gender={gender}
          />
        );
      })}
    </View>
  );
}

function CellWithSprite({
  source,
  cellWidth,
  cellHeight,
  cellX,
  cellY,
  columns,
  rows,
  isSelected,
  onPress,
  optionValue,
  gender,
}: {
  source: ImageSourcePropType;
  cellWidth: number;
  cellHeight: number;
  cellX: number;
  cellY: number;
  columns: number;
  rows: number;
  isSelected: boolean;
  onPress: () => void;
  optionValue: number;
  gender?: 'male' | 'female';
}) {
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setContainerSize({ width, height });
    }
  };

  // Calculate exact sprite dimensions based on actual container size
  // Each cell should be exactly 1/columns width and 1/rows height of the full sprite sheet
  const actualCellWidth = containerSize?.width ?? cellWidth;
  const actualCellHeight = containerSize?.height ?? cellHeight;
  
  // Full sprite sheet dimensions (must match exactly - no scaling issues)
  // The sprite sheet image will be sized to exactly match these dimensions
  const spriteWidth = actualCellWidth * columns;
  const spriteHeight = actualCellHeight * rows;
  
  // Calculate precise pixel offsets to show ONLY the correct cell
  // We move the sprite sheet left/up to position the desired cell in view
  // Negative values move the image left (for X) and up (for Y)
  let translateX = -cellX * actualCellWidth;
  const translateY = -cellY * actualCellHeight;
  
  // Special adjustments for male chart: move 10% and 25% slightly to the right
  if (gender === 'male') {
    if (optionValue === 10) {
      translateX += actualCellWidth * 0.02; // Move 2% of cell width to the right (tiny adjustment)
    } else if (optionValue === 25) {
      translateX += actualCellWidth * 0.02; // Move 2% of cell width to the right (tiny adjustment)
    }
  }

  return (
    <TouchableOpacity
      style={[
        styles.cell,
        { width: cellWidth, height: cellHeight },
        isSelected && styles.cellSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer} onLayout={onLayout}>
        {containerSize && (
          <Image
            source={source}
            style={[
              styles.spriteImage,
              {
                width: spriteWidth,
                height: spriteHeight,
                transform: [
                  { translateX },
                  { translateY },
                ],
              },
            ]}
            resizeMode="stretch"
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    marginHorizontal: -4,
  },
  cell: {
    marginHorizontal: 4,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cellSelected: {
    borderColor: '#FF6B35',
    borderWidth: 3,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  spriteImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});






/**
 * Utility functions for unit conversions and display formatting
 */

export type HeightUnit = 'cm' | 'ft';
export type WeightUnit = 'kg' | 'lbs';

// Height conversions
export const cmToFeet = (cm: number): number => {
  return Math.round(cm * 0.0328084 * 10) / 10;
};

export const feetToCm = (feet: number): number => {
  return Math.round(feet * 30.48);
};

// Convert cm to feet and inches (e.g., 185cm -> {feet: 6, inches: 1})
export const cmToFeetInches = (cm: number): {feet: number, inches: number} => {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
};

// Convert feet and inches to cm (e.g., 6'1" -> 185cm)
export const feetInchesToCm = (feet: number, inches: number): number => {
  return Math.round((feet * 12 + inches) * 2.54);
};

// Format height as feet'inches (e.g., "6'1\"")
export const formatFeetInches = (feet: number, inches: number): string => {
  return `${feet}'${inches}"`;
};

// Weight conversions
export const kgToLbs = (kg: number): number => {
  return Math.round(kg * 2.20462 * 10) / 10;
};

export const lbsToKg = (lbs: number): number => {
  return Math.round(lbs / 2.20462 * 10) / 10;
};

// Display formatting functions
export const formatHeight = (heightCm: number, preferredUnit: HeightUnit | null = null): string => {
  if (!heightCm) return '0';
  
  if (preferredUnit === 'ft') {
    const { feet, inches } = cmToFeetInches(heightCm);
    return formatFeetInches(feet, inches);
  }
  
  return heightCm.toString();
};

export const formatWeight = (weightKg: number, preferredUnit: WeightUnit | null = null): string => {
  if (!weightKg) return '0.0';
  
  if (preferredUnit === 'lbs') {
    const lbs = kgToLbs(weightKg);
    return lbs.toString();
  }
  
  return weightKg.toString();
};

export const getHeightDisplayUnit = (preferredUnit: HeightUnit | null = null): string => {
  return preferredUnit === 'ft' ? '' : 'cm'; // No unit suffix for feet since it's already in the value (6'1")
};

export const getWeightDisplayUnit = (preferredUnit: WeightUnit | null = null): string => {
  return preferredUnit === 'lbs' ? 'lbs' : 'kg';
};

// Combined display functions with unit
export const formatHeightWithUnit = (heightCm: number, preferredUnit: HeightUnit | null = null): string => {
  const value = formatHeight(heightCm, preferredUnit);
  const unit = getHeightDisplayUnit(preferredUnit);
  return unit ? `${value} ${unit}` : value; // No space if no unit (for feet'inches format)
};

export const formatWeightWithUnit = (weightKg: number, preferredUnit: WeightUnit | null = null): string => {
  const value = formatWeight(weightKg, preferredUnit);
  const unit = getWeightDisplayUnit(preferredUnit);
  return `${value} ${unit}`;
};

// Helper functions for storing and retrieving original values
export interface OriginalHeightValue {
  value: number;
  unit: HeightUnit;
  feet?: number;
  inches?: number;
}

export interface OriginalWeightValue {
  value: number;
  unit: WeightUnit;
}

// Convert height input to standardized cm and store original
export const processHeightInput = (
  value: number, 
  unit: HeightUnit, 
  feet?: number, 
  inches?: number
): { heightCm: number; originalValue: OriginalHeightValue } => {
  let heightCm: number;
  let originalValue: OriginalHeightValue;

  if (unit === 'ft') {
    // If feet and inches are provided separately, use them
    if (feet !== undefined && inches !== undefined) {
      heightCm = feetInchesToCm(feet, inches);
      originalValue = { value, unit, feet, inches };
    } else {
      // Otherwise, treat value as total feet (decimal)
      heightCm = feetToCm(value);
      originalValue = { value, unit };
    }
  } else {
    // cm input
    heightCm = Math.round(value);
    originalValue = { value, unit };
  }

  return { heightCm, originalValue };
};

// Convert weight input to standardized kg and store original
export const processWeightInput = (
  value: number, 
  unit: WeightUnit
): { weightKg: number; originalValue: OriginalWeightValue } => {
  let weightKg: number;

  if (unit === 'lbs') {
    weightKg = lbsToKg(value);
  } else {
    weightKg = Math.round(value * 10) / 10; // Round to 1 decimal place
  }

  const originalValue: OriginalWeightValue = { value, unit };

  return { weightKg, originalValue };
};

// Parse stored original value JSON strings
export const parseOriginalHeightValue = (jsonString: string | null): OriginalHeightValue | null => {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString) as OriginalHeightValue;
  } catch {
    return null;
  }
};

export const parseOriginalWeightValue = (jsonString: string | null): OriginalWeightValue | null => {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString) as OriginalWeightValue;
  } catch {
    return null;
  }
};

// Convert original values back to display format
export const formatOriginalHeight = (original: OriginalHeightValue): string => {
  if (original.unit === 'ft') {
    if (original.feet !== undefined && original.inches !== undefined) {
      return formatFeetInches(original.feet, original.inches);
    } else {
      return `${original.value} ft`;
    }
  } else {
    return `${original.value} cm`;
  }
};

export const formatOriginalWeight = (original: OriginalWeightValue): string => {
  return `${original.value} ${original.unit}`;
};

// Display formatting functions that take original values
export const formatHeightDisplay = (original: OriginalHeightValue): string => {
  return formatOriginalHeight(original);
};

export const formatWeightDisplay = (original: OriginalWeightValue): string => {
  return formatOriginalWeight(original);
};

/**
 * Utility functions to infer muscle groups from exercise names
 */

/**
 * Normalizes a muscle group name to a standard category
 */
export function normalizeMuscleGroup(mg: string): string {
  const normalized = mg.toLowerCase().trim();
  
  if (normalized.includes('chest') || normalized.includes('pectoral') || normalized.includes('pec')) {
    return 'chest';
  }
  if (normalized.includes('back') || normalized.includes('lat') || normalized.includes('rhomboid') || normalized.includes('trap')) {
    return 'back';
  }
  if (normalized.includes('leg') || normalized.includes('quad') || normalized.includes('hamstring') || normalized.includes('glute') || normalized.includes('calf')) {
    return 'legs';
  }
  if (normalized.includes('shoulder') || normalized.includes('delt')) {
    return 'shoulders';
  }
  if (normalized.includes('arm') || normalized.includes('bicep') || normalized.includes('tricep') || normalized.includes('forearm')) {
    return 'arms';
  }
  if (normalized.includes('core') || normalized.includes('abs') || normalized.includes('abdominal') || normalized.includes('oblique')) {
    return 'core';
  }
  
  return '';
}

/**
 * Infers muscle groups from an exercise name
 * Returns an array of standard muscle group names
 */
export function inferMuscleGroupsFromName(exerciseName: string): string[] {
  if (!exerciseName) return [];
  
  const nameLower = exerciseName.toLowerCase();
  const muscleGroups: string[] = [];
  
  // Chest
  if (nameLower.includes('chest') || 
      nameLower.includes('bench') || 
      (nameLower.includes('press') && !nameLower.includes('shoulder') && !nameLower.includes('overhead')) ||
      nameLower.includes('fly') ||
      nameLower.includes('pec') ||
      nameLower.includes('pectoral')) {
    muscleGroups.push('chest');
  }
  
  // Back
  if (nameLower.includes('back') || 
      nameLower.includes('row') || 
      nameLower.includes('pull') || 
      nameLower.includes('lat') || 
      nameLower.includes('deadlift') ||
      nameLower.includes('rhomboid') ||
      nameLower.includes('trap')) {
    muscleGroups.push('back');
  }
  
  // Legs
  if (nameLower.includes('leg') || 
      nameLower.includes('squat') || 
      nameLower.includes('lunge') || 
      nameLower.includes('calf') ||
      nameLower.includes('quad') ||
      nameLower.includes('hamstring') ||
      nameLower.includes('glute') ||
      nameLower.includes('thigh')) {
    muscleGroups.push('legs');
  }
  
  // Shoulders
  if (nameLower.includes('shoulder') || 
      nameLower.includes('delt') || 
      (nameLower.includes('press') && (nameLower.includes('overhead') || nameLower.includes('shoulder'))) ||
      nameLower.includes('lateral raise') ||
      nameLower.includes('rear delt') ||
      nameLower.includes('front raise')) {
    muscleGroups.push('shoulders');
  }
  
  // Arms
  if (nameLower.includes('arm') || 
      nameLower.includes('bicep') || 
      nameLower.includes('tricep') || 
      nameLower.includes('curl') ||
      nameLower.includes('forearm')) {
    muscleGroups.push('arms');
  }
  
  // Core
  if (nameLower.includes('core') || 
      nameLower.includes('abs') || 
      nameLower.includes('abdominal') || 
      nameLower.includes('crunch') ||
      nameLower.includes('plank') ||
      nameLower.includes('sit-up') ||
      nameLower.includes('oblique')) {
    muscleGroups.push('core');
  }
  
  // Remove duplicates and return
  return Array.from(new Set(muscleGroups));
}

/**
 * Gets default muscle groups based on exercise category
 */
export function getDefaultMuscleGroupsByCategory(category: string): string[] {
  switch (category?.toLowerCase()) {
    case 'compound':
      return ['full body'];
    case 'isolation':
      return ['arms'];
    case 'accessory':
      return ['core'];
    default:
      return ['full body'];
  }
}








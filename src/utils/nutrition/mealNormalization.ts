type MacroSource = Record<string, any> | undefined | null;

const extractNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const match = value.match(/-?\d+(\.\d+)?/);
    if (!match) return 0;
    const parsed = parseFloat(match[0]);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const pickValue = (sources: MacroSource[], keys: string[]): number => {
  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      if (source[key] !== undefined && source[key] !== null) {
        const numeric = extractNumber(source[key]);
        if (numeric !== 0) {
          return numeric;
        }
      }
    }
  }
  return 0;
};

export const normalizeMealMacros = (meal: any) => {
  if (!meal || typeof meal !== 'object') {
    return meal;
  }

  const macroSources: MacroSource[] = [
    meal.macros,
    meal.nutrition,
    meal.macronutrients,
    meal.totals,
    meal,
  ];

  const normalizedMacros = {
    calories: pickValue(macroSources, [
      'calories',
      'calories_per_serving',
      'caloriesPerServing',
      'energy',
      'total_calories',
      'totalCalories',
    ]),
    protein_grams: pickValue(macroSources, [
      'protein_grams',
      'proteinGrams',
      'protein',
      'protein_g',
      'proteinPerServing',
      'protein_per_serving',
      'proteins',
    ]),
    carbs_grams: pickValue(macroSources, [
      'carbs_grams',
      'carbsGrams',
      'carbs',
      'carbs_g',
      'carbohydrates',
      'carbohydrates_grams',
      'carbsPerServing',
      'carbs_per_serving',
    ]),
    fat_grams: pickValue(macroSources, [
      'fat_grams',
      'fatGrams',
      'fat',
      'fat_g',
      'fats',
      'fatPerServing',
      'fat_per_serving',
    ]),
  };

  return {
    ...meal,
    macros: normalizedMacros,
  };
};

export const normalizeMealPlan = (meals: any[] = []) =>
  Array.isArray(meals) ? meals.map(normalizeMealMacros) : [];



























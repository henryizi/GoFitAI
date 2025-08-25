// @/src/services/nutrition/foodImageMap.ts

import { ImageSourcePropType } from 'react-native';

const foodImageMap: Record<string, ImageSourcePropType> = {
  // --- PROTEINS ---
  'chicken-breast': require('../../../assets/images/chicken_breast.png'),
  eggs: require('../../../assets/images/eggs.png'),
  'greek-yogurt': require('../../../assets/images/greek-yogurt.png'),
  salmon: require('../../../assets/images/salmon.png'),
  tuna: require('../../../assets/images/tuna.png'),
  tofu: require('../../../assets/images/tofu.png'),
  'lean-beef': require('../../../assets/images/lean-beef.png'),
  shrimp: require('../../../assets/images/shrimp.png'),
  'cottage-cheese': require('../../../assets/images/cottage-cheese.png'),

  // --- CARBOHYDRATES ---
  'brown-rice': require('../../../assets/images/brown_rice.png'),
  'sweet-potato': require('../../../assets/images/sweet_potato.png'),
  quinoa: require('../../../assets/images/quinoa.png'),
  oats: require('../../../assets/images/oats.png'),
  chickpeas: require('../../../assets/images/chickpeas.png'),
  lentils: require('../../../assets/images/lentils.png'),
  potatoes: require('../../../assets/images/potatoes.png'),
  banana: require('../../../assets/images/banana.png'),
  apple: require('../../../assets/images/apple.png'),

  // --- FATS ---
  avocado: require('../../../assets/images/avocado.png'),
  almonds: require('../../../assets/images/almonds.png'),
  walnuts: require('../../../assets/images/walnuts.png'),
  'olive-oil': require('../../../assets/images/olive_oil.png'),
  'flaxseeds-oil': require('../../../assets/images/flaxseeds-oil.png'),
  'chia-seeds': require('../../../assets/images/chia-seeds.png'),
  'peanut-butter': require('../../../assets/images/peanut-butter.png'),
  cashews: require('../../../assets/images/cashews.png'),
  'dark-chocolate': require('../../../assets/images/dark-chocolate.png'),
};

const placeholder = require('../../../assets/images/placeholder.gif');

export const getFoodImage = (foodName: string): ImageSourcePropType => {
  if (!foodName) return placeholder;
  const key = foodName.toLowerCase().replace(/ /g, '-');
  return foodImageMap[key] || placeholder;
}; 
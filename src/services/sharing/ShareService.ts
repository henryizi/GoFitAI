import { Share, Alert, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';

interface Recipe {
  id: string;
  recipe_name: string;
  meal_type?: string;
  prep_time?: number;
  cook_time?: number;
  servings?: number;
  ingredients: Array<{
    name: string;
    quantity: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  }>;
  instructions: Array<string | {
    step: number;
    title: string;
    details: string[];
  }>;
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
  };
  macros?: {
    calories: number;
    protein_grams: number;
    carbs_grams: number;
    fat_grams: number;
  };
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  tips?: string[];
  tags?: string[];
  savedAt?: string;
}

export class ShareService {
  /**
   * Format recipe as readable text for sharing
   */
  static formatRecipeForSharing(recipe: Recipe): string {
    const title = `🍽️ ${recipe.recipe_name}`;
    const mealType = recipe.meal_type ? `\n📅 Meal Type: ${recipe.meal_type}` : '';
    
    // Timing info
    const timingInfo = [];
    if (recipe.prep_time) timingInfo.push(`⏱️ Prep: ${recipe.prep_time}min`);
    if (recipe.cook_time) timingInfo.push(`🔥 Cook: ${recipe.cook_time}min`);
    if (recipe.servings) timingInfo.push(`👥 Serves: ${recipe.servings}`);
    const timing = timingInfo.length > 0 ? `\n${timingInfo.join(' | ')}` : '';

    // Nutritional info
    const nutrition = recipe.nutrition || recipe.macros;
    const calories = nutrition?.calories || recipe.calories;
    const protein = (nutrition as any)?.protein_grams || (nutrition as any)?.protein || recipe.protein;
    const carbs = (nutrition as any)?.carbs_grams || (nutrition as any)?.carbs || recipe.carbs;
    const fat = (nutrition as any)?.fat_grams || (nutrition as any)?.fat || recipe.fat;

    const macros = calories ? 
      `\n📊 Nutrition (per serving): ${calories} cal | ${protein}g protein | ${carbs}g carbs | ${fat}g fat` : '';

    // Ingredients
    const ingredientsList = recipe.ingredients?.length > 0 
      ? `\n\n🛒 INGREDIENTS:\n${recipe.ingredients.map(ing => 
          `• ${ing.quantity} ${ing.name}`
        ).join('\n')}`
      : '';

    // Instructions
    const instructionsList = recipe.instructions?.length > 0
      ? `\n\n👨‍🍳 INSTRUCTIONS:\n${recipe.instructions.map((instruction, index) => {
          if (typeof instruction === 'string') {
            return `${index + 1}. ${instruction}`;
          } else if (instruction.step && instruction.title) {
            const details = instruction.details?.join('\n   - ') || '';
            return `${instruction.step}. ${instruction.title}${details ? `\n   - ${details}` : ''}`;
          }
          return '';
        }).filter(Boolean).join('\n\n')}`
      : '';

    // Tips
    const tips = recipe.tips?.length > 0 
      ? `\n\n💡 TIPS:\n${recipe.tips.map(tip => `• ${tip}`).join('\n')}`
      : '';

    // Footer
    const footer = '\n\n🤖 Generated with GoFitAI - Your AI Fitness & Nutrition Coach';

    return `${title}${mealType}${timing}${macros}${ingredientsList}${instructionsList}${tips}${footer}`;
  }

  /**
   * Share recipe using native share dialog
   */
  static async shareRecipe(recipe: Recipe): Promise<boolean> {
    try {
      const shareContent = this.formatRecipeForSharing(recipe);
      
      const result = await Share.share({
        message: shareContent,
        title: `Recipe: ${recipe.recipe_name}`,
      });

      if (result.action === Share.sharedAction) {
        console.log('Recipe shared successfully');
        return true;
      } else if (result.action === Share.dismissedAction) {
        console.log('Share dialog dismissed');
        return false;
      }
    } catch (error) {
      console.error('Error sharing recipe:', error);
      Alert.alert('Error', 'Failed to share recipe. Please try again.');
      return false;
    }
    return false;
  }

  /**
   * Copy recipe to clipboard
   */
  static async copyRecipeToClipboard(recipe: Recipe): Promise<boolean> {
    try {
      const shareContent = this.formatRecipeForSharing(recipe);
      
      // Check if Clipboard is available
      if (Clipboard && Clipboard.setStringAsync) {
        await Clipboard.setStringAsync(shareContent);
        Alert.alert('Copied!', 'Recipe copied to clipboard');
        return true;
      } else {
        // Fallback to native share if clipboard not available
        console.warn('Clipboard not available, falling back to native share');
        return await this.shareRecipe(recipe);
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy recipe to clipboard. Try sharing instead.');
      return false;
    }
  }

  /**
   * Share recipe via WhatsApp
   */
  static async shareViaWhatsApp(recipe: Recipe): Promise<boolean> {
    try {
      const shareContent = this.formatRecipeForSharing(recipe);
      const encodedText = encodeURIComponent(shareContent);
      const whatsappUrl = `whatsapp://send?text=${encodedText}`;
      
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        return true;
      } else {
        Alert.alert('WhatsApp Not Found', 'WhatsApp is not installed on this device');
        return false;
      }
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      Alert.alert('Error', 'Failed to share via WhatsApp');
      return false;
    }
  }

  /**
   * Share recipe via email
   */
  static async shareViaEmail(recipe: Recipe): Promise<boolean> {
    try {
      const shareContent = this.formatRecipeForSharing(recipe);
      const subject = encodeURIComponent(`Recipe: ${recipe.recipe_name}`);
      const body = encodeURIComponent(shareContent);
      const emailUrl = `mailto:?subject=${subject}&body=${body}`;
      
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);
        return true;
      } else {
        Alert.alert('Email Not Available', 'No email app found on this device');
        return false;
      }
    } catch (error) {
      console.error('Error sharing via email:', error);
      Alert.alert('Error', 'Failed to share via email');
      return false;
    }
  }

  /**
   * Share recipe via SMS/Messages
   */
  static async shareViaSMS(recipe: Recipe): Promise<boolean> {
    try {
      const shareContent = this.formatRecipeForSharing(recipe);
      const encodedText = encodeURIComponent(shareContent);
      const smsUrl = `sms:?body=${encodedText}`;
      
      const canOpen = await Linking.canOpenURL(smsUrl);
      if (canOpen) {
        await Linking.openURL(smsUrl);
        return true;
      } else {
        Alert.alert('SMS Not Available', 'SMS is not available on this device');
        return false;
      }
    } catch (error) {
      console.error('Error sharing via SMS:', error);
      Alert.alert('Error', 'Failed to share via SMS');
      return false;
    }
  }

  /**
   * Show share options menu
   */
  static showShareOptions(recipe: Recipe): void {
    Alert.alert(
      'Share Recipe',
      `Share "${recipe.recipe_name}" with others`,
      [
        {
          text: 'Share',
          onPress: () => this.shareRecipe(recipe),
        },
        {
          text: 'Copy to Clipboard',
          onPress: () => this.copyRecipeToClipboard(recipe),
        },
        {
          text: 'WhatsApp',
          onPress: () => this.shareViaWhatsApp(recipe),
        },
        {
          text: 'Email',
          onPress: () => this.shareViaEmail(recipe),
        },
        {
          text: 'SMS',
          onPress: () => this.shareViaSMS(recipe),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  }

  /**
   * Generate shareable recipe URL (for future web integration)
   */
  static generateShareableURL(recipe: Recipe): string {
    // This would be used when you have a web version
    const baseUrl = 'https://gofitai.com/recipe';
    const encodedName = encodeURIComponent(recipe.recipe_name.toLowerCase().replace(/\s+/g, '-'));
    return `${baseUrl}/${recipe.id}/${encodedName}`;
  }

  /**
   * Create a recipe summary for quick sharing
   */
  static createRecipeSummary(recipe: Recipe): string {
    const nutrition = recipe.nutrition || recipe.macros;
    const calories = nutrition?.calories || recipe.calories;
    const protein = (nutrition as any)?.protein_grams || (nutrition as any)?.protein || recipe.protein;
    
    const summary = `🍽️ ${recipe.recipe_name}`;
    const macroInfo = calories ? ` - ${calories} cal, ${protein}g protein` : '';
    const footer = ' 🤖 Made with GoFitAI';
    
    return `${summary}${macroInfo}${footer}`;
  }

  /**
   * Share recipe summary (shorter version for social media)
   */
  static async shareRecipeSummary(recipe: Recipe): Promise<boolean> {
    try {
      const summary = this.createRecipeSummary(recipe);
      
      const result = await Share.share({
        message: summary,
        title: recipe.recipe_name,
      });

      return result.action === Share.sharedAction;
    } catch (error) {
      console.error('Error sharing recipe summary:', error);
      Alert.alert('Error', 'Failed to share recipe summary');
      return false;
    }
  }
}

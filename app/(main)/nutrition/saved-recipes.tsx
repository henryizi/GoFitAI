import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  FlatList,
  Image,
  Modal
} from 'react-native';
import {
  Text,
  IconButton,
  Card,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NutritionService } from '../../../src/services/nutrition/NutritionService';
import { ShareService } from '../../../src/services/sharing/ShareService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Modern, premium colors
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  accent: '#FF8F65',
  secondary: '#FF8F65',
  background: '#121212',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF453A',
  card: 'rgba(28, 28, 30, 0.8)',
  border: 'rgba(84, 84, 88, 0.6)',
  white: '#FFFFFF',
  dark: '#121212',
  darkGray: '#1C1C1E',
  mediumGray: '#8E8E93',
};

const SavedRecipesScreen = () => {
  const insets = useSafeAreaInsets();
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

  useEffect(() => {
    loadSavedRecipes();
  }, []);

  const loadSavedRecipes = () => {
    try {
      setLoading(true);
      const recipes = NutritionService.getSavedRecipes();
      setSavedRecipes(recipes);
    } catch (error) {
      console.error('Failed to load saved recipes:', error);
      Alert.alert('Error', 'Failed to load saved recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipe = (recipeId: string) => {
    Alert.alert(
      'Delete Recipe',
      'Are you sure you want to delete this recipe?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            const success = NutritionService.deleteSavedRecipe(recipeId);
            if (success) {
              loadSavedRecipes();
              if (selectedRecipe?.id === recipeId) {
                setSelectedRecipe(null);
              }
            } else {
              Alert.alert('Error', 'Failed to delete recipe');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'Unknown date';
    }
  };

  const renderRecipeItem = ({ item }) => (
    <TouchableOpacity onPress={() => setSelectedRecipe(item)}>
      <Card style={styles.recipeCard}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.recipeName} numberOfLines={3} ellipsizeMode="tail">{item.recipe_name}</Text>
            <View style={styles.cardActions}>
              <IconButton 
                icon="share-variant" 
                iconColor={colors.primary}
                size={20}
                onPress={() => ShareService.showShareOptions(item)}
              />
              <IconButton 
                icon="delete-outline" 
                iconColor={colors.error}
                size={20}
                onPress={() => handleDeleteRecipe(item.id)}
              />
            </View>
          </View>
          <Text style={styles.savedDate}>Saved on {formatDate(item.savedAt)}</Text>
          
          <View style={styles.macrosContainer}>
            <View style={styles.macroItem}>
              <Icon name="fire" size={14} color={colors.primary} />
              <Text style={styles.macroText}>{item.calories || '?'} cal</Text>
            </View>
            <View style={styles.macroItem}>
              <Icon name="food-drumstick" size={14} color={colors.accent} />
              <Text style={styles.macroText}>{item.protein || '?'}g protein</Text>
            </View>
            <View style={styles.macroItem}>
              <Icon name="bread-slice" size={14} color={colors.secondary} />
              <Text style={styles.macroText}>{item.carbs || '?'}g carbs</Text>
            </View>
            <View style={styles.macroItem}>
              <Icon name="oil" size={14} color={colors.mediumGray} />
              <Text style={styles.macroText}>{item.fat || '?'}g fat</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton 
          icon="arrow-left" 
          iconColor={colors.text} 
          onPress={() => router.back()} 
        />
        <Text style={styles.headerTitle}>Saved Recipes</Text>
        <IconButton 
          icon="refresh" 
          iconColor={colors.text}
          onPress={loadSavedRecipes}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading saved recipes...</Text>
        </View>
      ) : selectedRecipe ? (
        <Modal
          visible={!!selectedRecipe}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedRecipe(null)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} numberOfLines={3} ellipsizeMode="tail">{selectedRecipe.recipe_name}</Text>
                <View style={styles.modalHeaderActions}>
                  <IconButton 
                    icon="share-variant" 
                    iconColor={colors.primary} 
                    size={24} 
                    onPress={() => ShareService.showShareOptions(selectedRecipe)} 
                  />
                  <IconButton 
                    icon="close" 
                    iconColor={colors.text} 
                    size={24} 
                    onPress={() => setSelectedRecipe(null)} 
                  />
                </View>
              </View>
              
              <ScrollView style={styles.modalScrollContent}>
                {/* Ingredients */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Ingredients</Text>
                  {Array.isArray(selectedRecipe.ingredients) && selectedRecipe.ingredients.map((ing: any, idx: number) => (
                    <View key={idx} style={styles.ingredientRow}>
                      <Icon name="circle-small" size={16} color={colors.primary} />
                      <Text style={styles.ingredientName}>
                        {ing.name}
                        {ing.macro_info ? <Text style={styles.macroInfo}> ({ing.macro_info})</Text> : null}
                      </Text>
                      <Text style={styles.ingredientQuantity}>
                        {ing.quantity_display || ing.quantity || '1 serving'}
                      </Text>
                    </View>
                  ))}
                </View>
                
                {/* Nutritional Info */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Nutritional Info</Text>
                  <View style={styles.macrosGrid}>
                    <View style={styles.macroItemBox}>
                      <Text style={styles.macroLabel}>Calories</Text>
                      <Text style={styles.macroValue}>{selectedRecipe.macros?.calories || selectedRecipe.calories || 'N/A'}</Text>
                    </View>
                    <View style={styles.macroItemBox}>
                      <Text style={styles.macroLabel}>Protein</Text>
                      <Text style={styles.macroValue}>{selectedRecipe.macros?.protein_grams || selectedRecipe.protein || 'N/A'}g</Text>
                    </View>
                    <View style={styles.macroItemBox}>
                      <Text style={styles.macroLabel}>Carbs</Text>
                      <Text style={styles.macroValue}>{selectedRecipe.macros?.carbs_grams || selectedRecipe.carbs || 'N/A'}g</Text>
                    </View>
                    <View style={styles.macroItemBox}>
                      <Text style={styles.macroLabel}>Fat</Text>
                      <Text style={styles.macroValue}>{selectedRecipe.macros?.fat_grams || selectedRecipe.fat || 'N/A'}g</Text>
                    </View>
                  </View>
                </View>
                
                {/* Instructions */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Instructions</Text>
                  {Array.isArray(selectedRecipe.instructions) && selectedRecipe.instructions.map((instruction: any, index: number) => {
                    // Handle both old format (string array) and new format (object array with step, title, details)
                    if (typeof instruction === 'string') {
                      // Old format - simple string array
                      return (
                        <View key={index} style={styles.stepContainer}>
                          <View style={styles.stepNumberContainer}>
                            <Text style={styles.stepNumber}>{index + 1}</Text>
                          </View>
                          <Text style={styles.stepText}>{instruction}</Text>
                        </View>
                      );
                    } else if (instruction.step && instruction.title && Array.isArray(instruction.details)) {
                      // New format - object with step, title, and details array
                      return (
                        <View key={index} style={styles.stepContainerNew}>
                          <View style={styles.stepHeader}>
                            <View style={styles.stepNumberContainer}>
                              <Text style={styles.stepNumber}>{instruction.step}</Text>
                            </View>
                            <Text style={styles.stepTitle}>{instruction.title}</Text>
                          </View>
                          <View style={styles.stepDetails}>
                            {instruction.details.map((detail: string, detailIndex: number) => (
                              <View key={detailIndex} style={styles.stepDetailRow}>
                                <Icon name="minus" size={16} color={colors.primary} style={styles.detailBullet} />
                                <Text style={styles.stepDetailText}>{detail}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    }
                    return null;
                  })}
                </View>
                
                {/* Action buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={styles.shareButton} 
                    onPress={() => ShareService.shareRecipe(selectedRecipe)}
                  >
                    <Icon name="share-variant" size={16} color={colors.white} style={{ marginRight: 8 }} />
                    <Text style={styles.shareButtonText}>Share Recipe</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.copyButton} 
                    onPress={() => ShareService.copyRecipeToClipboard(selectedRecipe)}
                  >
                    <Icon name="content-copy" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.copyButtonText}>Copy to Clipboard</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={styles.deleteButton} 
                  onPress={() => {
                    Alert.alert(
                      'Delete Recipe',
                      'Are you sure you want to delete this recipe?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Delete', 
                          style: 'destructive',
                          onPress: () => {
                            const deleted = NutritionService.deleteSavedRecipe(selectedRecipe.id);
                            if (deleted) {
                              setSelectedRecipe(null);
                              loadSavedRecipes();
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Icon name="delete" size={16} color={colors.error} style={{ marginRight: 8 }} />
                  <Text style={styles.deleteButtonText}>Delete Recipe</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : savedRecipes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="food-off" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Saved Recipes</Text>
          <Text style={styles.emptyText}>
            Your saved recipes will appear here. Generate a recipe and tap the save icon to add it to your collection.
          </Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => router.push('/(main)/nutrition/recipe-generator-simple')}
          >
            <Text style={styles.createButtonText}>Generate New Recipe</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={savedRecipes}
          renderItem={renderRecipeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    marginTop: 16,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  recipeCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    lineHeight: 24,
    minHeight: 48, // 确保至少有两行空间用于长食谱名称
  },
  savedDate: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  macrosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  macroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  macroText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  createButtonText: {
    color: colors.text,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalScrollContent: {
    padding: 16,
  },
  modalSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  macrosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  macroItemBox: {
    width: '48%',
    marginBottom: 12,
  },
  macroLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  macroValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ingredientName: {
    color: colors.text,
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  ingredientQuantity: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '400',
    minWidth: 60,
    textAlign: 'right',
  },
  macroInfo: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumber: {
    color: colors.text,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  noInstructionsText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  stepContainerNew: {
    marginBottom: 20,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  stepDetails: {
    marginLeft: 40,
  },
  stepDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailBullet: {
    marginRight: 8,
    marginTop: 2,
  },
  stepDetailText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 16,
    gap: 12,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
  },
  shareButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  copyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
  },
  copyButtonText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginTop: 8,
  },
  deleteButtonText: {
    color: colors.text,
    fontWeight: 'bold',
  },
});

export default SavedRecipesScreen; 
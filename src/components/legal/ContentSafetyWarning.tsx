import React from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReportContentButton from '../safety/ReportContentButton';

interface ContentSafetyWarningProps {
  onProceed: () => void;
  onCancel: () => void;
  variant?: 'sharing' | 'general';
}

export default function ContentSafetyWarning({ 
  onProceed, 
  onCancel, 
  variant = 'sharing' 
}: ContentSafetyWarningProps) {
  // Using hardcoded colors to ensure visibility
  const colors = {
    primary: '#007AFF',
    error: '#DC2626',
    warning: '#F59E0B',
    surface: '#FFFFFF',
    onSurface: '#1F2937',
    onSurfaceVariant: '#6B7280',
    errorContainer: '#FEF2F2',
    onErrorContainer: '#991B1B',
  };

  const styles = StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: 20,
    },
    container: {
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      maxWidth: 400,
      width: '90%',
      minHeight: 500, // Ensure minimum height
      maxHeight: '85%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 12,
      overflow: 'hidden',
      // Ensure container is visible
      borderWidth: 2,
      borderColor: '#E5E7EB',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 24,
      flexGrow: 1,
      minHeight: 400, // Ensure content takes up space
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
    },
    warningIcon: {
      marginRight: 12,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: '#DC2626',
      flex: 1,
    },
    warningContainer: {
      backgroundColor: '#FEF2F2',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderLeftWidth: 4,
      borderLeftColor: '#DC2626',
    },
    warningText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#DC2626',
      marginBottom: 8,
      textAlign: 'center',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1F2937',
      marginTop: 20,
      marginBottom: 12,
    },
    bulletPoint: {
      fontSize: 15,
      lineHeight: 22,
      color: '#4B5563',
      marginLeft: 16,
      marginBottom: 8,
    },
    guidelinesContainer: {
      backgroundColor: '#F9FAFB',
      borderRadius: 8,
      padding: 12,
      marginVertical: 12,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    guidelinesTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: '#1F2937',
      marginBottom: 8,
      textAlign: 'center',
    },
    guideline: {
      fontSize: 13,
      lineHeight: 18,
      color: '#6B7280',
      marginLeft: 12,
      marginBottom: 4,
    },
    consequencesContainer: {
      backgroundColor: '#FFF3E0',
      borderRadius: 8,
      padding: 12,
      marginVertical: 12,
      borderLeftWidth: 3,
      borderLeftColor: '#F59E0B',
    },
    consequencesTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: '#F59E0B',
      marginBottom: 8,
    },
    consequence: {
      fontSize: 13,
      lineHeight: 18,
      color: '#E65100',
      marginLeft: 12,
      marginBottom: 4,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 24,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: '#F3F4F6',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#D1D5DB',
    },
    cancelButtonText: {
      color: '#6B7280',
      fontSize: 16,
      fontWeight: '600',
    },
    proceedButton: {
      flex: 1,
      backgroundColor: '#DC2626',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 120, // Ensure minimum width for text
      shadowColor: '#DC2626',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    proceedButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
      flexShrink: 0, // Prevent text from shrinking
    },
    disclaimerText: {
      fontSize: 12,
      lineHeight: 16,
      color: '#9CA3AF',
      textAlign: 'center',
      fontStyle: 'italic',
      marginTop: 12,
    },
  });

  const showAdditionalWarning = () => {
    Alert.alert(
      '⚠️ Important Reminder',
      'Sharing inappropriate content may violate platform policies and could have legal consequences. Please ensure your content is appropriate for public sharing.\n\nBy proceeding, you acknowledge that you are solely responsible for the content you share.',
      [
        { text: 'Cancel', style: 'cancel', onPress: onCancel },
        { 
          text: 'I Understand & Proceed', 
          style: 'destructive',
          onPress: onProceed 
        }
      ]
    );
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          <View style={styles.headerContainer}>
            <Ionicons 
              name="warning" 
              size={28} 
              color={colors.error} 
              style={styles.warningIcon} 
            />
            <Text style={styles.title}>Content Safety Warning</Text>
          </View>

          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              ⚠️ THINK BEFORE YOU SHARE ⚠️
            </Text>
            <Text style={styles.warningText}>
              You are about to share personal fitness content publicly
            </Text>
          </View>

          <Text style={styles.sectionTitle}>🚫 Prohibited Content</Text>
          <Text style={styles.bulletPoint}>• Nudity or sexually explicit content</Text>
          <Text style={styles.bulletPoint}>• Inappropriate or revealing photos</Text>
          <Text style={styles.bulletPoint}>• Content that violates platform policies</Text>
          <Text style={styles.bulletPoint}>• Images that could be considered offensive</Text>

          <View style={styles.guidelinesContainer}>
            <Text style={styles.guidelinesTitle}>✅ Sharing Guidelines</Text>
            <Text style={styles.guideline}>• Ensure appropriate clothing/coverage</Text>
            <Text style={styles.guideline}>• Focus on fitness progress, not appearance</Text>
            <Text style={styles.guideline}>• Consider who might see this content</Text>
            <Text style={styles.guideline}>• Respect community standards</Text>
          </View>

          <View style={styles.consequencesContainer}>
            <Text style={styles.consequencesTitle}>⚠️ Potential Consequences</Text>
            <Text style={styles.consequence}>• Content may be reported or removed</Text>
            <Text style={styles.consequence}>• Violation of platform terms of service</Text>
            <Text style={styles.consequence}>• Potential legal or professional impact</Text>
            <Text style={styles.consequence}>• Permanent digital footprint</Text>
          </View>

          <Text style={styles.disclaimerText}>
            You are solely responsible for the content you choose to share. GoFitAI cannot control how others use or distribute shared content.
          </Text>

          {/* Report Content Option */}
          <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
            <ReportContentButton 
              contentType="progress_photo" 
              variant="link"
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.proceedButton} onPress={showAdditionalWarning}>
              <Text style={styles.proceedButtonText} numberOfLines={1}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}



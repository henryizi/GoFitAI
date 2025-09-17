import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import HealthDisclaimer from '../../src/components/legal/HealthDisclaimer';

export default function PrivacyConsentScreen() {
  const theme = useTheme();
  const [hasAgreed, setHasAgreed] = useState(false);

  const handleAgree = () => {
    if (!hasAgreed) {
      Alert.alert(
        'Privacy Agreement Required',
        'Please read and agree to our privacy policy before continuing.'
      );
      return;
    }
    
    // Mark privacy consent as given
    router.replace('/(auth)/register');
  };

  const handleViewFullPolicy = () => {
    router.push('/(legal)/privacy-policy');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
    },
    backButton: {
      marginRight: 15,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.onBackground,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.onBackground,
      marginBottom: 20,
      textAlign: 'center',
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onBackground,
      marginBottom: 8,
    },
    text: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 10,
    },
    dataList: {
      paddingLeft: 15,
    },
    dataItem: {
      fontSize: 14,
      lineHeight: 18,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 4,
    },
    highlightBox: {
      backgroundColor: theme.colors.surfaceVariant,
      padding: 15,
      borderRadius: 8,
      marginVertical: 10,
    },
    highlightText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
    healthDisclaimerSection: {
      marginTop: 20,
      marginBottom: 10,
    },
    consentSection: {
      marginTop: 20,
      padding: 20,
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.outline,
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 15,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      borderRadius: 4,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    checkboxChecked: {
      backgroundColor: theme.colors.primary,
    },
    checkboxText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.onSurface,
    },
    linkText: {
      color: theme.colors.primary,
      textDecorationLine: 'underline',
    },
    buttonContainer: {
      marginTop: 20,
      gap: 10,
    },
    agreeButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 15,
      paddingHorizontal: 30,
      borderRadius: 8,
      alignItems: 'center',
    },
    agreeButtonDisabled: {
      backgroundColor: theme.colors.surfaceDisabled,
    },
    agreeButtonText: {
      color: theme.colors.onPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    agreeButtonTextDisabled: {
      color: theme.colors.onSurfaceVariant,
    },
    viewPolicyButton: {
      borderWidth: 1,
      borderColor: theme.colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: 8,
      alignItems: 'center',
    },
    viewPolicyButtonText: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: '500',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.onBackground}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Notice</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Personal Information Collection Statement</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What Personal Data We Collect</Text>
          <Text style={styles.text}>
            GoFitAI collects the following personal health and profile data to provide our AI-powered fitness services:
          </Text>
          <View style={styles.dataList}>
            <Text style={styles.dataItem}>• Personal details: Name, email, birthday, gender</Text>
            <Text style={styles.dataItem}>• Physical measurements: Height, weight, body fat percentage</Text>
            <Text style={styles.dataItem}>• Health information: Fitness goals, activity level, dietary preferences</Text>
            <Text style={styles.dataItem}>• Body photos: Front and back images for AI analysis</Text>
            <Text style={styles.dataItem}>• Food photos: Images for nutrition analysis</Text>
            <Text style={styles.dataItem}>• Workout data: Exercise logs, performance metrics, progress tracking</Text>
            <Text style={styles.dataItem}>• Nutrition data: Food intake, meal logs, calorie tracking</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why We Collect This Data</Text>
          <Text style={styles.text}>
            We use your personal data to:
          </Text>
          <View style={styles.dataList}>
            <Text style={styles.dataItem}>• Generate personalized workout and nutrition plans</Text>
            <Text style={styles.dataItem}>• Provide AI-powered body composition and food analysis</Text>
            <Text style={styles.dataItem}>• Track your fitness progress and achievements</Text>
            <Text style={styles.dataItem}>• Deliver customized health and fitness recommendations</Text>
            <Text style={styles.dataItem}>• Improve our AI models and service quality</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Storage & Security</Text>
          <Text style={styles.text}>
            Your data is stored securely on Supabase cloud servers with:
          </Text>
          <View style={styles.dataList}>
            <Text style={styles.dataItem}>• End-to-end encryption for sensitive health data</Text>
            <Text style={styles.dataItem}>• Secure access controls and authentication</Text>
            <Text style={styles.dataItem}>• Regular security audits and monitoring</Text>
            <Text style={styles.dataItem}>• Geographic data residency in secure data centers</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Data Processing</Text>
          <Text style={styles.text}>
            We use artificial intelligence to analyze your photos and biometric data:
          </Text>
          <View style={styles.dataList}>
            <Text style={styles.dataItem}>• Body photos are processed by AI for aesthetic analysis</Text>
            <Text style={styles.dataItem}>• Food photos are analyzed for nutritional content</Text>
            <Text style={styles.dataItem}>• Health data is used to generate personalized recommendations</Text>
            <Text style={styles.dataItem}>• All AI processing follows PCPD guidance for automated decision-making</Text>
          </View>
        </View>

        <View style={styles.highlightBox}>
          <Text style={styles.highlightText}>
            Data Retention: We keep your data for as long as your account is active, plus 12 months for backup purposes. You can request deletion at any time.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.text}>Under Hong Kong PDPO, you have the right to:</Text>
          <View style={styles.dataList}>
            <Text style={styles.dataItem}>• Access and review your personal data</Text>
            <Text style={styles.dataItem}>• Correct inaccurate information</Text>
            <Text style={styles.dataItem}>• Delete your account and all associated data</Text>
            <Text style={styles.dataItem}>• Export your data for portability</Text>
            <Text style={styles.dataItem}>• Opt out of AI processing (where technically feasible)</Text>
            <Text style={styles.dataItem}>• Lodge complaints with the Privacy Commissioner</Text>
          </View>
        </View>

        {/* Health Disclaimer */}
        <View style={styles.healthDisclaimerSection}>
          <HealthDisclaimer 
            variant="full" 
            title="Health & Fitness Information Disclaimer"
            showAcceptButton={false}
          />
        </View>

        <View style={styles.consentSection}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setHasAgreed(!hasAgreed)}
          >
            <View style={[styles.checkbox, hasAgreed && styles.checkboxChecked]}>
              {hasAgreed && (
                <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />
              )}
            </View>
            <Text style={styles.checkboxText}>
              I have read and agree to the collection, use, and processing of my personal health and profile data as described above, including the health and fitness disclaimers. I understand that I can withdraw consent and delete my data at any time through the app settings.
            </Text>
          </TouchableOpacity>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.agreeButton,
                !hasAgreed && styles.agreeButtonDisabled,
              ]}
              onPress={handleAgree}
              disabled={!hasAgreed}
            >
              <Text
                style={[
                  styles.agreeButtonText,
                  !hasAgreed && styles.agreeButtonTextDisabled,
                ]}
              >
                Continue Registration
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewPolicyButton}
              onPress={handleViewFullPolicy}
            >
              <Text style={styles.viewPolicyButtonText}>
                View Full Privacy Policy
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

export default function PrivacyPolicyScreen() {
  const theme = useTheme();

  const handleContactUs = () => {
    Linking.openURL('mailto:privacy@gofitai.com');
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
      marginBottom: 10,
      textAlign: 'center',
    },
    lastUpdated: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: 30,
    },
    section: {
      marginBottom: 25,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.onBackground,
      marginBottom: 12,
    },
    subsectionTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.onBackground,
      marginBottom: 8,
      marginTop: 15,
    },
    text: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 10,
    },
    bulletPoint: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 6,
      paddingLeft: 15,
    },
    highlightBox: {
      backgroundColor: theme.colors.errorContainer,
      padding: 15,
      borderRadius: 8,
      marginVertical: 15,
    },
    highlightText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.onErrorContainer,
    },
    contactBox: {
      backgroundColor: theme.colors.primaryContainer,
      padding: 20,
      borderRadius: 10,
      marginTop: 20,
      alignItems: 'center',
    },
    contactTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onPrimaryContainer,
      marginBottom: 10,
    },
    contactButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 6,
    },
    contactButtonText: {
      color: theme.colors.onPrimary,
      fontSize: 14,
      fontWeight: '500',
    },
    linkText: {
      color: theme.colors.primary,
      textDecorationLine: 'underline',
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>GoFitAI Privacy Policy</Text>
        <Text style={styles.lastUpdated}>Last Updated: {new Date().toLocaleDateString()}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.text}>
            GoFitAI ("we", "our", or "us") is committed to protecting your personal data and privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our AI-powered fitness and nutrition application.
          </Text>
          <Text style={styles.text}>
            This policy complies with Hong Kong's Personal Data (Privacy) Ordinance (PDPO) and follows the Privacy Commissioner for Personal Data (PCPD) guidelines for AI and health data processing.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Data Controller Information</Text>
          <Text style={styles.text}>
            <Text style={styles.linkText}>Data Controller:</Text> GoFitAI Development Team{'\n'}
            <Text style={styles.linkText}>Contact:</Text> privacy@gofitai.com{'\n'}
            <Text style={styles.linkText}>Data Protection Officer:</Text> dpo@gofitai.com
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Personal Data We Collect</Text>
          
          <Text style={styles.subsectionTitle}>3.1 Account Information</Text>
          <Text style={styles.bulletPoint}>• Full name and preferred display name</Text>
          <Text style={styles.bulletPoint}>• Email address (for account creation and communication)</Text>
          <Text style={styles.bulletPoint}>• Account credentials (securely hashed passwords)</Text>
          <Text style={styles.bulletPoint}>• Account preferences and settings</Text>

          <Text style={styles.subsectionTitle}>3.2 Health & Biometric Data</Text>
          <Text style={styles.bulletPoint}>• Physical measurements: height, weight, body fat percentage</Text>
          <Text style={styles.bulletPoint}>• Personal characteristics: age/birthday, gender</Text>
          <Text style={styles.bulletPoint}>• Fitness information: training level, primary goals, activity level</Text>
          <Text style={styles.bulletPoint}>• Body composition photos (front and back view)</Text>
          <Text style={styles.bulletPoint}>• Workout history and exercise performance data</Text>
          <Text style={styles.bulletPoint}>• Progress tracking measurements and achievements</Text>

          <Text style={styles.subsectionTitle}>3.3 Nutrition & Dietary Data</Text>
          <Text style={styles.bulletPoint}>• Food photos for AI nutritional analysis</Text>
          <Text style={styles.bulletPoint}>• Meal logs and calorie tracking</Text>
          <Text style={styles.bulletPoint}>• Dietary preferences and restrictions</Text>
          <Text style={styles.bulletPoint}>• Nutrition goals and target macronutrients</Text>

          <Text style={styles.subsectionTitle}>3.4 Usage & Analytics Data</Text>
          <Text style={styles.bulletPoint}>• App usage patterns and feature interaction</Text>
          <Text style={styles.bulletPoint}>• Device information (model, OS version, app version)</Text>
          <Text style={styles.bulletPoint}>• Performance metrics and error logs</Text>
          <Text style={styles.bulletPoint}>• User feedback and support interactions</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. How We Use Your Data</Text>
          
          <Text style={styles.subsectionTitle}>4.1 Primary Services</Text>
          <Text style={styles.bulletPoint}>• Generate personalized workout plans based on your goals and fitness level</Text>
          <Text style={styles.bulletPoint}>• Create customized nutrition plans and meal recommendations</Text>
          <Text style={styles.bulletPoint}>• Provide AI-powered body composition and aesthetic analysis</Text>
          <Text style={styles.bulletPoint}>• Track your fitness progress and provide achievement insights</Text>
          <Text style={styles.bulletPoint}>• Deliver personalized health and fitness coaching</Text>

          <Text style={styles.subsectionTitle}>4.2 AI Processing</Text>
          <Text style={styles.bulletPoint}>• Analyze body photos using computer vision for aesthetic assessment</Text>
          <Text style={styles.bulletPoint}>• Process food images to identify nutrition content and calories</Text>
          <Text style={styles.bulletPoint}>• Generate recommendations using machine learning algorithms</Text>
          <Text style={styles.bulletPoint}>• Improve AI model accuracy through anonymized data analysis</Text>

          <Text style={styles.subsectionTitle}>4.3 Service Improvement</Text>
          <Text style={styles.bulletPoint}>• Enhance app functionality and user experience</Text>
          <Text style={styles.bulletPoint}>• Develop new features and improve existing ones</Text>
          <Text style={styles.bulletPoint}>• Monitor app performance and fix technical issues</Text>
          <Text style={styles.bulletPoint}>• Conduct research to improve health outcomes</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. AI Data Processing & PCPD Compliance</Text>
          
          <Text style={styles.highlightBox}>
            <Text style={styles.highlightText}>
              We follow PCPD AI guidance for all automated processing of your personal data.
            </Text>
          </Text>

          <Text style={styles.subsectionTitle}>5.1 Automated Decision Making</Text>
          <Text style={styles.text}>
            Our AI systems make automated decisions about:
          </Text>
          <Text style={styles.bulletPoint}>• Workout plan difficulty and exercise selection</Text>
          <Text style={styles.bulletPoint}>• Nutrition recommendations and calorie targets</Text>
          <Text style={styles.bulletPoint}>• Body composition assessments and ratings</Text>
          <Text style={styles.bulletPoint}>• Progress tracking and achievement recognition</Text>

          <Text style={styles.subsectionTitle}>5.2 Human Oversight & Rights</Text>
          <Text style={styles.bulletPoint}>• You can request human review of any AI-generated recommendations</Text>
          <Text style={styles.bulletPoint}>• You can opt-out of automated processing where technically feasible</Text>
          <Text style={styles.bulletPoint}>• We provide explanations for AI decisions upon request</Text>
          <Text style={styles.bulletPoint}>• Regular human monitoring ensures AI fairness and accuracy</Text>

          <Text style={styles.subsectionTitle}>5.3 AI Risk Controls</Text>
          <Text style={styles.bulletPoint}>• Regular bias testing and fairness assessments</Text>
          <Text style={styles.bulletPoint}>• Data minimization - only necessary data is processed</Text>
          <Text style={styles.bulletPoint}>• Accuracy monitoring and error correction procedures</Text>
          <Text style={styles.bulletPoint}>• Secure AI model deployment with privacy protections</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Data Storage & Security</Text>
          
          <Text style={styles.subsectionTitle}>6.1 Where Your Data is Stored</Text>
          <Text style={styles.bulletPoint}>• Primary storage: Supabase cloud infrastructure (secure, encrypted)</Text>
          <Text style={styles.bulletPoint}>• Photo storage: Secure cloud storage with access controls</Text>
          <Text style={styles.bulletPoint}>• Geographic location: Data centers with appropriate security certifications</Text>
          <Text style={styles.bulletPoint}>• Backup storage: Encrypted backups in geographically separate locations</Text>

          <Text style={styles.subsectionTitle}>6.2 Security Measures</Text>
          <Text style={styles.bulletPoint}>• End-to-end encryption for sensitive health data</Text>
          <Text style={styles.bulletPoint}>• Multi-factor authentication and secure access controls</Text>
          <Text style={styles.bulletPoint}>• Regular security audits and penetration testing</Text>
          <Text style={styles.bulletPoint}>• Employee access controls and privacy training</Text>
          <Text style={styles.bulletPoint}>• Incident detection and response procedures</Text>

          <Text style={styles.subsectionTitle}>6.3 Data Retention</Text>
          <Text style={styles.bulletPoint}>• Active account data: Retained while your account is active</Text>
          <Text style={styles.bulletPoint}>• Backup data: 12 months after account deletion</Text>
          <Text style={styles.bulletPoint}>• Analytics data: Anonymized and retained for service improvement</Text>
          <Text style={styles.bulletPoint}>• Legal obligations: Retained as required by applicable laws</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Data Sharing & Third Parties</Text>
          
          <Text style={styles.text}>
            We do not sell your personal data. We may share your data only in these limited circumstances:
          </Text>

          <Text style={styles.subsectionTitle}>7.1 Service Providers</Text>
          <Text style={styles.bulletPoint}>• Cloud infrastructure providers (Supabase) for data storage</Text>
          <Text style={styles.bulletPoint}>• AI processing services (DeepSeek, Gemini) for analysis</Text>
          <Text style={styles.bulletPoint}>• Analytics providers for app performance monitoring</Text>
          <Text style={styles.bulletPoint}>• Support service providers for customer assistance</Text>

          <Text style={styles.subsectionTitle}>7.2 Legal Requirements</Text>
          <Text style={styles.bulletPoint}>• Court orders, legal processes, or regulatory requests</Text>
          <Text style={styles.bulletPoint}>• Protection of rights, property, or safety</Text>
          <Text style={styles.bulletPoint}>• Compliance with applicable laws and regulations</Text>

          <Text style={styles.subsectionTitle}>7.3 Business Transfers</Text>
          <Text style={styles.bulletPoint}>• Mergers, acquisitions, or asset transfers (with continued privacy protection)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Your Rights Under PDPO</Text>
          
          <Text style={styles.text}>
            Under Hong Kong's Personal Data (Privacy) Ordinance, you have the following rights:
          </Text>

          <Text style={styles.subsectionTitle}>8.1 Access Rights</Text>
          <Text style={styles.bulletPoint}>• Request a copy of all personal data we hold about you</Text>
          <Text style={styles.bulletPoint}>• View how your data is being processed and used</Text>
          <Text style={styles.bulletPoint}>• Understand the purposes of data collection</Text>

          <Text style={styles.subsectionTitle}>8.2 Correction Rights</Text>
          <Text style={styles.bulletPoint}>• Correct inaccurate or incomplete personal data</Text>
          <Text style={styles.bulletPoint}>• Update your profile information at any time</Text>
          <Text style={styles.bulletPoint}>• Request correction of AI-generated assessments</Text>

          <Text style={styles.subsectionTitle}>8.3 Deletion Rights</Text>
          <Text style={styles.bulletPoint}>• Delete your account and all associated personal data</Text>
          <Text style={styles.bulletPoint}>• Request removal of specific data categories</Text>
          <Text style={styles.bulletPoint}>• Data portability before deletion</Text>

          <Text style={styles.subsectionTitle}>8.4 Additional Rights</Text>
          <Text style={styles.bulletPoint}>• Withdraw consent for data processing</Text>
          <Text style={styles.bulletPoint}>• Object to automated decision-making</Text>
          <Text style={styles.bulletPoint}>• Data portability to other services</Text>
          <Text style={styles.bulletPoint}>• Lodge complaints with the Privacy Commissioner</Text>

          <Text style={styles.subsectionTitle}>8.5 How to Exercise Your Rights</Text>
          <Text style={styles.text}>
            You can exercise these rights through:
          </Text>
          <Text style={styles.bulletPoint}>• App Settings → Privacy & Security → Data Management</Text>
          <Text style={styles.bulletPoint}>• Email us at privacy@gofitai.com</Text>
          <Text style={styles.bulletPoint}>• In-app support chat or help center</Text>
          <Text style={styles.text}>
            We will respond to your requests within 40 days as required by PDPO.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. International Data Transfers</Text>
          <Text style={styles.text}>
            Your data may be transferred outside Hong Kong for processing by our AI service providers. We ensure adequate protection through:
          </Text>
          <Text style={styles.bulletPoint}>• Contractual safeguards and data processing agreements</Text>
          <Text style={styles.bulletPoint}>• Adequacy decisions and approved transfer mechanisms</Text>
          <Text style={styles.bulletPoint}>• Regular monitoring of international service providers</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Children's Privacy</Text>
          <Text style={styles.text}>
            GoFitAI is not intended for users under 16 years old. We do not knowingly collect personal data from children. If we become aware that we have collected data from a child, we will delete it immediately and terminate the account.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Data Breach Response</Text>
          <Text style={styles.text}>
            In the unlikely event of a data breach:
          </Text>
          <Text style={styles.bulletPoint}>• We will notify the Privacy Commissioner within 72 hours</Text>
          <Text style={styles.bulletPoint}>• Affected users will be notified without undue delay</Text>
          <Text style={styles.bulletPoint}>• We will provide clear information about the breach and protective measures</Text>
          <Text style={styles.bulletPoint}>• We will offer appropriate support and remediation</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Changes to This Policy</Text>
          <Text style={styles.text}>
            We may update this Privacy Policy from time to time. We will:
          </Text>
          <Text style={styles.bulletPoint}>• Notify you of material changes through the app or email</Text>
          <Text style={styles.bulletPoint}>• Post the updated policy with a new "Last Updated" date</Text>
          <Text style={styles.bulletPoint}>• Obtain new consent if required by law</Text>
          <Text style={styles.bulletPoint}>• Provide transition periods for policy changes</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Contact Information</Text>
          <Text style={styles.text}>
            For privacy questions, concerns, or to exercise your rights:
          </Text>
          <Text style={styles.bulletPoint}>• Email: privacy@gofitai.com</Text>
          <Text style={styles.bulletPoint}>• Data Protection Officer: dpo@gofitai.com</Text>
          <Text style={styles.bulletPoint}>• Support: support@gofitai.com</Text>
          
          <Text style={styles.text}>
            Privacy Commissioner for Personal Data, Hong Kong:
          </Text>
          <Text style={styles.bulletPoint}>• Website: pcpd.org.hk</Text>
          <Text style={styles.bulletPoint}>• Complaint hotline: +852 2827 2827</Text>
          <Text style={styles.bulletPoint}>• Email: complaints@pcpd.org.hk</Text>
        </View>

        <View style={styles.contactBox}>
          <Text style={styles.contactTitle}>Have Privacy Questions?</Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleContactUs}
          >
            <Text style={styles.contactButtonText}>Contact Our Privacy Team</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

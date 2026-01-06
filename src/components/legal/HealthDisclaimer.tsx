import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../styles/colors';

interface HealthDisclaimerProps {
  variant?: 'compact' | 'full' | 'modal';
  onAccept?: () => void;
  showAcceptButton?: boolean;
  title?: string;
}

const HealthDisclaimer: React.FC<HealthDisclaimerProps> = ({
  variant = 'compact',
  onAccept,
  showAcceptButton = false,
  title = 'Health & Fitness Disclaimer'
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);

  const handleAccept = () => {
    setHasAccepted(true);
    onAccept?.();
    setIsModalVisible(false);
  };

  const handleViewFull = () => {
    setIsModalVisible(true);
  };

  const disclaimerText = {
    medical: "This app provides general fitness information and is not a substitute for professional medical advice, diagnosis, or treatment.",
    consultation: "Always consult your physician or qualified healthcare provider before starting any new exercise program, especially if you have:",
    conditions: [
      "• Heart conditions or cardiovascular disease",
      "• High blood pressure or diabetes", 
      "• Joint problems, injuries, or chronic pain",
      "• Pregnancy or recent surgery",
      "• Any chronic medical conditions",
      "• Are over 40 years old (men) or 50 years old (women)"
    ],
    liability: "You acknowledge that you participate in fitness activities at your own risk. If you experience chest pain, dizziness, shortness of breath, or any discomfort during exercise, stop immediately and seek medical attention.",
    ai: "AI-generated workout and nutrition plans are based on general fitness principles and may not be suitable for your individual health needs. These recommendations should supplement, not replace, professional guidance.",
    emergency: "In case of medical emergency, contact your local emergency services immediately.",
    citations: "Our fitness and nutrition recommendations are based on evidence-based research from:",
    citationsList: [
      {
        name: "American College of Sports Medicine (ACSM) Exercise Guidelines",
        url: "https://www.acsm.org/education-resources/trending-topics-resources/physical-activity-guidelines"
      },
      {
        name: "American Heart Association Physical Activity Recommendations",
        url: "https://www.heart.org/en/healthy-living/fitness/fitness-basics/aha-recs-for-physical-activity-in-adults"
      },
      {
        name: "U.S. Department of Health & Human Services Physical Activity Guidelines",
        url: "https://health.gov/our-work/nutrition-physical-activity/physical-activity-guidelines"
      },
      {
        name: "Academy of Nutrition and Dietetics Evidence-Based Practice Guidelines",
        url: "https://www.eatright.org/health"
      },
      {
        name: "World Health Organization (WHO) Physical Activity Guidelines",
        url: "https://www.who.int/news-room/fact-sheets/detail/physical-activity"
      }
    ]
  };

  const handleOpenCitation = (url: string) => {
    Linking.openURL(url).catch(err => {
      Alert.alert('Error', 'Unable to open link. Please check your internet connection.');
      console.error('Error opening URL:', err);
    });
  };

  const CompactDisclaimer = () => (
    <View style={styles.compactContainer}>
      <View style={styles.warningHeader}>
        <Ionicons name="warning" size={16} color={colors.warning} />
        <Text style={styles.compactTitle}>Health Notice</Text>
      </View>
      <Text style={styles.compactText}>
        {disclaimerText.medical}
      </Text>
      <Text style={styles.consultText}>
        {disclaimerText.consultation}
      </Text>
      <View style={styles.compactActions}>
        <TouchableOpacity onPress={handleViewFull} style={styles.readMoreButton}>
          <Text style={styles.readMoreText}>Read Full Disclaimer</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => {
            setIsModalVisible(true);
            // Scroll to citations section after modal opens
            setTimeout(() => {
              // This will be handled by the modal's scroll view
            }, 300);
          }} 
          style={styles.citationsButton}
        >
          <Ionicons name="library" size={14} color={colors.primary} />
          <Text style={styles.citationsButtonText}>View Citations</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const FullDisclaimer = () => (
    <ScrollView style={styles.fullContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.headerSection}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={[colors.error, colors.warning]}
            style={styles.iconGradient}
          >
            <Ionicons name="medical" size={24} color="white" />
          </LinearGradient>
        </View>
        <Text style={styles.fullTitle}>{title}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ Important Medical Notice</Text>
        <Text style={styles.bodyText}>{disclaimerText.medical}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👨‍⚕️ Consult Your Doctor</Text>
        <Text style={styles.bodyText}>{disclaimerText.consultation}</Text>
        <View style={styles.conditionsList}>
          {disclaimerText.conditions.map((condition, index) => (
            <Text key={index} style={styles.conditionText}>{condition}</Text>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 AI-Generated Content</Text>
        <Text style={styles.bodyText}>{disclaimerText.ai}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Exercise Safety</Text>
        <Text style={styles.bodyText}>{disclaimerText.liability}</Text>
      </View>

      <View style={styles.emergencySection}>
        <Text style={styles.emergencyTitle}>🚨 Emergency</Text>
        <Text style={styles.emergencyText}>{disclaimerText.emergency}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📚 Research Citations & Sources</Text>
        <Text style={styles.bodyText}>{disclaimerText.citations}</Text>
        <View style={styles.citationsList}>
          {disclaimerText.citationsList.map((citation, index) => (
            <TouchableOpacity
              key={index}
              style={styles.citationItem}
              onPress={() => handleOpenCitation(citation.url)}
              activeOpacity={0.7}
            >
              <Ionicons name="link" size={16} color={colors.primary} style={styles.citationIcon} />
              <Text style={styles.citationText}>{citation.name}</Text>
              <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.citationNote}>
          Tap any citation above to view the source material. These evidence-based guidelines inform our fitness and nutrition recommendations.
        </Text>
      </View>

      {showAcceptButton && (
        <TouchableOpacity 
          onPress={handleAccept}
          style={[styles.acceptButton, hasAccepted && styles.acceptedButton]}
        >
          <LinearGradient
            colors={hasAccepted ? [colors.success, colors.success] : [colors.primary, colors.primaryDark]}
            style={styles.buttonGradient}
          >
            <Ionicons 
              name={hasAccepted ? "checkmark-circle" : "shield-checkmark"} 
              size={20} 
              color="white" 
            />
            <Text style={styles.acceptButtonText}>
              {hasAccepted ? "Acknowledged" : "I Understand & Agree"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  if (variant === 'compact') {
    return (
      <>
        <CompactDisclaimer />
        <Modal
          visible={isModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => setIsModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FullDisclaimer />
          </View>
        </Modal>
      </>
    );
  }

  return <FullDisclaimer />;
};

const styles = StyleSheet.create({
  compactContainer: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.warning,
    marginLeft: 8,
  },
  compactText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  consultText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  compactActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 12,
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readMoreText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginRight: 4,
  },
  citationsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  citationsButtonText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  fullContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    paddingBottom: 0,
  },
  closeButton: {
    padding: 8,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  conditionsList: {
    marginTop: 12,
    marginLeft: 8,
  },
  conditionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  emergencySection: {
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.error,
    marginBottom: 8,
  },
  emergencyText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  acceptButton: {
    marginTop: 24,
    marginBottom: 40,
  },
  acceptedButton: {
    opacity: 0.8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  citationsList: {
    marginTop: 16,
    gap: 12,
  },
  citationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  citationIcon: {
    marginRight: 12,
  },
  citationText: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    lineHeight: 20,
  },
  citationNote: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 12,
    lineHeight: 18,
  },
});

export default HealthDisclaimer;


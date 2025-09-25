import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

interface ProgressPhotoPrivacyNoticeProps {
  variant?: 'compact' | 'full';
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export default function ProgressPhotoPrivacyNotice({ 
  variant = 'compact', 
  onAccept,
  showAcceptButton = false 
}: ProgressPhotoPrivacyNoticeProps) {
  const theme = useTheme();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 12,
      padding: 16,
      marginVertical: 8,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: variant === 'full' ? 12 : 8,
    },
    icon: {
      marginRight: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onSurface,
      flex: 1,
    },
    content: {
      marginBottom: showAcceptButton ? 12 : 0,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginBottom: 8,
      marginTop: 12,
    },
    text: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 8,
    },
    bulletPoint: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.onSurfaceVariant,
      marginLeft: 16,
      marginBottom: 4,
    },
    highlightText: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.primary,
      fontWeight: '500',
      marginBottom: 8,
    },
    warningText: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.error,
      fontWeight: '500',
      marginBottom: 8,
    },
    acceptButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center',
    },
    acceptButtonText: {
      color: theme.colors.onPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    disclaimerContainer: {
      backgroundColor: theme.colors.errorContainer,
      borderRadius: 8,
      padding: 12,
      marginTop: 12,
    },
    disclaimerText: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.onErrorContainer,
      fontStyle: 'italic',
    },
  });

  const renderCompactNotice = () => (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Ionicons 
          name="shield-checkmark" 
          size={20} 
          color={theme.colors.primary} 
          style={styles.icon} 
        />
        <Text style={styles.title}>Progress Photos Privacy</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.highlightText}>
          Photos are stored only on your device - never uploaded to our servers.
        </Text>
        <Text style={styles.text}>
          Your progress photos remain completely private and are only accessible within this app on your device.
        </Text>
      </View>
      {showAcceptButton && (
        <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
          <Text style={styles.acceptButtonText}>I Understand</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFullNotice = () => (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Ionicons 
          name="shield-checkmark" 
          size={24} 
          color={theme.colors.primary} 
          style={styles.icon} 
        />
        <Text style={styles.title}>Progress Photos Privacy Notice</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Local Storage Only</Text>
        <Text style={styles.highlightText}>
          When you choose to upload body progress photos, they are stored only on your device.
        </Text>
        <Text style={styles.bulletPoint}>• We do not upload, collect, or store your photos on our servers</Text>
        <Text style={styles.bulletPoint}>• Photos remain private to you and can only be viewed inside the app</Text>
        <Text style={styles.bulletPoint}>• No one else can access your photos, including our development team</Text>

        <Text style={styles.sectionTitle}>Data Management</Text>
        <Text style={styles.bulletPoint}>• If you delete the app, your photos will also be deleted unless you have backed them up yourself</Text>
        <Text style={styles.bulletPoint}>• You can delete your photos at any time through your device's storage settings or by uninstalling the app</Text>
        <Text style={styles.bulletPoint}>• Photos are automatically removed if you log out or switch accounts</Text>

        <Text style={styles.sectionTitle}>Security & Access</Text>
        <Text style={styles.bulletPoint}>• Photos are stored in your device's secure app directory</Text>
        <Text style={styles.bulletPoint}>• Only this app can access the stored photos</Text>
        <Text style={styles.bulletPoint}>• Photos cannot be accessed by other apps without your explicit permission</Text>

        <Text style={styles.sectionTitle}>Your Rights</Text>
        <Text style={styles.bulletPoint}>• You have complete control over your photos</Text>
        <Text style={styles.bulletPoint}>• You can view, delete, or export your photos at any time</Text>
        <Text style={styles.bulletPoint}>• No data leaves your device unless you explicitly share it</Text>

        <Text style={styles.sectionTitle}>Sharing & Content Safety</Text>
        <Text style={styles.bulletPoint}>• When you choose to share photos, you are responsible for the content</Text>
        <Text style={styles.bulletPoint}>• Use Privacy Mode for enhanced protection when sharing</Text>
        <Text style={styles.bulletPoint}>• Content safety warnings will appear before sharing</Text>
        <Text style={styles.bulletPoint}>• Shared content may be subject to platform policies</Text>
        <Text style={styles.bulletPoint}>• Consider who might see your shared content</Text>

        <View style={styles.disclaimerContainer}>
          <Text style={styles.disclaimerText}>
            Disclaimer: This feature is provided for personal fitness tracking only. We do not provide medical advice, diagnosis, or treatment. Always consult a qualified health professional before making changes to your exercise or nutrition.
          </Text>
        </View>
      </View>

      {showAcceptButton && (
        <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
          <Text style={styles.acceptButtonText}>I Understand and Agree</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return variant === 'compact' ? renderCompactNotice() : renderFullNotice();
}

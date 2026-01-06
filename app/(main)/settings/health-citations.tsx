import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '../../../src/styles/colors';
import HealthDisclaimer from '../../../src/components/legal/HealthDisclaimer';

export default function HealthCitationsScreen() {
  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <IconButton 
          icon="arrow-left" 
          size={24} 
          onPress={() => router.back()} 
          style={styles.backButton} 
        />
        <Text style={styles.title}>Health Information & Citations</Text>
      </View>

      {/* Health Disclaimer with Citations */}
      <View style={styles.disclaimerContainer}>
        <HealthDisclaimer 
          variant="full" 
          title="Health & Fitness Information"
          showAcceptButton={false}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backButton: {
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  disclaimerContainer: {
    paddingHorizontal: 0,
  },
});














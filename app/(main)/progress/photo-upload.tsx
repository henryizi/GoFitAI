import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/hooks/useAuth';
import PhotoUploadForm from '../../../src/components/forms/PhotoUploadForm';
import { colors } from '../../../src/styles/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function PhotoUploadScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date?: string }>();

  if (!user) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(main)/progress')}>
          <Icon name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Body Photos</Text>
        <View style={{ width: 40 }} />
      </View>
      <PhotoUploadForm userId={user.id} initialDate={params.date} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)'
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
}); 
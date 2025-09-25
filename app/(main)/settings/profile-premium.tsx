import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ProfilePremium = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Premium Profile</Text>
      <Text style={styles.description}>
        Unlock premium features to enhance your fitness journey
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
}); 

export default ProfilePremium;
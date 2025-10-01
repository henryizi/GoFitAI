import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

interface PrivacyModeToggleProps {
  isPrivate: boolean;
  onToggle: (isPrivate: boolean) => void;
}

const PrivacyModeToggle: React.FC<PrivacyModeToggleProps> = ({ isPrivate, onToggle }) => {
  const handleToggle = () => {
    onToggle(!isPrivate);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleToggle}>
      <View style={[styles.toggle, isPrivate ? styles.toggleActive : styles.toggleInactive]}>
        <View style={[styles.thumb, isPrivate ? styles.thumbActive : styles.thumbInactive]} />
      </View>
      <Text style={styles.label}>
        {isPrivate ? 'Private Mode' : 'Public Mode'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
    marginRight: 12,
  },
  toggleActive: {
    backgroundColor: '#007AFF',
  },
  toggleInactive: {
    backgroundColor: '#E5E5E5',
  },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
  },
  thumbActive: {
    transform: [{ translateX: 20 }],
  },
  thumbInactive: {
    transform: [{ translateX: 0 }],
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PrivacyModeToggle;

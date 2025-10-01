import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface ReportContentButtonProps {
  onReport?: () => void;
}

const ReportContentButton: React.FC<ReportContentButtonProps> = ({ onReport }) => {
  const handleReport = () => {
    if (onReport) {
      onReport();
    } else {
      // Default behavior - could open a modal or navigate to report screen
      console.log('Report content requested');
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleReport}>
      <Text style={styles.text}>Report</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
    backgroundColor: '#ff4444',
    borderRadius: 4,
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ReportContentButton;

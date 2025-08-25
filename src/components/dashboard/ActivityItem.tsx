import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../styles/colors';

interface ActivityItemProps {
  label: string;
  value: string;
  unit: string;
  icon: string;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ label, value, unit, icon }) => {
  return (
    <View style={styles.container}>
      <Icon name={icon} size={28} color={colors.primary} style={styles.icon} />
      <View style={styles.textContainer}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueContainer}>
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.unit}>{unit}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 16,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  unit: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
});

export default ActivityItem; 
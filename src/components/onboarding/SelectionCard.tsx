import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { theme } from '../../styles/theme';

interface SelectionCardProps {
  title: string;
  subtitle: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
}

export const SelectionCard: React.FC<SelectionCardProps> = ({
  title,
  subtitle,
  icon,
  selected,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardContent}>
        <View style={styles.leftSection}>
          <View style={[styles.iconContainer, selected && styles.iconContainerSelected]}>
            <Ionicons
              name={icon as any}
              size={24}
              color={selected ? colors.text : colors.textSecondary}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, selected && styles.titleSelected]}>
              {title}
            </Text>
            <Text style={[styles.subtitle, selected && styles.subtitleSelected]}>
              {subtitle}
            </Text>
          </View>
        </View>
        
        <View style={styles.rightSection}>
          <View style={[styles.radioButton, selected && styles.radioButtonSelected]}>
            {selected && <View style={styles.radioButtonInner} />}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardSelected: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconContainerSelected: {
    backgroundColor: colors.primary,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  titleSelected: {
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  subtitleSelected: {
    color: colors.textSecondary,
  },
  rightSection: {
    marginLeft: 16,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.primary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
}); 
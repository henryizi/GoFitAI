import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { theme } from '../../styles/theme';

interface NumberInputProps {
  value: string;
  onChangeText: (text: string) => void;
  label: string;
  unit?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChangeText,
  label,
  unit,
  placeholder = '0',
  min = 0,
  max = 999,
  step = 1,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleIncrement = () => {
    const currentValue = parseFloat(value) || 0;
    const newValue = Math.min(currentValue + step, max);
    onChangeText(newValue.toString());
  };

  const handleDecrement = () => {
    const currentValue = parseFloat(value) || 0;
    const newValue = Math.max(currentValue - step, min);
    onChangeText(newValue.toString());
  };

  const handleTextChange = (text: string) => {
    const numericValue = text.replace(/[^0-9.]/g, '');
    const floatValue = parseFloat(numericValue);
    
    if (numericValue === '' || (floatValue >= min && floatValue <= max)) {
      onChangeText(numericValue);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleDecrement}
          activeOpacity={0.7}
        >
          <Ionicons name="remove" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={handleTextChange}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            textAlign="center"
          />
          {unit && <Text style={styles.unit}>{unit}</Text>}
        </View>
        
        <TouchableOpacity
          style={styles.button}
          onPress={handleIncrement}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.rangeContainer}>
        <Text style={styles.rangeText}>{min}</Text>
        <Text style={styles.rangeText}>{max}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 4,
    borderWidth: 2,
    borderColor: colors.secondaryLight,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputContainerFocused: {
    borderColor: colors.primary,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  input: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    minWidth: 80,
  },
  unit: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  rangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  rangeText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
}); 
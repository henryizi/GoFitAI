import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useServerStatus } from '../../contexts/ServerStatusContext';
import { colors } from '../../styles/colors';

interface ServerStatusIndicatorProps {
  size?: number;
  showBorder?: boolean;
}

export const ServerStatusIndicator: React.FC<ServerStatusIndicatorProps> = ({
  size = 8,
  showBorder = false
}) => {
  const { isServerConnected, isChecking } = useServerStatus();

  const getStatusColor = () => {
    if (isChecking) return colors.warning;
    return isServerConnected ? colors.success : colors.error;
  };

  return (
    <View
      style={[
        styles.indicator,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: getStatusColor(),
          borderWidth: showBorder ? 1 : 0,
          borderColor: colors.border,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  indicator: {
    // Styles are applied inline
  },
});



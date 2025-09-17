import React, { useState } from 'react';
import { Image, ImageStyle, StyleProp, ImageResizeMode, View, ActivityIndicator } from 'react-native';
import { colors } from '../../styles/colors';

interface SafeImageProps {
  sourceUrl: string;
  style: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
}

export const SafeImage: React.FC<SafeImageProps> = ({ sourceUrl, style, resizeMode = 'cover' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <View style={style}>
      <Image 
        source={{ uri: sourceUrl }} 
        style={[style, { position: 'absolute' }]}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
      />
      {isLoading && (
        <View style={[
          style,
          {
            position: 'absolute',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.1)',
          }
        ]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
}; 
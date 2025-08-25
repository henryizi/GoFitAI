import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

interface SafeImageProps {
  sourceUrl: string;
  style: StyleProp<ImageStyle>;
}

export const SafeImage: React.FC<SafeImageProps> = ({ sourceUrl, style }) => {
  return <Image source={{ uri: sourceUrl }} style={style} />;
}; 
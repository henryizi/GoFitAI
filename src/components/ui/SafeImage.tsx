import React from 'react';
import { Image, ImageStyle, StyleProp, ImageResizeMode } from 'react-native';

interface SafeImageProps {
  sourceUrl: string;
  style: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
}

export const SafeImage: React.FC<SafeImageProps> = ({ sourceUrl, style, resizeMode = 'cover' }) => {
  return <Image source={{ uri: sourceUrl }} style={style} resizeMode={resizeMode} />;
}; 
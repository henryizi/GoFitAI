import React, { useState, useEffect } from 'react';
import { Image, ImageStyle, StyleProp, ImageResizeMode, View, ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { colors } from '../../styles/colors';
import { ImageOptimizer } from '../../services/storage/imageOptimizer';

interface SafeImageProps {
  sourceUrl: string;
  style: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
  quality?: number; // 0-1, for compression
  enableCache?: boolean; // Enable/disable caching
  maxWidth?: number; // Max width for optimization
  maxHeight?: number; // Max height for optimization
}

// Simple cache to store processed image URIs
const imageCache = new Map<string, string>();

// Function to clear the SafeImage cache
export const clearSafeImageCache = () => {
  imageCache.clear();
  console.log('📷 SafeImage cache cleared');
};

export const SafeImage: React.FC<SafeImageProps> = ({ 
  sourceUrl, 
  style, 
  resizeMode = 'cover', 
  quality = 0.9,
  enableCache = true,
  maxWidth = 2400, // Increased to preserve high-res photos
  maxHeight = 3200  // Increased to preserve high-res photos
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [processedUri, setProcessedUri] = useState<string | null>(null);

  useEffect(() => {
    processImage();
  }, [sourceUrl, quality, enableCache, maxWidth, maxHeight]);

  const processImage = async () => {
    if (!sourceUrl) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setHasError(false);

      // Check cache first
      const cacheKey = `${sourceUrl}_${quality}_${maxWidth}_${maxHeight}`;
      if (enableCache && imageCache.has(cacheKey)) {
        setProcessedUri(imageCache.get(cacheKey)!);
        setIsLoading(false);
        return;
      }

      // Check if original file exists
      const fileInfo = await FileSystem.getInfoAsync(sourceUrl);
      if (!fileInfo.exists) {
        console.log(`📷 SafeImage: File not found: ${sourceUrl.split('/').pop()}`);
        setHasError(true);
        setIsLoading(false);
        return;
      }

      // Optimize the image for better performance
      const optimizedUri = await ImageOptimizer.optimizeImage(sourceUrl, {
        maxWidth,
        maxHeight,
        quality,
        enableCache
      });

      setProcessedUri(optimizedUri);
      if (enableCache) {
        imageCache.set(cacheKey, optimizedUri);
      }
      setIsLoading(false);

    } catch (error) {
      console.error('SafeImage: Error processing image:', error);
      // Fallback to original URI if optimization fails
      try {
        const fileInfo = await FileSystem.getInfoAsync(sourceUrl);
        if (fileInfo.exists) {
          setProcessedUri(sourceUrl);
          setIsLoading(false);
        } else {
          setHasError(true);
          setIsLoading(false);
        }
      } catch (fallbackError) {
        setHasError(true);
        setIsLoading(false);
      }
    }
  };

  const handleLoadStart = () => {
    // Image component is starting to load
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    console.warn('SafeImage: Failed to load image:', processedUri);
  };

  if (hasError || !processedUri) {
    return (
      <View style={[style, {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
      }]}>
        <View style={{
          padding: 20,
          alignItems: 'center',
        }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(0,0,0,0.1)',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 8,
          }}>
            <View style={{
              width: 20,
              height: 20,
              backgroundColor: colors.textSecondary,
              opacity: 0.5,
            }} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={style}>
      <Image 
        source={{ uri: processedUri }} 
        style={[style, { position: 'absolute' }]}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        // Add these props for better performance
        fadeDuration={200}
        progressiveRenderingEnabled={true}
        defaultSource={undefined} // Prevent default image flashing
      />
      {isLoading && (
        <View style={[
          style,
          {
            position: 'absolute',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.05)',
          }
        ]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </View>
  );
}; 
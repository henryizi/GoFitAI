import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../styles/colors';

const { width, height } = Dimensions.get('window');

export const MockFoodCamera = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Camera Preview Background */}
      <View style={styles.cameraPreview}>
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.9)']}
          style={StyleSheet.absoluteFill}
        />
        {/* Mock food image overlay */}
        <View style={styles.foodImageOverlay}>
          <Icon name="food" size={120} color="rgba(255, 107, 53, 0.3)" />
        </View>
      </View>

      {/* Overlay */}
      <View style={styles.overlay} />

      {/* Top Controls */}
      <View style={[styles.topControls, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.iconButton}>
          <Icon name="close" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.flashButton}>
          <Icon name="flash-off" size={24} color={colors.white} />
        </View>
      </View>

      {/* Center Frame */}
      <View style={styles.frameContainer}>
        <View style={styles.frame} />
        <Text style={styles.scanText}>Position food in frame</Text>
      </View>

      {/* Bottom Controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity style={styles.galleryButton}>
          <Icon name="image-outline" size={24} color={colors.white} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.shutterButton}>
          <View style={styles.shutterOuter}>
            <View style={styles.shutterInner} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.flipButton}>
          <Icon name="camera-flip" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraPreview: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodImageOverlay: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameContainer: {
    position: 'absolute',
    top: (height - width) / 2,
    left: (width - width) / 2,
    width: width,
    height: width,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: width - 80,
    height: width - 80,
    borderRadius: 24,
    borderColor: 'rgba(255,255,255,0.9)',
    borderWidth: 4,
  },
  scanText: {
    position: 'absolute',
    bottom: -28,
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 10,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});




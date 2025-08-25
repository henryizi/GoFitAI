import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Image, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.7)',
  overlay: 'rgba(0,0,0,0.35)',
};

export default function FoodCameraScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<'on' | 'off'>('off');
  const [type] = useState<CameraType>('back');
  const [captured, setCaptured] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [flashOverlay, setFlashOverlay] = useState(false);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  const onCapture = async () => {
    try {
      if (!cameraRef.current) return;
      setCapturing(true);
      setFlashOverlay(true);
      setTimeout(() => setFlashOverlay(false), 120);
      const photo = await cameraRef.current.takePictureAsync({ quality: 1, skipProcessing: Platform.OS === 'android' });
      if (photo?.uri) {
        console.log('Photo captured:', photo.uri);
        setCaptured(photo.uri);
      }
    } catch (e) {
      console.warn('Capture failed', e);
    } finally {
      setCapturing(false);
    }
  };

  const usePhoto = () => {
    if (!captured) return;
    console.log('Using photo, navigating back with image:', captured);
    router.replace({ pathname: '/(main)/nutrition/log-food', params: { image: captured } });
  };

  if (!permission?.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}> 
        <Text style={{ color: colors.text, textAlign: 'center' }}>Camera permission is required.</Text>
        <TouchableOpacity onPress={requestPermission} style={{ alignSelf: 'center', marginTop: 12 }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!captured ? (
        <CameraView
          ref={(r) => { cameraRef.current = r; }}
          style={styles.camera}
          facing={type}
          enableTorch={flash === 'on'}
        >
          <View style={styles.overlay} />
          {!capturing && (
            <>
              <View style={styles.frameContainer}>
                <View style={styles.frame} />
                <Text style={styles.scanText}>Scan food</Text>
              </View>
              <LinearGradient colors={[colors.overlay, 'transparent']} style={[styles.gradientTop, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}> 
                  <Icon name="arrow-left" size={22} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFlash(flash === 'on' ? 'off' : 'on')} style={styles.iconBtn}>
                  <Icon name={flash === 'on' ? 'flash' : 'flash-off'} size={22} color={colors.text} />
                </TouchableOpacity>
              </LinearGradient>
              <View style={[styles.bottomControls, { bottom: insets.bottom + 24 }]}>
                <TouchableOpacity onPress={onCapture} activeOpacity={0.9} style={styles.shutterOuter}>
                  <View style={styles.shutterInner} />
                </TouchableOpacity>
              </View>
            </>
          )}
          {flashOverlay && <View style={styles.flash} />}
        </CameraView>
      ) : (
        <View style={styles.previewWrap}>
          <Image source={{ uri: captured }} style={styles.preview} />
          <LinearGradient colors={[colors.overlay, 'transparent']} style={[styles.gradientTop, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity onPress={() => setCaptured(null)} style={styles.iconBtn}> 
              <Icon name="arrow-left" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Icon name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </LinearGradient>
          <View style={[styles.previewActions, { bottom: insets.bottom + 24 }]}>
            <TouchableOpacity onPress={() => setCaptured(null)} style={styles.secondaryBtn}>
              <Text style={styles.secondaryText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={usePhoto} style={styles.primaryBtn}>
              <Text style={styles.primaryText}>Use Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// Change to use a smaller 9:16 aspect ratio frame
const FRAME_WIDTH = width * 0.85; // Reduced from 0.95 to 0.85
// For a portrait 9:16 ratio, height should be (16/9) times the width
const FRAME_HEIGHT = FRAME_WIDTH * (16/9);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', opacity: 0.8 },
  gradientTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  bottomControls: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)'
  },
  frameContainer: { 
    position: 'absolute', 
    top: (height - FRAME_HEIGHT) / 2 - 20, 
    left: (width - FRAME_WIDTH) / 2, 
    width: FRAME_WIDTH, 
    height: FRAME_HEIGHT, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  frame: { 
    position: 'absolute', 
    width: FRAME_WIDTH, 
    height: FRAME_HEIGHT, 
    borderRadius: 24, 
    borderColor: 'rgba(255,255,255,0.9)', 
    borderWidth: 4 
  },
  scanText: { position: 'absolute', bottom: -28, color: colors.textSecondary, fontWeight: '600' },
  shutterOuter: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' },
  previewWrap: { flex: 1, backgroundColor: '#000' },
  preview: { width: '100%', height: '100%', resizeMode: 'cover' },
  previewActions: {
    position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24,
  },
  secondaryBtn: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  secondaryText: { color: colors.text, fontWeight: '700' },
  primaryBtn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, backgroundColor: colors.primary },
  primaryText: { color: '#fff', fontWeight: '800', letterSpacing: 0.5 },
}); 
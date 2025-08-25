import React, { useState } from 'react';
import { View, StyleSheet, Alert, Image } from 'react-native';
import { Text, Button, IconButton, ActivityIndicator, Card } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { PhotoStorageService } from '../../services/storage/photoStorage';
import { AnalysisService } from '../../services/analysisService';

const BodyAnalysisForm = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [frontPhotoUri, setFrontPhotoUri] = useState<string | null>(null);
  const [backPhotoUri, setBackPhotoUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePickImage = async (type: 'front' | 'back') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 5],
      quality: 0.8,
    });

    if (!result.canceled) {
      if (type === 'front') setFrontPhotoUri(result.assets[0].uri);
      if (type === 'back') setBackPhotoUri(result.assets[0].uri);
    }
  };

  const handleAnalyze = async () => {
    if (!user || !frontPhotoUri || !backPhotoUri) {
      Alert.alert('Missing Photos', 'Please upload both a front and a back photo.');
      return;
    }
    setIsLoading(true);

    try {
      // 1. Upload photos to storage
      const frontPhotoResult = await PhotoStorageService.uploadPhoto(user.id, 'front', frontPhotoUri);
      const backPhotoResult = await PhotoStorageService.uploadPhoto(user.id, 'back', backPhotoUri);

      if (!frontPhotoResult.success || !backPhotoResult.success || !frontPhotoResult.photo?.photo_url || !backPhotoResult.photo?.photo_url) {
        throw new Error('One or more photos failed to upload.');
      }

      // 2. Call backend to start analysis
      const analysisResult = await AnalysisService.startAnalysis(
        user.id,
        frontPhotoResult.photo.photo_url,
        backPhotoResult.photo.photo_url
      );

      Alert.alert('Analysis Complete!', 'Your results are ready to view.');
      router.push(`/(main)/analysis/${analysisResult.analysis.id}`);
    } catch (error) {
      Alert.alert('Analysis Failed', 'There was an error analyzing your photos. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPhotoSelector = (type: 'front' | 'back') => {
    const uri = type === 'front' ? frontPhotoUri : backPhotoUri;
    return (
      <Card style={styles.photoCard}>
        <Card.Title title={type === 'front' ? 'Front-Facing Photo' : 'Back-Facing Photo'} />
        <Card.Content>
          <View style={styles.photoPlaceholder}>
            {uri ? (
              <Image source={{ uri }} style={styles.previewImage} />
            ) : (
              <IconButton icon="camera-plus-outline" size={48} onPress={() => handlePickImage(type)} />
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.instructions}>
        For the best results, please upload high-quality, full-body photos in a well-lit area.
      </Text>
      {renderPhotoSelector('front')}
      {renderPhotoSelector('back')}
      <Button
        mode="contained"
        onPress={handleAnalyze}
        loading={isLoading}
        disabled={isLoading || !frontPhotoUri || !backPhotoUri}
        style={styles.button}
        icon="robot-outline"
      >
        Analyze My Physique
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  instructions: {
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 16,
  },
  photoCard: {
    marginBottom: 16,
  },
  photoPlaceholder: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  button: {
    marginTop: 16,
    paddingVertical: 8,
  },
});

export default BodyAnalysisForm; 
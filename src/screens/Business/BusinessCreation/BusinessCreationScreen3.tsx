import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../../libs/hooks/useAuth';
import { getColors } from '../../../libs/colors';
import Toolbar from '../../../components/Toolbar';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import Icon from '@react-native-vector-icons/material-icons';

const MAX_PHOTOS = 3;

const BusinessCreationScreen3 = ({ navigation, route }: any) => {
  const { isDarkMode } = useAuth();
  const colors = getColors(isDarkMode);
  const [businessPhotos, setBusinessPhotos] = useState<Asset[]>([]);

  const {
    businessName,
    description,
    address,
    city,
    country,
    state,
    postalCode,
    phoneNumber,
    businessUrl,
    logoFile,
    coverFile,
  } = route.params || {};

  const pickImages = async () => {
    if (businessPhotos.length >= MAX_PHOTOS) {
      Alert.alert(
        'Limit Reached',
        `You can only upload up to ${MAX_PHOTOS} photos`,
      );
      return;
    }

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 1,
        selectionLimit: MAX_PHOTOS - businessPhotos.length,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'Failed to pick image');
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const newPhotos = [...businessPhotos, ...result.assets].slice(
          0,
          MAX_PHOTOS,
        );
        setBusinessPhotos(newPhotos);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removePhoto = (index: number) => {
    const updated = businessPhotos.filter((_, i) => i !== index);
    setBusinessPhotos(updated);
  };

  const handleNext = () => {
    // Navigate to Screen4 (Review/Submit) with all data
    navigation.navigate('BusinessCreationScreen4', {
      businessName,
      description,
      address,
      city,
      country,
      state,
      postalCode,
      phoneNumber,
      businessUrl,
      logo: logoFile
        ? {
            uri: logoFile.uri,
            type: logoFile.type,
            fileName: logoFile.fileName,
            fileSize: logoFile.fileSize,
          }
        : null,
      cover: coverFile
        ? {
            uri: coverFile.uri,
            type: coverFile.type,
            fileName: coverFile.fileName,
            fileSize: coverFile.fileSize,
          }
        : null,
      businessPhotos: businessPhotos.map(photo => ({
        uri: photo.uri,
        type: photo.type,
        fileName: photo.fileName,
        fileSize: photo.fileSize,
      })),
    });
  };

  const renderUploadBox = () => {
    return (
      <TouchableOpacity
        style={styles.uploadBox}
        onPress={pickImages}
        activeOpacity={0.7}
      >
        <View style={styles.uploadPlaceholder}>
          <View style={styles.cloudIconContainer}>
            <Icon name="cloud-upload" size={32} color="#E4760F" />
          </View>
          <Text style={styles.uploadText}>
            Drag & drop files or <Text style={styles.browseText}>Browse</Text>
          </Text>
          <Text style={styles.supportedText}>
            Supported formates: SVG, PNG, JPG
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPhotoPreview = () => {
    if (businessPhotos.length === 0) return null;

    return (
      <View style={styles.photosGrid}>
        {businessPhotos.map((photo, index) => (
          <View key={index} style={styles.photoItem}>
            <Image
              source={{ uri: photo.uri }}
              style={styles.photoImage}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removePhoto(index)}
            >
              <Icon name="close" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View
      style={[styles.mainContainer, { backgroundColor: colors.background }]}
    >
      <Toolbar
        title="Business Creation"
        onBack={() => navigation.goBack()}
        showSettings={false}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Step Header */}
        <View style={styles.headerSection}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            Step 3. <Text style={styles.stepTitleBold}>Business Photos</Text>
          </Text>
          <Text style={[styles.stepSubtitle, { color: '#666' }]}>
            Upload photos of your business to enhance your profile and drive
            customers into your establishmant
          </Text>
        </View>

        {/* Photos Upload Section */}
        <View style={styles.uploadSection}>
          <Text style={[styles.labelText, { color: colors.text }]}>
            Business Photos{' '}
            <Text style={styles.optionalText}>(up to {MAX_PHOTOS})</Text>
          </Text>
          {renderUploadBox()}
          {renderPhotoPreview()}
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next Step</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: colors.text }]}>
            Back to Previous Step
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    marginBottom: 8,
  },
  stepTitleBold: {
    fontWeight: '700',
  },
  stepSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  uploadSection: {
    marginBottom: 24,
  },
  labelText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  optionalText: {
    color: '#999',
    fontWeight: '400',
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#F5C9A0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    backgroundColor: '#FEFAF6',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  cloudIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF5EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 14,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    marginBottom: 4,
  },
  browseText: {
    color: '#E4760F',
    fontWeight: '600',
  },
  supportedText: {
    fontSize: 12,
    color: '#999',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 12,
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: 8,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  nextButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});

export default BusinessCreationScreen3;

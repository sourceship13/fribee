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
import Icon from 'react-native-vector-icons/MaterialIcons';

const BusinessCreationScreen2 = ({ navigation, route }: any) => {
  const { isDarkMode } = useAuth();
  const colors = getColors(isDarkMode);

  // Get props from Screen1
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
  } = route.params || {};

  const [logoFile, setLogoFile] = useState<Asset | null>(null);
  const [coverFile, setCoverFile] = useState<Asset | null>(null);

  const pickImage = async (type: 'logo' | 'cover') => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 1,
        selectionLimit: 1,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'Failed to pick image');
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (type === 'logo') {
          setLogoFile(asset);
        } else {
          setCoverFile(asset);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeImage = (type: 'logo' | 'cover') => {
    if (type === 'logo') {
      setLogoFile(null);
    } else {
      setCoverFile(null);
    }
  };

  const handleNext = () => {
    if (!logoFile) {
      Alert.alert('Missing Logo', 'Please upload your Business Logo before continuing.');
      return;
    }
    navigation.navigate('BusinessCreationScreen3', {
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
    });
  };

  const renderUploadBox = (
    file: Asset | null,
    type: 'logo' | 'cover',
    isRequired: boolean = false
  ) => {
    const hasFile = file !== null;

    return (
      <TouchableOpacity
        style={styles.uploadBox}
        onPress={() => pickImage(type)}
        activeOpacity={0.7}
      >
        {hasFile ? (
          <View style={styles.imagePreviewContainer}>
            <Image
              source={{ uri: file.uri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeImage(type)}
            >
              <Icon name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.uploadPlaceholder}>
            <View style={styles.cloudIconContainer}>
              <Icon name="cloud-upload" size={32} color="#E4760F" />
            </View>
            <Text style={styles.uploadText}>
              Drag & drop files or{' '}
              <Text style={styles.browseText}>Browse</Text>
            </Text>
            <Text style={styles.supportedText}>
              Supported formates: SVG, PNG, JPG
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
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
            Step 2. <Text style={styles.stepTitleBold}>Logo & Cover Photo</Text>
          </Text>
          <Text style={[styles.stepSubtitle, { color: '#666' }]}>
            Upload your business logo and cover photo to make your profile stand out. This helps customers recognize your brand easily
          </Text>
        </View>

        {/* Logo Upload Section */}
        <View style={styles.uploadSection}>
          <Text style={[styles.labelText, { color: colors.text }]}>
            Business Logo <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          {renderUploadBox(logoFile, 'logo', true)}
        </View>

        {/* Cover Photo Upload Section */}
        <View style={styles.uploadSection}>
          <Text style={[styles.labelText, { color: colors.text }]}>
            Cover Photo <Text style={styles.optionalText}>(Optional)</Text>
          </Text>
          {renderUploadBox(coverFile, 'cover', false)}
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
  requiredAsterisk: {
    color: '#E4760F',
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
  imagePreviewContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
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
    borderRadius: 24,
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

export default BusinessCreationScreen2;

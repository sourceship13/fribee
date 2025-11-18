import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import { useAuth } from '../../../libs/hooks/useAuth';
import { getColors } from '../../../libs/colors';
import Toolbar from '../../../components/Toolbar';
import { iOSUIKit } from 'react-native-typography';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ProfileScreen from '../../Profile/Profile';
import VersionFooter from '../../../components/VersionFooter';

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
  } = route.params;
  
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
        console.log('User cancelled image picker');
        return;
      }

      if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'Failed to pick image');
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Accept SVG, PNG, JPG, and other image files
        if (asset.type && (asset.type.includes('svg') || asset.type.includes('image'))) {
          if (type === 'logo') {
            setLogoFile(asset);
          } else {
            setCoverFile(asset);
          }
        } else {
          Alert.alert('Invalid File', 'Please select an image file (SVG, PNG, JPG, etc.)');
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
      Alert.alert('Missing Logo', 'Please upload your business logo before continuing');
      return;
    }
    // Navigate to next step and pass all data forward
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Toolbar
        title="Business Access"
        onBack={() => navigation.goBack()}
        showSettings={false}
      />
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          <View style={styles.container}>
            <Text style={[iOSUIKit.largeTitleEmphasized, { color: colors.text, marginBottom: 16 }]}>
              Business Creation - Step 2
            </Text>
            <Text style={[iOSUIKit.body, { color: colors.text, marginVertical: 20 }]}>
              Upload your business logo and cover photo to make your profile stand out. This helps customers recognize your brand easily.
            </Text>
            
            {/* Logo Upload */}
            <View style={styles.uploadSection}>
              <Text style={[iOSUIKit.subhead, { color: colors.text, marginBottom: 8, fontWeight: '600' }]}>
                Business Logo *
              </Text>
              <TouchableOpacity
                style={[styles.uploadBox, { borderColor: colors.border }]}
                onPress={() => pickImage('logo')}
              >
                {logoFile ? (
                  <View style={styles.imagePreview}>
                    <Image
                      source={{ uri: logoFile.uri }}
                      style={styles.previewImage}
                      resizeMode="contain"
                    />
                    <TouchableOpacity
                      style={[styles.removeButton, { backgroundColor: colors.error }]}
                      onPress={() => removeImage('logo')}
                    >
                      <Icon name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Icon name="add-photo-alternate" size={48} color={colors.textSecondary} />
                    <Text style={[iOSUIKit.footnote, { color: colors.textSecondary, marginTop: 8 }]}>
                      Tap to upload logo (SVG, PNG, JPG)
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Cover Photo Upload */}
            <View style={styles.uploadSection}>
              <Text style={[iOSUIKit.subhead, { color: colors.text, marginBottom: 8, fontWeight: '600' }]}>
                Cover Photo (Optional)
              </Text>
              <TouchableOpacity
                style={[styles.uploadBoxCover, { borderColor: colors.border }]}
                onPress={() => pickImage('cover')}
              >
                {coverFile ? (
                  <View style={styles.imagePreviewCover}>
                    <Image
                      source={{ uri: coverFile.uri }}
                      style={styles.previewImageCover}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={[styles.removeButton, { backgroundColor: colors.error }]}
                      onPress={() => removeImage('cover')}
                    >
                      <Icon name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Icon name="add-photo-alternate" size={48} color={colors.textSecondary} />
                    <Text style={[iOSUIKit.footnote, { color: colors.textSecondary, marginTop: 8 }]}>
                      Tap to upload cover photo (SVG, PNG, JPG)
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                padding: 15,
                borderRadius: 10,
                marginTop: 24,
                marginBottom: 40,
                alignItems: 'center',
              }}
              onPress={handleNext}
            >
              <Text style={{ color: colors.background, fontWeight: 'bold', fontSize: 16 }}>
                Next Step
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 150,
  },
  container: {
    padding: 24,
  },
  uploadSection: {
    marginBottom: 24,
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 168, // 200 - (16 padding * 2)
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 168,
    borderRadius: 8,
  },
  uploadBoxCover: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imagePreviewCover: {
    width: '100%',
    height: 118, // 150 - (16 padding * 2)
    position: 'relative',
  },
  previewImageCover: {
    width: '100%',
    height: 118,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BusinessCreationScreen2;

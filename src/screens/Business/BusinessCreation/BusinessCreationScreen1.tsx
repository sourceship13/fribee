import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { useAuth } from '../../../libs/hooks/useAuth';
import { getColors } from '../../../libs/colors';
import Toolbar from '../../../components/Toolbar';
import Icon from 'react-native-vector-icons/MaterialIcons';

const COUNTRIES = ['United States', 'Canada', 'Mexico', 'United Kingdom'];
const STATES: Record<string, string[]> = {
  'United States': [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
    'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
    'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
    'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
    'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
  ],
  Canada: ['Ontario', 'Quebec', 'British Columbia', 'Alberta', 'Manitoba', 'Saskatchewan'],
  Mexico: ['Mexico City', 'Jalisco', 'Nuevo León', 'Puebla', 'Guanajuato'],
  'United Kingdom': ['England', 'Scotland', 'Wales', 'Northern Ireland'],
};

const BusinessCreationScreen1 = ({ navigation, route }: any) => {
  const { isDarkMode } = useAuth();
  const colors = getColors(isDarkMode);

  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('United States');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [businessUrl, setBusinessUrl] = useState('');

  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);

  const inputStyle = {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  };

  const renderDropdown = (
    value: string,
    placeholder: string,
    onPress: () => void,
    flex?: number
  ) => (
    <TouchableOpacity
      style={[
        styles.dropdownButton,
        {
          borderColor: '#E5E5E5',
          backgroundColor: colors.background,
          flex: flex,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.dropdownText,
          { color: value ? colors.text : '#999' },
        ]}
        numberOfLines={1}
      >
        {value || placeholder}
      </Text>
      <Icon name="keyboard-arrow-down" size={24} color="#999" />
    </TouchableOpacity>
  );

  const renderPickerModal = (
    visible: boolean,
    onClose: () => void,
    options: string[],
    onSelect: (value: string) => void,
    title: string
  ) => {
    if (!visible) return null;

    return (
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.pickerModal, { backgroundColor: colors.background }]}>
          <Text style={[styles.pickerTitle, { color: colors.text }]}>{title}</Text>
          <ScrollView style={styles.pickerList}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.pickerItem}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
              >
                <Text style={[styles.pickerItemText, { color: colors.text }]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
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
            Step 1. <Text style={styles.stepTitleBold}>General Information</Text>
          </Text>
          <Text style={[styles.stepSubtitle, { color: '#666' }]}>
            Let's get started by collecting some basic information about your business
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          {/* Business Name */}
          <TextInput
            style={inputStyle}
            placeholder="Business Name"
            placeholderTextColor="#999"
            value={businessName}
            onChangeText={setBusinessName}
          />

          {/* Description */}
          <TextInput
            style={[inputStyle, styles.descriptionInput]}
            placeholder="Description of Your Business"
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Address */}
          <TextInput
            style={inputStyle}
            placeholder="Address"
            placeholderTextColor="#999"
            value={address}
            onChangeText={setAddress}
          />

          {/* City, Country, State Row */}
          <View style={styles.rowContainer}>
            <TextInput
              style={[inputStyle, styles.cityInput]}
              placeholder="City"
              placeholderTextColor="#999"
              value={city}
              onChangeText={setCity}
            />
            {/* {renderDropdown(country, 'Country', () => setShowCountryPicker(true), 1)} */}
            {renderDropdown(state, 'State', () => setShowStatePicker(true), 1)}
          </View>

          {/* Postal Code */}
          <TextInput
            style={inputStyle}
            placeholder="Postal Code"
            placeholderTextColor="#999"
            value={postalCode}
            onChangeText={setPostalCode}
            keyboardType="numeric"
          />

          {/* Phone Number */}
          <TextInput
            style={inputStyle}
            placeholder="Phone Number"
            placeholderTextColor="#999"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />

          {/* Business URL */}
          <TextInput
            style={inputStyle}
            placeholder="Business URL"
            placeholderTextColor="#999"
            value={businessUrl}
            onChangeText={setBusinessUrl}
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>
      </ScrollView>

      {/* Next Step Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={() =>
            navigation.navigate('BusinessCreationScreen2', {
              businessName,
              description,
              address,
              city,
              country,
              state,
              postalCode,
              phoneNumber,
              businessUrl,
            })
          }
        >
          <Text style={styles.nextButtonText}>Next Step</Text>
        </TouchableOpacity>
      </View>

      {/* Picker Modals */}
      {renderPickerModal(
        showCountryPicker,
        () => setShowCountryPicker(false),
        COUNTRIES,
        (value) => {
          setCountry(value);
          setState(''); // Reset state when country changes
        },
        'Select Country'
      )}
      {renderPickerModal(
        showStatePicker,
        () => setShowStatePicker(false),
        STATES[country] || STATES['United States'],
        setState,
        'Select State'
      )}
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
    marginTop:10,
  },
  formSection: {
    gap: 16,
  },
  descriptionInput: {
    height: 80,
    paddingTop: 14,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  cityInput: {
    flex: 0.8,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    minWidth: 80,
  },
  dropdownText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  nextButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModal: {
    width: '80%',
    maxHeight: '60%',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  pickerList: {
    maxHeight: 300,
  },
  pickerItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  pickerItemText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});

export default BusinessCreationScreen1;

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../../libs/hooks/useAuth';
import { getColors } from '../../../libs/colors';
import Toolbar from '../../../components/Toolbar';
import { iOSUIKit } from 'react-native-typography';
import { TextInput } from 'react-native-gesture-handler';

const BusinessCreationScreen1 = ({ navigation }: any) => {
  const { isDarkMode } = useAuth();
  const colors = getColors(isDarkMode);
  const [businessName, setBusinessName] = React.useState('Debug Business');
  const [description, setDescription] = React.useState('This is a debug business description.');
  const [address, setAddress] = React.useState('7302 Compass Rose Dr');
  const [city, setCity] = React.useState('Richmond');
  const [country, setCountry] = React.useState('United States');
  const [postalCode, setPostalCode] = React.useState('77407');
  const [state, setState] = React.useState('Texas');
  const [phoneNumber, setPhoneNumber] = React.useState('713-659-2171');
  const [businessUrl, setBusinessUrl] = React.useState('https://sera.dev');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Toolbar
        title="Business Access"
        onBack={() => navigation.goBack()}
        showSettings={false}
      />
      <View style={styles.container}>
        <Text style={[iOSUIKit.largeTitleEmphasized, { color: colors.text, marginBottom: 16 }]}>
          Business Creation - Step 1
        </Text>
        <Text style={[iOSUIKit.body, { color: colors.text, marginVertical: 20 }]}>
          This is the first step in the business creation process. More steps will be added here to guide you through setting up your business account.
        </Text>
        <Text style={[iOSUIKit.title3, { color: colors.text, marginVertical: 20 }]}>
          Let's get started by collecting some basic information about your business.
        </Text>
        <TextInput
          style={{
            height: 40,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 10,
            color: colors.text,
            backgroundColor: colors.surface,
          }}
          placeholder="Business Name"
          placeholderTextColor={colors.placeholder}
          onChangeText={(text) => setBusinessName(text)}
        />
        <TextInput
          style={{
            height: 40,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 10,
            color: colors.text,
            backgroundColor: colors.surface,
          }}
          placeholder="Description"
          placeholderTextColor={colors.placeholder}
          onChangeText={(text) => setDescription(text)}
        />
        <TextInput
          style={{
            height: 40,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 10,
            color: colors.text,
            backgroundColor: colors.surface,
          }}
          placeholder="Address"
          placeholderTextColor={colors.placeholder}
          onChangeText={(text) => setAddress(text)}
        />
        <TextInput
          style={{
            height: 40,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 10,
            color: colors.text,
            backgroundColor: colors.surface,
          }}
          placeholder="City"
          placeholderTextColor={colors.placeholder}
          onChangeText={(text) => setCity(text)}
        />
        <TextInput
          style={{
            height: 40,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 10,
            color: colors.text,
            backgroundColor: colors.surface,
          }}
          placeholder="Country"
          placeholderTextColor={colors.placeholder}
          onChangeText={(text) => setCountry(text)}
        />
        <TextInput
          style={{
            height: 40,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 10,
            color: colors.text,
            backgroundColor: colors.surface,
          }}
          placeholder="State"
          placeholderTextColor={colors.placeholder}
          onChangeText={(text) => setState(text)}
        />
        <TextInput
          style={{
            height: 40,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 10,
            color: colors.text,
            backgroundColor: colors.surface,
          }}
          placeholder="Postal Code"
          placeholderTextColor={colors.placeholder}
          onChangeText={(text) => setPostalCode(text)}
        />
        <TextInput
          style={{
            height: 40,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 10,
            color: colors.text,
            backgroundColor: colors.surface,
          }}
          placeholder="Phone Number"
          placeholderTextColor={colors.placeholder}
          onChangeText={(text) => setPhoneNumber(text)}
        />
        <TextInput
          style={{
            height: 40,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 10,
            color: colors.text,
            backgroundColor: colors.surface,
          }}
          placeholder="Business Url"
          placeholderTextColor={colors.placeholder}
          onChangeText={(text) => setBusinessUrl(text)}
        />
      </View>
      <TouchableOpacity
        style={{
          backgroundColor: colors.primary,
          padding: 15,
          borderRadius: 10,
          margin: 24,
          alignItems: 'center',
        }}
        onPress={() => navigation.navigate('BusinessCreationScreen2', {
          businessName,
          description,
          address,
          city,
          country,
          state,
          postalCode,
          phoneNumber,
          businessUrl,
        })}
      >
        <Text style={{ color: colors.background, fontWeight: 'bold', fontSize: 16 }}>
          Next Step
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
});

export default BusinessCreationScreen1;

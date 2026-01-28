import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { useAuth } from '../../libs/hooks/useAuth';
import { getColors } from '../../libs/colors';
import AuthService from '../../services/auth.service';
import { iOSUIKit } from 'react-native-typography';
import VersionFooter from '../../components/VersionFooter';

const fieldKeys = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'password',
] as const;
const fieldLabels = [
  'First Name',
  'Last Name',
  'Email',
  'Phone Number',
  'Password',
];

const SignUpScreen = ({ navigation }: any) => {
  const { isDarkMode } = useAuth();
  const colors = getColors(isDarkMode);

  const [fields, setFields] = useState({
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    phone: '(555) 123-4567',
    password: 'TestPass123!',
  });

  const [confirmPassword, setConfirmPassword] = useState('TestPass123!');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  // Validate form
  const validateForm = () => {
    const newErrors: any = {};

    console.log('=== VALIDATION STARTING ===');
    console.log('Fields state:', JSON.stringify(fields, null, 2));
    console.log('Confirm password:', confirmPassword);

    // Email validation
    if (!fields.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(fields.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation
    console.log('Password validation check:');
    console.log('  - Password exists:', !!fields.password);
    console.log('  - Password value:', fields.password);
    console.log('  - Password length:', fields.password?.length);

    if (!fields.password) {
      console.log('  - ERROR: Password is required');
      newErrors.password = 'Password is required';
    } else if (fields.password.length < 8) {
      console.log('  - ERROR: Password too short');
      newErrors.password = 'Password must be at least 8 characters';
    } else {
      console.log('  - Password validation PASSED');
    }
    // Removed strict character type requirements to support password managers
    // Any 8+ character password is now accepted

    // Confirm password
    console.log('Confirm password check:');
    console.log('  - Password:', fields.password);
    console.log('  - Confirm:', confirmPassword);
    console.log('  - Match:', fields.password === confirmPassword);

    if (fields.password !== confirmPassword) {
      console.log('  - ERROR: Passwords do not match');
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Phone validation (optional)
    if (fields.phone && !/^\+?[\d\s-()]+$/.test(fields.phone)) {
      newErrors.phone = 'Invalid phone number';
    }

    console.log('=== VALIDATION COMPLETE ===');
    console.log('Errors:', newErrors);

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle registration with auth service
  const handleSignUp = async () => {
    console.log('Sign up button pressed. Current fields:', fields);
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      // Call the auth service register method
      const result = await AuthService.register({
        email: fields.email.toLowerCase().trim(),
        password: fields.password,
        first_name: fields.firstName.trim(),
        last_name: fields.lastName.trim(),
        phone_number: fields.phone.trim(),
      });
      // Registration successful - user will be handled by auth context
      // Show success and navigate
      Alert.alert(
        'Welcome to DEALZ! 🎉',
        'Your account has been created successfully. Please check your email to verify your account.',
        [
          {
            text: 'OK',
            onPress: () =>
              navigation.navigate('Verification', {
                phoneNumber: fields.phone.trim(),
              }),
          },
        ],
      );
      // Clear form
      setFields({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
      });
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert(
        'Registration Failed',
        error.message || 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle social sign up (placeholder for now)
  const handleSocialSignUp = (provider: string) => {
    Alert.alert('Coming Soon', `${provider} sign up will be available soon!`, [
      { text: 'OK' },
    ]);
    // TODO: Implement OAuth when backend supports it
  };

  // Update field and clear error
  const updateField = (key: (typeof fieldKeys)[number], value: string) => {
    console.log('Field updated:', key, 'Value:', value);
    setFields({ ...fields, [key]: value });
    // If password is updated via autofill, also update confirm password
    if (key === 'password' && value.length >= 8) {
      console.log('Auto-filling confirm password to match');
      setConfirmPassword(value);
    }
    if (errors[key]) {
      setErrors({ ...errors, [key]: null });
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { backgroundColor: colors.background },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            Create Account
          </Text>

          {/* Form Fields */}
          {fieldLabels.map((field, idx) => (
            <View key={field} style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, backgroundColor: colors.surface },
                  errors[fieldKeys[idx]] && styles.inputError,
                ]}
                placeholder={field}
                placeholderTextColor={colors.textPlaceholder}
                value={fields[fieldKeys[idx]]}
                onChangeText={text => updateField(fieldKeys[idx], text)}
                secureTextEntry={field === 'Password'}
                keyboardType={
                  field === 'Email'
                    ? 'email-address'
                    : field === 'Phone Number'
                    ? 'phone-pad'
                    : 'default'
                }
                autoCapitalize={
                  field === 'Email' || field === 'Password'
                    ? 'none'
                    : 'sentences'
                }
                textContentType={
                  field === 'Email'
                    ? 'emailAddress'
                    : field === 'Password'
                    ? 'newPassword'
                    : field === 'Phone Number'
                    ? 'telephoneNumber'
                    : field === 'First Name'
                    ? 'givenName'
                    : field === 'Last Name'
                    ? 'familyName'
                    : 'none'
                }
                editable={!loading}
              />
              {errors[fieldKeys[idx]] && (
                <Text
                  style={[
                    styles.errorText,
                    { color: colors.error || '#ff3b30' },
                  ]}
                >
                  {errors[fieldKeys[idx]]}
                </Text>
              )}
            </View>
          ))}

          {/* Confirm Password Field */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, backgroundColor: colors.surface },
                errors.confirmPassword && styles.inputError,
              ]}
              placeholder="Confirm Password"
              placeholderTextColor={colors.textPlaceholder}
              value={confirmPassword}
              onChangeText={text => {
                console.log('Confirm password updated:', text);
                setConfirmPassword(text);
                if (errors.confirmPassword) {
                  setErrors({ ...errors, confirmPassword: null });
                }
              }}
              secureTextEntry={true}
              autoCapitalize="none"
              textContentType="newPassword"
              editable={!loading}
            />
            {errors.confirmPassword && (
              <Text
                style={[styles.errorText, { color: colors.error || '#ff3b30' }]}
              >
                {errors.confirmPassword}
              </Text>
            )}
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.text },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={{ color: colors.background, fontWeight: 'bold' }}>
                Join DEALZ
              </Text>
            )}
          </TouchableOpacity>

          {/* Sign In Link */}
          <TouchableOpacity
            onPress={() => navigation.navigate('SignIn')}
            disabled={loading}
          >
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>
              Already have an account?
              <Text style={{ color: colors.text, fontWeight: 'bold' }}>
                {' '}
                Sign In
              </Text>
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View
              style={[styles.dividerLine, { backgroundColor: colors.border }]}
            />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>
              OR
            </Text>
            <View
              style={[styles.dividerLine, { backgroundColor: colors.border }]}
            />
          </View>

          {/* Social Sign Up Buttons */}
          <View style={styles.socialContainer}>
            <TouchableOpacity
              style={[
                styles.socialBtn,
                {
                  backgroundColor: colors.google,
                  borderColor: colors.border,
                  borderWidth: 1,
                },
              ]}
              onPress={() => handleSocialSignUp('Google')}
              disabled={loading}
            >
              <FontAwesome
                name="google"
                size={22}
                color={colors.background}
                style={styles.socialIcon}
              />
              <Text style={[styles.socialText, { color: colors.background }]}>
                Sign up with Google
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: colors.facebook }]}
              onPress={() => handleSocialSignUp('Facebook')}
              disabled={loading}
            >
              <FontAwesome
                name="facebook"
                size={22}
                color={colors.background}
                style={styles.socialIcon}
              />
              <Text style={[styles.socialText, { color: colors.background }]}>
                Sign up with Facebook
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: colors.instagram }]}
              onPress={() => handleSocialSignUp('Instagram')}
              disabled={loading}
            >
              <FontAwesome
                name="instagram"
                size={22}
                color={colors.background}
                style={styles.socialIcon}
              />
              <Text style={[styles.socialText, { color: colors.background }]}>
                Sign up with Instagram
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: colors.apple }]}
              onPress={() => handleSocialSignUp('Apple')}
              disabled={loading}
            >
              <FontAwesome5
                name="apple"
                size={22}
                color={colors.background}
                style={styles.socialIcon}
                iconStyle="brand"
              />
              <Text style={[styles.socialText, { color: colors.background }]}>
                Sign up with Apple
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <VersionFooter />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: StyleSheet.flatten([
    iOSUIKit.largeTitleEmphasized,
    {
      marginBottom: 16,
    },
  ]),
  inputWrapper: {
    width: '100%',
    marginBottom: 16,
  },
  input: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      width: '100%',
      borderRadius: 12,
      padding: 16,
    },
  ]),
  inputError: {
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  errorText: StyleSheet.flatten([
    iOSUIKit.caption2,
    {
      marginTop: 4,
      marginLeft: 8,
    },
  ]),
  button: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  linkText: StyleSheet.flatten([
    iOSUIKit.subhead,
    {
      textAlign: 'center',
      marginBottom: 20,
    },
  ]),
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: StyleSheet.flatten([
    iOSUIKit.subhead,
    {
      marginHorizontal: 10,
    },
  ]),
  socialContainer: {
    width: '100%',
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    justifyContent: 'center',
  },
  socialIcon: {
    marginRight: 12,
  },
  socialText: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      fontWeight: 'bold',
    },
  ]),
});

export default SignUpScreen;

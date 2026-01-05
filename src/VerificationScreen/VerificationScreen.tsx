import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../libs/hooks/useAuth';
import { getColors } from '../libs/colors';
import Toolbar from '../components/Toolbar';
import ApiService from '../services/api.service';
import authService from '../services/auth.service'; // Add this import
import { iOSUIKit } from 'react-native-typography';


const VerificationScreen = ({ navigation, route }: any) => {
  const { isDarkMode } = useAuth();
  const colors = getColors(isDarkMode);

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0); // Add timer for resend button
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Get identifier (phone or email) from route params
  const identifier = route?.params?.phoneNumber || route?.params?.email || '';
  const verificationMethod = route?.params?.verificationMethod || 'sms';

  useEffect(() => {
    // Focus the first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  useEffect(() => {
    // Countdown timer for resend button
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleCodeChange = (value: string, index: number) => {
    // Handle SMS auto-completion - if multiple digits pasted
    if (value.length > 1) {
      handlePaste(value);
      return;
    }

    // Only allow digits
    const digit = value.replace(/\D/g, '');

    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Auto-advance to next input if value entered
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits entered
    if (digit && index === 5) {
      const fullCode = [...newCode].join('');
      if (fullCode.length === 6) {
        verifyCode(fullCode);
      }
    }
  };

  const handleBackspace = (value: string, index: number) => {
    const newCode = [...code];

    if (value === '') {
      // Clear current position
      newCode[index] = '';
      setCode(newCode);

      // Move to previous input
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (text: string) => {
    // Handle SMS auto-completion or manual paste
    const digits = text.replace(/\D/g, '').slice(0, 6);
    const newCode = ['', '', '', '', '', ''];

    for (let i = 0; i < digits.length; i++) {
      newCode[i] = digits[i];
    }

    setCode(newCode);

    // Auto-submit if 6 digits pasted
    if (digits.length === 6) {
      verifyCode(digits);
    } else {
      // Focus the next empty input
      const nextEmptyIndex = newCode.findIndex(digit => digit === '');
      const focusIndex =
        nextEmptyIndex === -1 ? 5 : Math.max(0, nextEmptyIndex);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const verifyCode = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join('');

    if (codeToVerify.length !== 6) {
      Alert.alert('Error', 'Please enter a complete 6-digit code');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.verifyCode(identifier, codeToVerify);

      if (result.success) {
        Alert.alert('Success', 'Account verified successfully! Please sign in.', [
          { text: 'OK', onPress: () => navigation.navigate('SignIn') },
        ]);
      } else {
        Alert.alert('Error', result.message || 'Invalid verification code');
        // Clear the code for retry
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      Alert.alert(
        'Error',
        error.message || 'Verification failed. Please try again.',
      );
      // Clear code on error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const resendCode = async () => {
    if (resendTimer > 0) return; // Prevent spam while timer is active

    try {
      const result = await authService.resendVerificationCode(identifier);

      if (result.success) {
        Alert.alert(
          'Code Sent!',
          `A new verification code has been sent via ${
            result.method || 'SMS'
          }.`,
        );

        // Set 30 second cooldown
        setResendTimer(30);

        // Clear the current code inputs
        setCode(['', '', '', '', '', '']);

        // Focus first input
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      } else {
        Alert.alert('Error', result.message || 'Failed to resend code');
      }
    } catch (error: any) {
      console.error('Resend error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to resend code. Please try again.',
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Toolbar title="Verify Account" onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>
          Enter Verification Code
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          We sent a 6-digit code to{'\n'}
          {identifier}
        </Text>

        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <View
              key={index}
              style={[
                styles.codeInputWrapper,
                {
                  backgroundColor: colors.surface,
                  borderColor: digit ? colors.primary : colors.border,
                  borderWidth: digit ? 2 : 1,
                },
              ]}
            >
              <TextInput
                ref={ref => {
                  inputRefs.current[index] = ref;
                }}
                style={[styles.codeInput, { color: colors.text }]}
                value={digit}
                onChangeText={value => handleCodeChange(value, index)}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Backspace') {
                    handleBackspace(digit, index);
                  }
                }}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                textAlign="center"
                // Remove caretHidden - it can cause issues
                // caretHidden
                textContentType={index === 0 ? 'oneTimeCode' : undefined}
                autoComplete={index === 0 ? 'sms-otp' : undefined}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.verifyButton,
            {
              backgroundColor:
                code.join('').length === 6 ? colors.primary : colors.disabled,
            },
          ]}
          onPress={() => verifyCode()}
          disabled={isLoading || code.join('').length !== 6}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            {isLoading ? 'Verifying...' : 'Verify Code'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.resendButton, { opacity: resendTimer > 0 ? 0.5 : 1 }]}
          onPress={resendCode}
          disabled={resendTimer > 0}
        >
          <Text style={[styles.resendText, { color: colors.primary }]}>
            {resendTimer > 0
              ? `Resend code in ${resendTimer}s`
              : "Didn't receive the code? Resend"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: StyleSheet.flatten([
    iOSUIKit.title3Emphasized,
    {
      marginBottom: 8,
      textAlign: 'center',
    }
  ]),
  subtitle: StyleSheet.flatten([
    iOSUIKit.body,
    {
      textAlign: 'center',
      marginBottom: 40,
    }
  ]),
  hiddenInput: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      width: '100%',
      maxWidth: 280,
      height: 50,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 12,
      marginBottom: 20,
    }
  ]),
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 280,
    marginBottom: 40,
  },
  codeInputWrapper: {
    width: 40,
    height: 50,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeInput: StyleSheet.flatten([
    iOSUIKit.title3Emphasized,
    {
      width: 40,
      height: 50,
      fontSize: 24, // Keep larger size for code input visibility
      textAlign: 'center',
      backgroundColor: 'transparent',
    }
  ]),
  verifyButton: {
    width: '100%',
    maxWidth: 280,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: StyleSheet.flatten([
    iOSUIKit.body,
    {
      fontWeight: 'bold',
    }
  ]),
  resendButton: {
    padding: 12,
  },
  resendText: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      textDecorationLine: 'underline',
    }
  ]),
});

export default VerificationScreen;

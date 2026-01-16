import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Animated,
  SafeAreaView,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { iOSUIKit } from 'react-native-typography';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useAuth, getColors } from '../../libs/hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
const FribeeLogoPNG = require('../../../assets/imgs/fribee-logo.png');

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const slides: Slide[] = [
  {
    id: '1',
    title: 'Discover Amazing Deals',
    description:
      'Browse through exclusive local deals from your favorite businesses right in your area.',
    icon: 'local-offer',
    color: '#667eea',
  },
  {
    id: '2',
    title: 'Share & Unlock',
    description:
      'Share deals with your friends to unlock exclusive offers. The more you share, the more you save!',
    icon: 'share',
    color: '#764ba2',
  },
  {
    id: '3',
    title: 'Redeem Your Rewards',
    description:
      "Once you've unlocked a deal, redeem it at the business and enjoy your savings.",
    icon: 'card-giftcard',
    color: '#f093fb',
  },
];

const OnboardingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { isDarkMode, markOnboardingAsComplete } = useAuth();
  const colors = getColors(isDarkMode);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  };

  const handleSkip = () => {
    setShowSkipModal(true);
  };

  const handleSkipConfirm = async (showAgain: boolean) => {
    // Save preference to AsyncStorage
    await AsyncStorage.setItem(
      'showOnboardingAgain',
      JSON.stringify(showAgain),
    );
    setShowSkipModal(false);
    await markOnboardingAsComplete();
    navigation.replace('Welcome');
  };

  const handleGetStarted = async () => {
    // Mark onboarding as complete and don't show again
    await AsyncStorage.setItem('showOnboardingAgain', JSON.stringify(false));
    await markOnboardingAsComplete();
    navigation.replace('Welcome');
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false },
  );

  const handleMomentumScrollEnd = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / screenWidth);
    setCurrentIndex(index);
  };

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={[styles.slide, { backgroundColor: colors.background }]}>
      <View style={styles.slideContent}>
        {/* Icon/Logo Section */}
        <View
          style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}
        >
          <MaterialIcons name={item.icon} size={80} color={item.color} />
        </View>

        {/* Text Section */}
        <Text style={[styles.slideTitle, { color: colors.text }]}>
          {item.title}
        </Text>
        <Text
          style={[styles.slideDescription, { color: colors.textSecondary }]}
        >
          {item.description}
        </Text>
      </View>
    </View>
  );

  const dotPosition = Animated.divide(scrollX, screenWidth);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Skip Button */}
      {currentIndex < slides.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>
            Skip
          </Text>
        </TouchableOpacity>
      )}
      <View style={{ alignItems: 'center', marginVertical: 20 }}>
        {/* <FribeeLogo width={120} height={120} /> */}
        <View style={{ alignItems: 'center' }}>
          <Image
            source={FribeeLogoPNG}
            style={{ width: 120, height: 120, marginTop: 20 }}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Slides FlatList */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEnabled={true}
        showsHorizontalScrollIndicator={false}
      />

      {/* Dots Indicator */}
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => {
          const opacity = dotPosition.interpolate({
            inputRange: [index - 1, index, index + 1],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          const width = dotPosition.interpolate({
            inputRange: [index - 1, index, index + 1],
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  opacity,
                  width,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.buttonContainer}>
        {currentIndex < slides.length - 1 ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleNext}
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>
              Next
            </Text>
            <MaterialIcons
              name="arrow-forward"
              size={20}
              color={colors.background}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleGetStarted}
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>
              Get Started
            </Text>
            <MaterialIcons
              name="arrow-forward"
              size={20}
              color={colors.background}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Skip Modal */}
      <Modal
        visible={showSkipModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSkipModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: colors.background },
            ]}
          >
            <View
              style={[
                styles.modalIconContainer,
                { backgroundColor: colors.primary + '20' },
              ]}
            >
              <MaterialIcons
                name="info-outline"
                size={48}
                color={colors.primary}
              />
            </View>

            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Skip Intro?
            </Text>

            <Text
              style={[styles.modalDescription, { color: colors.textSecondary }]}
            >
              Would you like to see this intro again next time you open the app?
            </Text>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonSecondary,
                  { borderColor: colors.border },
                ]}
                onPress={() => handleSkipConfirm(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  No, Don't Show Again
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => handleSkipConfirm(true)}
              >
                <Text
                  style={[styles.modalButtonText, { color: colors.background }]}
                >
                  Yes, Show Again
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowSkipModal(false)}
            >
              <Text
                style={[
                  styles.modalCancelText,
                  { color: colors.textSecondary },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignSelf: 'flex-end',
    marginRight: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  slide: {
    width: screenWidth,
    height: screenHeight * 0.65,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  slideContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  slideTitle: StyleSheet.flatten([
    iOSUIKit.title3,
    {
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 16,
    },
  ]),
  slideDescription: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      textAlign: 'center',
      lineHeight: 24,
      paddingHorizontal: 20,
    },
  ]),
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      fontWeight: '600',
    },
  ]),
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: StyleSheet.flatten([
    iOSUIKit.title3Emphasized,
    {
      textAlign: 'center',
      marginBottom: 12,
    },
  ]),
  modalDescription: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
  ]),
  modalButtonContainer: {
    width: '100%',
    gap: 12,
  },
  modalButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    // backgroundColor set dynamically
  },
  modalButtonSecondary: {
    borderWidth: 2,
  },
  modalButtonText: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      fontWeight: '600',
    },
  ]),
  modalCancelButton: {
    marginTop: 12,
    paddingVertical: 8,
  },
  modalCancelText: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      fontWeight: '500',
    },
  ]),
});

export default OnboardingScreen;

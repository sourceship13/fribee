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
} from 'react-native';
import { iOSUIKit } from 'react-native-typography';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth, getColors } from '../../libs/hooks/useAuth';

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
    description: 'Browse through exclusive local deals from your favorite businesses right in your area.',
    icon: 'local-offer',
    color: '#667eea',
  },
  {
    id: '2',
    title: 'Share & Unlock',
    description: 'Share deals with your friends to unlock exclusive offers. The more you share, the more you save!',
    icon: 'share',
    color: '#764ba2',
  },
  {
    id: '3',
    title: 'Redeem Your Rewards',
    description: 'Once you\'ve unlocked a deal, redeem it at the business and enjoy your savings.',
    icon: 'card-giftcard',
    color: '#f093fb',
  },
];

const OnboardingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { isDarkMode, markOnboardingAsComplete } = useAuth();
  const colors = getColors(isDarkMode);
  
  const [currentIndex, setCurrentIndex] = useState(0);
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

  const handleSkip = async () => {
    await markOnboardingAsComplete();
    navigation.replace('SignIn');
  };

  const handleGetStarted = async () => {
    await markOnboardingAsComplete();
    navigation.replace('SignIn');
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
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
          style={[
            styles.iconContainer,
            { backgroundColor: item.color + '20' },
          ]}
        >
          <MaterialIcons name={item.icon} size={80} color={item.color} />
        </View>

        {/* Text Section */}
        <Text style={[styles.slideTitle, { color: colors.text }]}>
          {item.title}
        </Text>
        <Text
          style={[
            styles.slideDescription,
            { color: colors.textSecondary },
          ]}
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
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>
            Skip
          </Text>
        </TouchableOpacity>
      )}

      {/* Slides FlatList */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
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
            style={[
              styles.button,
              { backgroundColor: colors.primary },
            ]}
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
            style={[
              styles.button,
              { backgroundColor: colors.primary },
            ]}
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
});

export default OnboardingScreen;

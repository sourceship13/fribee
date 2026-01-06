import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth, getColors } from '../libs/hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { iOSUIKit } from 'react-native-typography';
import IconLogo from '../../assets/imgs/icon_logo.svg';
import SettingsIcon from '../../assets/imgs/settings-icon.svg';



interface ToolbarProps {
  title?: string;
  onBack?: () => void;
  onSettings?: () => void;
  showSettings?: boolean;
  showLogo?: boolean;
  onRedemptions?: () => void;
  showRedemptions?: boolean;
  dealId?: string;
  dealObject?: any;
  showHearted?: boolean;
  onToggleHearted?: (dealId: string, dealObject?: any) => void;
  isDealHearted?: (dealId: string) => boolean;
  backgroundColor?: string;
  skipSafeArea?: boolean;
}



const Toolbar: React.FC<ToolbarProps> = ({
  title = '',
  onBack,
  onSettings,
  showSettings,
  showLogo,
  onRedemptions,
  showRedemptions,
  dealId,
  dealObject,
  showHearted,
  onToggleHearted,
  isDealHearted,
  backgroundColor,
  skipSafeArea = false,
}) => {
  const { isDarkMode } = useAuth();
  const colors = getColors(isDarkMode);

  // Heart icon logic
  const hearted = dealId && isDealHearted ? isDealHearted(dealId) : false;

  const Wrapper = skipSafeArea ? View : SafeAreaView;
  const wrapperProps = skipSafeArea ? {} : { edges: ['top'] as const };

  return (
    <Wrapper {...wrapperProps} style={{ backgroundColor: colors.background }}>
      <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>  
        <View style={styles.leftContainer}>
          {showLogo ? (
            <IconLogo width={21} height={24} fill="#FF9500" />
          ) : onBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backBtn}
              hitSlop={{ top: 32, bottom: 32, left: 32, right: 32 }}
              activeOpacity={0.6}
              delayPressIn={0}
              delayPressOut={50}
            >
              <Ionicons name="chevron-back" size={32} color={isDarkMode ? '#fff' : '#222'} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 48 }} />
          )}
        </View>

        <View style={styles.titleContainer} pointerEvents="none">
          <Text style={[styles.title, { color: colors.title }]}>{title}</Text>
        </View>

        <View style={styles.rightButtons}>
          {showRedemptions ? (
            <TouchableOpacity
              onPress={onRedemptions}
              style={styles.redemptionsBtn}
              hitSlop={{ top: 32, bottom: 32, left: 32, right: 32 }}
              activeOpacity={0.6}
              delayPressIn={0}
              delayPressOut={50}
            >
              <Ionicons name="bookmark" size={24} color={isDarkMode ? '#fff' : '#222'} />
            </TouchableOpacity>
          ) : null}
          {showSettings ? (
            <TouchableOpacity
              onPress={onSettings}
              style={styles.settingsBtn}
              hitSlop={{ top: 32, bottom: 32, left: 32, right: 32 }}
              activeOpacity={0.6}
              delayPressIn={0}
              delayPressOut={50}
            >
              <SettingsIcon width={24} height={24} color={colors.inactive} />
            </TouchableOpacity>
          ) : null}

          {showHearted && dealId ? (
            <TouchableOpacity
              onPress={() => onToggleHearted && onToggleHearted(dealId, dealObject)}
              style={styles.settingsBtn}
              hitSlop={{ top: 32, bottom: 32, left: 32, right: 32 }}
              activeOpacity={0.6}
              delayPressIn={0}
              delayPressOut={50}
            >
              <Ionicons
                name={hearted ? "heart" : "heart-outline"}
                size={28}
                color={hearted ? '#e0245e' : isDarkMode ? '#fff' : '#222'}
              />
            </TouchableOpacity>
          ) : null}
          {!showSettings && !showRedemptions && !showHearted ? <View style={{ width: 40 }} /> : null}
        </View>
      </View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    zIndex: 10,
  },
  settingsBtn: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  rightButtons: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  redemptionsBtn: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    marginRight: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    zIndex: 10,
  },
  leftContainer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  titleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  title: StyleSheet.flatten([
    iOSUIKit.title3Emphasized,
    {
      textAlign: 'center',
    },
  ]),
});

export default Toolbar;

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useAuth, getColors } from '../../libs/hooks/useAuth';
import Icon from '@react-native-vector-icons/material-icons';
import VersionFooter from '../../components/VersionFooter';

interface FontDebugProps {
  navigation: any;
}

const FontDebug: React.FC<FontDebugProps> = ({ navigation }) => {
  const { isDarkMode } = useAuth();
  const colors = getColors(isDarkMode);

  const testFonts = [
    // System fonts
    { name: 'System', label: 'System Default' },
    { name: 'System', label: 'System Bold', weight: '700' as const },

    // Inter fonts
    { name: 'Inter', label: 'Inter (Variable)' },
    { name: 'Inter', label: 'Inter Weight 300', weight: '300' as const },
    { name: 'Inter', label: 'Inter Weight 400', weight: '400' as const },
    { name: 'Inter', label: 'Inter Weight 600', weight: '600' as const },
    { name: 'Inter', label: 'Inter Weight 700', weight: '700' as const },
    { name: 'Inter-Variable', label: 'Inter-Variable' },
    { name: 'Inter-Regular', label: 'Inter-Regular' },
    { name: 'Inter-Bold', label: 'Inter-Bold' },

    // Roboto fonts
    { name: 'Roboto', label: 'Roboto' },
    { name: 'Roboto-Regular', label: 'Roboto-Regular' },
    { name: 'Roboto-Medium', label: 'Roboto-Medium' },
    { name: 'Roboto-Bold', label: 'Roboto-Bold' },
    { name: 'Roboto', label: 'Roboto Weight 300', weight: '300' as const },
    { name: 'Roboto', label: 'Roboto Weight 500', weight: '500' as const },
    { name: 'Roboto', label: 'Roboto Weight 700', weight: '700' as const },

    // Other available fonts
    { name: 'Barlow-Regular', label: 'Barlow-Regular' },
    { name: 'Barlow-Bold', label: 'Barlow-Bold' },
    { name: 'Montserrat-Regular', label: 'Montserrat-Regular' },
    { name: 'Montserrat-Bold', label: 'Montserrat-Bold' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Font Debug
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Platform Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>
            Platform Information
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Platform: {Platform.OS}
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            OS Version: {Platform.Version}
          </Text>
        </View>

        {/* Font Tests */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Font Tests
          </Text>
          <Text
            style={[
              styles.infoText,
              { color: colors.textSecondary, marginBottom: 16 },
            ]}
          >
            If fonts are working, each line should look different.
          </Text>

          {testFonts.map((font, index) => (
            <View key={index} style={styles.fontTestRow}>
              <View style={styles.labelContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {font.label}
                </Text>
              </View>
              <View style={styles.sampleContainer}>
                <Text
                  style={[
                    styles.fontSample,
                    {
                      color: colors.text,
                      fontFamily: font.name,
                      ...(font.weight && { fontWeight: font.weight }),
                    },
                  ]}
                >
                  The quick brown fox jumps 123
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Weight Comparison */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Weight Comparison (Same Font Family)
          </Text>

          <Text style={[styles.subsectionTitle, { color: colors.text }]}>
            Inter with fontWeight:
          </Text>
          {['100', '200', '300', '400', '500', '600', '700', '800', '900'].map(
            weight => (
              <Text
                key={weight}
                style={[
                  styles.weightSample,
                  {
                    color: colors.text,
                    fontFamily: 'Inter',
                    fontWeight: weight as any,
                  },
                ]}
              >
                Weight {weight}: The quick brown fox
              </Text>
            ),
          )}

          <Text
            style={[
              styles.subsectionTitle,
              { color: colors.text, marginTop: 20 },
            ]}
          >
            Roboto with fontWeight:
          </Text>
          {['300', '400', '500', '700', '900'].map(weight => (
            <Text
              key={weight}
              style={[
                styles.weightSample,
                {
                  color: colors.text,
                  fontFamily: 'Roboto',
                  fontWeight: weight as any,
                },
              ]}
            >
              Weight {weight}: The quick brown fox
            </Text>
          ))}
        </View>

        {/* Expected Results */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Expected Results
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            ✅ <Text style={{ fontWeight: 'bold' }}>Working:</Text> Each font
            family should look visually different
          </Text>
          <Text
            style={[
              styles.infoText,
              { color: colors.textSecondary, marginTop: 8 },
            ]}
          >
            ✅ <Text style={{ fontWeight: 'bold' }}>Working:</Text> Different
            weights (300, 400, 700) should have different thickness
          </Text>
          <Text
            style={[
              styles.infoText,
              { color: colors.textSecondary, marginTop: 8 },
            ]}
          >
            ❌ <Text style={{ fontWeight: 'bold' }}>Not Working:</Text> All
            fonts look the same
          </Text>
          <Text
            style={[
              styles.infoText,
              { color: colors.textSecondary, marginTop: 8 },
            ]}
          >
            ❌ <Text style={{ fontWeight: 'bold' }}>Not Working:</Text> Weight
            changes have no effect
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      <VersionFooter />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  fontTestRow: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
    paddingBottom: 12,
  },
  labelContainer: {
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  sampleContainer: {
    marginTop: 4,
  },
  fontSample: {
    fontSize: 16,
  },
  weightSample: {
    fontSize: 16,
    marginBottom: 8,
  },
});

export default FontDebug;

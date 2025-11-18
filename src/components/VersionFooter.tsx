import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const packageJson = require('../../package.json');

const VersionFooter: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.versionText}>v{packageJson.version}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 4,
    paddingTop: 5,
    backgroundColor: 'transparent',
  },
  versionText: {
    color: 'red',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default VersionFooter;
8
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { apiConfig } from '../libs/utils/api.utils';

const packageJson = require('../../package.json');

const VersionFooter: React.FC = () => {
  const environment = apiConfig.environment;
  const environmentLabel = environment === 'production' ? 'PROD' : environment === 'staging' ? 'STAGING' : 'LOCAL';
  const environmentColor = environment === 'production' ? '#ff3b30' : environment === 'staging' ? '#ff9500' : '#34c759';
  
  return (
    <View style={styles.container}>
      <Text style={styles.versionText}>v{packageJson.version}</Text>
      <Text style={[styles.environmentText, { color: environmentColor }]}>
        {environmentLabel} • {apiConfig.baseURL.replace('https://', '').replace('http://', '')}
      </Text>
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
    marginBottom:10  },
  versionText: {
    color: 'red',
    fontSize: 12,
    fontWeight: '500',
  },
  environmentText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default VersionFooter;

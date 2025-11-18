import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import VersionFooter from '../../components/VersionFooter';

const HomeScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to NoLimitSera Deals!</Text>
      <Text style={styles.subtitle}>Your one-stop shop for amazing offers.</Text>
      <Button title="View Deals" onPress={() => navigation?.navigate('Deals')} />
      <VersionFooter />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
});

export default HomeScreen;

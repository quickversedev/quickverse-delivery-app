import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import useAuthStore from '../hooks/useAuthStore';
import { TokenStorage } from '../utils/storage';

const TokenDisplay: React.FC = () => {
  const { token, user } = useAuthStore();

  const handleShowStorageInfo = async () => {
    const storedToken = await TokenStorage.getToken();
    const hasToken = await TokenStorage.hasToken();

    Alert.alert(
      'Storage Information',
      `Stored Token: ${storedToken || 'None'}\n\n` +
        `Current User: ${JSON.stringify(user, null, 2)}\n\n` +
        `Has Token: ${hasToken}`,
      [{ text: 'OK' }],
    );
  };

  const handleClearStorage = async () => {
    Alert.alert(
      'Clear Storage',
      'This will clear the stored authentication token. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await TokenStorage.clearToken();
            Alert.alert('Success', 'Token cleared successfully');
          },
        },
      ],
    );
  };

  if (!token) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Token Information</Text>

      <View style={styles.tokenInfo}>
        <Text style={styles.label}>Current Token:</Text>
        <Text style={styles.token} numberOfLines={2}>
          {token}
        </Text>
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.label}>User:</Text>
        <Text style={styles.userText}>
          {user?.phoneNumber} ({user?.isVerified ? 'Verified' : 'Not Verified'})
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleShowStorageInfo}>
          <Text style={styles.buttonText}>Show Storage Info</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={handleClearStorage}
        >
          <Text style={[styles.buttonText, styles.clearButtonText]}>
            Clear Storage
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  tokenInfo: {
    marginBottom: 12,
  },
  userInfo: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  token: {
    fontSize: 12,
    color: '#333333',
    fontFamily: 'monospace',
    backgroundColor: '#F8F8F8',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  userText: {
    fontSize: 14,
    color: '#666666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButtonText: {
    color: '#FFFFFF',
  },
});

export default TokenDisplay;

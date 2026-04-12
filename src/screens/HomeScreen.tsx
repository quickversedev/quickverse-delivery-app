import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { FONT_FAMILY } from '../theme/typography';

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();

  const handleGoToPartner = () => {
    navigation.navigate('Partner');
  };

  const handleLogout = () => {
    logout();
    // Auth state change will switch navigator to Auth stack
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          Welcome{user?.phoneNumber ? `, ${user.phoneNumber}` : ''}
        </Text>
        <Text style={styles.subtitle}>You are now logged in.</Text>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleGoToPartner}
        >
          <Text style={styles.buttonText}>Delivery Partner</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitBold,
  },
});

export default HomeScreen;

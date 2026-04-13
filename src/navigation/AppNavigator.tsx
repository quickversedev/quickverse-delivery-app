import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import OTPScreen from '../screens/OTPScreen';
import HomeScreen from '../screens/HomeScreen';
import LoadingScreen from '../components/LoadingScreen';
import LogoutIcon from '../assets/icons/LogoutIcon';

// import LoadingScreen from '../components/LoadingScreen';
import { useAuth } from '../contexts/AuthContext';

type AuthStackParamList = {
  Login: undefined;
  OTP: undefined;
};

type AppStackParamList = {
  Home: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

const HeaderLogoutButton: React.FC = () => {
  const { logout, partnerProfile, isPartnerLoading } = useAuth();

  const partnerName = partnerProfile?.name || 'Delivery Partner';
  const profileImageUrl = partnerProfile?.profileImageUrl;
  const initials = partnerName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
  const hasRemoteImage =
    typeof profileImageUrl === 'string' && profileImageUrl.trim().length > 0;

  return (
    <View style={styles.headerRightWrap}>
      <View style={styles.headerAvatarWrap}>
        {isPartnerLoading ? (
          <Text style={styles.avatarLoading}>...</Text>
        ) : hasRemoteImage ? (
          <Image source={{ uri: profileImageUrl as string }} style={styles.headerAvatarImage} />
        ) : (
          <Text style={styles.headerAvatarFallback}>{initials || 'DP'}</Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => logout()}
        style={styles.headerRightButton}
        activeOpacity={0.8}
      >
        <View style={styles.logoutContent}>
          <LogoutIcon size={16} color="#0E6DFD" />
          <Text style={styles.logoutText}>Logout</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const renderHomeHeaderRight = () => <HeaderLogoutButton />;

const LoginNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="OTP" component={OTPScreen} />
    </AuthStack.Navigator>
  );
};

const MainAppNavigator: React.FC = () => {
  return (
    <AppStack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: true,
        headerTitle: 'Home',
        headerRight: renderHomeHeaderRight,
      }}
    >
      <AppStack.Screen
        name="Home"
        component={HomeScreen}
      />
    </AppStack.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { authData, isBootstrapping } = useAuth();

  const isAuthenticated = !!authData?.token;

  if (isBootstrapping) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainAppNavigator /> : <LoginNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator;

const styles = StyleSheet.create({
  headerRightButton: {
    paddingHorizontal: 12,
  },
  headerRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatarWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: '#EAF1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  headerAvatarFallback: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0E6DFD',
  },
  avatarLoading: {
    fontSize: 10,
    color: '#0E6DFD',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0E6DFD',
    marginLeft: 6,
  },
});

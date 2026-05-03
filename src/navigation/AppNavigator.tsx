import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import OTPScreen from '../screens/OTPScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OrderWebViewScreen from '../screens/OrderWebViewScreen';
import LoadingScreen from '../components/LoadingScreen';
import useAuthStore from '../hooks/useAuthStore';
import { rehydrateAuthStore } from '../store/authStore';
import { SafeAreaView } from 'react-native-safe-area-context';

type AuthStackParamList = {
  Login: undefined;
  OTP: undefined;
};

type AppStackParamList = {
  Home: undefined;
  Profile: undefined;
  OrderWebView: { url: string; title?: string };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

const LoginNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator
      initialRouteName="Login"
      screenOptions={{ headerShown: false }}
    >
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
        headerShown: false,
      }}
    >
      <AppStack.Screen name="Home" component={HomeScreen} />
      <AppStack.Screen name="Profile" component={ProfileScreen} />
      <AppStack.Screen name="OrderWebView" component={OrderWebViewScreen} />
    </AppStack.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { authData, isBootstrapping, isLoggedIn } = useAuthStore();

  useEffect(() => {
    rehydrateAuthStore();
  }, []);

  const isAuthenticated = isLoggedIn && !!authData?.token;

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

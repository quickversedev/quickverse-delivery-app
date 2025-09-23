import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import OTPScreen from '../screens/OTPScreen';
import DeliveryPartnerScreen from '../screens/DeliveryPartnerScreen';
import HomeScreen from '../screens/HomeScreen';

// import LoadingScreen from '../components/LoadingScreen';
import { useAuth } from '../contexts/AuthContext';

type AuthStackParamList = {
  Login: undefined;
  OTP: undefined;
};

type AppStackParamList = {
  Home: undefined;
  Partner: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

const HeaderProfileButton: React.FC = () => {
  const navigation = useNavigation<any>();
  return (
    <TouchableOpacity onPress={() => navigation.navigate('Partner')} style={styles.headerRightButton}>
      <Text style={styles.headerRightIcon}>👤</Text>
    </TouchableOpacity>
  );
};

const renderHomeHeaderRight = () => <HeaderProfileButton />;

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
    <AppStack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
      <AppStack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: true,
          headerTitle: 'Home',
          headerRight: renderHomeHeaderRight,
        }}
      />
      <AppStack.Screen name="Partner" component={DeliveryPartnerScreen} />
    </AppStack.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { authData } = useAuth();

  const isAuthenticated = !!authData?.token;
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
  headerRightIcon: {
    fontSize: 18,
  },
});

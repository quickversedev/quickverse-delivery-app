import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Home,
  LayoutDashboard,
  Wallet,
  User,
} from 'lucide-react-native';
import {
  LoginScreen,
  OTPScreen,
  OrderDeliveryScreen,
  OrderWebViewScreen,
  ProfileScreen,
  HomeScreen,
  NewHomeScreen,
  EarningsScreen,
} from '../screens';
import LoadingScreen from '../components/LoadingScreen';
import useAuthStore from '../hooks/useAuthStore';
import { rehydrateAuthStore } from '../store/authStore';
import { DeliveryPartnerOrder } from '../services/delivery-partner.service';
import { FONT_FAMILY } from '../theme/typography';
import LocationGuard from '../components/LocationGuard';

type AuthStackParamList = {
  Login: undefined;
  OTP: undefined;
};

export type MainTabParamList = {
  NewHomeTab: undefined;
  HomeTab: undefined;
  EarningsTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  OrderWebView: { url: string; title?: string };
  OrderDelivery: { order: DeliveryPartnerOrder };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS = {
  NewHomeTab: LayoutDashboard,
  HomeTab: Home,
  EarningsTab: Wallet,
  ProfileTab: User,
} as const;

const TAB_LABELS: Record<keyof MainTabParamList, string> = {
  NewHomeTab: 'Dashboard',
  HomeTab: 'Home',
  EarningsTab: 'Earnings',
  ProfileTab: 'Profile',
};

const LoginNavigator: React.FC = () => (
  <AuthStack.Navigator
    initialRouteName="Login"
    screenOptions={{ headerShown: false }}
  >
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="OTP" component={OTPScreen} />
  </AuthStack.Navigator>
);

const renderTabIcon = (route: { name: keyof MainTabParamList }, color: string, size: number) => {
  const Icon = TAB_ICONS[route.name];
  return <Icon size={size - 2} color={color} strokeWidth={2} />;
};

const MainTabNavigator: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      // eslint-disable-next-line react/no-unstable-nested-components
      tabBarIcon: ({ color, size }) => renderTabIcon(route, color, size),
      tabBarLabel: TAB_LABELS[route.name],
      tabBarActiveTintColor: '#0E6DFD',
      tabBarInactiveTintColor: '#94A3B8',
      tabBarLabelStyle: styles.tabLabel,
      tabBarStyle: styles.tabBar,
    })}
  >
    <Tab.Screen name="HomeTab" component={HomeScreen} />
    {/* <Tab.Screen name="NewHomeTab" component={NewHomeScreen} /> */}
    <Tab.Screen name="EarningsTab" component={EarningsScreen} />
    <Tab.Screen name="ProfileTab" component={ProfileScreen} />
  </Tab.Navigator>
);

const MainAppNavigator: React.FC = () => (
  <RootStack.Navigator screenOptions={{ headerShown: false }}>
    <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
    <RootStack.Screen name="OrderWebView" component={OrderWebViewScreen} />
    <RootStack.Screen name="OrderDelivery" component={OrderDeliveryScreen} />
  </RootStack.Navigator>
);

const AppNavigator: React.FC = () => {
  const { authData, isBootstrapping } = useAuthStore();

  useEffect(() => {
    rehydrateAuthStore();
  }, []);

  const isAuthenticated = authData?.token;

  if (isBootstrapping) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <LocationGuard>
          <MainAppNavigator />
        </LocationGuard>
      ) : (
        <LoginNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
  },
});

export default AppNavigator;

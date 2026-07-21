import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Wallet, User, Zap, CalendarDays } from 'lucide-react-native';
import {
  LoginScreen,
  OTPScreen,
  OrderDeliveryScreen,
  OrderWebViewScreen,
  ProfileScreen,
  HomeScreen,
  EarningsScreen,
  ShiftSelectionScreen,
  MyShiftsScreen,
  LiveOrderPoolScreen,
} from '../screens';
import LoadingScreen from '../components/LoadingScreen';
import useAuthStore from '../hooks/useAuthStore';
import { rehydrateAuthStore } from '../store/authStore';
import { DeliveryPartnerOrder } from '../services/delivery-partner.service';
import { FONT_FAMILY } from '../theme/typography';
import LocationGuard from '../components/LocationGuard';
import type { ShiftResponse } from '../types/shift.types';

type AuthStackParamList = {
  Login: undefined;
  OTP: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  PoolTab: undefined;
  ShiftsTab: undefined;
  EarningsTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  OrderWebView: { url: string; title?: string };
  OrderDelivery: { order: DeliveryPartnerOrder };
  ShiftSelection: undefined;
  MyShifts: { shifts: ShiftResponse[] };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<
  keyof MainTabParamList,
  React.FC<{ size: number; color: string; strokeWidth: number }>
> = {
  HomeTab: Home,
  PoolTab: Zap,
  ShiftsTab: CalendarDays,
  EarningsTab: Wallet,
  ProfileTab: User,
};

const TAB_LABELS: Record<keyof MainTabParamList, string> = {
  HomeTab: 'Home',
  PoolTab: 'Pool',
  ShiftsTab: 'Shifts',
  EarningsTab: 'Earnings',
  ProfileTab: 'Profile',
};

const LoginNavigator: React.FC = () => (
  <AuthStack.Navigator
    initialRouteName="Login"
    screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="OTP" component={OTPScreen} />
  </AuthStack.Navigator>
);

const renderTabIcon = (
  route: { name: keyof MainTabParamList },
  color: string,
  size: number,
) => {
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
      tabBarActiveTintColor: '#1A6BFF',
      tabBarInactiveTintColor: '#94A3B8',
      tabBarLabelStyle: styles.tabLabel,
      tabBarStyle: styles.tabBar,
    })}>
    <Tab.Screen name="HomeTab" component={HomeScreen} />
    <Tab.Screen name="PoolTab" component={LiveOrderPoolScreen} />
    <Tab.Screen name="ShiftsTab" component={ShiftSelectionScreen} />
    <Tab.Screen name="EarningsTab" component={EarningsScreen} />
    <Tab.Screen name="ProfileTab" component={ProfileScreen} />
  </Tab.Navigator>
);

const MainAppNavigator: React.FC = () => (
  <RootStack.Navigator screenOptions={{ headerShown: false }}>
    <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
    <RootStack.Screen name="OrderWebView" component={OrderWebViewScreen} />
    <RootStack.Screen name="OrderDelivery" component={OrderDeliveryScreen} />
    <RootStack.Screen name="ShiftSelection" component={ShiftSelectionScreen} />
    <RootStack.Screen name="MyShifts" component={MyShiftsScreen} />
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
    height: 60,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitBold,
  },
});

export default AppNavigator;

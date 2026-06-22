import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import authService from '../services/auth.service';
import deliveryPartnerService, {
  DeliveryPartnerProfile,
} from '../services/delivery-partner.service';
import deviceRegistryService from '../services/device-registry.service';
import { TokenStorage } from '../utils/storage';

const STORAGE_KEY = 'auth-store';

export interface AuthData {
  token: string | null;
  phoneNumber: string | null;
  partnerId: string | null;
}

export interface User {
  phoneNumber: string | null;
  isVerified: boolean;
  deliveryPartnerId?: string | null;
}

interface PersistedAuthState {
  user: User | null;
  isLoggedIn: boolean;
  authData: AuthData;
  token: string | null;
  partnerProfile: DeliveryPartnerProfile | null;
}

interface AuthStoreState extends PersistedAuthState {
  isLoading: boolean;
  isBootstrapping: boolean;
  isPartnerLoading: boolean;
  verificationId: string | null;
  login: (phoneNumber: string) => Promise<void>;
  verifyOTP: (otp: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshPartnerProfile: () => Promise<void>;
  setIsBootstrapping: (value: boolean) => void;
}

const safeSetItem = async (key: string, value: string) => {
  try {
    if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
      await AsyncStorage.setItem(key, value);
    }
  } catch (error) {
    console.warn('AsyncStorage setItem failed:', error);
  }
};

const safeGetItem = async (key: string) => {
  try {
    if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
      return await AsyncStorage.getItem(key);
    }
  } catch (error) {
    console.warn('AsyncStorage getItem failed:', error);
  }
  return null;
};

const safeRemoveItem = async (key: string) => {
  try {
    if (AsyncStorage && typeof AsyncStorage.removeItem === 'function') {
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    console.warn('AsyncStorage removeItem failed:', error);
  }
};

const persistAuthState = async (state: PersistedAuthState) => {
  await safeSetItem(STORAGE_KEY, JSON.stringify(state));
};

const clearPersistedAuthState = async () => {
  await safeRemoveItem(STORAGE_KEY);
};

export const rehydrateAuthStore = async () => {
  try {
    // Helpful debugging lines kept clean
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('Available Storage Keys:', allKeys);

    const saved = await safeGetItem(STORAGE_KEY);
    console.log('Saved Auth State Payload:', saved);

    if (saved) {
      const parsed: PersistedAuthState = JSON.parse(saved);
      console.log(parsed);

      useAuthStore.setState({
        ...parsed,
        isBootstrapping: false,
        isLoading: false,
        verificationId: null,
      });

      // Synchronize standalone utility keys alongside main storage state
      await Promise.all([
        parsed.token ? TokenStorage.saveToken(parsed.token) : Promise.resolve(),
        parsed.authData.partnerId
          ? TokenStorage.savePartnerId(parsed.authData.partnerId)
          : Promise.resolve(),
        parsed.authData.phoneNumber
          ? TokenStorage.savePhoneNumber(parsed.authData.phoneNumber)
          : Promise.resolve(),
        TokenStorage.setLoggedIn(parsed.isLoggedIn),
      ]);

      console.log(
        'Auth state rehydrated successfully:',
        parsed.authData.partnerId,
      );

      if (parsed.authData.partnerId) {
        try {
          console.log('Getting profile : ', parsed.authData.partnerId);
          const profile = await deliveryPartnerService.getDeliveryPartnerById(
            parsed.authData.partnerId,
          );
          console.log('Fetched Partner Profile during rehydration:', profile);
          useAuthStore.setState({ partnerProfile: profile });
          await persistAuthState({ ...parsed, partnerProfile: profile });
        } catch (profileError) {
          console.warn(
            'Profile fetch failed during rehydration:',
            profileError,
          );
        }
      }
      return;
    }

    // Fallback path: Handle instances where only standalone keys exist (legacy data migrations)
    const [token, partnerId, phoneNumber, loggedIn] = await Promise.all([
      TokenStorage.getToken(),
      TokenStorage.getPartnerId(),
      TokenStorage.getPhoneNumber(),
      TokenStorage.isLoggedIn(),
    ]);

    if (token || partnerId || phoneNumber || loggedIn) {
      const fallbackState: PersistedAuthState = {
        user: {
          phoneNumber: phoneNumber,
          isVerified: true,
          deliveryPartnerId: partnerId,
        },
        isLoggedIn: loggedIn,
        authData: {
          token,
          phoneNumber,
          partnerId,
        },
        token,
        partnerProfile: null,
      };

      useAuthStore.setState({
        ...fallbackState,
        isBootstrapping: false,
        isLoading: false,
        verificationId: null,
      });

      // Crucial Fix: Ensure the unified fallback state gets saved directly to STORAGE_KEY
      await persistAuthState(fallbackState);
    }
  } catch (error) {
    console.warn('Failed to rehydrate auth store:', error);
  } finally {
    useAuthStore.setState({ isBootstrapping: false });
  }
};

export const useAuthStore = create<AuthStoreState>()(() => ({
  user: null,
  isLoading: false,
  isBootstrapping: true,
  isPartnerLoading: false,
  isLoggedIn: false,
  authData: {
    token: null,
    phoneNumber: null,
    partnerId: null,
  },
  token: null,
  partnerProfile: null,
  verificationId: null,

  login: async (phoneNumber: string) => {
    useAuthStore.setState({ isLoading: true });
    try {
      const verificationId = await authService.sendOtp(phoneNumber);
      useAuthStore.setState({
        verificationId,
        user: {
          phoneNumber,
          isVerified: false,
          deliveryPartnerId: null,
        },
        authData: {
          ...useAuthStore.getState().authData,
          phoneNumber,
        },
      });
    } finally {
      useAuthStore.setState({ isLoading: false });
    }
  },

  verifyOTP: async (otp: string) => {
    const { user, verificationId } = useAuthStore.getState();
    if (!user?.phoneNumber || !verificationId) {
      throw new Error('Phone number or verification session is missing.');
    }

    useAuthStore.setState({ isLoading: true });
    try {
      const response = await authService.verifyOtp(
        user.phoneNumber,
        otp,
        verificationId,
      );
      const session = response.session;

      const newState: PersistedAuthState = {
        token: session.token,
        isLoggedIn: true,
        user: {
          phoneNumber: session.phoneNumber,
          isVerified: true,
          deliveryPartnerId: session.deliveryPartnerId,
        },
        authData: {
          token: session.token,
          phoneNumber: session.phoneNumber,
          partnerId: session.deliveryPartnerId,
        },
        partnerProfile: null,
      };

      useAuthStore.setState({
        ...newState,
        verificationId: null,
      });

      // Parallelize async storage ops to maximize speed performance
      await Promise.all([
        TokenStorage.saveToken(session.token),
        TokenStorage.savePartnerId(session.deliveryPartnerId),
        TokenStorage.savePhoneNumber(session.phoneNumber),
        TokenStorage.setLoggedIn(true),
      ]);

      deviceRegistryService.updateDeviceRegistrySafe(
        session.phoneNumber,
        session.token,
      );

      if (session.deliveryPartnerId) {
        const profile = await deliveryPartnerService.getDeliveryPartnerById(
          session.deliveryPartnerId,
        );
        useAuthStore.setState({ partnerProfile: profile });
        await persistAuthState({ ...newState, partnerProfile: profile });
      } else {
        await persistAuthState({ ...newState, partnerProfile: null });
      }
    } finally {
      useAuthStore.setState({ isLoading: false });
    }
  },

  logout: async () => {
    useAuthStore.setState({ isLoading: true });
    try {
      await authService.signOut().catch(() => undefined);
    } finally {
      // Clear data out completely across all namespaces concurrently
      await Promise.all([
        TokenStorage.clearToken(),
        TokenStorage.clearPartnerId(),
        TokenStorage.clearPhoneNumber(),
        TokenStorage.clearLoggedIn(),
        clearPersistedAuthState(),
      ]);

      useAuthStore.setState({
        user: null,
        isLoading: false,
        isLoggedIn: false,
        authData: {
          token: null,
          phoneNumber: null,
          partnerId: null,
        },
        token: null,
        partnerProfile: null,
        verificationId: null,
      });
    }
  },

  refreshPartnerProfile: async () => {
    const partnerId = useAuthStore.getState().authData.partnerId;
    if (!partnerId) {
      useAuthStore.setState({ partnerProfile: null });
      return;
    }

    useAuthStore.setState({ isPartnerLoading: true });
    try {
      const profile = await deliveryPartnerService.getDeliveryPartnerById(
        partnerId,
      );
      useAuthStore.setState({ partnerProfile: profile });

      // Keep storage in sync with new profile data updates
      const currentStoreState = useAuthStore.getState();
      await persistAuthState({
        user: currentStoreState.user,
        isLoggedIn: currentStoreState.isLoggedIn,
        authData: currentStoreState.authData,
        token: currentStoreState.token,
        partnerProfile: profile,
      });
    } catch (error) {
      console.error('Error refreshing partner profile:', error);
      useAuthStore.setState({
        partnerProfile: {
          id: partnerId,
          name: 'Delivery Partner',
          profileImageUrl: null,
          totalOrders: 0,
          orderSuccess: 0,
          orderFailed: 0,
          earnings: null,
        },
      });
    } finally {
      useAuthStore.setState({ isPartnerLoading: false });
    }
  },

  setIsBootstrapping: (value: boolean) =>
    useAuthStore.setState({ isBootstrapping: value }),
}));

export default useAuthStore;

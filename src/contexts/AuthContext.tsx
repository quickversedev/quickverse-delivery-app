import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { TokenStorage } from '../utils/storage';
import authService, { AuthError } from '../services/auth.service';
import deliveryPartnerService, {
  DeliveryPartnerProfile,
} from '../services/delivery-partner.service';

interface User {
  phoneNumber: string;
  isVerified: boolean;
  deliveryPartnerId?: string | null;
}

interface AuthData {
  token: string | null;
  phoneNumber: string | null;
  partnerId: string | null;
}

interface PartnerProfile extends DeliveryPartnerProfile {}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isBootstrapping: boolean;
  isPartnerLoading: boolean;
  login: (phoneNumber: string) => Promise<void>;
  verifyOTP: (otp: string) => Promise<void>;
  logout: () => Promise<void>;
  // Aligned with common patterns: signIn/signOut and exposing authData
  signIn: (
    token: string,
    phoneNumber: string,
    partnerId?: string | null,
  ) => void;
  signOut: () => void;
  authData: AuthData;
  token: string | null;
  partnerProfile: PartnerProfile | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const toAuthError = (error: unknown): AuthError => {
    const err = error as Partial<AuthError>;
    return {
      status: typeof err?.status === 'number' ? err.status : 500,
      message:
        typeof err?.message === 'string' && err.message.trim().length > 0
          ? err.message
          : 'Authentication failed. Please try again.',
      isCancelled: Boolean(err?.isCancelled),
    };
  };

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isPartnerLoading, setIsPartnerLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(
    null,
  );
  const [authData, setAuthData] = useState<AuthData>({
    token: null,
    phoneNumber: null,
    partnerId: null,
  });

  const loadPartnerProfile = async (partnerId: string | null) => {
    if (!partnerId) {
      setPartnerProfile(null);
      setIsPartnerLoading(false);
      return;
    }

    try {
      setIsPartnerLoading(true);
      const profile = await deliveryPartnerService.getDeliveryPartnerById(
        partnerId,
      );
      setPartnerProfile(profile);
    } catch (error) {
      console.error('Error loading delivery partner profile:', error);
      setPartnerProfile({
        id: partnerId,
        name: 'Delivery Partner',
        profileImageUrl: null,
        totalOrders: 0,
        orderSuccess: 0,
        orderFailed: 0,
        earnings: null,
      });
    } finally {
      setIsPartnerLoading(false);
    }
  };

  useEffect(() => {
    // Initialize storage and check for existing token
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setIsLoading(true);

      // Check if there's an existing token
      const hasToken = TokenStorage.hasToken();
      const storedPartnerId = TokenStorage.getPartnerId();

      if (hasToken) {
        // User has a token, consider them logged in
        const storedToken = TokenStorage.getToken();
        setToken(storedToken);
        setAuthData({
          token: storedToken,
          phoneNumber: null,
          partnerId: storedPartnerId,
        });

        // Optionally: validate token with backend here
        setUser({
          phoneNumber: 'User',
          isVerified: true,
          deliveryPartnerId: storedPartnerId,
        });

        if (storedPartnerId) {
          await loadPartnerProfile(storedPartnerId);
        } else {
          setPartnerProfile(null);
        }

        console.log('User restored from token:', storedToken);
      } else {
        // No token, user needs to login
        setUser(null);
        setToken(null);
        setAuthData({ token: null, phoneNumber: null, partnerId: null });
        setPartnerProfile(null);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      setUser(null);
      setToken(null);
      setAuthData({ token: null, phoneNumber: null, partnerId: null });
      setPartnerProfile(null);
    } finally {
      setIsLoading(false);
      setIsBootstrapping(false);
    }
  };

  const login = async (phoneNumber: string): Promise<void> => {
    try {
      setIsLoading(true);
      const vId = await authService.sendOtp(phoneNumber);
      setVerificationId(vId);
      setUser({ phoneNumber, isVerified: false });
    } catch (error) {
      throw toAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (otp: string): Promise<void> => {
    try {
      setIsLoading(true);
      if (!user?.phoneNumber || !verificationId) {
        throw toAuthError({
          status: 400,
          message: 'Phone number or verification session is missing.',
        });
      }
      const { session } = await authService.verifyOtp(
        user.phoneNumber,
        otp,
        verificationId,
      );
      TokenStorage.saveToken(session.token);
      TokenStorage.savePartnerId(session.deliveryPartnerId);
      setToken(session.token);
      setUser({
        phoneNumber: session.phoneNumber,
        isVerified: true,
        deliveryPartnerId: session.deliveryPartnerId,
      });
      setAuthData({
        token: session.token,
        phoneNumber: session.phoneNumber,
        partnerId: session.deliveryPartnerId,
      });
      await loadPartnerProfile(session.deliveryPartnerId);
      setVerificationId(null);
    } catch (error) {
      throw toAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await authService.signOut().catch(() => undefined);
    } finally {
      TokenStorage.clearToken();
      TokenStorage.clearPartnerId();
      setUser(null);
      setToken(null);
      setVerificationId(null);
      setAuthData({ token: null, phoneNumber: null, partnerId: null });
      setPartnerProfile(null);
      setIsPartnerLoading(false);
      setIsLoading(false);
      console.log('User logged out and token cleared');
    }
  };

  // Aliases aligned with common auth flow articles
  const signIn = (
    newToken: string,
    phoneNumber: string,
    partnerId: string | null = null,
  ) => {
    TokenStorage.saveToken(newToken);
    TokenStorage.savePartnerId(partnerId);
    setToken(newToken);
    setUser({ phoneNumber, isVerified: true, deliveryPartnerId: partnerId });
    setAuthData({ token: newToken, phoneNumber, partnerId });
    loadPartnerProfile(partnerId).catch(() => undefined);
  };

  const signOut = () => {
    logout();
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isBootstrapping,
    login,
    verifyOTP,
    logout,
    signIn,
    signOut,
    authData,
    token,
    partnerProfile,
    isPartnerLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

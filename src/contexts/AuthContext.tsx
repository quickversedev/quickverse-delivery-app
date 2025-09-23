import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TokenStorage } from '../utils/storage';
import authService from '../services/auth.service';

interface User {
  phoneNumber: string;
  isVerified: boolean;
}

interface AuthData {
  token: string | null;
  phoneNumber: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (phoneNumber: string) => Promise<void>;
  verifyOTP: (otp: string) => Promise<boolean>;
  logout: () => void;
  // Aligned with common patterns: signIn/signOut and exposing authData
  signIn: (token: string, phoneNumber: string) => void;
  signOut: () => void;
  authData: AuthData;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [authData, setAuthData] = useState<AuthData>({ token: null, phoneNumber: null });

  useEffect(() => {
    // Initialize storage and check for existing token
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setIsLoading(true);
      
      // Check if there's an existing token
      const hasToken = TokenStorage.hasToken();
      
      if (hasToken) {
        // User has a token, consider them logged in
        const storedToken = TokenStorage.getToken();
        setToken(storedToken);
        setAuthData({ token: storedToken, phoneNumber: null });
        
        // Optionally: validate token with backend here
        setUser({
          phoneNumber: 'User',
          isVerified: true
        });
        
        console.log('User restored from token:', storedToken);
      } else {
        // No token, user needs to login
        setUser(null);
        setToken(null);
        setAuthData({ token: null, phoneNumber: null });
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      setUser(null);
      setToken(null);
      setAuthData({ token: null, phoneNumber: null });
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (phoneNumber: string): Promise<void> => {
    try {
      setIsLoading(true);
      const vId = await authService.sendOtp(phoneNumber);
      setVerificationId(vId);
      setUser({ phoneNumber, isVerified: false });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (otp: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      if (!user?.phoneNumber || !verificationId) return false;
      const { session } = await authService.verifyOtp(user.phoneNumber, otp, verificationId);
      TokenStorage.saveToken(session.token);
      setToken(session.token);
      setUser({ phoneNumber: session.phoneNumber, isVerified: true });
      setAuthData({ token: session.token, phoneNumber: session.phoneNumber });
      setVerificationId(null);
      return true;
    } catch (error) {
      console.error('OTP verification error:', error);
      return false;
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
      setUser(null);
      setToken(null);
      setVerificationId(null);
      setAuthData({ token: null, phoneNumber: null });
      setIsLoading(false);
      console.log('User logged out and token cleared');
    }
  };

  // Aliases aligned with common auth flow articles
  const signIn = (newToken: string, phoneNumber: string) => {
    TokenStorage.saveToken(newToken);
    setToken(newToken);
    setUser({ phoneNumber, isVerified: true });
    setAuthData({ token: newToken, phoneNumber });
  };

  const signOut = () => {
    logout();
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    verifyOTP,
    logout,
    signIn,
    signOut,
    authData,
    token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

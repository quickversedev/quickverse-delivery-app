import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = '@AuthToken';
const PARTNER_ACTIVE_KEY = '@PartnerActive';
const PARTNER_ID_KEY = '@PartnerId';
const PHONE_NUMBER_KEY = '@PhoneNumber';
const IS_LOGGED_IN_KEY = '@IsLoggedIn';

export const TokenStorage = {
  async saveToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  },

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  async clearToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing token:', error);
    }
  },

  async hasToken(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  },

  async savePartnerId(partnerId: string | null): Promise<void> {
    try {
      if (!partnerId) {
        await AsyncStorage.removeItem(PARTNER_ID_KEY);
      } else {
        await AsyncStorage.setItem(PARTNER_ID_KEY, partnerId);
      }
    } catch (error) {
      console.error('Error saving partner ID:', error);
    }
  },

  async getPartnerId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(PARTNER_ID_KEY);
    } catch (error) {
      console.error('Error getting partner ID:', error);
      return null;
    }
  },

  async clearPartnerId(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PARTNER_ID_KEY);
    } catch (error) {
      console.error('Error clearing partner ID:', error);
    }
  },

  async savePhoneNumber(phoneNumber: string | null): Promise<void> {
    try {
      if (!phoneNumber) {
        await AsyncStorage.removeItem(PHONE_NUMBER_KEY);
      } else {
        await AsyncStorage.setItem(PHONE_NUMBER_KEY, phoneNumber);
      }
    } catch (error) {
      console.error('Error saving phone number:', error);
    }
  },

  async getPhoneNumber(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(PHONE_NUMBER_KEY);
    } catch (error) {
      console.error('Error getting phone number:', error);
      return null;
    }
  },

  async clearPhoneNumber(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PHONE_NUMBER_KEY);
    } catch (error) {
      console.error('Error clearing phone number:', error);
    }
  },

  async setLoggedIn(value: boolean): Promise<void> {
    try {
      // AsyncStorage only accepts strings, so booleans must be serialized
      await AsyncStorage.setItem(IS_LOGGED_IN_KEY, JSON.stringify(value));
    } catch (error) {
      console.error('Error setting logged in status:', error);
    }
  },

  async isLoggedIn(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(IS_LOGGED_IN_KEY);
      return value ? JSON.parse(value) : false;
    } catch (error) {
      console.error('Error checking logged in status:', error);
      return false;
    }
  },

  async clearLoggedIn(): Promise<void> {
    try {
      await AsyncStorage.removeItem(IS_LOGGED_IN_KEY);
    } catch (error) {
      console.error('Error clearing logged in status:', error);
    }
  },
};

export const PartnerStatusStorage = {
  async setActive(active: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(PARTNER_ACTIVE_KEY, JSON.stringify(active));
    } catch (error) {
      console.error('Error setting partner active status:', error);
    }
  },

  async isActive(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(PARTNER_ACTIVE_KEY);
      return value ? JSON.parse(value) : false;
    } catch (error) {
      console.error('Error checking partner active status:', error);
      return false;
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PARTNER_ACTIVE_KEY);
    } catch (error) {
      console.error('Error clearing partner active status:', error);
    }
  },
};

import { MMKV } from 'react-native-mmkv';

// Lazily create a single MMKV instance; provide safe in-memory fallback
let mmkv: MMKV | null = null;
let inMemoryToken: string | null = null;
let inMemoryPartnerId: string | null = null;

export const initializeStorage = (): void => {
  if (!mmkv) {
    try {
      mmkv = new MMKV();
    } catch (error) {
      console.warn(
        'MMKV storage failed to initialize. Falling back to in-memory storage.',
        error,
      );
      mmkv = null;
    }
  }
};

const getStorage = (): MMKV | null => {
  if (!mmkv) {
    initializeStorage();
  }
  return mmkv;
};

const AUTH_TOKEN_KEY = '@AuthToken';
const PARTNER_ACTIVE_KEY = '@PartnerActive';
const PARTNER_ID_KEY = '@PartnerId';
const PHONE_NUMBER_KEY = '@PhoneNumber';
const IS_LOGGED_IN_KEY = '@IsLoggedIn';

export const TokenStorage = {
  saveToken(token: string): void {
    const storage = getStorage();
    if (storage) {
      storage.set(AUTH_TOKEN_KEY, token);
    } else {
      inMemoryToken = token;
    }
  },

  getToken(): string | null {
    const storage = getStorage();
    if (storage) {
      return storage.getString(AUTH_TOKEN_KEY) ?? null;
    }
    return inMemoryToken;
  },

  clearToken(): void {
    const storage = getStorage();
    if (storage) {
      storage.delete(AUTH_TOKEN_KEY);
    }
    inMemoryToken = null;
  },

  hasToken(): boolean {
    const storage = getStorage();
    if (storage) {
      return storage.getString(AUTH_TOKEN_KEY) != null;
    }
    return inMemoryToken != null;
  },

  savePartnerId(partnerId: string | null): void {
    const storage = getStorage();
    if (!partnerId) {
      if (storage) {
        storage.delete(PARTNER_ID_KEY);
      }
      inMemoryPartnerId = null;
      return;
    }

    if (storage) {
      storage.set(PARTNER_ID_KEY, partnerId);
    } else {
      inMemoryPartnerId = partnerId;
    }
  },

  getPartnerId(): string | null {
    const storage = getStorage();
    if (storage) {
      return storage.getString(PARTNER_ID_KEY) ?? null;
    }
    return inMemoryPartnerId;
  },

  clearPartnerId(): void {
    const storage = getStorage();
    if (storage) {
      storage.delete(PARTNER_ID_KEY);
    }
    inMemoryPartnerId = null;
  },

  savePhoneNumber(phoneNumber: string | null): void {
    const storage = getStorage();
    if (!phoneNumber) {
      if (storage) {
        storage.delete(PHONE_NUMBER_KEY);
      }
      return;
    }
    if (storage) {
      storage.set(PHONE_NUMBER_KEY, phoneNumber);
    }
  },

  getPhoneNumber(): string | null {
    const storage = getStorage();
    if (storage) {
      return storage.getString(PHONE_NUMBER_KEY) ?? null;
    }
    return null;
  },

  clearPhoneNumber(): void {
    const storage = getStorage();
    if (storage) {
      storage.delete(PHONE_NUMBER_KEY);
    }
  },

  setLoggedIn(value: boolean): void {
    const storage = getStorage();
    if (storage) {
      storage.set(IS_LOGGED_IN_KEY, value);
    }
  },

  isLoggedIn(): boolean {
    const storage = getStorage();
    if (storage) {
      return storage.getBoolean(IS_LOGGED_IN_KEY) ?? false;
    }
    return false;
  },

  clearLoggedIn(): void {
    const storage = getStorage();
    if (storage) {
      storage.delete(IS_LOGGED_IN_KEY);
    }
  },
};

export const PartnerStatusStorage = {
  setActive(active: boolean): void {
    const storage = getStorage();
    if (storage) {
      storage.set(PARTNER_ACTIVE_KEY, active);
    }
  },
  isActive(): boolean {
    const storage = getStorage();
    if (storage) {
      return storage.getBoolean(PARTNER_ACTIVE_KEY) ?? false;
    }
    return false;
  },
  clear(): void {
    const storage = getStorage();
    if (storage) {
      storage.delete(PARTNER_ACTIVE_KEY);
    }
  },
};

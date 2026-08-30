import axios from 'axios';
import { Alert, Platform, ToastAndroid } from 'react-native';
import { ApiError } from './axios.types';
import { TokenStorage } from '../utils/storage';

type SessionExpiredCallback = () => void;
let sessionExpiredCallback: SessionExpiredCallback | null = null;

export const setSessionExpiredCallback = (callback: SessionExpiredCallback) => {
  sessionExpiredCallback = callback;
};

export const clearSessionExpiredCallback = () => {
  sessionExpiredCallback = null;
};

const showToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.TOP);
  } else {
    Alert.alert('Session Expired', message);
  }
};

export const API_CONFIG = {
  // baseURL: 'https://superscientifically-revengeless-ronald.ngrok-free.dev',
  // ankit's IP
  // local backend (use for testing new features)
  // baseURL: 'http://10.0.2.2:8080',
  // production
  baseURL: 'http://prd.quickverse.in',
  // baseURL: 'https://console-wharf-overplant.ngrok-free.dev',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Request-Origin': 'TRANSPORTER',
  },
} as const;

const axiosInstance = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: API_CONFIG.headers,
});

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

const formatJsonForLog = (value: unknown) => {
  if (value == null) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const logApiRequest = (config: any) => {
  if (!isDev) {
    return config;
  }

  const method = String(config?.method || 'get').toUpperCase();
  const url = `${config?.baseURL || API_CONFIG.baseURL || ''}${
    config?.url || ''
  }`;

  // console.log(
  //   `[API REQUEST] ${method} ${url}`,
  //   formatJsonForLog({
  //     params: config?.params,
  //     data: config?.data,
  //     headers: config?.headers,
  //   }),
  // );

  return config;
};

const logApiResponse = (response: any) => {
  if (!isDev) {
    return response;
  }

  const method = String(response?.config?.method || 'get').toUpperCase();
  const url = `${response?.config?.baseURL || API_CONFIG.baseURL || ''}${
    response?.config?.url || ''
  }`;

  // console.log(
  //   `[API RESPONSE] ${method} ${url} ${response?.status || ''}`.trim(),
  //   formatJsonForLog({
  //     data: response?.data,
  //     headers: response?.headers,
  //   }),
  // );

  return response;
};

const logApiError = (error: any) => {
  if (!isDev) {
    return Promise.reject(error);
  }

  const method = String(error?.config?.method || 'get').toUpperCase();
  const url = `${error?.config?.baseURL || API_CONFIG.baseURL || ''}${
    error?.config?.url || ''
  }`;

  console.log(
    `[API ERROR] ${method} ${url} ${error?.response?.status || ''}`.trim(),
    formatJsonForLog({
      message: error?.message,
      code: error?.code,
      response: error?.response?.data,
    }),
  );

  return Promise.reject(error);
};

// Attach Authorization header if token exists
axiosInstance.interceptors.request.use(async (config: any) => {
  const token = await TokenStorage.getToken();
  console.log(token);
  if (token) {
    const headers = (config.headers ?? {}) as any;
    headers.Authorization = `Bearer ${token}`;
    config.headers = headers;
  }
  return logApiRequest(config);
});

axiosInstance.interceptors.response.use(logApiResponse, logApiError);

const handleAxiosError = (error: any): ApiError => {
  if (!axios.isAxiosError(error)) {
    return {
      status: 500,
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      isCancelled: false,
      apiEndpoint: 'Unknown',
    };
  }

  const axiosError = error as any;

  if (axiosError.code === 'ERR_NETWORK') {
    return {
      status: (axiosError as any).response?.status || 0,
      message: 'Network error. Please check your internet connection.',
      code: 'NETWORK_ERROR',
      isCancelled: false,
      apiEndpoint: (axiosError as any).config?.url || 'Unknown',
    };
  }

  if (axiosError.code === 'ECONNABORTED') {
    return {
      status: 408,
      message:
        'Request timed out. Please check your internet connection and try again.',
      code: 'TIMEOUT',
      isCancelled: false,
      apiEndpoint: (axiosError as any).config?.url || 'Unknown',
    };
  }

  if (axios.isCancel(axiosError)) {
    return {
      status: 499,
      message: 'Request was cancelled',
      code: 'CANCELLED',
      isCancelled: true,
      apiEndpoint: (axiosError as any).config?.url || 'Unknown',
    };
  }

  if ((axiosError as any).response) {
    const responseData = (axiosError as any)?.response?.data as {
      code?: string;
      message?: string;
      error?: { code?: string; message?: string };
    };

    const errorMessage =
      responseData?.message ||
      responseData?.error?.message ||
      'An error occurred';
    const errorCode = responseData?.code || responseData?.error?.code || '';

    if (errorCode === '1047' || errorCode === '1042') {
      showToast('invalid session');
      console.log(responseData);
      sessionExpiredCallback?.();
    }

    return {
      status: (axiosError as any)?.response?.status || 500,
      message: errorMessage,
      code: errorCode,
      isCancelled: false,
      apiEndpoint: (axiosError as any).config?.url || 'Unknown',
      error: responseData || { code: errorCode, message: errorMessage },
    };
  }

  return {
    status: 500,
    message: (axiosError as any).message || 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    isCancelled: false,
    apiEndpoint: (axiosError as any).config?.url || 'Unknown',
  };
};

export const apiCall = async <T>(promise: Promise<any>): Promise<T> => {
  try {
    const response = await promise;
    return response.data;
  } catch (error) {
    console.warn('error caught in Axios Config', error);
    throw handleAxiosError(error as any);
  }
};

export const withHeaders = (extraHeaders: Record<string, string>) => {
  return {
    headers: extraHeaders,
  };
};

export const createRequestWithHeaders = (
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  url: string,
  data?: unknown,
  extraHeaders?: Record<string, string>,
) => {
  const config: { headers?: Record<string, string> } = {};

  if (extraHeaders) {
    config.headers = extraHeaders;
  }

  if (data && method !== 'get') {
    return axiosInstance[method](url, data, config);
  }

  return axiosInstance[method](url, config);
};

export default axiosInstance;

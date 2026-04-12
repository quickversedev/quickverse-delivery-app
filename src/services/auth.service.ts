import axiosInstance, { apiCall } from './axios.config';

export type AuthData = {
  session: {
    token: string;
    phoneNumber: string;
    newUser: boolean;
    name: string;
    defaultAddressId: string;
  };
};

export type AuthError = {
  status: number;
  message: string;
  isCancelled?: boolean;
};

const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

const createAuthError = (
  status: number,
  message: string,
  isCancelled = false,
): AuthError => ({
  status,
  message,
  isCancelled,
});

const normalizeAuthError = (error: unknown): AuthError => {
  const e = error as Partial<AuthError> & { code?: string };
  const status = typeof e?.status === 'number' ? e.status : 500;
  const isCancelled = Boolean(e?.isCancelled);
  const rawMessage =
    typeof e?.message === 'string' && e.message.trim().length > 0
      ? e.message
      : DEFAULT_ERROR_MESSAGE;

  if (isCancelled) {
    return createAuthError(status, 'Request was cancelled.', true);
  }

  if (status === 0) {
    return createAuthError(
      0,
      'Network error. Please check your connection and try again.',
    );
  }

  if (status === 408) {
    return createAuthError(
      408,
      'Request timed out. Please try again in a moment.',
    );
  }

  return createAuthError(status, rawMessage, isCancelled);
};

const toOnlyDigits = (value: string): string => value.replace(/\D/g, '');

interface SendOtpResponse {
  response: {
    verificationId: string;
  };
}

interface VerifyOtpResponse {
  jwt: string;
  phone: string;
  newUser: boolean;
  userName?: string;
  defaultAddressId?: string;
}

interface SignUpResponse {
  success: boolean;
  message?: string;
}

interface SignOutResponse {
  success: boolean;
  message?: string;
}

const BASIC_AUTH = 'Basic cXZDYXN0bGVFbnRyeTpjYSR0bGVfUGVybWl0QDAx';

const sendOtp = async (phoneNumber: string): Promise<string> => {
  if (!phoneNumber || phoneNumber.trim().length === 0) {
    throw createAuthError(400, 'Phone number is required');
  }

  const digits = toOnlyDigits(phoneNumber);
  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(digits)) {
    throw createAuthError(400, 'Please enter a valid 10-digit phone number');
  }

  try {
    const data = await apiCall<SendOtpResponse>(
      axiosInstance.post(
        '/v1/requestOtp',
        { phone: digits },
        { headers: { Authorization: BASIC_AUTH } },
      ),
    );

    if (!data?.response?.verificationId) {
      throw createAuthError(
        500,
        'Invalid response from server: verification ID not received',
      );
    }

    return data.response.verificationId;
  } catch (error) {
    const authError = normalizeAuthError(error);

    if (authError.status === 429) {
      throw createAuthError(
        429,
        'Too many OTP requests. Please wait before requesting another OTP.',
        authError.isCancelled,
      );
    }

    if (authError.status === 400) {
      throw createAuthError(
        400,
        authError.message || 'Invalid phone number format',
        authError.isCancelled,
      );
    }

    throw authError;
  }
};

const verifyOtp = async (
  phoneNumber: string,
  otp: string,
  verificationId: string,
): Promise<AuthData> => {
  if (!phoneNumber || phoneNumber.trim().length === 0) {
    throw createAuthError(400, 'Phone number is required');
  }
  if (!otp || otp.trim().length === 0) {
    throw createAuthError(400, 'OTP is required');
  }
  if (!verificationId || verificationId.trim().length === 0) {
    throw createAuthError(400, 'Verification ID is required');
  }

  const otpRegex = /^[0-9]{4}$/;
  if (!otpRegex.test(otp)) {
    throw createAuthError(400, 'Please enter a valid 4-digit OTP');
  }

  const digits = toOnlyDigits(phoneNumber);

  try {
    const data = await apiCall<VerifyOtpResponse>(
      axiosInstance.post(
        '/v1/login',
        {
          phone: '91' + digits,
          otp: otp,
          verificationId: verificationId,
        },
        { headers: { Authorization: BASIC_AUTH } },
      ),
    );

    if (!data?.jwt) {
      throw createAuthError(
        500,
        'Invalid response from server: authentication token not received',
      );
    }
    if (!data?.phone) {
      throw createAuthError(
        500,
        'Invalid response from server: mobile number not received',
      );
    }

    return {
      session: {
        token: data.jwt,
        phoneNumber: data.phone,
        newUser: data.newUser ?? false,
        name: data?.userName || '',
        defaultAddressId: data?.defaultAddressId || '',
      },
    };
  } catch (error) {
    const authError = normalizeAuthError(error);

    if (authError.status === 401) {
      throw createAuthError(
        401,
        authError.message || 'Invalid OTP. Please check and try again.',
        authError.isCancelled,
      );
    }
    if (authError.status === 400) {
      throw createAuthError(
        400,
        authError.message || 'Invalid OTP format',
        authError.isCancelled,
      );
    }
    if (authError.status === 422) {
      throw createAuthError(
        422,
        'OTP has expired. Please request a new OTP.',
        authError.isCancelled,
      );
    }

    throw authError;
  }
};

const signUp = async (
  fullName: string,
  dob: string,
  gender: string,
  email: string,
  jwt: string,
  phoneNumber: string,
): Promise<SignUpResponse> => {
  if (!fullName || fullName.trim().length === 0) {
    throw createAuthError(400, 'Full name is required');
  }
  if (!dob || dob.trim().length === 0) {
    throw createAuthError(400, 'Date of birth is required');
  }
  if (!gender || gender.trim().length === 0) {
    throw createAuthError(400, 'Gender is required');
  }

  const validGenders = ['MALE', 'FEMALE', 'OTHER'];
  if (!validGenders.includes(gender.toUpperCase())) {
    throw createAuthError(400, 'Gender must be MALE, FEMALE, or OTHER');
  }

  const digits = toOnlyDigits(phoneNumber);

  const data = await apiCall<SignUpResponse>(
    axiosInstance.post(
      '/v1/register/customer',
      {
        dob: dob,
        gender: gender.toUpperCase(),
        email: email,
        fullName: fullName,
        phone: digits,
      },
      {
        headers: {
          Authorization: BASIC_AUTH,
          SessionKey: jwt,
        },
      },
    ),
  );

  return data;
};

const signOut = async (): Promise<SignOutResponse> => {
  const data = await apiCall<SignOutResponse>(
    axiosInstance.delete('/v1/logout'),
  );
  return data;
};

const authService = {
  sendOtp,
  verifyOtp,
  signUp,
  signOut,
};

export default authService;

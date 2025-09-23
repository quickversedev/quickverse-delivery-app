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
    throw { status: 400, message: 'Phone number is required', isCancelled: false } as AuthError;
  }

  const digits = phoneNumber.replace(/\D/g, '');
  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(digits)) {
    throw {
      status: 400,
      message: 'Please enter a valid 10-digit phone number',
      isCancelled: false,
    } as AuthError;
  }

  try {
    const data = await apiCall<SendOtpResponse>(
      axiosInstance.post(
        '/v1/requestOtp',
        { phone: digits },
        { headers: { Authorization: BASIC_AUTH } }
      )
    );

    if (!data?.response?.verificationId) {
      throw {
        status: 500,
        message: 'Invalid response from server: verification ID not received',
        isCancelled: false,
      } as AuthError;
    }

    return data.response.verificationId;
  } catch (error) {
    const authError = error as AuthError;

    if (authError.status === 429) {
      throw {
        status: 429,
        message: 'Too many OTP requests. Please wait before requesting another OTP.',
        isCancelled: authError.isCancelled,
      } as AuthError;
    }

    if (authError.status === 400) {
      throw {
        status: 400,
        message: authError.message || 'Invalid phone number format',
        isCancelled: authError.isCancelled,
      } as AuthError;
    }

    throw authError;
  }
};

const verifyOtp = async (
  phoneNumber: string,
  otp: string,
  verificationId: string
): Promise<AuthData> => {
  if (!phoneNumber || phoneNumber.trim().length === 0) {
    throw { status: 400, message: 'Phone number is required', isCancelled: false } as AuthError;
  }
  if (!otp || otp.trim().length === 0) {
    throw { status: 400, message: 'OTP is required', isCancelled: false } as AuthError;
  }
  if (!verificationId || verificationId.trim().length === 0) {
    throw { status: 400, message: 'Verification ID is required', isCancelled: false } as AuthError;
  }

  const otpRegex = /^[0-9]{4}$/;
  if (!otpRegex.test(otp)) {
    throw { status: 400, message: 'Please enter a valid 4-digit OTP', isCancelled: false } as AuthError;
  }

  const digits = phoneNumber.replace(/\D/g, '');

  try {
    const data = await apiCall<VerifyOtpResponse>(
      axiosInstance.post(
        '/v1/login',
        {
          phone: '91' + digits,
          otp: otp,
          verificationId: verificationId,
        },
        { headers: { Authorization: BASIC_AUTH } }
      )
    );

    if (!data?.jwt) {
      throw {
        status: 500,
        message: 'Invalid response from server: authentication token not received',
        isCancelled: false,
      } as AuthError;
    }
    if (!data?.phone) {
      throw {
        status: 500,
        message: 'Invalid response from server: mobile number not received',
        isCancelled: false,
      } as AuthError;
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
    const authError = error as AuthError;

    if (authError.status === 401) {
      throw {
        status: 401,
        message: 'Invalid OTP. Please check and try again.',
        isCancelled: authError.isCancelled,
      } as AuthError;
    }
    if (authError.status === 400) {
      throw {
        status: 400,
        message: authError.message || 'Invalid OTP format',
        isCancelled: authError.isCancelled,
      } as AuthError;
    }
    if (authError.status === 422) {
      throw {
        status: 422,
        message: 'OTP has expired. Please request a new OTP.',
        isCancelled: authError.isCancelled,
      } as AuthError;
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
  phoneNumber: string
): Promise<SignUpResponse> => {
  if (!fullName || fullName.trim().length === 0) {
    throw { status: 400, message: 'Full name is required', isCancelled: false } as AuthError;
  }
  if (!dob || dob.trim().length === 0) {
    throw { status: 400, message: 'Date of birth is required', isCancelled: false } as AuthError;
  }
  if (!gender || gender.trim().length === 0) {
    throw { status: 400, message: 'Gender is required', isCancelled: false } as AuthError;
  }

  const validGenders = ['MALE', 'FEMALE', 'OTHER'];
  if (!validGenders.includes(gender.toUpperCase())) {
    throw {
      status: 400,
      message: 'Gender must be MALE, FEMALE, or OTHER',
      isCancelled: false,
    } as AuthError;
  }

  const digits = phoneNumber.replace(/\D/g, '');

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
      }
    )
  );

  return data;
};

const signOut = async (): Promise<SignOutResponse> => {
  const data = await apiCall<SignOutResponse>(
    axiosInstance.delete('/v1/logout')
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



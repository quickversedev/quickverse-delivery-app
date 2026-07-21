import axiosInstance, { apiCall } from './axios.config';
import { TokenStorage } from '../utils/storage';
import type {
  ShiftBookingRequest,
  ShiftResponse,
} from '../types/shift.types';

const getHeaders = async () => {
  const sessionKey = await TokenStorage.getToken();
  return {
    SessionKey: sessionKey || '',
    'Request-Origin': 'TRANSPORTER',
  };
};

const bookShifts = async (
  partnerId: string,
  request: ShiftBookingRequest,
): Promise<ShiftResponse[]> => {
  const headers = await getHeaders();
  const data = await apiCall<{ data: ShiftResponse[] }>(
    axiosInstance.post(
      `/quickVerse/v3/rider/${partnerId}/shifts`,
      request,
      { headers },
    ),
  );
  return data?.data ?? [];
};

const getShifts = async (
  partnerId: string,
  date?: string,
): Promise<ShiftResponse[]> => {
  const headers = await getHeaders();
  const data = await apiCall<{ data: ShiftResponse[] }>(
    axiosInstance.get(`/quickVerse/v3/rider/${partnerId}/shifts`, {
      headers,
      params: date ? { date } : {},
      validateStatus: s => s < 500,
    }),
  );
  return data?.data ?? [];
};

const cancelShift = async (
  partnerId: string,
  shiftId: string,
): Promise<void> => {
  const headers = await getHeaders();
  await apiCall(
    axiosInstance.delete(
      `/quickVerse/v3/rider/${partnerId}/shifts/${shiftId}`,
      { headers, validateStatus: s => s < 500 },
    ),
  );
};

const getActiveShift = async (
  partnerId: string,
): Promise<ShiftResponse | null> => {
  const headers = await getHeaders();
  const data = await apiCall<{ data: ShiftResponse | null }>(
    axiosInstance.get(
      `/quickVerse/v3/rider/${partnerId}/shifts/active`,
      { headers, validateStatus: s => s < 500 },
    ),
  );
  return data?.data ?? null;
};

const shiftService = {
  bookShifts,
  getShifts,
  cancelShift,
  getActiveShift,
};

export default shiftService;

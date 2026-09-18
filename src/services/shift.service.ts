import axiosInstance, { apiCall } from './axios.config';
import { TokenStorage } from '../utils/storage';
import type {
  ShiftBookingBatchRequest,
  ShiftResponse,
} from '../types/shift.types';

const getHeaders = async () => {
  const sessionKey = await TokenStorage.getToken();
  return {
    SessionKey: sessionKey || '',
    'Request-Origin': 'TRANSPORTER',
  };
};

const bookShiftsBatch = async (
  partnerId: string,
  request: ShiftBookingBatchRequest,
): Promise<ShiftResponse[]> => {
  const headers = await getHeaders();
  const data = await apiCall<{ data: ShiftResponse[] }>(
    axiosInstance.post(
      `/quickVerse/v3/rider/${partnerId}/shifts/batch`,
      request,
      { headers },
    ),
  );
  console.log('Book Shifts Response:', data);
  return data?.data ?? [];
};

const getShifts = async (
  partnerId: string,
  date?: string,
): Promise<ShiftResponse[]> => {
  const headers = await getHeaders();
  const data = await apiCall<any>(
    axiosInstance.get(`/quickVerse/v3/rider/${partnerId}/shifts`, {
      headers,
      params: date ? { date } : {},
      validateStatus: s => s < 500,
    }),
  );
  
  console.log(`Shift API Response for ${date}:`, data);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.shifts)) return data.data.shifts;
  return [];
};

const cancelShift = async (
  partnerId: string,
  shiftId: string,
): Promise<any> => {
  const headers = await getHeaders();
  const res = await apiCall<{ data: any }>(
    axiosInstance.delete(
      `/quickVerse/v3/rider/${partnerId}/shifts/${shiftId}`,
      { headers, validateStatus: s => s < 500 },
    ),
  );
  console.log('Cancel Shift Response:', res);
  return res;
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
  bookShiftsBatch,
  getShifts,
  cancelShift,
  getActiveShift,
};

export default shiftService;

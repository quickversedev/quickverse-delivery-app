export type ShiftType = 'BREAKFAST' | 'LUNCH' | 'EVENING' | 'DINNER' | 'NIGHT';
export type ShiftStatus = 'CONFIRMED' | 'CANCELLED';

export interface ShiftResponse {
  id: string;
  deliveryPartnerId: string;
  shiftDate: string;
  shiftType: ShiftType;
  shiftWindow: string;
  status: ShiftStatus;
  estimatedEarnings: number;
  createdAt: string;
}

export interface ShiftBookingRequest {
  shiftDate?: string;
  shiftTypes: ShiftType[];
}

export const SHIFT_WINDOWS: Record<ShiftType, string> = {
  BREAKFAST: '06:00 AM – 10:00 AM',
  LUNCH: '10:00 AM – 02:00 PM',
  EVENING: '02:00 PM – 06:00 PM',
  DINNER: '06:00 PM – 10:00 PM',
  NIGHT: '10:00 PM – 02:00 AM',
};

export const SHIFT_EARNINGS: Record<ShiftType, number> = {
  BREAKFAST: 250,
  LUNCH: 300,
  EVENING: 300,
  DINNER: 350,
  NIGHT: 200,
};

export const SHIFT_LABELS: Record<ShiftType, string> = {
  BREAKFAST: 'Breakfast Shift',
  LUNCH: 'Lunch Shift',
  EVENING: 'Evening Shift',
  DINNER: 'Dinner Shift',
  NIGHT: 'Night Shift',
};

export const ALL_SHIFT_TYPES: ShiftType[] = [
  'BREAKFAST',
  'LUNCH',
  'EVENING',
  'DINNER',
  'NIGHT',
];

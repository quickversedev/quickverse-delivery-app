export type ApiError = {
  status: number;
  message: string;
  code: string;
  isCancelled: boolean;
  apiEndpoint: string;
  error?: unknown;
};



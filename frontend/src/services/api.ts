import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL ?? 'http://localhost:5000';

export interface FailureDetail {
  name: string;
  email: string;
  error: string;
}

export interface UploadResponse {
  uploadId: string;
  message: string;
}

export interface UploadStatusResponse {
  uploadId: string;
  status: 'unprocessed' | 'processing' | 'done' | 'error';
  filePath: string;
  originalName: string;
  createdAt: number;
  progress: string;
  progressPercent: number;
  processedRecords: number;
  failedRecords: number;
  totalRecords: number;
  details: FailureDetail[];
  errorMessage?: string;
}

export interface ApiErrorResponse {
  error: string;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

export const apiService = {
  uploadFile: async (file: File): Promise<UploadResponse> => {
    const body = new FormData();
    body.append('file', file);
    const response = await api.post<UploadResponse>('/upload', body, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getUploadStatus: async (uploadId: string): Promise<UploadStatusResponse> => {
    const response = await api.get<UploadStatusResponse>(`/status/${uploadId}`);
    return response.data;
  },
};

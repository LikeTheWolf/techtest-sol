import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api'


export interface UploadResponse {
  uploadId: string; 
}
export interface ErrorResponse {
  error: string;
}

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  // Get all ingredients
  getIngredients: async (): Promise<UploadResponse> => {
    const response = await api.post<UploadResponse>('/upload', {
      
    });
    return response.data;
  }
}
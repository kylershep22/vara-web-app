/**
 * API Client
 * Axios instance configured for Express backend
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { getApiUrl, config } from '../../config';
import { auth } from '../../config/firebase';
import { getAuth } from 'firebase/auth';

/**
 * Create axios instance with base configuration
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: config.apiUrl + config.apiBasePath,
    timeout: 30000, // 30 seconds
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - add auth token
  client.interceptors.request.use(
    async (config) => {
      try {
        // Get current user's ID token
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Error getting auth token:', error);
      }

      if (config.debug && __DEV__) {
        console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
        console.log('📦 Request Data:', config.data);
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle errors
  client.interceptors.response.use(
    (response) => {
      if (response.config.debug && __DEV__) {
        console.log('📥 API Response:', response.status, response.config.url);
        console.log('📦 Response Data:', response.data);
      }
      return response;
    },
    async (error: AxiosError) => {
      if (error.config?.debug && __DEV__) {
        console.error('❌ API Error:', error.message);
        console.error('📍 URL:', error.config?.url);
        console.error('📦 Error Data:', error.response?.data);
      }

      // Handle specific error cases
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;

        switch (status) {
          case 401:
            // Unauthorized - attempt token refresh and retry
            try {
              const firebaseAuth = getAuth();
              if (firebaseAuth.currentUser) {
                await firebaseAuth.currentUser.getIdToken(true);
                const originalRequest = error.config!;
                originalRequest.headers['Authorization'] = `Bearer ${await firebaseAuth.currentUser.getIdToken()}`;
                return client(originalRequest);
              }
            } catch (refreshError) {
              // Refresh failed - sign out (AuthContext listener handles navigation)
              try { await getAuth().signOut(); } catch {}
            }
            break;
          case 403:
            // Forbidden
            console.error('Forbidden API request');
            break;
          case 404:
            // Not found
            console.error('API endpoint not found');
            break;
          case 429:
            // Too many requests
            console.error('Rate limit exceeded');
            break;
          case 500:
          case 502:
          case 503:
            // Server errors
            console.error('Server error - please try again later');
            break;
        }
      } else if (error.request) {
        // Request made but no response received
        console.error('No response from server - check your connection');
      } else {
        // Something else happened
        console.error('Request error:', error.message);
      }

      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * API client instance
 */
export const apiClient = createApiClient();

/**
 * Typed API request wrapper with retry logic
 */
export async function apiRequest<T>(
  config: AxiosRequestConfig & { debug?: boolean; retries?: number }
): Promise<T> {
  const maxRetries = config.retries || 2;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await apiClient.request<T>(config);
      return response.data;
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        if (status >= 400 && status < 500 && status !== 429) {
          throw error;
        }
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        if (config.debug && __DEV__) {
          console.log(`⏳ Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Helper for GET requests
 */
export function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return apiRequest<T>({ ...config, method: 'GET', url });
}

/**
 * Helper for POST requests
 */
export function apiPost<T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  return apiRequest<T>({ ...config, method: 'POST', url, data });
}

/**
 * Helper for PUT requests
 */
export function apiPut<T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  return apiRequest<T>({ ...config, method: 'PUT', url, data });
}

/**
 * Helper for DELETE requests
 */
export function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return apiRequest<T>({ ...config, method: 'DELETE', url });
}

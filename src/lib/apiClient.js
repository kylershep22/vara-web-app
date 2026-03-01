// src/lib/apiClient.js
// Authenticated API client for Express backend requests.
// All requests include the Firebase ID token in the Authorization header.

import { getAuth } from 'firebase/auth';
import { app } from '../firebase';

/**
 * Get the current user's Firebase ID token for API calls.
 * Throws if the user is not signed in.
 */
async function getAuthHeaders() {
  const user = getAuth(app).currentUser;
  if (!user) throw new Error('Please sign in to use this feature.');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

/**
 * Authenticated fetch wrapper. Automatically adds Authorization header.
 */
export async function authedFetch(url, options = {}) {
  const authHeaders = await getAuthHeaders();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
  });
}

/**
 * Authenticated POST helper. Serializes body as JSON.
 */
export async function authedPost(url, body) {
  const res = await authedFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res;
}

/**
 * Form Validation Utilities
 * Validation functions for auth forms
 */

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/**
 * Validate email format
 */
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true };
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): { isValid: boolean; error?: string } => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return { isValid: false, error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
  }

  if (!PASSWORD_REGEX.test(password)) {
    return {
      isValid: false,
      error: 'Password must contain uppercase, lowercase, and number',
    };
  }

  return { isValid: true };
};

/**
 * Validate password confirmation matches
 */
export const validatePasswordMatch = (
  password: string,
  confirmPassword: string
): { isValid: boolean; error?: string } => {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password' };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }

  return { isValid: true };
};

/**
 * Validate display name
 */
export const validateDisplayName = (name: string): { isValid: boolean; error?: string } => {
  if (!name) {
    return { isValid: false, error: 'Name is required' };
  }

  if (name.trim().length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }

  if (name.trim().length > 50) {
    return { isValid: false, error: 'Name must be less than 50 characters' };
  }

  return { isValid: true };
};

/**
 * Get Firebase auth error message
 */
export const getAuthErrorMessage = (errorCode: string | undefined, errorMessage?: string): string => {
  const errorMessages: { [key: string]: string } = {
    // Common auth errors
    'auth/email-already-in-use': 'This email is already registered. Please log in instead.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/operation-not-allowed': 'Email/password accounts are not enabled. Please contact support.',
    'auth/weak-password': 'Password is too weak. Please use a stronger password.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/user-not-found': 'No account found with this email. Please sign up first.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection and try again.',
    'auth/invalid-credential': 'Invalid email or password. Please check and try again.',
    'auth/requires-recent-login': 'This operation requires recent authentication. Please log in again.',
    // Additional error codes (Firebase v9+)
    'auth/invalid-login-credentials': 'Invalid email or password. Please check and try again.',
    'auth/user-token-expired': 'Your session has expired. Please log in again.',
    'auth/web-storage-unsupported': 'Your browser does not support storage. Please enable cookies.',
    'auth/app-not-authorized': 'This app is not authorized. Please contact support.',
    'auth/invalid-api-key': 'Configuration error. Please contact support.',
    'auth/app-deleted': 'The app has been deleted. Please contact support.',
    'auth/account-exists-with-different-credential': 'An account already exists with a different sign-in method.',
    'auth/credential-already-in-use': 'This credential is already associated with another account.',
    'auth/timeout': 'The request timed out. Please try again.',
    'auth/missing-email': 'Please enter an email address.',
    'auth/internal-error': 'An internal error occurred. Please try again.',
  };

  // If we have a known error code, return its message
  if (errorCode && errorMessages[errorCode]) {
    return errorMessages[errorCode];
  }

  // Log unknown error codes for debugging (will help identify new errors)
  if (errorCode) {
    console.warn('Unknown auth error code:', errorCode, 'Message:', errorMessage);
  }

  // If no error code but we have a message, check if it contains useful info
  if (errorMessage) {
    const lowerMessage = errorMessage.toLowerCase();
    if (lowerMessage.includes('network')) {
      return 'Network error. Please check your connection and try again.';
    }
    if (lowerMessage.includes('timeout')) {
      return 'The request timed out. Please try again.';
    }
    if (lowerMessage.includes('password') || lowerMessage.includes('credential')) {
      return 'Invalid email or password. Please check and try again.';
    }
  }

  return 'An error occurred. Please try again.';
};

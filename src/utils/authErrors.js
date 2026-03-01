/**
 * Translate Firebase Auth error codes to user-friendly messages
 *
 * This prevents users from seeing technical Firebase error messages
 * and provides clear, actionable feedback
 */

export function getAuthErrorMessage(errorCode) {
  const errorMessages = {
    // Login errors
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/user-not-found': 'No account found with this email address. Please check your email or sign up.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid email or password. Please check your credentials and try again.',
    'auth/too-many-requests': 'Too many unsuccessful login attempts. Please try again later or reset your password.',

    // Signup errors
    'auth/email-already-in-use': 'An account with this email already exists. Please log in instead.',
    'auth/weak-password': 'Password is too weak. Please use at least 8 characters with uppercase, lowercase, and a number.',
    'auth/operation-not-allowed': 'Account creation is currently disabled. Please contact support.',

    // Password reset errors
    'auth/expired-action-code': 'This password reset link has expired. Please request a new one.',
    'auth/invalid-action-code': 'This password reset link is invalid. Please request a new one.',

    // Network errors
    'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',

    // Generic errors
    'auth/internal-error': 'An unexpected error occurred. Please try again.',
    'auth/app-deleted': 'Service is temporarily unavailable. Please try again later.',
  };

  return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
}

/**
 * Extract error code from Firebase error object
 */
export function getFirebaseErrorCode(error) {
  return error?.code || 'unknown';
}

/**
 * Check if password meets minimum requirements
 */
export function validatePassword(password) {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check if email is valid format
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

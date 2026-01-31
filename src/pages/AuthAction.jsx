// src/pages/AuthAction.jsx
// Handles Firebase email action links (password reset, email verification)
import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
  checkActionCode
} from 'firebase/auth';
import { auth } from '../firebase';
import { Eye, EyeOff, CheckCircle, XCircle, Mail, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { getAuthErrorMessage, getFirebaseErrorCode } from '../utils/authErrors';
import logger from '../utils/logger';
import VaraLogo from "../assets/logo/vara-logo-hr.png";
import "../styles/custom.css";

export default function AuthAction() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL parameters from Firebase email link
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');
  const continueUrl = searchParams.get('continueUrl');

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');

  // Password reset specific state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [resetting, setResetting] = useState(false);

  // Verify the action code on mount
  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode || !mode) {
        setError('Invalid or missing action link. Please request a new one.');
        setLoading(false);
        return;
      }

      try {
        if (mode === 'resetPassword') {
          // Verify the password reset code and get the email
          const userEmail = await verifyPasswordResetCode(auth, oobCode);
          setEmail(userEmail);
          setLoading(false);
        } else if (mode === 'verifyEmail') {
          // Apply the email verification code
          await applyActionCode(auth, oobCode);
          logger.info('Email verified successfully');
          setSuccess(true);
          setLoading(false);
        } else if (mode === 'recoverEmail') {
          // Check the action code to get info
          const info = await checkActionCode(auth, oobCode);
          setEmail(info.data.email);
          // Apply the recovery
          await applyActionCode(auth, oobCode);
          logger.info('Email recovered successfully');
          setSuccess(true);
          setLoading(false);
        } else {
          setError('Unknown action type. Please try again.');
          setLoading(false);
        }
      } catch (err) {
        const errorCode = getFirebaseErrorCode(err);
        const friendlyMessage = getAuthErrorMessage(errorCode);
        setError(friendlyMessage || 'This link has expired or already been used. Please request a new one.');
        logger.error('Auth action verification failed', err, { mode, errorCode });
        setLoading(false);
      }
    };

    verifyCode();
  }, [oobCode, mode]);

  // Validate password requirements
  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return '';
  };

  // Handle password reset submission
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setPasswordError('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    // Validate password strength
    const validationError = validatePassword(newPassword);
    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    setResetting(true);

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      logger.info('Password reset successful', { email });
      setSuccess(true);
    } catch (err) {
      const errorCode = getFirebaseErrorCode(err);
      const friendlyMessage = getAuthErrorMessage(errorCode);
      setPasswordError(friendlyMessage || 'Failed to reset password. Please try again.');
      logger.error('Password reset failed', err, { email, errorCode });
    } finally {
      setResetting(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div
        className="min-h-screen bg-cover bg-center flex items-center justify-center px-4"
        style={{ backgroundImage: "url('/images/vara-welcome-bg.png')" }}
      >
        <div className="w-full max-w-md bg-white/90 backdrop-blur-lg p-10 rounded-2xl shadow-xl text-center">
          <div className="flex justify-center mb-6">
            <img src={VaraLogo} alt="Vara Logo" className="h-14 w-14 object-contain rounded-xl shadow" />
          </div>
          <div className="flex justify-center mb-4">
            <Loader2 className="h-12 w-12 text-[#1B5E57] animate-spin" />
          </div>
          <p className="text-[#6B7B6A]">Verifying your request...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div
        className="min-h-screen bg-cover bg-center flex items-center justify-center px-4"
        style={{ backgroundImage: "url('/images/vara-welcome-bg.png')" }}
      >
        <div className="w-full max-w-md bg-white/90 backdrop-blur-lg p-10 rounded-2xl shadow-xl">
          <div className="flex justify-center mb-4">
            <img src={VaraLogo} alt="Vara Logo" className="h-14 w-14 object-contain rounded-xl shadow" />
          </div>

          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="text-red-600" size={32} />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#3E3E3E] mb-2">
                Link Expired or Invalid
              </h2>
              <p className="text-sm text-gray-600 mb-6">{error}</p>
            </div>

            <div className="space-y-3">
              {mode === 'resetPassword' && (
                <Link
                  to="/forgot-password"
                  className="block w-full py-3 bg-gradient-to-r from-[#F4C542] to-[#F5B971] text-white font-semibold rounded-lg hover:brightness-105 transition-all text-center"
                >
                  Request New Reset Link
                </Link>
              )}
              <Link
                to="/login"
                className="block w-full py-3 border border-[#1B5E57] text-[#1B5E57] font-semibold rounded-lg hover:bg-[#1B5E57]/5 transition-all text-center"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render password reset form
  if (mode === 'resetPassword' && !success) {
    return (
      <div
        className="min-h-screen bg-cover bg-center flex items-center justify-center px-4"
        style={{ backgroundImage: "url('/images/vara-welcome-bg.png')" }}
      >
        <div className="w-full max-w-md bg-white/90 backdrop-blur-lg p-10 rounded-2xl shadow-xl">
          <div className="flex justify-center mb-4">
            <img src={VaraLogo} alt="Vara Logo" className="h-14 w-14 object-contain rounded-xl shadow" />
          </div>

          <h2 className="text-2xl font-semibold text-[#1B5E57] text-center mb-2">
            Create New Password
          </h2>
          <p className="text-sm text-[#6B7B6A] text-center mb-2">
            For <strong>{email}</strong>
          </p>
          <p className="text-sm text-[#6B7B6A] text-center italic mb-6">
            "Every journey back to wellness starts with a single step."
          </p>

          {passwordError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{passwordError}</p>
            </div>
          )}

          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#3E3E3E] mb-2">
                New Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={resetting}
                  required
                  className="w-full pl-10 pr-12 py-3 border border-[#D5E3D1] rounded-lg bg-[#FAFAF6] focus:outline-none focus:ring-2 focus:ring-[#F4C542] focus:border-transparent transition disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                  disabled={resetting}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#3E3E3E] mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={resetting}
                  required
                  className="w-full pl-10 pr-12 py-3 border border-[#D5E3D1] rounded-lg bg-[#FAFAF6] focus:outline-none focus:ring-2 focus:ring-[#F4C542] focus:border-transparent transition disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                  disabled={resetting}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Password requirements */}
            <div className="bg-[#FAFAF6] border border-[#D5E3D1] rounded-lg p-3">
              <p className="text-xs font-medium text-[#3E3E3E] mb-2">Password must contain:</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li className={`flex items-center gap-2 ${newPassword.length >= 8 ? 'text-green-600' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${newPassword.length >= 8 ? 'bg-green-600' : 'bg-gray-400'}`} />
                  At least 8 characters
                </li>
                <li className={`flex items-center gap-2 ${/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(newPassword) ? 'bg-green-600' : 'bg-gray-400'}`} />
                  One uppercase letter
                </li>
                <li className={`flex items-center gap-2 ${/[a-z]/.test(newPassword) ? 'text-green-600' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(newPassword) ? 'bg-green-600' : 'bg-gray-400'}`} />
                  One lowercase letter
                </li>
                <li className={`flex items-center gap-2 ${/[0-9]/.test(newPassword) ? 'text-green-600' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(newPassword) ? 'bg-green-600' : 'bg-gray-400'}`} />
                  One number
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={resetting}
              className="w-full py-3 bg-gradient-to-r from-[#F4C542] to-[#F5B971] text-white font-semibold rounded-lg hover:brightness-105 transition-all ease-in-out duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {resetting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render success states
  if (success) {
    const isPasswordReset = mode === 'resetPassword';
    const isEmailVerification = mode === 'verifyEmail';
    const isEmailRecovery = mode === 'recoverEmail';

    return (
      <div
        className="min-h-screen bg-cover bg-center flex items-center justify-center px-4"
        style={{ backgroundImage: "url('/images/vara-welcome-bg.png')" }}
      >
        <div className="w-full max-w-md bg-white/90 backdrop-blur-lg p-10 rounded-2xl shadow-xl">
          <div className="flex justify-center mb-4">
            <img src={VaraLogo} alt="Vara Logo" className="h-14 w-14 object-contain rounded-xl shadow" />
          </div>

          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                {isEmailVerification ? (
                  <Mail className="text-green-600" size={40} />
                ) : isPasswordReset ? (
                  <ShieldCheck className="text-green-600" size={40} />
                ) : (
                  <CheckCircle className="text-green-600" size={40} />
                )}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-[#1B5E57] mb-2">
                {isPasswordReset && 'Password Reset Complete!'}
                {isEmailVerification && 'Email Verified!'}
                {isEmailRecovery && 'Email Recovered!'}
              </h2>
              <p className="text-sm text-gray-600 mb-2">
                {isPasswordReset && 'Your password has been successfully updated.'}
                {isEmailVerification && 'Your email address has been verified. Welcome to Vara!'}
                {isEmailRecovery && `Your email has been restored to ${email}.`}
              </p>
              <p className="text-sm text-[#6B7B6A] italic">
                "Growth begins with the courage to start."
              </p>
            </div>

            <div className="pt-4 space-y-3">
              <Link
                to="/login"
                className="block w-full py-3 bg-gradient-to-r from-[#F4C542] to-[#F5B971] text-white font-semibold rounded-lg hover:brightness-105 transition-all text-center"
              >
                {isEmailVerification ? 'Continue to Login' : 'Log In with New Password'}
              </Link>

              {isEmailVerification && (
                <p className="text-xs text-gray-500">
                  You can now access all features of the Vara app.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback for unknown state
  return null;
}

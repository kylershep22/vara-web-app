// src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { getAuthErrorMessage, getFirebaseErrorCode, validateEmail } from '../utils/authErrors';
import logger from '../utils/logger';
import VaraLogo from "../assets/logo/vara-logo-hr.png";
import "../styles/custom.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate email format
      if (!validateEmail(email)) {
        setError('Please enter a valid email address.');
        setLoading(false);
        return;
      }

      // Send password reset email with custom action URL
      const actionCodeSettings = {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      };
      await sendPasswordResetEmail(auth, email, actionCodeSettings);

      // Log successful password reset request
      logger.info('Password reset email sent', { email });

      setSuccess(true);
    } catch (err) {
      const errorCode = getFirebaseErrorCode(err);
      const friendlyMessage = getAuthErrorMessage(errorCode);
      setError(friendlyMessage);

      // Log error for debugging
      logger.error('Password reset failed', err, {
        email,
        errorCode,
        friendlyMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center px-4"
      style={{
        backgroundImage: "url('/images/vara-welcome-bg.png')",
      }}
    >
      <div className="w-full max-w-md bg-white/90 backdrop-blur-lg p-10 rounded-2xl shadow-xl">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img
            src={VaraLogo}
            alt="Vara Logo"
            className="h-14 w-14 object-contain rounded-xl shadow"
          />
        </div>

        <h2 className="text-2xl font-semibold text-[#1B5E57] text-center mb-2">
          Reset Password
        </h2>
        <p className="text-sm text-[#6B7B6A] text-center italic mb-6">
          "Every journey back to wellness starts with a single step."
        </p>

        {!success ? (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#3E3E3E] mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-[#D5E3D1] rounded-lg bg-[#FAFAF6] focus:outline-none focus:ring-2 focus:ring-[#F4C542] focus:border-transparent transition disabled:opacity-60"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  We'll send you a link to reset your password
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-[#F4C542] to-[#F5B971] text-white font-semibold rounded-lg hover:brightness-105 transition-all ease-in-out duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="text-green-600" size={32} />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#3E3E3E] mb-2">
                Check Your Email
              </h3>
              <p className="text-sm text-gray-600">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <p className="text-xs text-gray-500 mt-3">
                Didn't receive it? Check your spam folder or try again in a few minutes.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-[#1B5E57] hover:underline transition"
          >
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

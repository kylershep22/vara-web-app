import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Eye, EyeOff } from 'lucide-react';
import { getAuthErrorMessage, getFirebaseErrorCode, validatePassword } from '../utils/authErrors';
import logger from '../utils/logger';
import VaraLogo from "../assets/logo/vara-logo-hr.png";
import "../styles/custom.css";

export default function Signup() {
  const emailRef = useRef();
  const passwordRef = useRef();
  const nameRef = useRef();
  const { signup, sendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState([]);

  // Validate password as user types
  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    const validation = validatePassword(newPassword);
    setPasswordErrors(validation.errors);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate inputs
      const name = nameRef.current.value.trim();
      const email = emailRef.current.value.trim();
      const pass = password;

      if (!name) {
        setError('Please enter your name.');
        setLoading(false);
        return;
      }

      // Check password strength
      const passwordValidation = validatePassword(pass);
      if (!passwordValidation.isValid) {
        setError(passwordValidation.errors[0]);
        setLoading(false);
        return;
      }

      // Create user account
      const result = await signup(email, pass);
      const user = result.user;

      // Create user document in Firestore with trial subscription
      const trialExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: name,
        name: name,
        createdAt: serverTimestamp(),
        onboardingComplete: false,

        // Subscription: Start with 7-day free trial
        subscription: {
          type: 'trial',
          trialStartedAt: serverTimestamp(),
          trialExpiresAt: Timestamp.fromDate(trialExpiresAt),
        },
        hasActiveSubscription: true,
        subscriptionType: 'trial',
      });

      // Send verification email
      try {
        await sendVerificationEmail(user);
        logger.info('Verification email sent', { userId: user.uid, email: user.email });
      } catch (emailError) {
        logger.warn('Failed to send verification email', emailError);
        // Don't block signup if verification email fails
      }

      // Log successful signup
      logger.info('User signed up', { userId: user.uid, email: user.email });

      // Navigate to onboarding
      navigate('/onboarding/profile');
    } catch (err) {
      const errorCode = getFirebaseErrorCode(err);
      const friendlyMessage = getAuthErrorMessage(errorCode);
      setError(friendlyMessage);

      // Log error for debugging
      logger.error('Signup failed', err, {
        email: emailRef.current?.value,
        errorCode,
        friendlyMessage
      });

      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center px-4"
      style={{
        backgroundImage: "url('/images/vara-welcome-bg.png')",
      }}
    >
      <div className="w-full max-w-md bg-white/90 backdrop-blur-lg p-10 rounded-2xl shadow-xl text-center">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img
            src={VaraLogo}
            alt="Vara Logo"
            className="h-14 w-14 object-contain rounded-xl shadow"
          />
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-semibold text-[#1B5E57] mb-2">Create Your Vara Account</h2>
        <p className="text-sm text-[#6B7B6A] italic mb-6">
          “Growth begins with the courage to start.”
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <input
              type="text"
              ref={nameRef}
              required
              placeholder="Your Name"
              disabled={loading}
              className="w-full px-4 py-3 border border-[#D5E3D1] rounded-lg bg-[#FAFAF6] focus:outline-none focus:ring-2 focus:ring-[#F4C542] focus:border-transparent transition disabled:opacity-60"
            />
          </div>

          <div>
            <input
              type="email"
              ref={emailRef}
              required
              placeholder="Email"
              disabled={loading}
              className="w-full px-4 py-3 border border-[#D5E3D1] rounded-lg bg-[#FAFAF6] focus:outline-none focus:ring-2 focus:ring-[#F4C542] focus:border-transparent transition disabled:opacity-60"
            />
          </div>

          <div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={handlePasswordChange}
                required
                placeholder="Password (min. 6 characters)"
                disabled={loading}
                className="w-full px-4 py-3 pr-12 border border-[#D5E3D1] rounded-lg bg-[#FAFAF6] focus:outline-none focus:ring-2 focus:ring-[#F4C542] focus:border-transparent transition disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                disabled={loading}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {password && passwordErrors.length > 0 && (
              <p className="mt-1 text-xs text-red-600">{passwordErrors[0]}</p>
            )}
            {password && passwordErrors.length === 0 && password.length >= 6 && (
              <p className="mt-1 text-xs text-green-600">✓ Password meets requirements</p>
            )}
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full py-3 mt-2 bg-gradient-to-r from-[#F4C542] to-[#F5B971] text-white font-semibold rounded-lg hover:brightness-105 transition-all ease-in-out duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>

          {/* Legal disclaimer */}
          <p className="text-xs text-gray-600 text-center mt-3">
            By signing up, you agree to our{' '}
            <Link to="/terms" className="text-[#1B5E57] hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-[#1B5E57] hover:underline">
              Privacy Policy
            </Link>
          </p>
        </form>

        {/* Link to login */}
        <div className="mt-6 text-sm text-center">
          Already have an account?{" "}
          <a href="/login" className="text-[#1B5E57] underline">
            Log In
          </a>
        </div>
      </div>
    </div>
  );
}





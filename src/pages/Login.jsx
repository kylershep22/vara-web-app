import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { Eye, EyeOff } from 'lucide-react';
import { getAuthErrorMessage, getFirebaseErrorCode } from '../utils/authErrors';
import logger from '../utils/logger';
import VaraLogo from "../assets/logo/vara-logo-hr.png";
import "../styles/custom.css";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Log successful login
      logger.info('User logged in', { userId: user.uid, email: user.email });

      // Check if user document exists
      const firestore = getFirestore();
      const userRef = doc(firestore, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        setError("Account setup incomplete. Please contact support.");
        logger.warn('User document not found after login', { userId: user.uid });
        setLoading(false);
        return;
      }

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      const errorCode = getFirebaseErrorCode(err);
      const friendlyMessage = getAuthErrorMessage(errorCode);
      setError(friendlyMessage);

      // Log error for debugging
      logger.error('Login failed', err, {
        email,
        errorCode,
        friendlyMessage
      });

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
      <form
        onSubmit={handleLogin}
        className="bg-white/90 backdrop-blur-lg p-10 rounded-2xl shadow-xl w-full max-w-md text-center"
      >
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img
            src={VaraLogo}
            alt="Vara Logo"
            className="h-14 w-14 object-contain rounded-xl shadow"
          />
        </div>

        <h2 className="text-2xl font-semibold text-evergreen-teal mb-2">Welcome Back</h2>
        <p className="text-sm text-muted-sage-gray italic mb-6">
          “Each mindful breath is a step forward.”
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <input
            className="w-full px-4 py-3 border border-divider rounded-lg bg-mist-white focus:outline-none focus:ring-2 focus:ring-sunrise-amber focus:border-transparent transition"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />

          <div className="relative">
            <input
              className="w-full px-4 py-3 pr-12 border border-divider rounded-lg bg-mist-white focus:outline-none focus:ring-2 focus:ring-sunrise-amber focus:border-transparent transition"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-sage-gray hover:text-soft-charcoal transition"
              disabled={loading}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 mt-6 bg-gradient-to-r from-sunrise-amber to-golden-apricot text-white font-semibold rounded-lg hover:brightness-105 transition-all ease-in-out duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-evergreen-teal hover:underline transition">
            Forgot Password?
          </Link>
          <Link to="/signup" className="text-evergreen-teal hover:underline transition">
            Create Account
          </Link>
        </div>
      </form>
    </div>
  );
}







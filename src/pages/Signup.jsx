import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import VaraLogo from "../assets/logo/vara-logo-hr.png";
import "../styles/custom.css";

export default function Signup() {
  const emailRef = useRef();
  const passwordRef = useRef();
  const nameRef = useRef();
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);

      const result = await signup(emailRef.current.value, passwordRef.current.value);
      const user = result.user;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: nameRef.current.value,
        name: nameRef.current.value,
        createdAt: new Date(),
        onboardingComplete: false,
      });

      navigate('/onboarding/profile');
    } catch (err) {
      setError('Failed to create an account. Please try again.');
      console.error(err);
    }
    setLoading(false);
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

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <input
            type="text"
            ref={nameRef}
            required
            placeholder="Your Name"
            className="w-full px-4 py-3 border border-[#D5E3D1] rounded-lg bg-[#FAFAF6] focus:outline-none focus:ring-2 focus:ring-[#F4C542] focus:border-transparent"
          />
          <input
            type="email"
            ref={emailRef}
            required
            placeholder="Email"
            className="w-full px-4 py-3 border border-[#D5E3D1] rounded-lg bg-[#FAFAF6] focus:outline-none focus:ring-2 focus:ring-[#F4C542] focus:border-transparent"
          />
          <input
            type="password"
            ref={passwordRef}
            required
            placeholder="Password"
            className="w-full px-4 py-3 border border-[#D5E3D1] rounded-lg bg-[#FAFAF6] focus:outline-none focus:ring-2 focus:ring-[#F4C542] focus:border-transparent"
          />
          <button
            disabled={loading}
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-[#F4C542] to-[#F5B971] text-white font-semibold rounded-lg hover:brightness-105 transition-all ease-in-out duration-300"
          >
            {loading ? 'Signing Up...' : 'Sign Up'}
          </button>
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





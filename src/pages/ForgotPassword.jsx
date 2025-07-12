// src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent. Please check your inbox.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAFAF6]">
      <form onSubmit={handleReset} className="bg-white p-8 rounded shadow-md w-80">
        <h2 className="text-2xl font-bold text-[#1B5E57] mb-4">Reset Password</h2>
        {message && <p className="text-sm text-[#3E3E3E] mb-4">{message}</p>}
        <input
          type="email"
          placeholder="Enter your email"
          className="w-full px-4 py-2 mb-4 border border-[#D5E3D1] rounded bg-[#D5E3D1]"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button
          type="submit"
          className="w-full py-2 bg-[#F4C542] text-white rounded hover:bg-[#F5B971]"
        >
          Send Reset Email
        </button>
        <button
          onClick={() => navigate('/login')}
          type="button"
          className="mt-4 w-full py-2 text-sm text-[#1B5E57] underline"
        >
          Back to Login
        </button>
      </form>
    </div>
  );
}

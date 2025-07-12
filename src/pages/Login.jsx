import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import VaraLogo from "../assets/logo/vara-logo-hr.png";
import "../styles/custom.css";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const firestore = getFirestore();
      const userRef = doc(firestore, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        setUserName(userDoc.data().name);
      } else {
        setError("User data not found.");
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (auth.currentUser) {
      const user = auth.currentUser;
      setUserName(user.displayName || "User");
    }
  }, []);

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

        <h2 className="text-2xl font-semibold text-[#1B5E57] mb-2">Welcome Back</h2>
        <p className="text-sm text-[#6B7B6A] italic mb-6">
          “Each mindful breath is a step forward.”
        </p>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <input
          className="w-full px-4 py-3 mb-4 border border-[#D5E3D1] rounded-lg bg-[#D5E3D1] focus:outline-none focus:ring-2 focus:ring-[#F4C542] focus:border-transparent"
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full px-4 py-3 mb-6 border border-[#D5E3D1] rounded-lg bg-[#D5E3D1] focus:outline-none focus:ring-2 focus:ring-[#F4C542] focus:border-transparent"
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          className="w-full py-3 mb-4 bg-gradient-to-r from-[#F4C542] to-[#F5B971] text-white font-semibold rounded-lg hover:brightness-105 transition-all ease-in-out duration-300"
        >
          Log In
        </button>

        {userName && (
          <p className="mt-4 text-sm text-[#1B5E57]">
            Logged in as: <span className="font-semibold">{userName}</span>
          </p>
        )}

        <p className="mt-4 text-sm">
          <a href="/forgot-password" className="text-[#1B5E57] underline">
            Forgot Password?
          </a>
        </p>
      </form>
    </div>
  );
}







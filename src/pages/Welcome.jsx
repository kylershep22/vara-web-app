import React from "react";
import { useNavigate } from "react-router-dom";
import VaraLogo from "../assets/logo/vara-logo-hr.png";
import "../styles/custom.css";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center px-6"
      style={{
        backgroundImage: "url('/images/vara-welcome-bg-2.png')",
      }}
    >
      <div className="w-full max-w-3xl bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-10 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src={VaraLogo}
            alt="Vara Logo"
            className="h-20 w-20 object-contain rounded-xl shadow"
          />
        </div>

        {/* Welcome Message */}
        <h1 className="text-4xl font-bold text-evergreen-teal mb-3">Welcome to Vara</h1>
        <p className="text-lg text-soft-charcoal mb-4">
          Your journey to resilience and wellbeing begins here.
        </p>

        {/* Quote */}
        <p className="italic text-muted-sage-gray text-sm mb-10">
          “Resilience is built one mindful moment at a time.”
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate("/login")}
            className="bg-evergreen-teal hover:opacity-90 text-white font-medium px-6 py-3 rounded-full transition"
          >
            Log In
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="bg-silver-sage hover:opacity-90 text-evergreen-teal font-medium px-6 py-3 rounded-full transition"
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}








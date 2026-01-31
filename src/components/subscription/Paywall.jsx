/**
 * Paywall Component (Web)
 * Shown to users when their subscription has expired
 * Directs users to the iOS app for subscription
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Smartphone, Check, Gift } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import VaraLogo from '../../assets/logo/vara-logo-hr.png';

const FEATURES = [
  'Unlimited AI coaching',
  'Full wellness library access',
  'Advanced habit tracking & insights',
  'Community features',
  'AI-powered journaling',
  'Brain health dashboard',
];

export default function Paywall() {
  const { status } = useSubscription();

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center px-4"
      style={{ backgroundImage: "url('/images/vara-welcome-bg.png')" }}
    >
      <div className="w-full max-w-lg bg-white/95 backdrop-blur-lg p-8 rounded-2xl shadow-xl">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img
            src={VaraLogo}
            alt="Vara Logo"
            className="h-14 w-14 object-contain rounded-xl shadow"
          />
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto bg-[#D5E3D1] rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-[#1B5E57]" />
          </div>
          <h1 className="text-2xl font-semibold text-[#1B5E57] mb-2">
            Unlock Your Full Potential
          </h1>
          <p className="text-[#6B7B6A]">
            {status?.type === 'expired'
              ? 'Your trial has ended. Subscribe to continue your wellness journey.'
              : 'Subscribe to access all features and continue growing.'}
          </p>
        </div>

        {/* Features */}
        <div className="bg-[#FAFAF6] rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-[#3E3E3E] mb-3">What you'll get:</h3>
          <ul className="space-y-2">
            {FEATURES.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-[#3E3E3E]">
                <Check className="h-4 w-4 text-[#1B5E57] flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white border-2 border-[#E0E0E0] rounded-xl p-4 text-center">
            <p className="text-sm text-[#757575] mb-1">Monthly</p>
            <p className="text-xl font-bold text-[#3E3E3E]">$10.99</p>
            <p className="text-xs text-[#757575]">/month</p>
          </div>
          <div className="bg-[#FFFDF5] border-2 border-[#F4C542] rounded-xl p-4 text-center relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F4C542] text-white text-xs font-semibold px-3 py-1 rounded-full">
              Best Value
            </span>
            <p className="text-sm text-[#1B5E57] mb-1 mt-1">Annual</p>
            <p className="text-xl font-bold text-[#1B5E57]">$111.99</p>
            <p className="text-xs text-[#388E3C] font-medium">Save 15%</p>
          </div>
        </div>

        {/* Mobile App CTA */}
        <div className="bg-[#1B5E57] text-white rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6 flex-shrink-0" />
            <div>
              <p className="font-semibold">Subscribe via iOS App</p>
              <p className="text-sm text-white/80">
                Download Vara on the App Store to subscribe
              </p>
            </div>
          </div>
        </div>

        {/* Invite Code Option */}
        <div className="text-center mb-4">
          <button
            className="inline-flex items-center gap-2 text-[#1B5E57] hover:underline transition"
            onClick={() => {
              // TODO: Open redeem code modal
              alert('To redeem an invite code, please use the Vara iOS app.');
            }}
          >
            <Gift className="h-4 w-4" />
            Have an invite code?
          </button>
        </div>

        {/* Data Retention Notice */}
        {status?.dataRetentionDaysRemaining && (
          <div className="bg-[#FFF8E1] border border-[#F57C00]/30 rounded-lg p-3 mb-4">
            <p className="text-sm text-[#3E3E3E]">
              <span className="font-medium">Note:</span> Your data will be kept for{' '}
              {status.dataRetentionDaysRemaining} more days. Subscribe to keep your progress
              permanently.
            </p>
          </div>
        )}

        {/* Terms */}
        <p className="text-xs text-[#757575] text-center">
          Subscriptions are managed through your App Store account.
          <br />
          <Link to="/terms" className="underline">
            Terms of Service
          </Link>{' '}
          ·{' '}
          <Link to="/privacy" className="underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}

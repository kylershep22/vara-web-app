import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import VaraLogo from "../assets/logo/vara-logo-hr.png";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#FAFAF6]">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/login">
            <img
              src={VaraLogo}
              alt="Vara Logo"
              className="h-12 w-12 object-contain rounded-xl shadow"
            />
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-2 text-[#1B5E57] hover:text-[#164e48] transition"
          >
            <ArrowLeft size={20} />
            <span>Back to Login</span>
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-[#D5E3D1] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="text-[#1B5E57]" size={32} />
            <h1 className="text-3xl font-bold text-[#3E3E3E]">Privacy Policy</h1>
          </div>

          <p className="text-sm text-gray-600 mb-8">
            <strong>Effective Date:</strong> January 1, 2026<br />
            <strong>Last Updated:</strong> November 7, 2025
          </p>

          <div className="prose prose-sm max-w-none space-y-6 text-[#3E3E3E]">
            <section>
              <h2 className="text-2xl font-semibold text-[#1B5E57] mb-4">Introduction</h2>
              <p>
                Welcome to Vara Wellness ("we," "us," or "our"). We respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our wellness application and services (the "Service").
              </p>
              <p>
                Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#1B5E57] mb-4">1. Information We Collect</h2>

              <h3 className="text-xl font-semibold text-[#3E3E3E] mb-3">1.1 Information You Provide to Us</h3>

              <h4 className="text-lg font-medium text-[#3E3E3E] mb-2">Account Information:</h4>
              <ul className="list-disc pl-6 space-y-1">
                <li>Email address</li>
                <li>Display name</li>
                <li>Password (encrypted)</li>
                <li>Profile photo (optional)</li>
                <li>Bio and personal information you choose to share</li>
              </ul>

              <h4 className="text-lg font-medium text-[#3E3E3E] mb-2 mt-4">Wellness Data:</h4>
              <ul className="list-disc pl-6 space-y-1">
                <li>Goals and progress tracking</li>
                <li>Habit check-ins and streaks</li>
                <li>Tasks and to-do items</li>
                <li>Journal entries and reflections</li>
                <li>Mood tracking</li>
                <li>Community posts and comments</li>
                <li>Direct messages</li>
                <li>Group memberships</li>
              </ul>

              <h3 className="text-xl font-semibold text-[#3E3E3E] mb-3 mt-4">1.2 Information Automatically Collected</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Device type, operating system, and browser</li>
                <li>IP address and general location (city/country level)</li>
                <li>App usage statistics and feature interactions</li>
                <li>Session duration and frequency</li>
                <li>Error logs and crash reports</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#1B5E57] mb-4">2. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>To Provide and Maintain Our Service:</strong> Create and manage your account, store your wellness data, sync across devices</li>
                <li><strong>To Improve Our Service:</strong> Analyze usage patterns, develop new features, fix bugs</li>
                <li><strong>AI-Powered Features:</strong> Generate personalized wellness plans, provide AI coaching, summarize journal entries (powered by OpenAI)</li>
                <li><strong>To Communicate With You:</strong> Send account-related emails, respond to inquiries, send important updates</li>
                <li><strong>To Ensure Security:</strong> Monitor for suspicious activity, enforce our Terms of Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#1B5E57] mb-4">3. How We Share Your Information</h2>
              <p className="font-semibold">We do not sell your personal information.</p>

              <h3 className="text-xl font-semibold text-[#3E3E3E] mb-3 mt-4">With Service Providers:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Firebase (Google Cloud):</strong> Hosting, database, authentication, storage</li>
                <li><strong>OpenAI:</strong> AI features (daily plans, journal summaries, habit suggestions)</li>
                <li><strong>Analytics Providers:</strong> Firebase Analytics for usage statistics (anonymized)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#1B5E57] mb-4">4. Your Privacy Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Access:</strong> View all your personal data</li>
                <li><strong>Update:</strong> Edit your profile, goals, habits, and other data</li>
                <li><strong>Delete:</strong> Remove specific content or close your account</li>
                <li><strong>Export:</strong> Download your data in a portable format</li>
              </ul>

              <h3 className="text-xl font-semibold text-[#3E3E3E] mb-3 mt-4">GDPR Rights (European Users):</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Right to erasure</li>
                <li>Right to restriction</li>
                <li>Right to data portability</li>
                <li>Right to object</li>
                <li>Right to lodge a complaint</li>
              </ul>

              <h3 className="text-xl font-semibold text-[#3E3E3E] mb-3 mt-4">CCPA Rights (California Users):</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Know what personal information we collect</li>
                <li>Request deletion of your personal information</li>
                <li>Opt-out of sale (we do not sell your information)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#1B5E57] mb-4">5. Data Security</h2>
              <p>We implement industry-standard security measures:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Encryption in transit (HTTPS/TLS) and at rest</li>
                <li>Firebase Security Rules for access control</li>
                <li>Secure authentication with password hashing</li>
                <li>Regular security audits</li>
              </ul>
              <p className="mt-3 text-sm italic">
                While we strive to protect your information, no method of transmission over the Internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#1B5E57] mb-4">6. Children's Privacy</h2>
              <p>
                Vara Wellness is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#1B5E57] mb-4">7. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy, please contact us:
              </p>
              <div className="mt-3 space-y-1">
                <p><strong>Email:</strong> [YOUR SUPPORT EMAIL]</p>
                <p><strong>Mail:</strong> [YOUR BUSINESS ADDRESS]</p>
              </div>
            </section>

            <div className="mt-12 p-6 bg-[#F4F7F4] rounded-lg border border-[#D5E3D1]">
              <p className="text-sm text-gray-600">
                <strong>Last Updated:</strong> November 7, 2025<br />
                <strong>Effective Date:</strong> January 1, 2026
              </p>
              <p className="text-sm text-gray-600 mt-4">
                © 2025 Vara Wellness. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

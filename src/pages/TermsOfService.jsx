import React from 'react';
import { FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import VaraLogo from "../assets/logo/vara-logo-hr.png";

export default function TermsOfService() {
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
            <FileText className="text-[#1B5E57]" size={32} />
            <h1 className="text-3xl font-bold text-[#3E3E3E]">Terms of Service</h1>
          </div>

          <p className="text-sm text-gray-600 mb-8">
            <strong>Effective Date:</strong> January 1, 2026<br />
            <strong>Last Updated:</strong> November 7, 2025
          </p>

          <div className="prose prose-sm max-w-none space-y-6 text-[#3E3E3E]">
            <section>
              <h2 className="text-2xl font-semibold text-[#1B5E57] mb-4">1. Acceptance of Terms</h2>
              <p>
                Welcome to Vara Wellness! These Terms of Service ("Terms") govern your access to and use of our wellness application, website, and related services (collectively, the "Service").
              </p>
              <p className="font-semibold">
                By accessing or using the Service, you agree to be bound by these Terms.
              </p>
              <p>
                If you do not agree to these Terms, you may not access or use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#1B5E57] mb-4">2. Eligibility</h2>
              <p>
                You must be at least 13 years old to use the Service. If you are between 13 and 18, you represent that you have your parent's or guardian's permission to use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#1B5E57] mb-4">3. User Accounts</h2>
              <p>You are responsible for:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Maintaining the confidentiality of your password</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#1B5E57] mb-4">4. Acceptable Use</h2>

              <h3 className="text-xl font-semibold text-[#3E3E3E] mb-3">You may use the Service to:</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Track your wellness goals and habits</li>
                <li>Journal and reflect on your wellness journey</li>
                <li>Connect with the Vara community</li>
                <li>Access wellness content and AI coaching</li>
              </ul>

              <h3 className="text-xl font-semibold text-[#3E3E3E] mb-3 mt-4">You agree NOT to:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Illegal Activity:</strong> Violate any laws, engage in fraud, harass or threaten others</li>
                <li><strong>Harmful Content:</strong> Post violence, hate speech, explicit content, or spam</li>
                <li><strong>Technical Abuse:</strong> Hack, use bots, or interfere with the Service</li>
                <li><strong>Misuse of Features:</strong> Impersonate others, create fake accounts, abuse AI features</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#1B5E57] mb-4">5. User Content</h2>
              <p>
                You retain ownership of the content you create and share on the Service (journal entries, posts, comments, etc.).
              </p>
              <p>
                By posting content, you grant us a worldwide, non-exclusive, royalty-free license to use, store, and display your content for the purpose of operating the Service.
              </p>
              <p>
                You are solely responsible for your content and represent that you have the rights to post it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#1B5E57] mb-4">6. AI-Powered Features & Medical Disclaimer</h2>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <p className="font-semibold text-yellow-800">⚠️ Important Disclaimer</p>
                <p className="text-yellow-700 mt-2">
                  Our AI features are for informational purposes only and are NOT a substitute for professional medical or mental health advice.
                </p>
              </div>
              <p className="font-semibold">Vara Wellness is NOT a medical service.</p>
              <p>Always consult a licensed healthcare professional for:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Medical concerns or emergencies</li>
                <li>Mental health issues</li>
                <li>Medication or treatment decisions</li>
              </ul>
              <p className="font-semibold mt-3">
                If you are experiencing a medical emergency, call 911 or your local emergency number immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#1B5E57] mb-4">7. Disclaimers</h2>
              <p className="font-semibold">THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.</p>
              <p>We do not warrant that:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>The Service will be uninterrupted or error-free</li>
                <li>Defects will be corrected</li>
                <li>The Service is free of viruses</li>
                <li>Results will be accurate</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#1B5E57] mb-4">8. Limitation of Liability</h2>
              <p className="font-semibold">TO THE FULLEST EXTENT PERMITTED BY LAW:</p>
              <p>
                Vara Wellness shall not be liable for indirect, incidental, or consequential damages. Our total liability shall not exceed $100 or the amount you paid us in the past 12 months.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#1B5E57] mb-4">9. Termination</h2>
              <p>
                You may delete your account at any time. We may suspend or terminate your account for violating these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#1B5E57] mb-4">10. Changes to Terms</h2>
              <p>
                We may update these Terms from time to time. We will notify you of material changes by email or through the Service. Your continued use constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#1B5E57] mb-4">11. Governing Law</h2>
              <p>
                These Terms are governed by the laws of [YOUR STATE/COUNTRY]. Any legal action must be brought in the courts located in [YOUR JURISDICTION].
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#1B5E57] mb-4">12. Contact Us</h2>
              <p>
                If you have questions about these Terms, please contact us:
              </p>
              <div className="mt-3 space-y-1">
                <p><strong>Email:</strong> [YOUR SUPPORT EMAIL]</p>
                <p><strong>Mail:</strong> [YOUR BUSINESS ADDRESS]</p>
              </div>
            </section>

            <div className="mt-12 p-6 bg-[#F4F7F4] rounded-lg border border-[#D5E3D1]">
              <p className="font-semibold text-[#3E3E3E] mb-2">
                By using Vara Wellness, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
              <p className="text-sm text-gray-600 mt-4">
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

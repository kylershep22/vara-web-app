import React from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { Heart, Moon, Wind, Activity, Apple, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function FuelRecovery() {
  const { user } = useAuth();

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="text-[#1B5E57]" size={32} />
            <h1 className="text-3xl font-bold text-[#3E3E3E]">Fuel & Recovery</h1>
          </div>
          <p className="text-[#6B7280]">
            Optimize your physical and mental recovery for peak brain performance
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Sleep */}
          <div className="bg-white rounded-xl shadow-sm border border-[#D5E3D1] p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Moon className="text-[#1B5E57]" size={24} />
              <h2 className="text-xl font-semibold text-[#3E3E3E]">Sleep</h2>
            </div>
            <p className="text-[#6B7280] mb-4">
              Build healthy sleep routines, track your sleep quality, and learn the science of restorative rest.
            </p>
            <Link
              to="/library/sleep"
              className="text-[#1B5E57] font-medium hover:underline"
            >
              Explore Sleep Resources →
            </Link>
          </div>

          {/* Breathwork */}
          <div className="bg-white rounded-xl shadow-sm border border-[#D5E3D1] p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Wind className="text-[#10B981]" size={24} />
              <h2 className="text-xl font-semibold text-[#3E3E3E]">Breathwork</h2>
            </div>
            <p className="text-[#6B7280] mb-4">
              Practice guided breathwork sessions for relaxation, focus, and energy.
            </p>
            <Link
              to="/library/breathwork"
              className="text-[#1B5E57] font-medium hover:underline"
            >
              Start Breathwork →
            </Link>
          </div>

          {/* Stress Management */}
          <div className="bg-white rounded-xl shadow-sm border border-[#D5E3D1] p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="text-[#F59E0B]" size={24} />
              <h2 className="text-xl font-semibold text-[#3E3E3E]">Stress Management</h2>
            </div>
            <p className="text-[#6B7280] mb-4">
              Learn why stress isn't the enemy and discover tools for building resilience.
            </p>
            <button className="text-[#1B5E57] font-medium hover:underline">
              Learn More →
            </button>
          </div>

          {/* Movement */}
          <div className="bg-white rounded-xl shadow-sm border border-[#D5E3D1] p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="text-[#8B5CF6]" size={24} />
              <h2 className="text-xl font-semibold text-[#3E3E3E]">Movement</h2>
            </div>
            <p className="text-[#6B7280] mb-4">
              Explore movement practices that support brain health and overall vitality.
            </p>
            <Link
              to="/library/movement"
              className="text-[#1B5E57] font-medium hover:underline"
            >
              Movement Library →
            </Link>
          </div>

          {/* Nutrition */}
          <div className="bg-white rounded-xl shadow-sm border border-[#D5E3D1] p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Apple className="text-[#EF4444]" size={24} />
              <h2 className="text-xl font-semibold text-[#3E3E3E]">Nutrition</h2>
            </div>
            <p className="text-[#6B7280] mb-4">
              Discover how nutrition impacts brain health and cognitive performance.
            </p>
            <button className="text-[#1B5E57] font-medium hover:underline">
              Coming Soon →
            </button>
          </div>

          {/* Wellness Vault */}
          <div className="bg-gradient-to-br from-[#1B5E57] to-[#B8CDBA] rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow text-white">
            <div className="flex items-center gap-3 mb-4">
              <Heart className="text-white" size={24} />
              <h2 className="text-xl font-semibold">Wellness Vault</h2>
            </div>
            <p className="mb-4 opacity-90">
              Access our complete library of videos, articles, and resources on brain health topics.
            </p>
            <button className="bg-white text-[#1B5E57] px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-shadow">
              Browse Vault
            </button>
          </div>

        </div>

        {/* Educational Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-[#D5E3D1] p-6">
          <h3 className="text-xl font-semibold text-[#3E3E3E] mb-4">Recovery is Brain Health</h3>
          <p className="text-[#6B7280] mb-4">
            Your brain's ability to perform at its best depends on how well you fuel and recover it. Sleep, nutrition, stress management, and movement aren't just about physical health—they're essential for cognitive performance, mental clarity, and long-term brain resilience.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="border-l-4 border-[#1B5E57] pl-4">
              <h4 className="font-semibold text-[#3E3E3E] mb-2">Sleep & Cognitive Reserve</h4>
              <p className="text-sm text-[#6B7280]">
                Quality sleep consolidates memories, clears brain toxins, and builds cognitive reserve.
              </p>
            </div>
            <div className="border-l-4 border-[#10B981] pl-4">
              <h4 className="font-semibold text-[#3E3E3E] mb-2">Stress as a Tool</h4>
              <p className="text-sm text-[#6B7280]">
                Acute stress can enhance performance. Learning to manage and recover from stress builds resilience.
              </p>
            </div>
          </div>
        </div>

        {/* Coming Soon Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Coming Soon</h3>
          <p className="text-blue-700">
            Sleep routine designer, stress tracking, nutrition guides, wellness vault with curated content, and masterclasses on gut health, hormones, and longevity.
          </p>
        </div>
      </div>
    </SidebarLayout>
  );
}

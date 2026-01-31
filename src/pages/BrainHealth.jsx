import React from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { Brain, TrendingUp, Zap, Target, Shield, Users } from 'lucide-react';
import { BRAIN_PILLARS, getAllPillarIds } from '../constants/brainPillars';

export default function BrainHealth() {
  return (
    <SidebarLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="h-10 w-10 text-[#1B5E57]" />
            <h1 className="text-4xl font-bold text-[#3E3E3E]">Brain Health</h1>
          </div>
          <p className="text-lg text-[#6B7280] max-w-3xl">
            Your comprehensive brain health dashboard - tracking the 5 core pillars of cognitive wellness.
          </p>
        </div>

        {/* Coming Soon Notice */}
        <div className="bg-gradient-to-r from-[#1B5E57] to-[#B8CDBA] text-white rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-3">Coming Soon</h2>
          <p className="text-lg opacity-90">
            We're building a comprehensive brain health dashboard with real-time metrics,
            neuroplasticity tracking, and personalized insights. Stay tuned!
          </p>
        </div>

        {/* Brain Health Pillars Preview */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#3E3E3E] mb-4">The 5 Brain Health Pillars</h2>
          <p className="text-[#6B7280] mb-6">
            Every action you take in Vara supports one or more of these scientifically-backed brain health pillars.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getAllPillarIds().map(pillarId => {
            const pillar = BRAIN_PILLARS[pillarId];
            const IconComponent = getIconComponent(pillar.icon);

            return (
              <div
                key={pillar.id}
                className="bg-white rounded-xl border-2 border-[#D5E3D1] p-6 hover:shadow-lg transition-all duration-200"
                style={{ borderLeftColor: pillar.color, borderLeftWidth: '4px' }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: pillar.lightColor }}
                  >
                    <IconComponent size={24} style={{ color: pillar.color }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#3E3E3E] mb-1">
                      {pillar.name}
                    </h3>
                    <p className="text-sm text-[#9AAE8C] font-medium">
                      {pillar.fullName}
                    </p>
                  </div>
                </div>

                <p className="text-[#6B7280] mb-4">
                  {pillar.description}
                </p>

                <div className="pt-4 border-t border-[#D5E3D1]">
                  <p className="text-sm font-semibold text-[#3E3E3E] mb-2">
                    Key Benefits:
                  </p>
                  <ul className="space-y-1">
                    {pillar.benefits.slice(0, 3).map((benefit, idx) => (
                      <li key={idx} className="text-sm text-[#6B7280] flex items-start">
                        <span className="mr-2">•</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Future Features Preview */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-[#D5E3D1] p-6">
            <div className="h-12 w-12 bg-[#E8F5E9] rounded-lg flex items-center justify-center mb-4">
              <Target className="h-6 w-6 text-[#1B5E57]" />
            </div>
            <h3 className="text-lg font-bold text-[#3E3E3E] mb-2">Brain Readiness Score</h3>
            <p className="text-sm text-[#6B7280]">
              Daily cognitive performance tracking based on sleep, hydration, and stress levels.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#D5E3D1] p-6">
            <div className="h-12 w-12 bg-[#FFF3E0] rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-[#F59E0B]" />
            </div>
            <h3 className="text-lg font-bold text-[#3E3E3E] mb-2">Neuroplasticity Tracker</h3>
            <p className="text-sm text-[#6B7280]">
              Track daily challenges and uncomfortable actions that strengthen your brain's adaptability.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#D5E3D1] p-6">
            <div className="h-12 w-12 bg-[#F3E5F5] rounded-lg flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-[#8B5CF6]" />
            </div>
            <h3 className="text-lg font-bold text-[#3E3E3E] mb-2">Nervous System Tools</h3>
            <p className="text-sm text-[#6B7280]">
              Quick-access stress regulation techniques like physiological sighs and panoramic vision.
            </p>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

// Helper function to map icon names to components
function getIconComponent(iconName) {
  const iconMap = {
    TrendingUp,
    Zap,
    Target,
    Shield,
    Users
  };
  return iconMap[iconName] || Brain;
}

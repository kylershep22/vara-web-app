// src/pages/BrainHealth.jsx
// Brain Health dashboard — 7 interactive widgets tracking cognitive wellness.

import React from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { Brain } from 'lucide-react';

import AIBrainInsightCard from '../components/brain/AIBrainInsightCard';
import BrainReadinessWidget from '../components/brain/BrainReadinessWidget';
import FocusWindowIndicator from '../components/brain/FocusWindowIndicator';
import NeuroplasticityTracker from '../components/brain/NeuroplasticityTracker';
import AMCCChallengeCard from '../components/brain/AMCCChallengeCard';
import NervousSystemTools from '../components/brain/NervousSystemTools';
import WeeklyBrainMetricsChart from '../components/brain/WeeklyBrainMetricsChart';

export default function BrainHealth() {
  return (
    <SidebarLayout>
      <div className="max-w-5xl mx-auto px-vara-base py-vara-lg">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-vara-xs">
          <Brain size={28} className="text-evergreen-teal shrink-0" />
          <h1 className="text-vara-2xl font-bold text-soft-charcoal">Brain Health</h1>
        </div>
        <p className="text-vara-base text-muted-sage-gray mb-vara-lg">
          Track your cognitive wellness
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-vara-base mt-vara-lg">
          {/* Full-width: AI insight */}
          <div className="lg:col-span-2">
            <AIBrainInsightCard />
          </div>

          {/* Half-width pair */}
          <BrainReadinessWidget />
          <FocusWindowIndicator />

          {/* Half-width pair */}
          <NeuroplasticityTracker />
          <AMCCChallengeCard />

          {/* Full-width: tools */}
          <div className="lg:col-span-2">
            <NervousSystemTools />
          </div>

          {/* Full-width: chart */}
          <div className="lg:col-span-2">
            <WeeklyBrainMetricsChart />
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

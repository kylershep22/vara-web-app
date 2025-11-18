// src/components/insights/BrainHealthHub.jsx

import React, { useState } from 'react';
import { Brain, Users, TreePine, Zap, Smartphone, Activity } from 'lucide-react';
import BrainHealthScore from '../trackers/BrainHealthScore';
import SocialConnectionTracker from '../trackers/SocialConnectionTracker';
import NatureExposureLogger from '../trackers/NatureExposureLogger';
import CognitiveLoadMonitor from '../trackers/CognitiveLoadMonitor';
import DigitalWellbeingDashboard from '../trackers/DigitalWellbeingDashboard';

const BrainHealthHub = ({ userId }) => {
  const [activeTracker, setActiveTracker] = useState('score');

  const trackers = [
    { id: 'score', label: 'Brain Health Score', icon: Brain, color: 'purple' },
    { id: 'social', label: 'Social Connections', icon: Users, color: 'blue' },
    { id: 'nature', label: 'Nature Exposure', icon: TreePine, color: 'green' },
    { id: 'cognitive', label: 'Cognitive Load', icon: Zap, color: 'yellow' },
    { id: 'digital', label: 'Digital Wellbeing', icon: Smartphone, color: 'indigo' }
  ];

  const getColorClasses = (color, isActive) => {
    const colors = {
      purple: isActive
        ? 'bg-purple-100 border-purple-500 text-purple-700'
        : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300 hover:bg-purple-50',
      blue: isActive
        ? 'bg-blue-100 border-blue-500 text-blue-700'
        : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50',
      green: isActive
        ? 'bg-green-100 border-green-500 text-green-700'
        : 'bg-white border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50',
      yellow: isActive
        ? 'bg-yellow-100 border-yellow-500 text-yellow-700'
        : 'bg-white border-gray-200 text-gray-600 hover:border-yellow-300 hover:bg-yellow-50',
      indigo: isActive
        ? 'bg-indigo-100 border-indigo-500 text-indigo-700'
        : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50'
    };
    return colors[color];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Brain className="text-purple-600" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-purple-900 mb-2">Brain Health Hub</h2>
            <p className="text-purple-700 mb-4">
              Comprehensive tracking of the key factors that influence your cognitive health, mental clarity, and overall brain function.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2 bg-white bg-opacity-60 rounded-lg px-3 py-2">
                <Activity className="text-purple-600" size={16} />
                <span className="text-purple-800">Track multiple dimensions</span>
              </div>
              <div className="flex items-center gap-2 bg-white bg-opacity-60 rounded-lg px-3 py-2">
                <Brain className="text-purple-600" size={16} />
                <span className="text-purple-800">Science-backed metrics</span>
              </div>
              <div className="flex items-center gap-2 bg-white bg-opacity-60 rounded-lg px-3 py-2">
                <Zap className="text-purple-600" size={16} />
                <span className="text-purple-800">Actionable insights</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tracker Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {trackers.map(tracker => {
          const Icon = tracker.icon;
          const isActive = activeTracker === tracker.id;
          return (
            <button
              key={tracker.id}
              onClick={() => setActiveTracker(tracker.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${getColorClasses(tracker.color, isActive)}`}
            >
              <Icon size={24} />
              <span className="text-sm font-medium text-center">{tracker.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tracker Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {activeTracker === 'score' && <BrainHealthScore userId={userId} />}
        {activeTracker === 'social' && <SocialConnectionTracker userId={userId} />}
        {activeTracker === 'nature' && <NatureExposureLogger userId={userId} />}
        {activeTracker === 'cognitive' && <CognitiveLoadMonitor userId={userId} />}
        {activeTracker === 'digital' && <DigitalWellbeingDashboard userId={userId} />}
      </div>
    </div>
  );
};

export default BrainHealthHub;

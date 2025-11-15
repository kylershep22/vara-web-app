import React, { useState } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { Target, Clock, Music, Calendar, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PomodoroTimer from '../components/focus/PomodoroTimer';
import FocusSessionHistory from '../components/focus/FocusSessionHistory';
import BinauraBeatsLibrary from '../components/focus/BinauraBeatsLibrary';
import RoutineDesigner from '../components/focus/RoutineDesigner';

export default function Focus() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('timer'); // 'timer' | 'history' | 'music' | 'routines'
  const [sessionsRefreshKey, setSessionsRefreshKey] = useState(0);

  const handleSessionComplete = (duration) => {
    // Refresh session history when a new session completes
    setSessionsRefreshKey(prev => prev + 1);
  };

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Target className="text-[#1B5E57]" size={32} />
            <h1 className="text-3xl font-bold text-[#3E3E3E]">Focus</h1>
          </div>
          <p className="text-[#6B7280]">
            Tools and techniques for deep work and sustained concentration
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto border-b border-gray-200">
          <button
            onClick={() => setActiveTab('timer')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 ${
              activeTab === 'timer'
                ? 'border-[#1B5E57] text-[#1B5E57]'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <Clock size={20} />
            Pomodoro Timer
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 ${
              activeTab === 'history'
                ? 'border-[#1B5E57] text-[#1B5E57]'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <BarChart3 size={20} />
            Session History
          </button>
          <button
            onClick={() => setActiveTab('music')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 ${
              activeTab === 'music'
                ? 'border-[#1B5E57] text-[#1B5E57]'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <Music size={20} />
            Focus Music
          </button>
          <button
            onClick={() => setActiveTab('routines')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 ${
              activeTab === 'routines'
                ? 'border-[#1B5E57] text-[#1B5E57]'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <Calendar size={20} />
            Routines
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {/* Pomodoro Timer Tab */}
          {activeTab === 'timer' && (
            <div className="max-w-2xl mx-auto">
              <PomodoroTimer userId={user?.uid} onSessionComplete={handleSessionComplete} />
            </div>
          )}

          {/* Session History Tab */}
          {activeTab === 'history' && (
            <div>
              <FocusSessionHistory key={sessionsRefreshKey} userId={user?.uid} />
            </div>
          )}

          {/* Focus Music Tab */}
          {activeTab === 'music' && (
            <div>
              <BinauraBeatsLibrary userId={user?.uid} />
            </div>
          )}

          {/* Routines Tab */}
          {activeTab === 'routines' && (
            <div>
              <RoutineDesigner userId={user?.uid} />
            </div>
          )}
        </div>

        {/* Focus Tips Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-[#D5E3D1] p-6">
          <h3 className="text-xl font-semibold text-[#3E3E3E] mb-4">Tips for Deep Focus</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Before You Start:</h4>
              <ul className="space-y-1 text-[#6B7280] text-sm">
                <li>• Close unnecessary browser tabs and apps</li>
                <li>• Turn off notifications on your devices</li>
                <li>• Have water and snacks within reach</li>
                <li>• Set a clear intention for the session</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">During Your Session:</h4>
              <ul className="space-y-1 text-[#6B7280] text-sm">
                <li>• Work on ONE task at a time</li>
                <li>• Take breaks to prevent burnout</li>
                <li>• Use the 20-20-20 rule for eye strain</li>
                <li>• Track your peak performance hours</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import SetGoalFlow from './components/goalFlow/SetGoalFlow';
import ProtectedRoute from './components/ProtectedRoute';

import DailyWellness from './pages/DailyWellness';
import WellnessLibrary from './pages/WellnessLibrary';
import SleepRecovery from './pages/SleepRecovery';
import Journal from './pages/Journal';
import AICompanion from './pages/AICompanion';
import Profile from './pages/Profile';
import CommunityPage from './pages/Community/CommunityPage';
import GroupPage from './pages/Community/GroupPage';
import Notifications from './pages/Notifications';
import Breathwork from './pages/library/Breathwork';
import Sleep from './pages/library/Sleep';
import Movement from './pages/library/Movement';
import GoalsHabits from './pages/GoalsHabits';

import { AudioPlayerProvider } from './context/AudioPlayerContext';
import { VideoPlayerProvider } from './context/VideoPlayerContext';
import NowPlayingBar from './components/audio/NowPlayingBar';
import VideoPlayerBar from './components/video/VideoPlayerBar';
import UserProfileForm from './components/onboarding/UserProfileForm';

import './styles/tailwind.css';

function App() {
  return (
    <AudioPlayerProvider>
      <VideoPlayerProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Onboarding Flow */}
          <Route path="/onboarding/set-goal" element={<SetGoalFlow />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/goals-habits"
            element={
              <ProtectedRoute>
                <GoalsHabits />
              </ProtectedRoute>
            }
          />
          <Route
            path="/daily"
            element={
              <ProtectedRoute>
                <DailyWellness />
              </ProtectedRoute>
            }
          />
          <Route
            path="/library"
            element={
              <ProtectedRoute>
                <WellnessLibrary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sleep"
            element={
              <ProtectedRoute>
                <SleepRecovery />
              </ProtectedRoute>
            }
          />
          <Route
            path="/journal"
            element={
              <ProtectedRoute>
                <Journal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai"
            element={
              <ProtectedRoute>
                <AICompanion />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community"
            element={
              <ProtectedRoute>
                <CommunityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/group/:groupId"
            element={
              <ProtectedRoute>
                <GroupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/library/breathwork"
            element={
              <ProtectedRoute>
                <Breathwork />
              </ProtectedRoute>
            }
          />
          <Route
            path="/library/sleep"
            element={
              <ProtectedRoute>
                <Sleep />
              </ProtectedRoute>
            }
          />
          <Route
            path="/library/movement"
            element={
              <ProtectedRoute>
                <Movement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/profile"
            element={
              <ProtectedRoute>
                <UserProfileForm />
              </ProtectedRoute>
            }
          />
        </Routes>

        {/* Persistent Media Bars */}
        <NowPlayingBar />
        <VideoPlayerBar />
      </VideoPlayerProvider>
    </AudioPlayerProvider>
  );
}

export default App;












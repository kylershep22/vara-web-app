import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';

import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import AuthAction from './pages/AuthAction';
import Dashboard from './pages/Dashboard';
import SetGoalFlow from './components/goalFlow/SetGoalFlow';
import ProtectedRoute from './components/ProtectedRoute';

import WellnessLibrary from './pages/WellnessLibrary';
import SleepRecovery from './pages/SleepRecovery';
import Journal from './pages/Journal';
import AICompanion from './pages/AICompanion';
import Settings from "./pages/Settings/Settings";
import CommunityPage from './pages/Community/CommunityPage';
import GroupPage from './pages/Community/GroupPage';
import GroupDetailPage from './pages/GroupDetailPage';
import Notifications from './pages/Notifications';
import Breathwork from './pages/library/Breathwork';
import Sleep from './pages/library/Sleep';
import Movement from './pages/library/Movement';
import GoalsHabits from './pages/GoalsHabits';
import GroupForumPage from './pages/Community/GroupForumPage';
import ChallengesPage from './pages/Community/ChallengesPage';
import ChallengeDetailPage from './pages/Community/ChallengeDetailPage';

// New Brain Health pages
import BrainHealth from './pages/BrainHealth';
import MentalResilience from './pages/MentalResilience';
import Focus from './pages/Focus';
import FuelRecovery from './pages/FuelRecovery';
import Insights from './pages/Insights';
import Masterclass from './pages/Masterclass';

import { AudioPlayerProvider } from './context/AudioPlayerContext';
import { VideoPlayerProvider } from './context/VideoPlayerContext';
import NowPlayingBar from './components/audio/NowPlayingBar';
import VideoPlayerBar from './components/video/VideoPlayerBar';
import UserProfileForm from './components/onboarding/UserProfileForm';
import OnboardingWelcome from './pages/onboarding/OnboardingWelcome';
import OnboardingCheckIn from './pages/onboarding/OnboardingCheckIn';
import OnboardingInsight from './pages/onboarding/OnboardingInsight';
import OnboardingActivity from './pages/onboarding/OnboardingActivity';
import OnboardingConfirmation from './pages/onboarding/OnboardingConfirmation';
import EditProfile from './pages/Profile/EditProfile';
import PeopleSearchPage from './pages/Community/PeopleSearchPage';
import SeedTagsTool from "./dev/SeedTagsTool";
import MigrationAdmin from "./pages/MigrationAdmin";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import AdminRoute from "./components/AdminRoute";
import UserProfilePage from "./pages/Profile/UserProfilePage";
import MyProfileRedirect from './pages/Profile/MyProfileRedirect';
import LegacyProfileRedirect from './pages/Profile/LegacyProfileRedirect';
import Reflections from "./pages/Reflections";
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

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
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/action" element={<AuthAction />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />

          {/* Onboarding Flow */}
          <Route path="/onboarding/welcome" element={<ProtectedRoute><OnboardingWelcome /></ProtectedRoute>} />
          <Route path="/onboarding/check-in" element={<ProtectedRoute><OnboardingCheckIn /></ProtectedRoute>} />
          <Route path="/onboarding/insight" element={<ProtectedRoute><OnboardingInsight /></ProtectedRoute>} />
          <Route path="/onboarding/activity" element={<ProtectedRoute><OnboardingActivity /></ProtectedRoute>} />
          <Route path="/onboarding/confirmation" element={<ProtectedRoute><OnboardingConfirmation /></ProtectedRoute>} />
          <Route path="/onboarding/set-goal" element={<SetGoalFlow />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <ErrorBoundary level="feature" featureName="Dashboard">
                  <Dashboard />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* New Brain Health Routes */}
          <Route
            path="/brain-health"
            element={
              <ProtectedRoute>
                <ErrorBoundary level="feature" featureName="Brain Health">
                  <BrainHealth />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mental-resilience"
            element={
              <ProtectedRoute>
                <ErrorBoundary level="feature" featureName="Mental Resilience">
                  <MentalResilience />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/focus"
            element={
              <ProtectedRoute>
                <ErrorBoundary level="feature" featureName="Focus">
                  <Focus />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/fuel-recovery"
            element={
              <ProtectedRoute>
                <ErrorBoundary level="feature" featureName="Fuel & Recovery">
                  <FuelRecovery />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/insights"
            element={
              <ProtectedRoute>
                <ErrorBoundary level="feature" featureName="Insights">
                  <Insights />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/masterclass"
            element={
              <ProtectedRoute>
                <ErrorBoundary level="feature" featureName="Masterclass">
                  <Masterclass />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* Legacy route - keep for backward compatibility */}
          <Route
            path="/goals-habits"
            element={
              <ProtectedRoute>
                <ErrorBoundary level="feature" featureName="Goals & Habits">
                  <GoalsHabits />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/library"
            element={
              <ProtectedRoute>
                <ErrorBoundary level="feature" featureName="Wellness Library">
                  <WellnessLibrary />
                </ErrorBoundary>
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
                <ErrorBoundary level="feature" featureName="Journal">
                  <Journal />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai"
            element={
              <ProtectedRoute>
                <ErrorBoundary level="feature" featureName="AI Companion">
                  <AICompanion />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <ErrorBoundary level="feature" featureName="Settings">
                  <Settings />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/community"
            element={
              <ProtectedRoute>
                <ErrorBoundary level="feature" featureName="Community">
                  <CommunityPage />
                </ErrorBoundary>
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
            path="/group/:groupId/details"
            element={
              <ProtectedRoute>
                <GroupDetailPage />
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
          <Route
            path="/group/:groupId/forum"
            element={
              <ProtectedRoute>
                <GroupForumPage />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <MyProfileRedirect />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/profile/edit"
            element={
              <ProtectedRoute>
                <EditProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:uid"
            element={
              <ProtectedRoute>
                <LegacyProfileRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community/people"
            element={
              <ProtectedRoute>
                <PeopleSearchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community/challenges"
            element={
              <ProtectedRoute>
                <ChallengesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community/challenges/:challengeId"
            element={
              <ProtectedRoute>
                <ChallengeDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dev/seed-tags"
            element={
              <ProtectedRoute>
                <SeedTagsTool />
              </ProtectedRoute>
            }
          />
          <Route
            path="/migration-admin"
            element={
              <ProtectedRoute>
                <MigrationAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/u/:uid"
            element={
              <ProtectedRoute>
                <UserProfilePage />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/reflections" 
            element={
              <ProtectedRoute>
                <Reflections />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
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












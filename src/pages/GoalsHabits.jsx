// src/pages/ProductivityHub.jsx
import React, { useEffect, useState } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import {
  Target,
  Sparkles,
  Plus,
  Clock,
  Zap,
  Link2,
  X,
  Brain,
  Lightbulb,
  TrendingUp,
  Award,
  Star,
  BarChart3,
  Calendar,
  Activity,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
  Flame,
  Crown,
  Medal
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';

import AddHabitForm from '../components/habits/AddHabitForm';
import AIBasedSuggestions from '../components/habits/AIBasedSuggestions';
import GoalCreationForm from '../components/goals/GoalCreationForm';
import GoalDetailsModal from '../components/goals/GoalDetailsModal';

export default function ProductivityHub() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [habits, setHabits] = useState([]);
  const [selectedTab, setSelectedTab] = useState('overview');

  const [creatingGoal, setCreatingGoal] = useState(false);
  const [creatingHabit, setCreatingHabit] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [selectedHabit, setSelectedHabit] = useState(null);

  // AI Suggestions state
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestionType, setAiSuggestionType] = useState('goals');

  // Filter and view state
  const [goalFilter, setGoalFilter] = useState('all'); // all, active, completed, archived
  const [habitFilter, setHabitFilter] = useState('all'); // all, active, daily, weekly, monthly
  const [viewMode, setViewMode] = useState('grid'); // grid, list

  // Integration setup state
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [connectedApps, setConnectedApps] = useState([
    { id: 'apple-health', name: 'Apple Health', icon: Activity, connected: false, capabilities: ['steps', 'workouts', 'sleep'] },
    { id: 'apple-fitness', name: 'Apple Fitness+', icon: Activity, connected: false, capabilities: ['workouts', 'activity-rings'] },
    { id: 'strava', name: 'Strava', icon: Activity, connected: true, capabilities: ['running', 'cycling', 'swimming'] },
    { id: 'myfitnesspal', name: 'MyFitnessPal', icon: Activity, connected: false, capabilities: ['nutrition', 'calories'] },
    { id: 'headspace', name: 'Headspace', icon: Brain, connected: false, capabilities: ['meditation', 'mindfulness'] }
  ]);

  useEffect(() => {
    if (user) {
      fetchGoals();
      fetchHabits();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchGoals = async () => {
    const q = query(collection(db, 'goals'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const goalData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    setGoals(goalData);
  };

  const fetchHabits = async () => {
    const q = query(collection(db, 'habits'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const habitData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    setHabits(habitData);
  };

  const handleSaveGoal = async (goalData) => {
    if (!user?.uid) return;
    try {
      const mappedGoal = {
        title: goalData.goalText,
        category: goalData.focus === 'custom' ? goalData.customFocus : goalData.focus,
        target: goalData.targetType,
        unit: goalData.measurement,
        frequency: goalData.frequency,
        habitIds: goalData.habitIds,
        timeframe: goalData.timeframe,
        status: 'active',
        progress: 0,
        milestones: goalData.milestones || [],
        userId: user.uid,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'goals'), mappedGoal);
      await fetchGoals();
      setCreatingGoal(false);
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  const handleSaveHabit = async (habitData) => {
    if (!user?.uid) return;
    try {
      const mappedHabit = {
        ...habitData,
        status: 'active',
        streak: 0,
        bestStreak: 0,
        completionRate: 0,
        integrations: habitData.integrations || [],
        userId: user.uid,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'habits'), mappedHabit);
      await fetchHabits();
      setCreatingHabit(false);
    } catch (error) {
      console.error('Error saving habit:', error);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    await deleteDoc(doc(db, 'goals', goalId));
    fetchGoals();
  };

  const handleDeleteHabit = async (habitId) => {
    await deleteDoc(doc(db, 'habits', habitId));
    fetchHabits();
  };

  const toggleAppConnection = (appId) => {
    setConnectedApps((apps) =>
      apps.map((app) =>
        app.id === appId ? { ...app, connected: !app.connected } : app
      )
    );
  };

  // Filters
  const filteredGoals = goals.filter((goal) => {
    switch (goalFilter) {
      case 'active':
        return goal.status === 'active';
      case 'completed':
        return goal.status === 'completed';
      case 'archived':
        return goal.status === 'archived';
      default:
        return true;
    }
  });

  const filteredHabits = habits.filter((habit) => {
    switch (habitFilter) {
      case 'active':
        return habit.status === 'active';
      case 'daily':
        return habit.type === 'daily';
      case 'weekly':
        return habit.type === 'weekly';
      case 'monthly':
        return habit.type === 'monthly';
      default:
        return true;
    }
  });

  // Stats
  const goalStats = {
    total: goals.length,
    active: goals.filter((g) => g.status === 'active').length,
    completed: goals.filter((g) => g.status === 'completed').length,
    avgProgress:
      goals.length > 0
        ? Math.round(
            goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length
          )
        : 0
  };

  const habitStats = {
    total: habits.length,
    active: habits.filter((h) => h.status === 'active').length,
    avgStreak:
      habits.length > 0
        ? Math.round(
            habits.reduce((sum, h) => sum + (h.streak || 0), 0) / habits.length
          )
        : 0,
    bestStreak: Math.max(...habits.map((h) => h.bestStreak || 0), 0)
  };

  // --- UI blocks ---
  const AIAssistantSection = () => (
    <div className="mb-8">
      <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border border-purple-200/50 rounded-3xl p-6 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Brain size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                AI Coach
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full font-medium">Beta</span>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
              </h2>
              <p className="text-sm text-gray-600 mt-1">Get personalized insights and recommendations powered by AI</p>
            </div>
          </div>

          <button
            onClick={() => setShowAISuggestions(!showAISuggestions)}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 ${
              showAISuggestions
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                : 'bg-white text-purple-600 border border-purple-200 hover:bg-purple-50'
            }`}
          >
            <Lightbulb size={18} />
            <span className="font-medium">{showAISuggestions ? 'Hide Coach' : 'Get Insights'}</span>
          </button>
        </div>

        {showAISuggestions && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700">Focus Area:</span>
              <div className="flex bg-white rounded-2xl p-2 border border-gray-200 shadow-sm">
                {[
                  { key: 'goals', label: 'Goals', icon: Target },
                  { key: 'habits', label: 'Habits', icon: Sparkles },
                  { key: 'insights', label: 'Insights', icon: TrendingUp }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setAiSuggestionType(key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      aiSuggestionType === key
                        ? 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={16} className={aiSuggestionType === key ? 'text-purple-600' : 'text-gray-500'} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200/50 shadow-sm">
              {user?.uid && (
                <AIBasedSuggestions
                  type={aiSuggestionType}
                  userId={user.uid}
                  context={{ goals, habits, connectedApps }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const StatsOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
            <Target size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-emerald-800">Goals</h3>
            <p className="text-emerald-600 text-sm">{goalStats.active} active</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Progress</span>
            <span className="font-bold text-emerald-700">{goalStats.avgProgress}%</span>
          </div>
          <div className="w-full bg-emerald-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${goalStats.avgProgress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-blue-800">Habits</h3>
            <p className="text-blue-600 text-sm">{habitStats.active} active</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Avg Streak</span>
            <span className="font-bold text-blue-700 flex items-center gap-1">
              <Flame size={14} className="text-orange-500" />
              {habitStats.avgStreak} days
            </span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
            <Link2 size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-purple-800">Integrations</h3>
            <p className="text-purple-600 text-sm">
              {connectedApps.filter((a) => a.connected).length} connected
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowIntegrations(true)}
          className="w-full bg-white text-purple-600 border border-purple-200 rounded-xl py-2 text-sm font-medium hover:bg-purple-50 transition-colors"
        >
          Manage Apps
        </button>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
            <Award size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-amber-800">Best Streak</h3>
            <p className="text-amber-600 text-sm">Personal record</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Crown size={18} className="text-amber-600" />
          <span className="font-bold text-amber-700 text-lg">{habitStats.bestStreak} days</span>
        </div>
      </div>
    </div>
  );

  const IntegrationModal = () =>
    showIntegrations && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-3xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">App Integrations</h2>
              <p className="text-gray-600 mt-1">Connect your favorite apps to automatically track habits</p>
            </div>
            <button
              onClick={() => setShowIntegrations(false)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X size={24} className="text-gray-400" />
            </button>
          </div>

          <div className="space-y-4">
            {connectedApps.map((app) => (
              <div key={app.id} className="bg-gray-50 rounded-2xl p-6 hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        app.connected ? 'bg-green-100' : 'bg-gray-200'
                      }`}
                    >
                      <app.icon size={24} className={app.connected ? 'text-green-600' : 'text-gray-500'} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{app.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {app.connected ? (
                          <span className="flex items-center gap-1 text-sm text-green-600">
                            <CheckCircle2 size={14} />
                            Connected
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <XCircle size={14} />
                            Not connected
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {app.capabilities.map((capability) => (
                          <span key={capability} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            {capability}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAppConnection(app.id)}
                    className={`px-6 py-3 rounded-xl font-medium transition-all ${
                      app.connected
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {app.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-blue-50 rounded-2xl">
            <h3 className="font-semibold text-blue-800 mb-2">How it works</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Connect your fitness and wellness apps</li>
              <li>• Create habits that match activities in those apps</li>
              <li>• Habits automatically complete when activities are detected</li>
              <li>• Your streaks and progress update in real-time</li>
            </ul>
          </div>
        </div>
      </div>
    );

  const GoalCard = ({ goal }) => (
    <div className="bg-white border-2 border-emerald-200 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full" />
            <h3 className="font-bold text-gray-800 text-lg group-hover:text-emerald-700 transition-colors">
              {goal.title}
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            {goal.category} • {goal.target} {goal.unit}
          </p>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Progress</span>
              <span className="text-sm font-bold text-emerald-600">{goal.progress || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${goal.progress || 0}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-blue-500" />
              <span className="text-gray-600">
                {habits.filter((h) => h.goalIds?.includes(goal.id)).length} habits
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-purple-500" />
              <span className="text-gray-600">{goal.timeframe || 'No deadline'}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => setSelectedGoal(goal)}
            className="p-2 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition-colors"
            title="View details"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleDeleteGoal(goal.id)}
            className="p-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors"
            title="Delete goal"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  const HabitCard = ({ habit }) => {
    const connectedApp = connectedApps.find((app) =>
      habit.integrations?.some((integration) => integration.appId === app.id)
    );

    return (
      <div className="bg-white border-2 border-blue-200 rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded-full ${
                  habit.type === 'daily'
                    ? 'bg-green-500'
                    : habit.type === 'weekly'
                    ? 'bg-blue-500'
                    : habit.type === 'monthly'
                    ? 'bg-purple-500'
                    : 'bg-gray-500'
                }`}
              />
              <h3 className="font-bold text-gray-800 text-lg group-hover:text-blue-700 transition-colors">
                {habit.name}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
                <Flame size={14} />
                {habit.streak || 0} days
              </div>
            </div>
          </div>

          {connectedApp && (
            <div className="flex items-center gap-2 text-sm">
              <connectedApp.icon size={14} className="text-green-600" />
              <span className="text-green-700 font-medium">Auto-tracked via {connectedApp.name}</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Type</span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      habit.type === 'daily'
                        ? 'bg-green-100 text-green-700'
                        : habit.type === 'weekly'
                        ? 'bg-blue-100 text-blue-700'
                        : habit.type === 'monthly'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {habit.type || 'Custom'}
                  </span>
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Frequency</span>
                <p className="text-gray-600 mt-1">{habit.frequency}</p>
              </div>
            </div>

            {(habit.trigger || habit.reward) && (
              <div className="space-y-3">
                {habit.trigger && (
                  <div className="bg-blue-50 rounded-2xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap size={14} className="text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Trigger</span>
                    </div>
                    <p className="text-blue-700 text-sm">{habit.trigger}</p>
                  </div>
                )}

                {habit.reward && (
                  <div className="bg-green-50 rounded-2xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Star size={14} className="text-green-600" />
                      <span className="text-sm font-medium text-green-800">Reward</span>
                    </div>
                    <p className="text-green-700 text-sm">{habit.reward}</p>
                  </div>
                )}
              </div>
            )}

            {habit.goalIds && habit.goalIds.length > 0 && (
              <div>
                <span className="text-sm font-medium text-gray-700 mb-2 block">🔗 Linked Goals</span>
                <div className="flex flex-wrap gap-2">
                  {habit.goalIds.map((gId) => {
                    const goal = goals.find((g) => g.id === gId);
                    return (
                      <span
                        key={gId}
                        className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 hover:bg-emerald-200 transition-colors cursor-pointer"
                      >
                        {goal ? goal.title : 'Unknown Goal'}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">This week's progress</span>
                </div>
                <span className="text-sm font-bold text-blue-600">5/7 days</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full" style={{ width: '71%' }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Medal size={12} className="text-amber-500" />
                  <span>Best: {habit.bestStreak || 14} days</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>Next: Tomorrow</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                onClick={() => setSelectedHabit(habit)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <Eye size={14} />
                View Details
              </button>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                  Log Today
                </button>
                <button
                  onClick={() => handleDeleteHabit(habit.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="Delete habit"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TabNavigation = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex bg-white rounded-2xl p-2 border border-gray-200 shadow-sm">
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'goals', label: 'Goals', icon: Target },
            { key: 'habits', label: 'Habits', icon: Sparkles },
            { key: 'integrations', label: 'Integrations', icon: Link2 }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSelectedTab(key)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                selectedTab === key
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        {(selectedTab === 'goals' || selectedTab === 'habits') && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select
                value={selectedTab === 'goals' ? goalFilter : habitFilter}
                onChange={(e) =>
                  selectedTab === 'goals'
                    ? setGoalFilter(e.target.value)
                    : setHabitFilter(e.target.value)
                }
                className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All</option>
                {selectedTab === 'goals' ? (
                  <>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </>
                ) : (
                  <>
                    <option value="active">Active</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'
                }`}
              >
                <div className="grid grid-cols-2 gap-1">
                  <div className="w-1 h-1 bg-current rounded-full" />
                  <div className="w-1 h-1 bg-current rounded-full" />
                  <div className="w-1 h-1 bg-current rounded-full" />
                  <div className="w-1 h-1 bg-current rounded-full" />
                </div>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'
                }`}
              >
                <div className="space-y-1">
                  <div className="w-4 h-0.5 bg-current rounded-full" />
                  <div className="w-4 h-0.5 bg-current rounded-full" />
                  <div className="w-4 h-0.5 bg-current rounded-full" />
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <SidebarLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Target size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-800">Productivity Hub</h1>
              <p className="text-gray-600 mt-1">
                Build meaningful goals, develop powerful habits, and track your progress with intelligent insights
              </p>
            </div>
          </div>
        </div>

        <AIAssistantSection />
        <StatsOverview />
        <TabNavigation />

        {selectedTab === 'overview' && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <Activity size={24} className="text-blue-500" />
                Recent Activity
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Target size={18} className="text-emerald-500" />
                    Latest Goals
                  </h3>
                  <div className="space-y-3">
                    {goals.slice(0, 3).map((goal) => (
                      <div key={goal.id} className="bg-gray-50 rounded-2xl p-4">
                        <h4 className="font-medium text-gray-800">{goal.title}</h4>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-500">{goal.category}</span>
                          <span className="text-sm font-medium text-emerald-600">{goal.progress || 0}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Sparkles size={18} className="text-blue-500" />
                    Active Habits
                  </h3>
                  <div className="space-y-3">
                    {habits.slice(0, 3).map((habit) => (
                      <div key={habit.id} className="bg-gray-50 rounded-2xl p-4">
                        <h4 className="font-medium text-gray-800">{habit.name}</h4>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-500">{habit.type}</span>
                          <div className="flex items-center gap-1 text-sm font-medium text-orange-600">
                            <Flame size={14} />
                            {habit.streak || 0} days
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'goals' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <Target size={24} className="text-emerald-500" />
                  Goals
                  <span className="bg-emerald-100 text-emerald-700 text-sm px-3 py-1 rounded-full">
                    {filteredGoals.length}
                  </span>
                </h2>
                <p className="text-gray-600 mt-1">Define and track your long-term objectives</p>
              </div>
              <button
                onClick={() => setCreatingGoal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-2xl font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                <Plus size={18} />
                Create Goal
              </button>
            </div>

            {creatingGoal && (
              <div className="bg-white border border-emerald-200 rounded-3xl p-8 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-emerald-700">Create New Goal</h3>
                  <button
                    onClick={() => setCreatingGoal(false)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>
                <GoalCreationForm
                  userId={user.uid}
                  userHabits={habits}
                  onNewHabitCreated={fetchHabits}
                  onSave={handleSaveGoal}
                  onCancel={() => setCreatingGoal(false)}
                />
              </div>
            )}

            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
              {filteredGoals.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Target size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No goals yet</h3>
                  <p className="text-gray-500 mb-4">Create your first goal to get started</p>
                  <button
                    onClick={() => setCreatingGoal(true)}
                    className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-medium hover:bg-emerald-600 transition-colors"
                  >
                    Create Your First Goal
                  </button>
                </div>
              ) : (
                filteredGoals.map((goal) => <GoalCard key={goal.id} goal={goal} />)
              )}
            </div>
          </div>
        )}

        {selectedTab === 'habits' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <Sparkles size={24} className="text-blue-500" />
                  Habits
                  <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full">
                    {filteredHabits.length}
                  </span>
                </h2>
                <p className="text-gray-600 mt-1">Build consistent daily routines that support your goals</p>
              </div>
              <button
                onClick={() => setCreatingHabit(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-3 rounded-2xl font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                <Plus size={18} />
                Create Habit
              </button>
            </div>

            {creatingHabit && (
              <div className="bg-white border border-blue-200 rounded-3xl p-8 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-blue-700">Create New Habit</h3>
                  <button
                    onClick={() => setCreatingHabit(false)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>
                <AddHabitForm
                  userId={user.uid}
                  goals={goals}
                  connectedApps={connectedApps.filter((app) => app.connected)}
                  onSave={handleSaveHabit}
                  onCancel={() => setCreatingHabit(false)}
                />
              </div>
            )}

            <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-4'}>
              {filteredHabits.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Sparkles size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No habits yet</h3>
                  <p className="text-gray-500 mb-4">Create your first habit to start building consistency</p>
                  <button
                    onClick={() => setCreatingHabit(true)}
                    className="bg-blue-500 text-white px-6 py-3 rounded-2xl font-medium hover:bg-blue-600 transition-colors"
                  >
                    Create Your First Habit
                  </button>
                </div>
              ) : (
                filteredHabits.map((habit) => <HabitCard key={habit.id} habit={habit} />)
              )}
            </div>
          </div>
        )}

        {selectedTab === 'integrations' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3 mb-2">
                <Link2 size={24} className="text-purple-500" />
                App Integrations
              </h2>
              <p className="text-gray-600">Connect your favorite apps to automatically track habits and sync data</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-8 border border-purple-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-purple-800">Connected Apps</h3>
                  <p className="text-purple-600 mt-1">
                    {connectedApps.filter((a) => a.connected).length} of {connectedApps.length} apps connected
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      connectedApps.some((a) => a.connected) ? 'bg-green-400' : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-sm font-medium text-purple-700">
                    {connectedApps.some((a) => a.connected) ? 'Active' : 'No connections'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {connectedApps.map((app) => (
                  <div
                    key={app.id}
                    className={`bg-white rounded-2xl p-6 border-2 transition-all hover:shadow-md ${
                      app.connected ? 'border-green-2 00 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                          app.connected ? 'bg-green-100' : 'bg-gray-100'
                        }`}
                      >
                        <app.icon size={24} className={app.connected ? 'text-green-600' : 'text-gray-500'} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">{app.name}</h4>
                        <span
                          className={`text-sm flex items-center gap-1 ${
                            app.connected ? 'text-green-600' : 'text-gray-500'
                          }`}
                        >
                          {app.connected ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {app.connected ? 'Connected' : 'Not connected'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Capabilities</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {app.capabilities.map((capability) => (
                            <span key={capability} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                              {capability}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => toggleAppConnection(app.id)}
                        className={`w-full py-3 rounded-xl font-medium transition-all ${
                          app.connected
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {app.connected ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-6 bg-white rounded-2xl border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                  <Lightbulb size={18} />
                  How Auto-Tracking Works
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-purple-700">
                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      <span>Connect your favorite fitness and wellness apps</span>
                    </div>
                    <div className="flex items-center gap-2 text-purple-700">
                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      <span>Create habits that match activities in those apps</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-purple-700">
                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      <span>Habits automatically complete when activities are detected</span>
                    </div>
                    <div className="flex items-center gap-2 text-purple-700">
                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      <span>Your streaks and progress update in real-time</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Goal Details Modal */}
        {selectedGoal && (
          <GoalDetailsModal
            goal={selectedGoal}
            habits={habits}
            tasks={[]}
            onClose={() => setSelectedGoal(null)}
            onDelete={handleDeleteGoal}
          />
        )}

        {/* Minimal Habit Details Modal so the "View Details" button is valid */}
        {selectedHabit && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Habit Details</h3>
                <button className="p-2 hover:bg-gray-100 rounded-xl" onClick={() => setSelectedHabit(null)}>
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="font-semibold text-gray-800">{selectedHabit.name}</div>
                <div className="text-gray-600">Type: {selectedHabit.type || 'Custom'}</div>
                <div className="text-gray-600">Frequency: {selectedHabit.frequency || '—'}</div>
                {selectedHabit.trigger && <div className="text-gray-600">Trigger: {selectedHabit.trigger}</div>}
                {selectedHabit.reward && <div className="text-gray-600">Reward: {selectedHabit.reward}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Integration Modal */}
        <IntegrationModal />
      </div>
    </SidebarLayout>
  );
}









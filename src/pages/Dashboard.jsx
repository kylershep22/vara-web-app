// src/pages/Dashboard.jsx

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  orderBy,
  limit
} from "firebase/firestore";
import SidebarLayout from "../components/layout/SidebarLayout";
import HabitList from '../components/habits/HabitList';

export default function Dashboard() {
  const { user, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [goals, setGoals] = useState([]);
  const [habits, setHabits] = useState([]);
  const [dailyPlan, setDailyPlan] = useState('');
  const [planPreview, setPlanPreview] = useState('');
  const [modifier, setModifier] = useState('');
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [mood, setMood] = useState('');
  const [timeframe, setTimeframe] = useState('weekly');
  const [isPlanExpanded, setIsPlanExpanded] = useState(false);
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    longestStreak: 0,
    completionRate: 0
  });

  const modifiers = [
    "Feeling energetic", "Short on time", "Need something gentle",
    "Prefer physical activity", "Prefer mental wellness",
    "Overwhelmed – need calm", "Focus on routine", "Surprise me"
  ];

  const timeframeOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' }
  ];

  const fetchDailyPlan = useCallback(async (opts = {}) => {
    try {
      setIsLoadingPlan(true);
      const res = await fetch("http://localhost:5001/api/generate-daily-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, concise: true, bullets: 3, ...opts })
      });
      const data = await res.json();
      if (data.plan) {
        setDailyPlan(data.plan);
        // Create preview (first 100 characters + ellipsis)
        const preview = data.plan.length > 100 
          ? data.plan.substring(0, 100) + "..." 
          : data.plan;
        setPlanPreview(preview);
      }
    } catch (err) {
      console.error("Failed to fetch daily plan:", err);
    } finally {
      setIsLoadingPlan(false);
    }
  }, [user]);

  // Calculate streaks and insights
  const calculateStreaks = useCallback((habits) => {
    // Mock calculation - replace with actual habit completion data
    const totalHabits = habits.length;
    const completedToday = habits.filter(h => h.completedToday).length;
    const completionRate = totalHabits > 0 ? (completedToday / totalHabits) * 100 : 0;
    
    setStreakData({
      currentStreak: 7, // Mock data - calculate from actual completions
      longestStreak: 21, // Mock data
      completionRate: Math.round(completionRate)
    });
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        setUserName(userDoc.exists() ? (userDoc.data().name || user.displayName) : (user.displayName || "User"));
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    const fetchGoals = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, "goals"), where("userId", "==", user.uid));
        const snapshot = await getDocs(q);
        setGoals(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching goals:", err);
      }
    };

    const fetchHabits = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, "habits"), 
          where("userId", "==", user.uid),
          where("active", "==", true),
          orderBy("createdAt", "desc"),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const habitsData = snapshot.docs.map((doc) => ({ 
          id: doc.id, 
          ...doc.data(),
          // Mock completion status - replace with actual data
          completedToday: Math.random() > 0.5
        }));
        setHabits(habitsData);
        calculateStreaks(habitsData);
      } catch (err) {
        console.error("Error fetching habits:", err);
      }
    };

    if (user && isAuthReady) {
      fetchUserData();
      fetchGoals();
      fetchHabits();
      fetchDailyPlan();
    }
  }, [user, isAuthReady, fetchDailyPlan, timeframe, calculateStreaks]);

  const regeneratePlan = () => {
    if (!modifier) return;
    fetchDailyPlan({ forceNew: true, modifier });
  };

  const handleMood = (emoji) => {
    setMood(emoji);
    // Optional: send to Firestore if needed
  };

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  };

  const getMotivationalInsight = () => {
    const insights = [
      "You're building incredible momentum! 🚀",
      "Small steps lead to big changes! ✨",
      "Your consistency is paying off! 💪",
      "Every habit completed is a victory! 🎉",
      "You're creating a better version of yourself! 🌟"
    ];
    return insights[Math.floor(Math.random() * insights.length)];
  };

  return (
    <SidebarLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header with Greeting and Timeframe Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#1B5E57]">
              {getTimeBasedGreeting()}, {userName || "Friend"} 👋
            </h1>
            <p className="text-[#9AAE8C] mt-1">{getMotivationalInsight()}</p>
          </div>
          
          {/* Timeframe Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#3E3E3E]">View:</span>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="border border-[#D5E3D1] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B5E57] focus:border-transparent"
            >
              {timeframeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Compact Mood Check-In */}
        <div className="bg-white p-3 rounded-xl shadow border border-[#D5E3D1] flex items-center justify-between">
          <span className="text-sm font-medium text-[#3E3E3E]">How are you feeling?</span>
          <div className="flex space-x-2 text-2xl">
            {["😄", "🙂", "😐", "😞", "😣"].map((emoji) => (
              <span 
                key={emoji} 
                onClick={() => handleMood(emoji)}
                className={`cursor-pointer hover:scale-110 transition-transform ${mood === emoji ? 'ring-2 ring-[#1B5E57] rounded-full p-1' : ''}`}
              >
                {emoji}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Stats and Streaks */}
          <div className="space-y-6">
            {/* Streak Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-[#1B5E57] to-[#2A7B6B] text-white p-4 rounded-xl shadow">
                <div className="text-2xl font-bold">{streakData.currentStreak}</div>
                <div className="text-xs opacity-80">Day Streak 🔥</div>
              </div>
              <div className="bg-gradient-to-br from-[#B8CDBA] to-[#A8BDA9] text-[#1B5E57] p-4 rounded-xl shadow">
                <div className="text-2xl font-bold">{streakData.completionRate}%</div>
                <div className="text-xs opacity-80">Completion Rate</div>
              </div>
            </div>

            {/* Weekly Progress Ring */}
            <div className="bg-white p-4 rounded-xl shadow border border-[#D5E3D1]">
              <h3 className="text-sm font-semibold text-[#3E3E3E] mb-3">Weekly Progress</h3>
              <div className="flex items-center justify-center">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-[#D5E3D1]"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="text-[#1B5E57]"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${streakData.completionRate}, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-[#1B5E57]">{streakData.completionRate}%</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-center text-[#9AAE8C] mt-2">
                {Math.floor(streakData.completionRate * habits.length / 100)} of {habits.length} habits completed
              </p>
            </div>

            {/* Best Streak Achievement */}
            <div className="bg-gradient-to-r from-[#FFE4B5] to-[#FFF8DC] p-4 rounded-xl shadow border border-[#E6D4A1]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🏆</span>
                <span className="text-sm font-semibold text-[#8B6914]">Personal Best</span>
              </div>
              <div className="text-lg font-bold text-[#8B6914]">{streakData.longestStreak} Days</div>
              <div className="text-xs text-[#8B6914] opacity-80">Longest streak achieved</div>
            </div>
          </div>

          {/* Middle Column - Daily Plan */}
          <div className="bg-white rounded-xl shadow border border-[#D5E3D1] flex flex-col">
            <div className="p-4 border-b border-[#D5E3D1]">
              <h2 className="text-lg font-semibold text-[#3E3E3E]">Today's AI Plan</h2>
            </div>
            
            <div className="flex-1 p-4">
              {isLoadingPlan ? (
                <div className="flex items-center justify-center h-24">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1B5E57]"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-[#3E3E3E] bg-[#FAFAF6] p-3 rounded-lg border border-[#D5E3D1]">
                    {isPlanExpanded ? (
                      <div className="whitespace-pre-wrap">{dailyPlan}</div>
                    ) : (
                      <div>{planPreview}</div>
                    )}
                  </div>
                  
                  {dailyPlan.length > 100 && (
                    <button
                      onClick={() => setIsPlanExpanded(!isPlanExpanded)}
                      className="text-[#1B5E57] text-sm font-medium hover:underline"
                    >
                      {isPlanExpanded ? 'Show Less' : 'Read Full Plan'}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#D5E3D1] space-y-3">
              <select
                value={modifier}
                onChange={(e) => setModifier(e.target.value)}
                className="w-full border border-[#D5E3D1] rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B5E57] focus:border-transparent"
              >
                <option value="">-- Customize your plan --</option>
                {modifiers.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <button
                onClick={regeneratePlan}
                disabled={!modifier || isLoadingPlan}
                className="w-full bg-[#1B5E57] text-white px-4 py-2 rounded-lg hover:bg-[#144d47] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingPlan ? 'Generating...' : 'Regenerate Plan'}
              </button>
            </div>
          </div>

          {/* Right Column - Goals */}
          <div className="space-y-6">
            {goals.length > 0 && (
              <div className="bg-white p-4 rounded-xl shadow border border-[#D5E3D1]">
                <h3 className="text-lg font-semibold text-[#3E3E3E] mb-4">Active Goals</h3>
                <div className="space-y-3">
                  {goals.slice(0, 3).map((goal) => (
                    <div key={goal.id} className="bg-[#FAFAF6] p-3 rounded-lg border border-[#D5E3D1]">
                      <p className="text-sm font-medium text-[#3E3E3E] mb-1">{goal.title}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-[#1B5E57]">
                          {goal.progress || 0} / {goal.target}
                        </span>
                        <span className="text-xs text-[#9AAE8C]">{goal.unit}</span>
                      </div>
                      <div className="w-full bg-[#D5E3D1] rounded-full h-2 mt-2">
                        <div 
                          className="bg-[#1B5E57] h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${Math.min((goal.progress || 0) / goal.target * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-white p-4 rounded-xl shadow border border-[#D5E3D1]">
              <h3 className="text-lg font-semibold text-[#3E3E3E] mb-4">This Week</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#6B7280]">Habits Completed</span>
                  <span className="font-semibold text-[#1B5E57]">{Math.floor(habits.length * 0.7)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#6B7280]">Perfect Days</span>
                  <span className="font-semibold text-[#1B5E57]">3</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#6B7280]">Improvement</span>
                  <span className="font-semibold text-green-600">+12%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Habits Section */}
        <div className="bg-white rounded-xl shadow border border-[#D5E3D1]">
          <div className="p-4 border-b border-[#D5E3D1] flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#3E3E3E]">
              Active Habits ({timeframe})
            </h2>
            <button
              onClick={() => navigate('/goals-habits')}
              className="bg-[#B8CDBA] text-[#1B5E57] px-4 py-2 rounded-lg font-medium hover:bg-[#A8BDA9] transition"
            >
              Manage Habits
            </button>
          </div>
          <div className="p-4">
            <HabitList userId={user?.uid} timeframe={timeframe} compact={true} />
          </div>
        </div>

        {/* Insights & Trends */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Trending Up */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📈</span>
              <h3 className="font-semibold text-green-800">Trending Up</h3>
            </div>
            <p className="text-sm text-green-700 mb-2">Morning Meditation</p>
            <p className="text-xs text-green-600">Completed 6 out of 7 days this week! Keep it up!</p>
          </div>

          {/* Need Attention */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="font-semibold text-orange-800">Needs Attention</h3>
            </div>
            <p className="text-sm text-orange-700 mb-2">Evening Reading</p>
            <p className="text-xs text-orange-600">Only 2 completions this week. Try setting a reminder!</p>
          </div>
        </div>

        {/* Joy Prompt */}
        <div className="bg-white p-6 rounded-xl shadow border border-[#D5E3D1]">
          <h2 className="text-xl font-semibold text-[#3E3E3E] mb-4">Moments of Joy ✨</h2>
          <p className="text-sm text-[#6B7280] mb-3">What made you smile today?</p>
          <textarea
            className="w-full p-3 border border-[#D5E3D1] rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-[#1B5E57] focus:border-transparent resize-none"
            rows="3"
            placeholder="Write about your joyful moment..."
          />
          <div className="flex items-center gap-3">
            <input 
              type="file" 
              accept="image/*" 
              className="text-sm text-[#6B7280] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#D5E3D1] file:text-[#1B5E57] hover:file:bg-[#C5D2C1]"
            />
            <button className="bg-[#B8CDBA] text-[#1B5E57] px-6 py-2 rounded-lg font-medium hover:bg-[#A8BDA9] transition">
              Save Moment
            </button>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}























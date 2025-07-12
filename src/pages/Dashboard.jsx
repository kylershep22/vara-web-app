""// src/pages/Dashboard.jsx

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
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
import MoodCheckIn from "../components/MoodCheckIn";
import AddHabitForm from '../components/habits/AddHabitForm';
import HabitList from '../components/habits/HabitList';

<AddHabitForm onHabitAdded={() => console.log('Habit added!')} />


export default function Dashboard() {
  const { user, isAuthReady } = useAuth();
  const [userName, setUserName] = useState('');
  const [goals, setGoals] = useState([]);
  const [dailyPlan, setDailyPlan] = useState('');
  const [modifier, setModifier] = useState('');
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

  const modifiers = [
    "Feeling energetic",
    "Short on time",
    "Need something gentle",
    "Prefer physical activity",
    "Prefer mental wellness",
    "Overwhelmed – need calm",
    "Focus on routine",
    "Surprise me"
  ];

  const fetchDailyPlan = useCallback(async (opts = {}) => {
    try {
      setIsLoadingPlan(true);
      const res = await fetch("http://localhost:5001/api/generate-daily-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, ...opts })
      });

      const data = await res.json();
      if (data.plan) {
        setDailyPlan(data.plan);
      }
    } catch (err) {
      console.error("Failed to fetch daily plan:", err);
    } finally {
      setIsLoadingPlan(false);
    }
  }, [user]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setUserName(userDoc.data().name || user.displayName);
        } else {
          setUserName(user.displayName || "User");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    const fetchGoals = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, "goals"),
          where("userId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        const fetchedGoals = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setGoals(fetchedGoals);
      } catch (err) {
        console.error("Error fetching goals:", err);
      }
    };

    if (user && isAuthReady) {
      fetchUserData();
      fetchGoals();
      fetchDailyPlan();
    }
  }, [user, isAuthReady, fetchDailyPlan]);

  const regeneratePlan = () => {
    if (!modifier) return;
    fetchDailyPlan({ forceNew: true, modifier });
  };

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <SidebarLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Welcome */}
        <h1 className="text-3xl font-semibold text-[#1B5E57]">
          {getTimeBasedGreeting()}, {userName || "Friend"} 👋
        </h1>

        {/* Mood Check-In */}
        <MoodCheckIn />

        {/* Goal Stats */}
        {goals.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {goals.slice(0, 3).map((goal) => (
              <div
                key={goal.id}
                className="bg-white p-4 rounded-xl border border-[#D5E3D1] shadow"
              >
                <p className="text-sm text-[#9AAE8C] mb-1">{goal.title}</p>
                <p className="text-xl font-bold text-[#3E3E3E]">
                  {goal.progress || 0} / {goal.target} {goal.unit}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Daily Plan */}
        <div className="bg-white p-6 rounded-xl shadow border border-[#D5E3D1]">
          <h2 className="text-xl font-semibold text-[#3E3E3E] mb-2">Today’s Plan</h2>
          <p className="text-[#6B7280] mb-4">
            Your personalized daily plan based on your goals, preferences, and mood.
          </p>

          {isLoadingPlan ? (
            <p className="text-[#9AAE8C]">Loading your plan...</p>
          ) : (
            <div className="whitespace-pre-wrap text-[#3E3E3E] bg-[#FAFAF6] p-4 rounded-xl border border-[#D5E3D1] shadow-inner">
              {dailyPlan}
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center">
            <select
              value={modifier}
              onChange={(e) => setModifier(e.target.value)}
              className="border border-[#D5E3D1] rounded-lg p-2 text-sm w-full sm:w-64"
            >
              <option value="">-- Choose a different focus --</option>
              {modifiers.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <button
              onClick={regeneratePlan}
              disabled={!modifier || isLoadingPlan}
              className="bg-[#1B5E57] text-white px-4 py-2 rounded-lg hover:bg-[#144d47] transition"
            >
              Regenerate Plan
            </button>
          </div>
        </div>

        {/* Habit Tracker */}
        <div className="bg-white p-6 rounded-xl shadow border border-[#D5E3D1]">
         <h2 className="text-xl font-semibold text-[#3E3E3E] mb-4">New Habit</h2>
         <AddHabitForm onHabitAdded={() => console.log("Habit saved")} />
          <HabitList userId={user?.uid} />
        </div>


        {/* Quick link */}
        <div className="text-center">
          <button className="text-[#1B5E57] font-medium hover:underline">
            Jump back into your flow →
          </button>
        </div>
      </div>
    </SidebarLayout>
  );
}























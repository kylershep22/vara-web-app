// AIBasedSuggestions.jsx - Smart habit suggestions linked to a selected goal

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

export default function AIBasedSuggestions({ userId }) {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchGoals = async () => {
      if (!userId) return;
      const q = query(collection(db, 'goals'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const goalList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setGoals(goalList);
    };
    fetchGoals();
  }, [userId]);

  const fetchSuggestions = async () => {
    if (!selectedGoalId) return;
    const goal = goals.find(g => g.id === selectedGoalId);
    if (!goal) return;

    setLoading(true);
    try {
      const prompt = `Suggest 5 daily wellness habits that help achieve this goal: "${goal.title}" in the category of ${goal.category}. Respond with a JSON array of short phrases.`;
      const response = await axios.post('/api/openai', { prompt });
      const parsed = JSON.parse(response.data.text || '[]');
      setSuggestions(parsed);
    } catch (err) {
      console.error('AI Suggestion Error:', err);
      setSuggestions([]);
    }
    setLoading(false);
  };

  const handleAddHabit = async (text) => {
    try {
      await addDoc(collection(db, 'habits'), {
        userId,
        goalId: selectedGoalId,
        title: text,
        createdAt: new Date(),
        completions: [],
        streak: 0,
        active: true,
      });
      alert('Habit added successfully!');
    } catch (err) {
      console.error('Error adding habit:', err);
    }
  };

  return (
    <div className="bg-white border border-[#D5E3D1] rounded-xl p-4 shadow">
      <h2 className="text-lg font-semibold text-[#1B5E57] mb-2">Smart Habit Suggestions</h2>
      <select
        className="w-full border border-[#D5E3D1] rounded-lg px-3 py-2 mb-4"
        value={selectedGoalId}
        onChange={(e) => setSelectedGoalId(e.target.value)}
      >
        <option value="">Select a goal...</option>
        {goals.map((goal) => (
          <option key={goal.id} value={goal.id}>
            {goal.title} ({goal.category})
          </option>
        ))}
      </select>
      <button
        onClick={fetchSuggestions}
        disabled={!selectedGoalId || loading}
        className="bg-[#1B5E57] text-white px-4 py-2 rounded hover:bg-[#164e48] transition"
      >
        {loading ? 'Loading...' : 'Get Habit Suggestions'}
      </button>

      {suggestions.length > 0 && (
        <ul className="mt-4 space-y-3">
          {suggestions.map((habit, idx) => (
            <li
              key={idx}
              className="flex items-center justify-between bg-[#F9FAF8] border border-[#D5E3D1] px-3 py-2 rounded-lg"
            >
              <span className="text-sm text-[#3E3E3E]">{habit}</span>
              <button
                onClick={() => handleAddHabit(habit)}
                className="text-[#1B5E57] text-sm underline hover:font-semibold"
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}



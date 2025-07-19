import React, { useState } from 'react';
import axios from 'axios';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';

export default function AIBasedSuggestions({ goal, userId }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  const getAISuggestions = async (additionalPrompt = '') => {
    if (!goal || !userId) return;
    setLoading(true);
    setSuggestions([]);
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/openai`, {
        goal,
        modifier: additionalPrompt
      });

      const parsed = JSON.parse(res.data.text || '[]');
      setSuggestions(parsed);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHabit = async (habit) => {
    try {
      await addDoc(collection(db, 'habits'), {
        userId,
        goalId: goal.id,
        title: habit.title,
        type: habit.type,
        frequency: habit.frequency,
        trigger: habit.trigger,
        reward: habit.reward,
        active: true,
        completions: [],
        streak: 0,
        createdAt: Timestamp.now()
      });
      alert('Habit added successfully!');
    } catch (err) {
      console.error('Error adding habit:', err);
    }
  };

  return (
    <div className="bg-[#F9FAF8] border border-[#D5E3D1] rounded-xl p-4 space-y-4">
      <button
        onClick={() => getAISuggestions()}
        disabled={loading}
        className="bg-[#1B5E57] text-white px-4 py-2 rounded hover:bg-[#164e48] transition"
      >
        {loading ? 'Generating...' : 'Get AI Habit Suggestions'}
      </button>

      {suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((sug, idx) => (
            <div key={idx} className="bg-white border border-[#D5E3D1] p-3 rounded">
              <p className="text-[#3E3E3E] font-semibold">{sug.title}</p>
              <p className="text-sm text-gray-600">Type: {sug.type} | Frequency: {sug.frequency}</p>
              <p className="text-sm text-gray-500">Trigger: {sug.trigger}</p>
              <p className="text-sm text-gray-500">Reward: {sug.reward}</p>
              <div className="flex gap-4 mt-2">
                <button
                  onClick={() => handleAddHabit(sug)}
                  className="text-sm text-green-600 hover:underline"
                >
                  Accept
                </button>
                <button
                  onClick={() => setShowPromptInput(true)}
                  className="text-sm text-yellow-700 hover:underline"
                >
                  Decline & Improve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPromptInput && (
        <div className="space-y-2">
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="What would make this habit more helpful for you?"
            className="w-full p-2 border rounded"
          />
          <button
            onClick={() => {
              getAISuggestions(customPrompt);
              setShowPromptInput(false);
              setCustomPrompt('');
            }}
            className="text-sm px-4 py-2 bg-[#B8CDBA] text-white rounded hover:bg-[#9AAE8C]"
          >
            Submit Feedback & Regenerate
          </button>
        </div>
      )}
    </div>
  );
}





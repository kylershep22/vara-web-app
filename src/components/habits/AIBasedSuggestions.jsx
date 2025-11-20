// src/components/habits/AIBasedSuggestions.jsx

import React, { useState } from 'react';
import axios from 'axios';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';

export default function AIBasedSuggestions({ type, userId, context }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  const getAISuggestions = async (additionalPrompt = '') => {
    if (!userId || !type) return;
    setLoading(true);
    setSuggestions([]);

    try {
      const res = await axios.post('/api/openai', {
        type, // 'goals', 'habits', or 'tasks'
        userId,
        customPrompt: additionalPrompt,
        context
      });

      const parsed = JSON.parse(res.data.text || '[]');
      setSuggestions(parsed);
    } catch (err) {
      console.error('Error fetching AI suggestions:', err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (item) => {
    try {
      const payload = {
        userId,
        createdAt: Timestamp.now(),
        ...item
      };

      if (type === 'goals') {
        await addDoc(collection(db, 'goals'), payload);
      } else if (type === 'habits') {
        payload.active = true;
        payload.completions = [];
        payload.streak = 0;
        await addDoc(collection(db, 'habits'), payload);
      } else if (type === 'tasks') {
        payload.status = 'pending';
        await addDoc(collection(db, 'tasks'), payload);
      }

      alert(`${type.slice(0, -1)} added successfully!`);
    } catch (err) {
      console.error(`Error adding ${type}:`, err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <button
          onClick={() => getAISuggestions()}
          disabled={loading}
          className="bg-[#1B5E57] text-white px-4 py-2 rounded hover:bg-[#164e48] transition"
        >
          {loading ? 'Generating...' : `Get AI ${type.slice(0, 1).toUpperCase() + type.slice(1)} Suggestions`}
        </button>
        <button
          onClick={() => setShowPromptInput(!showPromptInput)}
          className="text-sm text-purple-700 underline"
        >
          {showPromptInput ? 'Hide custom prompt' : 'Add a custom problem or focus'}
        </button>
      </div>

      {showPromptInput && (
        <div className="space-y-2">
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Describe a problem you're facing or something you want to improve..."
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
            Submit & Regenerate
          </button>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((sug, idx) => (
            <div key={idx} className="bg-white border border-[#D5E3D1] p-4 rounded">
              <p className="text-[#3E3E3E] font-semibold text-sm">{sug.title}</p>
              {sug.type && <p className="text-xs text-gray-600">Type: {sug.type}</p>}
              {sug.frequency && <p className="text-xs text-gray-600">Frequency: {sug.frequency}</p>}
              {sug.trigger && <p className="text-xs text-gray-500">Trigger: {sug.trigger}</p>}
              {sug.reward && <p className="text-xs text-gray-500">Reward: {sug.reward}</p>}

              <div className="flex gap-4 mt-2">
                <button
                  onClick={() => handleAccept(sug)}
                  className="text-sm text-green-600 hover:underline"
                >
                  Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}







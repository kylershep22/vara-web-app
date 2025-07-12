// src/components/MoodCheckIn.jsx

import React, { useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const moodOptions = [
  { emoji: '😢', label: 'Sad' },
  { emoji: '😕', label: 'Down' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '😊', label: 'Good' },
  { emoji: '😄', label: 'Great' }
];

export default function MoodCheckIn() {
  const { user } = useAuth();
  const [selectedMood, setSelectedMood] = useState(null);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user || selectedMood === null) return;

    try {
      const ref = collection(db, 'users', user.uid, 'moods');
      await addDoc(ref, {
        mood: moodOptions[selectedMood].emoji,
        label: moodOptions[selectedMood].label,
        note,
        timestamp: serverTimestamp()
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to save mood:', err);
    }
  };

  if (submitted) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
        ✅ Mood check-in saved! Thank you.
      </div>
    );
  }

  return (
    <div className="bg-white/80 p-6 rounded-2xl border border-[#D5E3D1] shadow-sm">
      <h3 className="text-lg font-semibold text-[#3E3E3E] mb-4">How are you feeling right now?</h3>
      <div className="flex justify-between mb-4">
        {moodOptions.map((mood, index) => (
          <button
            key={index}
            onClick={() => setSelectedMood(index)}
            className={`w-12 h-12 rounded-full text-2xl transition-all duration-200 ${
              selectedMood === index ? 'bg-[#D9A89E] transform scale-110 shadow-lg' : 'hover:bg-[#D5E3D1] hover:scale-105'
            }`}
          >
            {mood.emoji}
          </button>
        ))}
      </div>

      <textarea
        className="w-full border border-[#D5E3D1] rounded-lg px-4 py-2 mb-4 text-sm"
        placeholder="Add a note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <button
        onClick={handleSubmit}
        className="bg-gradient-to-r from-[#1B5E57] to-[#B8CDBA] text-white px-5 py-2 rounded-lg font-medium hover:scale-105 transition"
      >
        Submit Check-In
      </button>
    </div>
  );
}

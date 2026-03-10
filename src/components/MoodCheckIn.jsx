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
      <div className="p-4 bg-teal-light border border-silver-sage rounded-xl text-evergreen-teal">
        ✅ Mood check-in saved! Thank you.
      </div>
    );
  }

  return (
    <div className="bg-white/80 p-6 rounded-2xl border border-divider shadow-sm">
      <h3 className="text-lg font-semibold text-soft-charcoal mb-4">How are you feeling right now?</h3>
      <div className="flex justify-between mb-4">
        {moodOptions.map((mood, index) => (
          <button
            key={index}
            onClick={() => setSelectedMood(index)}
            className={`w-12 h-12 rounded-full text-2xl transition-all duration-200 ${
              selectedMood === index ? 'bg-soft-coral/60 transform scale-110 shadow-lg' : 'hover:bg-divider hover:scale-105'
            }`}
          >
            {mood.emoji}
          </button>
        ))}
      </div>

      <textarea
        className="w-full border border-divider rounded-lg px-4 py-2 mb-4 text-sm"
        placeholder="Add a note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <button
        onClick={handleSubmit}
        className="bg-gradient-to-r from-evergreen-teal to-silver-sage text-white px-5 py-2 rounded-lg font-medium hover:scale-105 transition"
      >
        Submit Check-In
      </button>
    </div>
  );
}

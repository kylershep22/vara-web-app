import React, { useState } from 'react';

const goalSuggestions = {
  'Exercise': [
    'Walk 5,000 steps daily',
    'Strength train 3x/week',
    'Yoga every morning',
  ],
  'Nutrition': [
    'Eat 3 servings of vegetables daily',
    'Drink 8 glasses of water every day',
    'Cook a healthy dinner 4x/week',
  ],
  'Sleep': [
    'Sleep 8 hours per night',
    'Limit screen time 1 hour before bed',
  ],
  'Physical Recovery': [
    'Stretch 10 minutes daily',
    'Foam roll after workouts',
  ],
  'Mindfulness & Stress Management': [
    'Meditate for 10 minutes daily',
    'Practice breathwork before bed',
  ],
  'Emotional Resilience': [
    'Journal 3x/week',
    'Reflect on gratitude each day',
  ],
  'Mental Clarity': [
    'Mindfulness before work',
    'Positive affirmations daily',
  ],
  'Self-Improvement': [
    'Read 10 minutes/day',
    'Attend a growth seminar monthly',
  ],
  'Creativity': [
    'Work on a creative project weekly',
    'Learn a new hobby',
  ],
  'Work-Life Balance': [
    'Unplug from email after 6 p.m.',
    'Dedicate weekends to relaxation',
  ],
  'Sleep Hygiene': [
    'Maintain a bedtime routine',
    'Optimize your sleep environment',
  ],
};

export default function Step3SetGoal({ data, setData, nextStep, prevStep }) {
  const [customGoal, setCustomGoal] = useState('');
  const suggestions = goalSuggestions[data.refinedFocus] || [];

  const handleSelect = (goal) => {
    setData({ ...data, goal });
    nextStep();
  };

  const handleCustomSubmit = () => {
    if (customGoal.trim()) {
      setData({ ...data, goal: customGoal });
      nextStep();
    }
  };

  return (
    <div className="max-w-xl mx-auto text-center p-6 bg-[#FAFAF6] rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-[#1B5E57] mb-4">Step 3 of 6</h2>
      <p className="mb-6 text-[#3E3E3E]">Here are some suggestions, or write your own goal below.</p>

      <div className="grid gap-4 mb-6">
        {suggestions.map((goal, index) => (
          <button
            key={index}
            onClick={() => handleSelect(goal)}
            className="w-full py-3 px-4 bg-[#F4C542] text-white rounded hover:bg-[#F5B971] transition"
          >
            {goal}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <input
          type="text"
          placeholder="Write your own goal..."
          value={customGoal}
          onChange={(e) => setCustomGoal(e.target.value)}
          className="w-full px-4 py-2 border border-[#E4BFA1] rounded focus:outline-none focus:ring focus:border-[#1B5E57]"
        />
        <button
          onClick={handleCustomSubmit}
          className="mt-3 px-6 py-2 bg-[#1B5E57] text-white rounded hover:bg-[#3E3E3E] transition"
        >
          Continue
        </button>
      </div>

      <button
        onClick={prevStep}
        className="mt-6 text-[#1B5E57] underline hover:text-[#3E3E3E] transition"
      >
        ← Back to Step 2
      </button>
    </div>
  );
}

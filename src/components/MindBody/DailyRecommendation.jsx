import React, { useEffect, useState } from 'react';

const suggestions = [
  {
    type: 'Meditation',
    title: 'Start with 5 minutes of Focused Mind',
    detail: 'Clear your mind and set intentions for the day.',
  },
  {
    type: 'Breathwork',
    title: 'Try 4-7-8 Breathing',
    detail: 'Reduce stress and regulate your nervous system.',
  },
  {
    type: 'Movement',
    title: 'Do a 3-minute Desk Reset stretch',
    detail: 'Loosen tight muscles from sitting too long.',
  },
];

const DailyRecommendation = () => {
  const [recommendation, setRecommendation] = useState(null);

  useEffect(() => {
    // Select a recommendation based on date or randomly
    const index = new Date().getDate() % suggestions.length;
    setRecommendation(suggestions[index]);
  }, []);

  if (!recommendation) return null;

  return (
    <div className="p-4 bg-dew-sage border border-silver-sage rounded-xl shadow">
      <h3 className="text-lg font-semibold text-evergreen-teal">🌿 Daily Recommendation</h3>
      <p className="text-evergreen-teal mt-2 font-medium">{recommendation.title}</p>
      <p className="text-sm text-soft-charcoal">{recommendation.detail}</p>
      <button className="mt-2 text-sm text-evergreen-teal underline hover:text-evergreen-teal">
        Start Now
      </button>
    </div>
  );
};

export default DailyRecommendation;

